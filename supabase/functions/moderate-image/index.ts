import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts'
import { adminClient, jsonResponse, requireUser, throttle } from '../_shared/auth.ts'

/**
 * Modération des photos de profil et de véhicule (OpenAI Moderation, modèle omni, gratuit).
 *
 * Appelée par l'application / le site juste après l'envoi du fichier dans le stockage, AVANT d'enregistrer
 * l'URL en base. Si la photo est jugée inappropriée (nudité, violence explicite…), elle est supprimée du
 * stockage et l'appelant reçoit approved:false.
 *
 * Entrée  : { bucket: 'profile-photos' | 'vehicle-photos', path: string }
 * Sortie  : { success, approved, checked, reason?, publicUrl? }
 *
 * En cas de panne de l'analyse (clé absente, service indisponible…), la photo est acceptée (checked:false) et le
 * verdict « error » est consigné dans image_moderation_log pour revue par l'administrateur.
 *
 * Secret requis : supabase secrets set OPENAI_API_KEY=sk-...
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_BUCKETS = ['profile-photos', 'vehicle-photos']
const SUPPORTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 15 * 1024 * 1024

// Seuils de refus (score 0..1 renvoyé par OpenAI). Une photo en maillot de bain reste sous 0,5 ;
// à ajuster d'après le journal image_moderation_log si trop strict ou trop laxiste.
const THRESHOLDS: Record<string, number> = {
  'sexual': 0.5,
  'sexual/minors': 0.2,
  'violence/graphic': 0.5,
  'violence': 0.85,
  'self-harm': 0.7,
  'self-harm/intent': 0.7,
  'self-harm/instructions': 0.7,
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

function mimeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  return 'image/jpeg'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const caller = await requireUser(req, corsHeaders)
  if (caller instanceof Response) return caller

  let bucket = ''
  let path = ''
  try {
    const body = await req.json()
    bucket = String(body?.bucket ?? '')
    path = String(body?.path ?? '')
  } catch {
    return jsonResponse(corsHeaders, 400, { success: false, error: 'invalid_body' })
  }
  if (!ALLOWED_BUCKETS.includes(bucket) || !path || path.includes('..') || path.length > 300) {
    return jsonResponse(corsHeaders, 400, { success: false, error: 'invalid_target' })
  }

  if (!(await throttle(`modimg:${caller.user.id}`, 2))) {
    return jsonResponse(corsHeaders, 429, { success: false, error: 'too_many_requests' })
  }

  const db = adminClient()

  // Le fichier doit appartenir à l'appelant : son identifiant (ou celui d'un de ses véhicules) figure dans le nom
  if (!caller.isAdmin) {
    const ids = [...new Set((path.match(UUID_RE) ?? []).map((s) => s.toLowerCase()))]
    let owns = ids.includes(caller.user.id.toLowerCase())
    if (!owns && ids.length > 0) {
      const { data: vehicles } = await db.from('vehicles').select('id').in('id', ids).eq('driver_id', caller.user.id)
      owns = (vehicles?.length ?? 0) > 0
    }
    if (!owns) return jsonResponse(corsHeaders, 403, { success: false, error: 'forbidden' })
  }

  const publicUrl = db.storage.from(bucket).getPublicUrl(path).data.publicUrl
  const log = async (status: 'approved' | 'rejected' | 'error', extra: Record<string, unknown> = {}) => {
    const { error } = await db.from('image_moderation_log').insert({
      user_id: caller.user.id,
      bucket,
      path,
      public_url: publicUrl,
      status,
      ...extra,
    })
    if (error) console.error('moderate-image: journal indisponible', error.message)
  }
  const skip = async (detail: string) => {
    console.error('moderate-image: analyse impossible -', detail)
    await log('error', { detail })
    return jsonResponse(corsHeaders, 200, { success: true, approved: true, checked: false, publicUrl })
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) return await skip('OPENAI_API_KEY manquante')

  const { data: file, error: dlError } = await db.storage.from(bucket).download(path)
  if (dlError || !file) {
    return jsonResponse(corsHeaders, 404, { success: false, error: 'file_not_found' })
  }

  if (file.size > MAX_BYTES) {
    await db.storage.from(bucket).remove([path])
    await log('rejected', { detail: 'too_large' })
    return jsonResponse(corsHeaders, 200, { success: true, approved: false, checked: true, reason: 'too_large' })
  }

  const mime = SUPPORTED_MIME.includes(file.type) ? file.type : mimeFromPath(path)
  if (!SUPPORTED_MIME.includes(mime)) return await skip(`format non pris en charge: ${file.type}`)

  let result: any
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: [{ type: 'image_url', image_url: { url: `data:${mime};base64,${encode(bytes)}` } }],
      }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return await skip(`OpenAI ${res.status}`)
    result = (await res.json())?.results?.[0]
    if (!result) return await skip('réponse OpenAI vide')
  } catch (e) {
    return await skip(`OpenAI injoignable: ${(e as Error).message}`)
  }

  const scores: Record<string, number> = result.category_scores ?? {}
  const flagged = Object.entries(THRESHOLDS)
    .filter(([cat, limit]) => (scores[cat] ?? 0) >= limit)
    .map(([cat]) => cat)

  if (flagged.length > 0) {
    await db.storage.from(bucket).remove([path])
    await log('rejected', { categories: flagged, scores, detail: 'inappropriate' })
    return jsonResponse(corsHeaders, 200, {
      success: true,
      approved: false,
      checked: true,
      reason: 'inappropriate',
    })
  }

  await log('approved', { scores })
  return jsonResponse(corsHeaders, 200, { success: true, approved: true, checked: true, publicUrl })
})

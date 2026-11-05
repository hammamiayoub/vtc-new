// Email envoyé au chauffeur après une action de l'administrateur : abonnement activé ou prolongé.
//
// SÉCURITÉ
//   - Réservé aux administrateurs : le jeton de la session connectée (Authorization: Bearer <jeton>) doit
//     appartenir à un utilisateur présent dans admin_users. La clé publique seule ne suffit plus.
//   - L'appelant n'envoie plus ni destinataire ni contenu : seulement { type, subscription_id }.
//     L'adresse, le nom et les dates sont lus en base. Impossible d'utiliser la fonction comme relais
//     d'emails sous le domaine TuniDrive, même avec un compte admin.
//   - Un seul email par événement : clé « activated:<date de fin> » / « extended:<date de fin> » réservée
//     dans subscription_expiration_notifications (un double clic ne double pas l'envoi). Nouvel essai
//     possible si l'envoi a échoué (la réservation est libérée). { "resend": true } force un renvoi.
//
// Corps JSON :
//   { "type": "activated" | "extended",
//     "subscription_id": "<uuid>",
//     "extension": { "amount": 3, "unit": "months", "previous_end_date": "2026-11-05" }   // si extended
//   }
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  buildActivatedEmail,
  buildExtendedEmail,
  type ExtensionInfo,
  type ExtensionUnit,
} from '../_shared/subscriptionReminders.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const FROM_EMAIL = 'TuniDrive <noreply@tunidrive.net>'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const EXTENSION_UNITS: ExtensionUnit[] = ['days', 'months', 'years']

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sendEmail(to: string, subject: string, html: string): Promise<string | undefined> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) throw new Error('Configuration email manquante: RESEND_API_KEY')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  })
  if (!response.ok) {
    throw new Error(`Erreur Resend ${response.status}: ${await response.text()}`)
  }
  const result = await response.json()
  return result?.id
}

function parseExtension(value: unknown): ExtensionInfo | null | 'invalid' {
  if (value == null) return null
  const e = value as Record<string, unknown>
  const amount = Number(e.amount)
  if (!Number.isInteger(amount) || amount < 1 || amount > 120) return 'invalid'
  if (!EXTENSION_UNITS.includes(e.unit as ExtensionUnit)) return 'invalid'
  const previous = e.previous_end_date
  if (previous != null && !(typeof previous === 'string' && DATE_PATTERN.test(previous))) return 'invalid'
  return { amount, unit: e.unit as ExtensionUnit, previous_end_date: (previous as string | null) ?? null }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, error: 'method_not_allowed' }, 405)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // 1. Qui appelle ? Un administrateur connecté, et personne d'autre.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ success: false, error: 'unauthorized' }, 401)

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) return json({ success: false, error: 'unauthorized' }, 401)

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (!adminRow) return json({ success: false, error: 'forbidden' }, 403)

  try {
    // 2. Que demande-t-il ?
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const type = body.type
    const subscriptionId = body.subscription_id
    if (type !== 'activated' && type !== 'extended') {
      return json({ success: false, error: 'Type invalide : "activated" ou "extended" attendu' }, 400)
    }
    if (typeof subscriptionId !== 'string' || !UUID_PATTERN.test(subscriptionId)) {
      return json({ success: false, error: 'subscription_id invalide' }, 400)
    }
    const extension = parseExtension(body.extension)
    if (extension === 'invalid') return json({ success: false, error: 'extension invalide' }, 400)

    // 3. Les données viennent de la base, pas de l'appelant
    const { data: sub, error: subError } = await supabase
      .from('driver_subscriptions')
      .select('id, driver_id, billing_period, start_date, end_date, total_price_tnd, payment_reference, payment_status')
      .eq('id', subscriptionId)
      .maybeSingle()
    if (subError) throw new Error(subError.message)
    if (!sub) return json({ success: false, error: 'Abonnement introuvable' }, 404)
    if (sub.payment_status !== 'paid') {
      return json({ success: false, error: 'Abonnement non payé : aucun email à envoyer' }, 409)
    }

    const { data: driver } = await supabase
      .from('drivers')
      .select('email, first_name, last_name')
      .eq('id', sub.driver_id)
      .maybeSingle()
    if (!driver?.email) return json({ success: false, error: 'Adresse email du chauffeur introuvable' }, 422)

    const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://tunidrive.net').replace(/\/+$/, '')
    const message = type === 'activated'
      ? buildActivatedEmail({ ...driver, ...sub }, siteUrl)
      : buildExtendedEmail({ ...driver, end_date: sub.end_date }, extension, siteUrl)

    // 4. Un seul email par événement
    const key = `${type}:${sub.end_date}`
    let claimed = false
    if (body.resend !== true) {
      const { data, error: claimError } = await supabase.rpc('claim_subscription_notification', {
        p_subscription_id: sub.id,
        p_driver_id: sub.driver_id,
        p_key: key,
        p_channel: 'email',
      })
      if (claimError) throw new Error(`claim: ${claimError.message}`)
      if (!data) return json({ success: true, skipped: 'already_sent', type })
      claimed = true
    }

    try {
      const emailId = await sendEmail(driver.email, message.subject, message.html)
      return json({ success: true, type, emailId })
    } catch (error) {
      if (claimed) {
        await supabase.rpc('release_subscription_notification', { p_subscription_id: sub.id, p_key: key })
      }
      throw error
    }
  } catch (error) {
    console.error('Erreur dans send-driver-subscription-email:', error)
    return json({ success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }, 500)
  }
})

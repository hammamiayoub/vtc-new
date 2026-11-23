import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { adminClient, jsonResponse, requireAdmin } from '../_shared/auth.ts'

/**
 * Modération des comptes par un administrateur.
 *
 * Depuis un signalement : { reportId, action, note? } avec action parmi
 *   dismiss       : classer sans suite
 *   reviewed      : marquer comme examiné (aucune sanction)
 *   remove_photo  : supprimer la photo de profil (et les photos de véhicule d'un chauffeur) de la personne signalée
 *   suspend       : suspendre le compte
 *   unsuspend     : lever la suspension
 *
 * Directement sur un compte : { userId, role: 'client' | 'driver', action: 'suspend' | 'unsuspend', note? }
 *
 * La suspension bloque la connexion (Supabase Auth) et met le statut à « suspended » ; la levée rétablit le statut
 * d'avant (table account_suspensions). Réservée aux administrateurs : passe par la clé service_role.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const REPORT_ACTIONS = ['dismiss', 'reviewed', 'remove_photo', 'suspend', 'unsuspend']
const DIRECT_ACTIONS = ['suspend', 'unsuspend']
const BAN_FOREVER = '876000h' // ~100 ans

/** Chemin d'un fichier dans un bucket public à partir de son URL publique. */
function storagePathFromUrl(url: unknown, bucket: string): string | null {
  if (typeof url !== 'string') return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const i = url.indexOf(marker)
  if (i < 0) return null
  return decodeURIComponent(url.slice(i + marker.length).split('?')[0])
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = await requireAdmin(req, corsHeaders)
  if (admin instanceof Response) return admin

  try {
    const body = await req.json()
    const { reportId, userId, role, action, note } = body ?? {}
    const db = adminClient()

    let report: Record<string, any> | null = null
    let targetId: string
    let targetRole: 'client' | 'driver'

    if (typeof reportId === 'string') {
      if (!REPORT_ACTIONS.includes(action)) return jsonResponse(corsHeaders, 400, { success: false, error: 'invalid_body' })
      const { data } = await db.from('user_reports').select('*').eq('id', reportId).maybeSingle()
      if (!data) return jsonResponse(corsHeaders, 404, { success: false, error: 'not_found' })
      report = data
      targetId = data.reported_id
      targetRole = data.reported_role
    } else {
      if (
        typeof userId !== 'string' ||
        (role !== 'client' && role !== 'driver') ||
        !DIRECT_ACTIONS.includes(action)
      ) {
        return jsonResponse(corsHeaders, 400, { success: false, error: 'invalid_body' })
      }
      targetId = userId
      targetRole = role
    }

    const table = targetRole === 'driver' ? 'drivers' : 'clients'
    const cleanNote = typeof note === 'string' ? note.trim().slice(0, 1000) : ''

    // Garde-fous : jamais soi-même, jamais un autre administrateur
    if (action === 'suspend') {
      if (targetId === admin.user.id) return jsonResponse(corsHeaders, 400, { success: false, error: 'cannot_suspend_self' })
      const { data: targetAdmin } = await db.from('admin_users').select('id').eq('id', targetId).maybeSingle()
      if (targetAdmin) return jsonResponse(corsHeaders, 403, { success: false, error: 'cannot_suspend_admin' })
    }

    let reportStatus: 'reviewed' | 'dismissed' | 'action_taken' = 'reviewed'
    let accountStatus: string | undefined

    if (action === 'dismiss') {
      reportStatus = 'dismissed'
    } else if (action === 'remove_photo') {
      reportStatus = 'action_taken'
      const { data: profile } = await db.from(table).select('profile_photo_url').eq('id', targetId).maybeSingle()
      const profilePath = storagePathFromUrl(profile?.profile_photo_url, 'profile-photos')
      if (profilePath) await db.storage.from('profile-photos').remove([profilePath])
      await db.from(table).update({ profile_photo_url: null }).eq('id', targetId)

      if (table === 'drivers') {
        const { data: vehicles } = await db.from('vehicles').select('id, photo_url').eq('driver_id', targetId)
        const vehiclePaths = (vehicles ?? [])
          .map((v: { photo_url: string | null }) => storagePathFromUrl(v.photo_url, 'vehicle-photos'))
          .filter((p: string | null): p is string => !!p)
        if (vehiclePaths.length > 0) await db.storage.from('vehicle-photos').remove(vehiclePaths)
        await db.from('vehicles').update({ photo_url: null }).eq('driver_id', targetId)

        const { data: d } = await db.from('drivers').select('vehicle_info').eq('id', targetId).maybeSingle()
        const infoPath = storagePathFromUrl(d?.vehicle_info?.photoUrl, 'vehicle-photos')
        if (infoPath) await db.storage.from('vehicle-photos').remove([infoPath])
        if (d?.vehicle_info?.photoUrl) {
          await db.from('drivers').update({ vehicle_info: { ...d.vehicle_info, photoUrl: null } }).eq('id', targetId)
        }
      }
    } else if (action === 'suspend') {
      reportStatus = 'action_taken'
      const { data: current } = await db.from(table).select('status').eq('id', targetId).maybeSingle()
      if (!current) return jsonResponse(corsHeaders, 404, { success: false, error: 'account_not_found' })
      const { error: banError } = await db.auth.admin.updateUserById(targetId, { ban_duration: BAN_FOREVER })
      if (banError) throw banError
      // Déjà suspendu : on ne crée pas de seconde entrée (elle écraserait le statut d'origine)
      if (current.status !== 'suspended') {
        await db.from('account_suspensions').insert({
          user_id: targetId,
          role: targetRole,
          prev_status: current.status,
          reason: cleanNote || null,
          report_id: report?.id ?? null,
          suspended_by: admin.user.id,
        })
      }
      await db.from(table).update({ status: 'suspended' }).eq('id', targetId)
      accountStatus = 'suspended'
    } else if (action === 'unsuspend') {
      reportStatus = 'reviewed'
      const { error: unbanError } = await db.auth.admin.updateUserById(targetId, { ban_duration: 'none' })
      if (unbanError) throw unbanError
      const { data: last } = await db
        .from('account_suspensions')
        .select('id, prev_status')
        .eq('user_id', targetId)
        .is('lifted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      // À défaut d'historique : un chauffeur repasse « pending » (à revalider), un client « active »
      const restored = last?.prev_status && last.prev_status !== 'suspended'
        ? last.prev_status
        : table === 'drivers' ? 'pending' : 'active'
      await db.from(table).update({ status: restored }).eq('id', targetId)
      if (last) {
        await db
          .from('account_suspensions')
          .update({ lifted_at: new Date().toISOString(), lifted_by: admin.user.id })
          .eq('id', last.id)
      }
      accountStatus = restored
    }

    if (report) {
      const { error: updateError } = await db
        .from('user_reports')
        .update({
          status: reportStatus,
          admin_note: cleanNote || report.admin_note,
          handled_by: admin.user.id,
          handled_at: new Date().toISOString(),
        })
        .eq('id', report.id)
      if (updateError) throw updateError
    }

    return jsonResponse(corsHeaders, 200, { success: true, status: reportStatus, accountStatus })
  } catch (e) {
    console.error('admin-moderate-user:', e)
    return jsonResponse(corsHeaders, 500, { success: false, error: 'internal_error' })
  }
})

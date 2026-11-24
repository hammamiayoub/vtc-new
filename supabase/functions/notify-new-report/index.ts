import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { adminClient, jsonResponse, requireServiceRole } from '../_shared/auth.ts'
import { renderEmail, paragraph, infoCard, button, FROM_EMAIL, SITE_URL } from '../_shared/emailLayout.ts'

/**
 * E-mail à l'administrateur à chaque nouveau signalement (user_reports).
 * Appelée uniquement par le trigger SQL notify_new_user_report, avec la clé service_role.
 * Le contenu vient de la base (jamais de l'appelant) et est échappé avant d'entrer dans l'e-mail.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ADMIN_EMAIL = 'support@tunidrive.net'

const REASONS: Record<string, string> = {
  inappropriate_photo: 'Photo inappropriée',
  abusive_behavior: 'Comportement abusif ou irrespectueux',
  fake_identity: 'Fausse identité',
  vehicle_issue: 'Véhicule non conforme',
  other: 'Autre',
}
const ROLES: Record<string, string> = { client: 'Client', driver: 'Chauffeur / transporteur' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const denied = requireServiceRole(req, corsHeaders)
  if (denied) return denied

  try {
    const { reportId } = await req.json()
    if (typeof reportId !== 'string') return jsonResponse(corsHeaders, 400, { success: false, error: 'invalid_body' })

    const db = adminClient()
    const { data: report } = await db.from('user_reports').select('*').eq('id', reportId).maybeSingle()
    if (!report) return jsonResponse(corsHeaders, 404, { success: false, error: 'not_found' })

    const who = async (id: string, role: string) => {
      const { data } = await db
        .from(role === 'driver' ? 'drivers' : 'clients')
        .select('first_name, last_name, email')
        .eq('id', id)
        .maybeSingle()
      return data ? `${data.first_name ?? ''} ${data.last_name ?? ''} (${data.email ?? '?'})`.trim() : id
    }
    const [reporter, reported] = await Promise.all([
      who(report.reporter_id, report.reporter_role),
      who(report.reported_id, report.reported_role),
    ])

    const [{ count: totalAgainst }, { count: rejectedPhotos }] = await Promise.all([
      db.from('user_reports').select('id', { count: 'exact', head: true }).eq('reported_id', report.reported_id),
      db
        .from('image_moderation_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', report.reported_id)
        .eq('status', 'rejected'),
    ])

    const reasonLabel = REASONS[report.reason] ?? report.reason
    const context = report.booking_id
      ? `Réservation ${report.booking_id}`
      : report.parcel_request_id
        ? `Demande de devis colis ${report.parcel_request_id}`
        : 'Non précisé'
    const html = renderEmail({
      title: `Nouveau signalement : ${reasonLabel}`,
      preheader: `${reporter} a signalé ${reported}.`,
      body: [
        infoCard('Signalement', [
          { label: 'Signalé par', value: `${reporter} — ${ROLES[report.reporter_role] ?? report.reporter_role}` },
          { label: 'Personne signalée', value: `${reported} — ${ROLES[report.reported_role] ?? report.reported_role}` },
          { label: 'Motif', value: reasonLabel },
          { label: 'Commentaire', value: report.comment || 'Aucun' },
          { label: 'Contexte', value: context },
        ], 'warning'),
        infoCard('Historique de la personne signalée', [
          { label: 'Signalements', value: `${totalAgainst ?? 1} au total` },
          { label: 'Photos refusées', value: `${rejectedPhotos ?? 0} (modération automatique)` },
        ]),
        paragraph('À traiter dans l\'administration, onglet « Signalements ».'),
        button('Ouvrir l\'administration', `${SITE_URL}/admin`),
      ].join(''),
      footnote: 'Notification interne envoyée à chaque nouveau signalement.',
    })

    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY manquante')
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: `TuniDrive — Signalement : ${reasonLabel}`,
        html,
      }),
    })
    if (!res.ok) throw new Error(`Resend ${res.status}`)

    return jsonResponse(corsHeaders, 200, { success: true })
  } catch (e) {
    console.error('notify-new-report:', e)
    return jsonResponse(corsHeaders, 500, { success: false, error: 'internal_error' })
  }
})

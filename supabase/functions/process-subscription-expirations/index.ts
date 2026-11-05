// Traitement horaire des abonnements chauffeurs (appelé par pg_cron, voir la migration
// 20261105130000_subscription_expiration_notifications.sql) :
//   1. marque comme « expired » les abonnements dont la date de fin est passée ;
//   2. envoie les rappels J-7, J-1 et « expiré » (email + push) entre 8 h et 20 h, heure de Tunis ;
//   3. accuse réception des nouvelles demandes d'abonnement au chauffeur et prévient l'admin.
//
// Chaque notification est « réservée » en base AVANT l'envoi (claim) puis libérée si l'envoi échoue :
// jamais deux emails pour la même échéance, et nouvel essai automatique au passage suivant.
//
// Accès : secret partagé dans l'en-tête x-subscription-cron-secret (même mécanisme que le blog).
// Corps JSON optionnel : { "dry_run": true } liste ce qui serait envoyé sans rien envoyer ni modifier ;
//                        { "force": true }   ignore la plage horaire 8 h - 20 h (essai manuel).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendExpoPush } from '../_shared/expoPush.ts'
import {
  buildAdminRequestEmail,
  buildReminderEmail,
  buildRequestReceivedEmail,
  isReminderWindow,
  type ReminderCandidate,
  type SubscriptionRequest,
} from '../_shared/subscriptionReminders.ts'

const FROM_EMAIL = 'TuniDrive <noreply@tunidrive.net>'
const DEFAULT_ADMIN_EMAIL = 'support@tunidrive.net'
/** Garde-fou : un passage n'envoie jamais plus de messages que ça (évite les emballements). */
const MAX_MESSAGES_PER_RUN = 200

function secretsMatch(left: string, right: string): boolean {
  const encoder = new TextEncoder()
  const a = encoder.encode(left)
  const b = encoder.encode(right)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function sendEmail(to: string[], subject: string, html: string): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) throw new Error('RESEND_API_KEY non configurée')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  if (!response.ok) {
    throw new Error(`Resend ${response.status}: ${await response.text()}`)
  }
}

interface RunSummary {
  dry_run: boolean
  reminder_window_open: boolean
  expired_marked: number
  reminders: { sent: number; skipped_duplicate: number; failed: number; planned: string[] }
  requests: { driver_acks: number; admin_alerts: number; skipped_duplicate: number; failed: number; planned: string[] }
  push_sent: number
  truncated: boolean
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const cronSecret = Deno.env.get('SUBSCRIPTION_CRON_SECRET') ?? ''
  const headerSecret = req.headers.get('x-subscription-cron-secret') ?? ''
  if (!cronSecret || !headerSecret || !secretsMatch(headerSecret, cronSecret)) {
    return json({ error: 'unauthorized' }, 401)
  }

  let options: { dry_run?: boolean; force?: boolean } = {}
  try {
    options = await req.json()
  } catch {
    /* corps vide : valeurs par défaut */
  }
  const dryRun = options.dry_run === true
  const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://tunidrive.net').replace(/\/+$/, '')
  const adminEmails = (Deno.env.get('ADMIN_NOTIFICATION_EMAILS') ?? DEFAULT_ADMIN_EMAIL)
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const windowOpen = options.force === true || isReminderWindow()
  const summary: RunSummary = {
    dry_run: dryRun,
    reminder_window_open: windowOpen,
    expired_marked: 0,
    reminders: { sent: 0, skipped_duplicate: 0, failed: 0, planned: [] },
    requests: { driver_acks: 0, admin_alerts: 0, skipped_duplicate: 0, failed: 0, planned: [] },
    push_sent: 0,
    truncated: false,
  }
  let budget = MAX_MESSAGES_PER_RUN

  try {
    // 1. Statuts : les abonnements échus passent à « expired » (l'accès, lui, dépend déjà des dates)
    if (!dryRun) {
      const { data: expired, error } = await supabase.rpc('mark_expired_subscriptions')
      if (error) console.error('[subscriptions] mark_expired_subscriptions:', error.message)
      else summary.expired_marked = Array.isArray(expired) ? expired.length : 0
    }

    // 2. Rappels aux chauffeurs
    if (windowOpen) {
      const { data, error } = await supabase.rpc('get_subscription_notification_candidates')
      if (error) throw new Error(`get_subscription_notification_candidates: ${error.message}`)

      for (const c of (data ?? []) as ReminderCandidate[]) {
        if (budget <= 0) { summary.truncated = true; break }
        const label = `${c.notification_key} → ${c.driver_email}`

        if (dryRun) { summary.reminders.planned.push(label); continue }

        const { data: claimed, error: claimError } = await supabase.rpc('claim_subscription_notification', {
          p_subscription_id: c.subscription_id,
          p_driver_id: c.driver_id,
          p_key: c.notification_key,
          p_channel: 'email',
        })
        if (claimError) { summary.reminders.failed++; console.error('[subscriptions] claim:', claimError.message); continue }
        if (!claimed) { summary.reminders.skipped_duplicate++; continue }

        budget--
        try {
          const message = buildReminderEmail(c, siteUrl)
          await sendEmail([c.driver_email], message.subject, message.html)
          summary.reminders.sent++

          // Push : en plus de l'email, sans conséquence si l'appareil n'en reçoit pas
          if (c.push_token && message.pushTitle && message.pushBody) {
            const ok = await sendExpoPush(c.push_token, {
              title: message.pushTitle,
              body: message.pushBody,
              data: { type: 'subscription', screen: 'subscription' },
            })
            if (ok) summary.push_sent++
          }
        } catch (error) {
          summary.reminders.failed++
          console.error(`[subscriptions] envoi ${label}:`, error)
          // On libère la réservation : nouvel essai au prochain passage
          await supabase.rpc('release_subscription_notification', {
            p_subscription_id: c.subscription_id,
            p_key: c.notification_key,
          })
        }
      }
    }

    // 3. Nouvelles demandes d'abonnement : accusé de réception au chauffeur + alerte à l'admin
    const { data: requests, error: requestsError } = await supabase.rpc('get_subscription_requests_to_notify')
    if (requestsError) throw new Error(`get_subscription_requests_to_notify: ${requestsError.message}`)

    for (const r of (requests ?? []) as SubscriptionRequest[]) {
      if (budget <= 0) { summary.truncated = true; break }

      const jobs: { key: string; to: string[]; build: () => { subject: string; html: string }; counter: 'driver_acks' | 'admin_alerts' }[] = [
        {
          key: 'request_received',
          to: [r.driver_email],
          build: () => buildRequestReceivedEmail(r, siteUrl),
          counter: 'driver_acks',
        },
        {
          key: 'admin_new_request',
          to: adminEmails,
          build: () => buildAdminRequestEmail(r, siteUrl),
          counter: 'admin_alerts',
        },
      ]

      for (const job of jobs) {
        if (!job.to.every(Boolean)) continue
        const label = `${job.key} → ${job.to.join(', ')}`
        if (dryRun) { summary.requests.planned.push(label); continue }

        const { data: claimed, error: claimError } = await supabase.rpc('claim_subscription_notification', {
          p_subscription_id: r.subscription_id,
          p_driver_id: r.driver_id,
          p_key: job.key,
          p_channel: 'email',
        })
        if (claimError) { summary.requests.failed++; console.error('[subscriptions] claim:', claimError.message); continue }
        if (!claimed) { summary.requests.skipped_duplicate++; continue }

        budget--
        try {
          const message = job.build()
          await sendEmail(job.to, message.subject, message.html)
          summary.requests[job.counter]++
        } catch (error) {
          summary.requests.failed++
          console.error(`[subscriptions] envoi ${label}:`, error)
          await supabase.rpc('release_subscription_notification', {
            p_subscription_id: r.subscription_id,
            p_key: job.key,
          })
        }
      }
    }

    return json({ ok: true, ...summary })
  } catch (error) {
    console.error('[subscriptions] erreur:', error)
    return json({ ok: false, error: error instanceof Error ? error.message : String(error), ...summary }, 500)
  }
})

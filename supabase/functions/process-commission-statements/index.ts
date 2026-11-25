// Notifications des relevés de commission des chauffeurs (appelé toutes les heures par pg_cron).
//   1. relevé émis      : e-mail + push au chauffeur (montant à virer, coordonnées bancaires, échéance) ;
//   2. rappel           : la veille de l'échéance, tant que le relevé est « due » ;
//   3. relevé en retard : e-mail + push une fois passé « overdue » ;
//   4. paiement déclaré : alerte à l'administrateur.
// Messages envoyés entre 8 h et 20 h (heure de Tunis). Chaque notification est « réservée » en base avant l'envoi
// (colonne *_notified_at) puis libérée si l'envoi échoue : jamais deux messages identiques, nouvel essai au passage suivant.
//
// Accès : secret partagé dans l'en-tête x-subscription-cron-secret (comme process-subscription-expirations).
// Corps JSON optionnel : { "dry_run": true } liste sans rien envoyer ; { "force": true } ignore la plage 8 h - 20 h.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendExpoPush } from '../_shared/expoPush.ts'
import {
  FROM_EMAIL,
  SITE_URL,
  SUPPORT_EMAIL,
  button,
  greeting,
  infoCard,
  notice,
  paragraph,
  renderEmail,
} from '../_shared/emailLayout.ts'

const BANK_BENEFICIARY = 'TuniDrive SARL'
const BANK_IBAN = 'TN59 04 117 1850077170413 86'
const MAX_MESSAGES_PER_RUN = 200

type Statement = {
  id: string
  driver_id: string
  invoice_number: string
  period_start: string
  rides_count: number
  free_rides_excluded: number
  gross_amount_tnd: number
  rate: number
  commission_ht_tnd: number
  vat_percentage: number
  vat_amount_tnd: number
  stamp_tnd: number
  total_ttc_tnd: number
  adjustment_tnd: number
  status: string
  due_at: string
  payment_reference: string | null
  drivers: { first_name: string | null; last_name: string | null; email: string | null; push_token: string | null } | null
}

function secretsMatch(left: string, right: string): boolean {
  const enc = new TextEncoder()
  const a = enc.encode(left)
  const b = enc.encode(right)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function tunisHour(now = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Tunis', hour: '2-digit', hour12: false }).format(now)) % 24
}

const tnd = (n: number) => `${Number(n).toFixed(3)} TND`
const monthLabel = (d: string) =>
  new Date(`${d.slice(0, 7)}-01T12:00:00Z`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const dueLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Africa/Tunis' })
const totalDue = (s: Statement) => Number(s.total_ttc_tnd) + Number(s.adjustment_tnd ?? 0)

async function sendEmail(to: string[], subject: string, html: string): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) throw new Error('RESEND_API_KEY non configurée')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

function statementCard(s: Statement): string {
  return infoCard(`Relevé ${s.invoice_number}`, [
    { label: 'Période', value: monthLabel(s.period_start) },
    { label: 'Courses facturables', value: String(s.rides_count) },
    { label: 'Courses offertes', value: s.free_rides_excluded > 0 ? String(s.free_rides_excluded) : '' },
    { label: 'Montant des courses', value: tnd(s.gross_amount_tnd) },
    { label: `Commission HT (${Math.round(Number(s.rate) * 100)} %)`, value: tnd(s.commission_ht_tnd) },
    { label: `TVA (${Number(s.vat_percentage)} %)`, value: tnd(s.vat_amount_tnd) },
    { label: 'Droit de timbre', value: Number(s.stamp_tnd) > 0 ? tnd(s.stamp_tnd) : '' },
    { label: 'Ajustement', value: Number(s.adjustment_tnd) !== 0 ? tnd(s.adjustment_tnd) : '' },
    { label: 'Total à virer (TTC)', value: tnd(totalDue(s)) },
  ], 'info')
}

function bankCard(s: Statement): string {
  return infoCard('Virement bancaire', [
    { label: 'Bénéficiaire', value: BANK_BENEFICIARY },
    { label: 'IBAN', value: BANK_IBAN },
    { label: 'Montant', value: tnd(totalDue(s)) },
    { label: 'Référence', value: s.invoice_number },
  ], 'neutral')
}

function issuedEmail(s: Statement, name: string) {
  const html = renderEmail({
    title: `Votre relevé de commission de ${monthLabel(s.period_start)}`,
    preheader: `Montant à virer : ${tnd(totalDue(s))}, avant le ${dueLabel(s.due_at)}.`,
    body: [
      greeting(name),
      paragraph(`Voici le récapitulatif de vos courses terminées en <strong>${monthLabel(s.period_start)}</strong> et la commission TuniDrive correspondante.`),
      statementCard(s),
      bankCard(s),
      notice(
        `<strong>Échéance : le ${dueLabel(s.due_at)}.</strong> Indiquez la référence <strong>${s.invoice_number}</strong> dans votre virement, puis déclarez votre paiement depuis votre espace chauffeur. Vous restez actif jusqu'à la validation de votre paiement par notre équipe.`,
        'warning',
      ),
      button('Accéder à mon espace', `${SITE_URL}/dashboard`),
      paragraph(`Une question sur ce relevé ? Écrivez-nous à <a href="mailto:${SUPPORT_EMAIL}" style="color:#111827;">${SUPPORT_EMAIL}</a>.`),
    ].join(''),
    footnote: 'Relevé de commission mensuel.',
  })
  return {
    subject: `TuniDrive — Relevé de commission ${monthLabel(s.period_start)} : ${tnd(totalDue(s))}`,
    html,
    pushTitle: 'Votre relevé de commission est disponible',
    pushBody: `${tnd(totalDue(s))} à virer avant le ${dueLabel(s.due_at)}.`,
  }
}

function reminderEmail(s: Statement, name: string) {
  const html = renderEmail({
    title: 'Rappel : échéance de votre commission',
    preheader: `Dernier jour pour régler ${tnd(totalDue(s))} : ${dueLabel(s.due_at)}.`,
    body: [
      greeting(name),
      paragraph(`Votre relevé <strong>${s.invoice_number}</strong> (${monthLabel(s.period_start)}) arrive à échéance le <strong>${dueLabel(s.due_at)}</strong>.`),
      bankCard(s),
      notice(
        'Après l\'échéance, sans paiement déclaré, votre compte peut être suspendu jusqu\'au règlement. Si vous avez déjà viré, déclarez simplement votre paiement depuis votre espace : vous restez actif en attendant la validation.',
        'warning',
      ),
      button('Déclarer mon paiement', `${SITE_URL}/dashboard`),
    ].join(''),
    footnote: 'Rappel automatique d\'échéance.',
  })
  return {
    subject: `TuniDrive — Rappel : commission à régler avant le ${dueLabel(s.due_at)}`,
    html,
    pushTitle: 'Commission à régler demain',
    pushBody: `${tnd(totalDue(s))} avant le ${dueLabel(s.due_at)}.`,
  }
}

function overdueEmail(s: Statement, name: string, enforcement: boolean) {
  const html = renderEmail({
    title: 'Votre commission est en retard',
    preheader: `Relevé ${s.invoice_number} non réglé.`,
    body: [
      greeting(name),
      paragraph(`L'échéance de votre relevé <strong>${s.invoice_number}</strong> (${monthLabel(s.period_start)}) est dépassée et nous n'avons pas reçu de paiement.`),
      bankCard(s),
      notice(
        enforcement
          ? 'Votre accès aux nouvelles demandes de courses est suspendu. Il sera rétabli dès la validation de votre paiement.'
          : 'Merci de régulariser votre situation au plus vite.',
        'danger',
      ),
      button('Déclarer mon paiement', `${SITE_URL}/dashboard`),
      paragraph(`Vous avez déjà payé ? Répondez-nous avec votre justificatif à <a href="mailto:${SUPPORT_EMAIL}" style="color:#111827;">${SUPPORT_EMAIL}</a>.`),
    ].join(''),
    footnote: 'Notification de retard de paiement.',
  })
  return {
    subject: 'TuniDrive — Commission en retard',
    html,
    pushTitle: 'Commission en retard',
    pushBody: enforcement ? 'Votre accès est suspendu jusqu\'au paiement.' : 'Merci de régler votre relevé.',
  }
}

function adminDeclaredEmail(s: Statement, name: string) {
  return {
    subject: `TuniDrive — Paiement de commission déclaré : ${name}`,
    html: renderEmail({
      title: 'Paiement de commission à valider',
      body: [
        paragraph('Un chauffeur a déclaré avoir réglé son relevé de commission. Vérifiez le virement puis validez-le dans l\'administration.'),
        infoCard('Paiement déclaré', [
          { label: 'Chauffeur', value: name },
          { label: 'E-mail', value: s.drivers?.email },
          { label: 'Relevé', value: s.invoice_number },
          { label: 'Période', value: monthLabel(s.period_start) },
          { label: 'Montant attendu', value: tnd(totalDue(s)) },
          { label: 'Référence indiquée', value: s.payment_reference },
        ], 'info'),
        button('Ouvrir l\'administration', `${SITE_URL}/admin`),
      ].join(''),
      footnote: 'Notification interne TuniDrive.',
    }),
  }
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const cronSecret = Deno.env.get('SUBSCRIPTION_CRON_SECRET') ?? ''
  const headerSecret = req.headers.get('x-subscription-cron-secret') ?? ''
  if (!cronSecret || !headerSecret || !secretsMatch(headerSecret, cronSecret)) return json({ error: 'unauthorized' }, 401)

  let options: { dry_run?: boolean; force?: boolean } = {}
  try { options = await req.json() } catch { /* corps vide */ }
  const dryRun = options.dry_run === true
  const windowOpen = options.force === true || (tunisHour() >= 8 && tunisHour() < 20)

  const summary = { dry_run: dryRun, window_open: windowOpen, issued: 0, reminders: 0, overdue: 0, admin_alerts: 0, failed: 0, push_sent: 0, planned: [] as string[] }
  if (!windowOpen) return json({ ok: true, ...summary })

  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const adminEmails = (Deno.env.get('ADMIN_NOTIFICATION_EMAILS') ?? SUPPORT_EMAIL).split(',').map((e) => e.trim()).filter(Boolean)

  const { data: settings } = await db.from('commission_settings').select('enforcement_enabled').eq('id', true).maybeSingle()
  const enforcement = settings?.enforcement_enabled === true

  const select =
    '*, drivers(first_name, last_name, email, push_token)'
  const nowIso = new Date().toISOString()
  const inThirtySixHours = new Date(Date.now() + 36 * 3600_000).toISOString()
  let budget = MAX_MESSAGES_PER_RUN

  type Job = {
    column: string
    counter: 'issued' | 'reminders' | 'overdue' | 'admin_alerts'
    rows: Statement[]
    build: (s: Statement, name: string) => { subject: string; html: string; pushTitle?: string; pushBody?: string }
    toAdmin?: boolean
  }

  const q = (build: (b: any) => any) => build(db.from('driver_commission_statements').select(select))
  const [issued, reminders, overdue, declared] = await Promise.all([
    q((b) => b.eq('status', 'due').is('notified_at', null)),
    q((b) => b.eq('status', 'due').is('reminder_notified_at', null).not('notified_at', 'is', null).lte('due_at', inThirtySixHours).gt('due_at', nowIso)),
    q((b) => b.eq('status', 'overdue').is('overdue_notified_at', null)),
    q((b) => b.eq('status', 'declared').is('declared_notified_at', null)),
  ])

  const jobs: Job[] = [
    { column: 'notified_at', counter: 'issued', rows: (issued.data ?? []) as Statement[], build: issuedEmail },
    { column: 'reminder_notified_at', counter: 'reminders', rows: (reminders.data ?? []) as Statement[], build: reminderEmail },
    { column: 'overdue_notified_at', counter: 'overdue', rows: (overdue.data ?? []) as Statement[], build: (s, n) => overdueEmail(s, n, enforcement) },
    { column: 'declared_notified_at', counter: 'admin_alerts', rows: (declared.data ?? []) as Statement[], build: adminDeclaredEmail, toAdmin: true },
  ]

  for (const job of jobs) {
    for (const s of job.rows) {
      if (budget <= 0) break
      const d = s.drivers
      const name = `${d?.first_name ?? ''} ${d?.last_name ?? ''}`.trim()
      const to = job.toAdmin ? adminEmails : d?.email ? [d.email] : []
      if (to.length === 0) continue
      if (dryRun) { summary.planned.push(`${job.column} ${s.invoice_number} → ${to.join(', ')}`); continue }

      // Réservation avant l'envoi : une seule exécution traite ce relevé
      const { data: claimed } = await db
        .from('driver_commission_statements')
        .update({ [job.column]: new Date().toISOString() })
        .eq('id', s.id)
        .is(job.column, null)
        .select('id')
      if (!claimed || claimed.length === 0) continue

      budget--
      try {
        const message = job.build(s, name)
        await sendEmail(to, message.subject, message.html)
        summary[job.counter]++
        if (!job.toAdmin && message.pushTitle && message.pushBody) {
          const ok = await sendExpoPush(d?.push_token, {
            title: message.pushTitle,
            body: message.pushBody,
            data: { type: 'commission', screen: 'subscription' },
          })
          if (ok) summary.push_sent++
        }
      } catch (error) {
        summary.failed++
        console.error(`[commission] envoi ${job.column} ${s.invoice_number}:`, error)
        await db.from('driver_commission_statements').update({ [job.column]: null }).eq('id', s.id)
      }
    }
  }

  return json({ ok: true, ...summary })
})

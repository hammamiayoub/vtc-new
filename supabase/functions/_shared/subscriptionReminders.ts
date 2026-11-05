// Logique pure des notifications d'abonnement (aucune dépendance : testable hors Deno).

export type ReminderType = 'expiring_soon_7d' | 'expiring_soon_1d' | 'expired'

export interface ReminderCandidate {
  subscription_id: string
  driver_id: string
  driver_email: string
  first_name: string | null
  last_name: string | null
  push_token: string | null
  lifetime_accepted_bookings: number
  notification_type: ReminderType
  notification_key: string
  end_date: string // AAAA-MM-JJ
  billing_period: string | null
  days_remaining: number
}

export interface SubscriptionRequest {
  subscription_id: string
  driver_id: string
  driver_email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  billing_period: string | null
  total_price_tnd: number | null
  created_at: string
}

export interface BuiltMessage {
  subject: string
  html: string
  pushTitle?: string
  pushBody?: string
}

/** Quota de courses gratuites à vie (aligné sur get_driver_subscription_status). */
const FREE_RIDES_QUOTA = 2

/** Les rappels aux chauffeurs ne partent qu'entre 8 h et 20 h, heure de Tunis. */
const REMINDER_FIRST_HOUR = 8
const REMINDER_LAST_HOUR = 20

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Heure (0-23) à Tunis. */
export function tunisHour(now = new Date()): number {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Tunis',
    hour: '2-digit',
    hour12: false,
  }).format(now)
  return Number(hour) % 24
}

export function isReminderWindow(now = new Date()): boolean {
  const hour = tunisHour(now)
  return hour >= REMINDER_FIRST_HOUR && hour < REMINDER_LAST_HOUR
}

/** Référence de virement affichée au chauffeur (identique à celle de l'espace chauffeur). */
export function subscriptionReference(driverId: string): string {
  return `ABONNEMENT-${driverId.slice(0, 8).toUpperCase()}`
}

export function formatDateFr(dateStr: string): string {
  // La date est un jour calendaire : on la lit en UTC pour qu'aucun fuseau ne la décale
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function periodLabel(period: string | null): string {
  if (period === 'yearly') return 'annuel'
  if (period === 'monthly') return 'mensuel'
  return 'Premium'
}

function fullName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(' ').trim()
}

export function layout(title: string, body: string, cta?: { label: string; url: string }): string {
  const button = cta
    ? `<p style="text-align:center;margin:28px 0 8px;">
         <a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:999px;">${escapeHtml(cta.label)}</a>
       </p>`
    : ''
  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:0;background:#f6f6f6;">
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#000;padding:20px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">TuniDrive</h1>
      <p style="color:#d1d5db;margin:6px 0 0;font-size:14px;">${escapeHtml(title)}</p>
    </div>
    <div style="padding:28px 24px;color:#333;font-size:16px;line-height:1.6;">
      ${body}
      ${button}
    </div>
    <div style="background:#f3f4f6;padding:16px;text-align:center;font-size:12px;color:#6b7280;">
      TuniDrive · support@tunidrive.net<br />Cet email a été envoyé automatiquement.
    </div>
  </div>
</body></html>`
}

function daysPhrase(days: number): string {
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'demain'
  return `dans ${days} jours`
}

export function buildReminderEmail(c: ReminderCandidate, siteUrl: string): BuiltMessage {
  const name = escapeHtml(c.first_name || 'chauffeur')
  const endDate = escapeHtml(formatDateFr(c.end_date))
  const plan = escapeHtml(periodLabel(c.billing_period))
  const cta = { label: 'Renouveler mon abonnement', url: `${siteUrl}/dashboard` }
  const limitedAfter = c.lifetime_accepted_bookings >= FREE_RIDES_QUOTA

  const consequence = limitedAfter
    ? `<p>Sans abonnement actif, vous ne pourrez plus accepter de nouvelles courses (vos ${FREE_RIDES_QUOTA} courses gratuites sont déjà utilisées). Les courses que vous avez déjà acceptées ne sont pas concernées.</p>`
    : `<p>Sans abonnement actif, votre accès aux courses illimitées prendra fin.</p>`

  const howTo = `<p>Pour renouveler : ouvrez votre espace chauffeur, onglet <strong>« Mon abonnement »</strong>, puis suivez les instructions de paiement. L'activation intervient sous 24 h ouvrables après réception du virement : pensez à l'effectuer quelques jours avant l'échéance.</p>`

  if (c.notification_type === 'expired') {
    return {
      subject: 'TuniDrive - Votre abonnement a expiré',
      html: layout(
        'Abonnement expiré',
        `<p>Bonjour ${name},</p>
         <p>Votre abonnement ${plan} a expiré le <strong>${endDate}</strong>.</p>
         ${consequence}
         ${howTo}`,
        cta,
      ),
      pushTitle: 'Abonnement expiré',
      pushBody: 'Renouvelez votre abonnement pour continuer à accepter des courses.',
    }
  }

  const when = daysPhrase(c.days_remaining)
  return {
    subject: `TuniDrive - Votre abonnement expire ${when}`,
    html: layout(
      'Votre abonnement arrive à échéance',
      `<p>Bonjour ${name},</p>
       <p>Votre abonnement ${plan} expire <strong>${escapeHtml(when)}</strong>, le <strong>${endDate}</strong>.</p>
       ${consequence}
       ${howTo}`,
      cta,
    ),
    pushTitle: `Abonnement : fin ${when}`,
    pushBody: `Votre abonnement expire le ${formatDateFr(c.end_date)}. Renouvelez-le pour ne pas être interrompu.`,
  }
}

export function buildRequestReceivedEmail(r: SubscriptionRequest, siteUrl: string): BuiltMessage {
  const name = escapeHtml(r.first_name || 'chauffeur')
  const price =
    r.total_price_tnd != null ? `<li>Montant à régler : <strong>${escapeHtml(Number(r.total_price_tnd).toFixed(2))} TND TTC</strong></li>` : ''
  return {
    subject: "TuniDrive - Demande d'abonnement reçue",
    html: layout(
      'Demande d’abonnement reçue',
      `<p>Bonjour ${name},</p>
       <p>Nous avons bien reçu votre demande d'abonnement ${escapeHtml(periodLabel(r.billing_period))}.</p>
       <ul>
         ${price}
         <li>Référence à indiquer dans le motif du virement : <strong>${escapeHtml(subscriptionReference(r.driver_id))}</strong></li>
       </ul>
       <p>Les coordonnées bancaires sont dans votre espace chauffeur, onglet <strong>« Mon abonnement »</strong>. Votre abonnement est activé sous 24 h ouvrables après réception du virement, et vous recevrez un email de confirmation.</p>`,
      { label: 'Voir mon abonnement', url: `${siteUrl}/dashboard` },
    ),
  }
}

export function buildAdminRequestEmail(r: SubscriptionRequest, siteUrl: string): BuiltMessage {
  const name = fullName(r.first_name, r.last_name) || r.driver_email
  const price = r.total_price_tnd != null ? `${Number(r.total_price_tnd).toFixed(2)} TND TTC` : 'montant non renseigné'
  return {
    subject: `Nouvelle demande d'abonnement - ${name} (${periodLabel(r.billing_period)}, ${price})`,
    html: layout(
      'Nouvelle demande d’abonnement',
      `<p>Un chauffeur a demandé un abonnement :</p>
       <ul>
         <li>Chauffeur : <strong>${escapeHtml(name)}</strong></li>
         <li>Email : ${escapeHtml(r.driver_email)}</li>
         <li>Téléphone : ${escapeHtml(r.phone || 'non renseigné')}</li>
         <li>Formule : ${escapeHtml(periodLabel(r.billing_period))} - ${escapeHtml(price)}</li>
         <li>Référence attendue sur le virement : <strong>${escapeHtml(subscriptionReference(r.driver_id))}</strong></li>
       </ul>
       <p>À valider dans l'espace administrateur une fois le virement reçu.</p>`,
      { label: 'Ouvrir l’espace admin', url: `${siteUrl}/admin-dashboard` },
    ),
  }
}

// ─── Emails d'activation et de prolongation (envoyés après une action de l'administrateur) ──────────

export type ExtensionUnit = 'days' | 'months' | 'years'

export interface ActivationInfo {
  first_name: string | null
  last_name: string | null
  billing_period: string | null
  start_date: string | null
  end_date: string
  total_price_tnd: number | null
  payment_reference: string | null
}

export interface ExtensionInfo {
  amount: number
  unit: ExtensionUnit
  previous_end_date?: string | null
}

export function extensionLabel(amount: number, unit: ExtensionUnit): string {
  const labels: Record<ExtensionUnit, [string, string]> = {
    days: ['jour', 'jours'],
    months: ['mois', 'mois'],
    years: ['an', 'ans'],
  }
  const [singular, plural] = labels[unit]
  return `${amount} ${amount > 1 ? plural : singular}`
}

function detailRows(rows: [string, string | null][]): string {
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;">
    ${rows
      .filter(([, value]) => value)
      .map(
        ([label, value]) => `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;width:140px;">${escapeHtml(label)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#111827;">${value}</td>
        </tr>`,
      )
      .join('')}
  </table>`
}

export function buildActivatedEmail(i: ActivationInfo, siteUrl: string): BuiltMessage {
  const name = escapeHtml(fullName(i.first_name, i.last_name) || 'chauffeur')
  const price = i.total_price_tnd != null ? `${escapeHtml(Number(i.total_price_tnd).toFixed(2))} TND` : null
  return {
    subject: 'TuniDrive - Votre abonnement Premium est activé',
    html: layout(
      'Votre abonnement Premium est activé',
      `<p>Bonjour ${name},</p>
       <p>Votre paiement a été validé : votre abonnement Premium TuniDrive est <strong>activé</strong>. Vous pouvez à nouveau accepter des courses sans limite.</p>
       ${detailRows([
         ['Formule', `Premium ${escapeHtml(periodLabel(i.billing_period))}`],
         ['Début', i.start_date ? escapeHtml(formatDateFr(i.start_date)) : null],
         ['Fin', `<strong>${escapeHtml(formatDateFr(i.end_date))}</strong>`],
         ['Montant TTC', price],
         ['Référence', i.payment_reference ? `<span style="font-family:monospace;">${escapeHtml(i.payment_reference)}</span>` : null],
       ])}`,
      { label: 'Accéder à mon tableau de bord', url: `${siteUrl}/dashboard` },
    ),
  }
}

export function buildExtendedEmail(
  i: { first_name: string | null; last_name: string | null; end_date: string },
  extension: ExtensionInfo | null,
  siteUrl: string,
): BuiltMessage {
  const name = escapeHtml(fullName(i.first_name, i.last_name) || 'chauffeur')
  const label = extension ? escapeHtml(extensionLabel(extension.amount, extension.unit)) : null
  return {
    subject: 'TuniDrive - Votre abonnement Premium a été prolongé',
    html: layout(
      'Votre abonnement a été prolongé',
      `<p>Bonjour ${name},</p>
       <p>Votre abonnement Premium a été prolongé${label ? ` de <strong>${label}</strong>` : ''} par notre équipe.</p>
       ${detailRows([
         ['Ancienne fin', extension?.previous_end_date ? escapeHtml(formatDateFr(extension.previous_end_date)) : null],
         ['Nouvelle fin', `<strong>${escapeHtml(formatDateFr(i.end_date))}</strong>`],
       ])}`,
      { label: 'Voir mon abonnement', url: `${siteUrl}/dashboard` },
    ),
  }
}

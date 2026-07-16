import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'TuniDrive <noreply@tunidrive.net>'
const SUPPORT_EMAIL = 'support@tunidrive.net'

type SubscriptionEmailType = 'activated' | 'extended'

interface DriverInfo {
  email: string
  first_name: string
  last_name: string
}

interface SubscriptionInfo {
  billing_period?: 'monthly' | 'yearly'
  start_date?: string
  end_date: string
  total_price_tnd?: number
  payment_reference?: string
  extension?: {
    amount: number
    unit: 'days' | 'months' | 'years'
    previous_end_date?: string
  }
}

function formatDateFr(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getBillingPeriodLabel(period?: string): string {
  if (period === 'yearly') return 'Annuel'
  if (period === 'monthly') return 'Mensuel'
  return 'Premium'
}

function getExtensionLabel(amount: number, unit: string): string {
  const labels: Record<string, [string, string]> = {
    days: ['jour', 'jours'],
    months: ['mois', 'mois'],
    years: ['an', 'ans'],
  }
  const [singular, plural] = labels[unit] ?? ['', unit]
  return `${amount} ${amount > 1 ? plural : singular}`
}

function buildActivatedEmail(driver: DriverInfo, subscription: SubscriptionInfo): { subject: string; html: string } {
  const periodLabel = getBillingPeriodLabel(subscription.billing_period)
  const startDate = subscription.start_date ? formatDateFr(subscription.start_date) : null
  const endDate = formatDateFr(subscription.end_date)

  const subject = 'TuniDrive - Votre abonnement Premium est activé'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #2563eb; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">TuniDrive</h1>
        <p style="color: #dbeafe; margin: 10px 0 0 0;">Votre abonnement Premium est activé</p>
      </div>

      <div style="padding: 30px 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">Bonjour ${driver.first_name} ${driver.last_name},</h2>

        <div style="background-color: #eff6ff; border: 2px solid #2563eb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1d4ed8; margin-top: 0; margin-bottom: 15px;">✅ Paiement validé</h3>
          <p style="color: #1e3a8a; font-size: 16px; line-height: 1.6; margin: 0;">
            Votre abonnement Premium TuniDrive a été <strong>activé avec succès</strong>. Vous pouvez à nouveau accepter des courses sans limite.
          </p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e293b; margin-top: 0; margin-bottom: 15px;">Détails de votre abonnement</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569; width: 140px;">Formule :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">Premium ${periodLabel}</td>
            </tr>
            ${startDate ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Début :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${startDate}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Fin :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-weight: bold;">${endDate}</td>
            </tr>
            ${subscription.total_price_tnd != null ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Montant TTC :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${subscription.total_price_tnd.toFixed(2)} TND</td>
            </tr>
            ` : ''}
            ${subscription.payment_reference ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #475569;">Référence :</td>
              <td style="padding: 8px 0; color: #1e293b; font-family: monospace;">${subscription.payment_reference}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://tunidrive.net/driver-dashboard"
             style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Accéder à mon tableau de bord
          </a>
        </div>

        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #64748b; margin: 0; line-height: 1.6;">
            Une question ? Contactez-nous : <strong>${SUPPORT_EMAIL}</strong>
          </p>
        </div>
      </div>

      <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
        <p style="margin: 0;">TuniDrive - Votre transport sur mesure</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #ccc;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
      </div>
    </div>
  `

  return { subject, html }
}

function buildExtendedEmail(driver: DriverInfo, subscription: SubscriptionInfo): { subject: string; html: string } {
  const endDate = formatDateFr(subscription.end_date)
  const extension = subscription.extension
  const extensionLabel = extension
    ? getExtensionLabel(extension.amount, extension.unit)
    : 'prolongation'
  const previousEnd = extension?.previous_end_date
    ? formatDateFr(extension.previous_end_date)
    : null

  const subject = 'TuniDrive - Votre abonnement Premium a été prolongé'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4f46e5; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">TuniDrive</h1>
        <p style="color: #e0e7ff; margin: 10px 0 0 0;">Votre abonnement Premium a été prolongé</p>
      </div>

      <div style="padding: 30px 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">Bonjour ${driver.first_name} ${driver.last_name},</h2>

        <div style="background-color: #eef2ff; border: 2px solid #4f46e5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #3730a3; margin-top: 0; margin-bottom: 15px;">📅 Prolongation confirmée</h3>
          <p style="color: #312e81; font-size: 16px; line-height: 1.6; margin: 0;">
            Votre abonnement Premium a été prolongé de <strong>${extensionLabel}</strong> par notre équipe.
          </p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e293b; margin-top: 0; margin-bottom: 15px;">Nouvelle période</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${previousEnd ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569; width: 140px;">Ancienne fin :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">${previousEnd}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #475569;">Nouvelle fin :</td>
              <td style="padding: 8px 0; color: #4f46e5; font-weight: bold;">${endDate}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://tunidrive.net/driver-dashboard"
             style="background-color: #4f46e5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Voir mon abonnement
          </a>
        </div>

        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #64748b; margin: 0; line-height: 1.6;">
            Une question ? Contactez-nous : <strong>${SUPPORT_EMAIL}</strong>
          </p>
        </div>
      </div>

      <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
        <p style="margin: 0;">TuniDrive - Votre transport sur mesure</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #ccc;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
      </div>
    </div>
  `

  return { subject, html }
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    throw new Error('Configuration email manquante: RESEND_API_KEY')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Erreur Resend ${response.status}: ${errorText}`)
  }

  return response.json()
}

serve(async (req) => {
  console.log('🚀 Edge Function send-driver-subscription-email démarrée')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, driver, subscription } = await req.json() as {
      type: SubscriptionEmailType
      driver: DriverInfo
      subscription: SubscriptionInfo
    }

    if (!type || !['activated', 'extended'].includes(type)) {
      throw new Error('Type invalide: type doit être "activated" ou "extended"')
    }

    if (!driver?.email || !driver?.first_name || !driver?.last_name) {
      throw new Error('Informations chauffeur incomplètes')
    }

    if (!subscription?.end_date) {
      throw new Error('Date de fin d\'abonnement manquante')
    }

    const { subject, html } = type === 'activated'
      ? buildActivatedEmail(driver, subscription)
      : buildExtendedEmail(driver, subscription)

    console.log(`📤 Envoi email abonnement (${type}) à:`, driver.email)
    const result = await sendEmail(driver.email, subject, html)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email abonnement envoyé avec succès',
        type,
        driverEmail: driver.email,
        emailId: result.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('💥 Erreur dans send-driver-subscription-email:', error)
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})

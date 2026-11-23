import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { throttle, adminClient, jsonResponse } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration Resend
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'TuniDrive <team@tunidrive.net>' // Utilisez votre domaine vérifié

async function sendPasswordResetEmail(to: string, firstName: string, lastName: string, userType: string) {
  console.log('🔧 Configuration email reset:')
  console.log('- RESEND_API_KEY présente:', !!RESEND_API_KEY)
  console.log('- FROM_EMAIL:', FROM_EMAIL)
  console.log('- TO:', to)
  console.log('- User Type:', userType)

  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY non configurée')
    throw new Error('Configuration email manquante: RESEND_API_KEY')
  }

  const userTypeLabel = userType === 'client' ? 'client' : 'chauffeur';
  const dashboardUrl = userType === 'client' ? 'client-dashboard' : 'dashboard';

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #7c3aed; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">TuniDrive</h1>
        <p style="color: #e9d5ff; margin: 10px 0 0 0;">Réinitialisation de mot de passe</p>
      </div>
      
      <div style="padding: 30px 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">Bonjour ${firstName} ${lastName},</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #555; margin-bottom: 20px;">
          Vous avez demandé la réinitialisation de votre mot de passe pour votre compte ${userTypeLabel} TuniDrive.
        </p>
        
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #92400e; margin-top: 0; margin-bottom: 10px;">Instructions importantes :</h3>
          <ul style="color: #92400e; margin: 0; padding-left: 20px;">
            <li>Vous avez reçu un email de Supabase avec un lien de réinitialisation</li>
            <li>Cliquez sur ce lien pour accéder au formulaire de nouveau mot de passe</li>
            <li>Le lien est valide pendant 1 heure seulement</li>
            <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
          </ul>
        </div>
        
        <div style="background-color: #e0f2fe; border: 1px solid #0288d1; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #01579b; margin-top: 0; margin-bottom: 10px;">Conseils de sécurité :</h3>
          <ul style="color: #01579b; margin: 0; padding-left: 20px;">
            <li>Choisissez un mot de passe fort (8+ caractères)</li>
            <li>Incluez majuscules, minuscules, chiffres et caractères spéciaux</li>
            <li>N'utilisez pas le même mot de passe que sur d'autres sites</li>
          </ul>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Si vous rencontrez des difficultés, contactez notre support à contact@tunidrive.net
        </p>
      </div>
      
      <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
        <p style="margin: 0;">TuniDrive - Votre transport sur mesure</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #ccc;">
          Cet email a été envoyé automatiquement, merci de ne pas y répondre.
        </p>
      </div>
    </div>
  `

  try {
    console.log('📤 Envoi email reset via Resend...')
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: `TuniDrive - Réinitialisation de votre mot de passe ${userTypeLabel}`,
        html: emailContent,
      }),
    })

    console.log('📡 Réponse Resend status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Erreur Resend:', {
        status: response.status,
        error: errorText
      })
      throw new Error(`Erreur Resend ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ Email reset envoyé avec succès:', result.id)
    return result
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email reset:', error)
    throw error
  }
}

serve(async (req) => {
  console.log('🚀 Edge Function send-password-reset démarrée')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, firstName, lastName, userType } = await req.json()

    if (!email || !firstName || !lastName || !userType) {
      throw new Error('Données manquantes: email, firstName, lastName ou userType')
    }

    // Appel possible sans connexion : on limite la fréquence, on n'écrit qu'à un compte existant
    // et les noms viennent de la base (jamais de l'appelant). Réponse identique si le compte n'existe pas.
    const __email = String(email).trim().toLowerCase()
    if (!(await throttle(`pwreset:${__email}`, 60))) {
      return jsonResponse(corsHeaders, 429, { success: false, error: 'too_many_requests' })
    }
    const __table = userType === 'driver' ? 'drivers' : 'clients'
    const { data: __acct } = await adminClient()
      .from(__table).select('email, first_name, last_name').ilike('email', __email).maybeSingle()
    if (__acct) {
      await sendPasswordResetEmail(__acct.email, __acct.first_name, __acct.last_name, userType)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email de réinitialisation envoyé avec succès'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('💥 Erreur dans send-password-reset:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
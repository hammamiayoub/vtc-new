import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration Resend
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'TuniRide <team@tuniride.net>' // Utilisez votre domaine vérifié

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
    <!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Réinitialisez votre mot de passe — MyRide</title>
  <style>
    .preheader { display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all; }
    @media (max-width: 600px) {
      .container { width:100% !important; }
      .px { padding-left:16px !important; padding-right:16px !important; }
      .btn { width:100% !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#f6f9fc;">
  <span class="preheader">Réinitialisez votre mot de passe MyRide en un clic.</span>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f9fc;">
    <tr>
      <td align="center" style="padding:24px;">
        <!-- Carte -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width:600px; width:600px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(16,24,40,0.08);">
          <!-- En-tête -->
          <tr>
            <td align="center" style="background:#000000; padding:24px;">
              <div style="font-family:Segoe UI, Roboto, Arial, sans-serif; font-size:20px; font-weight:700; color:#ffffff; letter-spacing:.3px;">
                MyRide
              </div>
            </td>
          </tr>

          <!-- Contenu -->
          <tr>
            <td class="px" style="padding:32px 32px 8px 32px; font-family:Segoe UI, Roboto, Arial, sans-serif; color:#0f172a;">
              <h2 style="margin:0 0 12px 0; font-size:24px; line-height:1.25; font-weight:700; color:#0f172a;">
                Réinitialiser votre mot de passe
              </h2>
              <p style="margin:0 0 16px 0; font-size:16px; line-height:1.6; color:#334155;">
                Vous avez demandé à réinitialiser le mot de passe de votre compte <strong>MyRide</strong>.
                Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
              </p>
              <p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#64748b;">
                Pour des raisons de sécurité, ce lien n’est valable que pendant une durée limitée.
              </p>
            </td>
          </tr>

          <!-- Bouton -->
          <tr>
            <td align="center" style="padding:8px 32px 24px 32px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{ .ConfirmationURL }}" style="height:48px;v-text-anchor:middle;width:320px;" arcsize="10%" stroke="f" fillcolor="#000000">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:Segoe UI, Arial, sans-serif;font-size:16px;font-weight:bold;">
                  Réinitialiser mon mot de passe
                </center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="{{ .ConfirmationURL }}" class="btn"
                 style="display:inline-block; text-decoration:none; background:#000000; color:#ffffff; font-family:Segoe UI, Roboto, Arial, sans-serif; font-size:16px; font-weight:700; line-height:48px; height:48px; padding:0 24px; border-radius:8px; text-align:center; min-width:240px;">
                 Réinitialiser mon mot de passe
              </a>
              <!--<![endif]-->
            </td>
          </tr>

          <!-- Lien de secours -->
          <tr>
            <td class="px" style="padding:0 32px 24px 32px; font-family:Segoe UI, Roboto, Arial, sans-serif;">
              <p style="margin:0; font-size:14px; line-height:1.6; color:#64748b;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur&nbsp;:
              </p>
              <p style="margin:8px 0 0 0; font-size:13px; line-height:1.5; color:#000000; word-break:break-all;">
                <a href="{{ .ConfirmationURL }}" style="color:#000000; text-decoration:underline;">{{ .ConfirmationURL }}</a>
              </p>
            </td>
          </tr>

          <!-- Aide / Sécurité -->
          <tr>
            <td class="px" style="padding:0 32px 32px 32px; font-family:Segoe UI, Roboto, Arial, sans-serif;">
              <p style="margin:0 0 8px 0; font-size:13px; line-height:1.6; color:#64748b;">
                Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet email.
                Pour toute question, écrivez-nous à
                <a href="mailto:support@myride.net" style="color:#000000; text-decoration:underline;">support@myride.net</a>.
              </p>
              <p style="margin:0; font-size:12px; line-height:1.6; color:#94a3b8;">
                Après avoir défini un nouveau mot de passe, vos anciennes sessions peuvent être déconnectées.
              </p>
            </td>
          </tr>

          <!-- Pied de page -->
          <tr>
            <td align="center" style="background:#f1f5f9; padding:16px 24px; font-family:Segoe UI, Roboto, Arial, sans-serif;">
              <p style="margin:0; font-size:12px; color:#94a3b8;">
                © <span style="white-space:nowrap;">2025</span> MyRide. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
        <!-- /Carte -->
      </td>
    </tr>
  </table>
</body>
</html>

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
        subject: `TuniRide - Réinitialisation de votre mot de passe ${userTypeLabel}`,
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

    await sendPasswordResetEmail(email, firstName, lastName, userType)

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
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'TuniDrive <noreply@tunidrive.net>'
const SUPPORT_EMAIL = 'support@tunidrive.net'

async function sendSignupNotificationEmail(userData: any, userType: string) {
  const userTypeLabel = userType === 'client' ? 'Client' : 'Chauffeur'
  const userTypeLabelLower = userType === 'client' ? 'client' : 'chauffeur'
  
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #7c3aed; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">TuniDrive</h1>
        <p style="color: #e9d5ff; margin: 10px 0 0 0;">Nouvelle inscription ${userTypeLabelLower}</p>
      </div>
      
      <div style="padding: 30px 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">Nouvelle inscription ${userTypeLabel}</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Un nouveau ${userTypeLabelLower} s'est inscrit sur la plateforme TuniDrive.
        </p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e293b; margin-top: 0; margin-bottom: 15px;">Informations du compte :</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569; width: 120px;">Nom complet :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${userData.first_name} ${userData.last_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Email :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${userData.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Téléphone :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${userData.phone || 'Non renseigné'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Ville :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${userData.city || 'Non renseignée'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Date d'inscription :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${new Date(userData.created_at).toLocaleString('fr-FR')}</td>
            </tr>
            ${userType === 'driver' ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Statut :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${userData.status || 'pending'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Véhicule :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${userData.vehicle_make || 'Non renseigné'} ${userData.vehicle_model || ''}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <div style="background-color: #e0f2fe; border: 1px solid #0288d1; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #01579b; margin-top: 0; margin-bottom: 10px;">Actions recommandées :</h3>
          <ul style="color: #01579b; margin: 0; padding-left: 20px;">
            <li>Vérifier les informations du compte</li>
            <li>${userType === 'driver' ? 'Valider les documents du chauffeur' : 'Activer le compte client'}</li>
            <li>Envoyer un email de bienvenue si nécessaire</li>
          </ul>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Cette notification a été envoyée automatiquement lors de l'inscription.
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
    console.log('📤 Envoi notification inscription via Resend...')
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [SUPPORT_EMAIL],
        subject: `TuniDrive - Nouvelle inscription ${userTypeLabel}: ${userData.first_name} ${userData.last_name}`,
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
    console.log('✅ Notification inscription envoyée avec succès:', result.id)
    return result
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification:', error)
    throw error
  }
}

serve(async (req) => {
  console.log('🚀 Edge Function send-signup-notification démarrée')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userData, userType } = await req.json()

    if (!userData || !userType) {
      throw new Error('Données manquantes: userData ou userType')
    }

    await sendSignupNotificationEmail(userData, userType)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification d\'inscription envoyée avec succès'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('💥 Erreur dans send-signup-notification:', error)
    
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

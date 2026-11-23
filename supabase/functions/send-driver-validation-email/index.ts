import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireAdmin } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'TuniDrive <noreply@tunidrive.net>'
const SUPPORT_EMAIL = 'support@tunidrive.net'

async function sendDriverValidationEmail(driverData: any) {
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #10b981; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">TuniDrive</h1>
        <p style="color: #d1fae5; margin: 10px 0 0 0;">Félicitations ! Votre compte chauffeur a été validé</p>
      </div>
      
      <div style="padding: 30px 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">Bonjour ${driverData.first_name} ${driverData.last_name},</h2>
        
        <div style="background-color: #ecfdf5; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #047857; margin-top: 0; margin-bottom: 15px;">🎉 Excellente nouvelle !</h3>
          <p style="color: #065f46; font-size: 16px; line-height: 1.6; margin: 0;">
            Votre inscription en tant que chauffeur TuniDrive a été <strong>validée avec succès</strong> par notre équipe d'administration.
          </p>
        </div>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e293b; margin-top: 0; margin-bottom: 15px;">Informations de votre compte :</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569; width: 120px;">Nom complet :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${driverData.first_name} ${driverData.last_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Email :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${driverData.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Téléphone :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${driverData.phone || 'Non renseigné'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Ville :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${driverData.city || 'Non renseignée'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Statut :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #10b981; font-weight: bold;">✅ Validé</td>
            </tr>
            ${driverData.vehicle_make ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Véhicule :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${driverData.vehicle_make} ${driverData.vehicle_model || ''}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <div style="background-color: #e0f2fe; border: 1px solid #0288d1; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #01579b; margin-top: 0; margin-bottom: 15px;">🚗 Prochaines étapes :</h3>
          <ul style="color: #01579b; margin: 0; padding-left: 20px; line-height: 1.6;">
            <li>Connectez-vous à votre <strong>tableau de bord chauffeur</strong></li>
            <li>Configurez votre <strong>disponibilité</strong> et vos zones de service</li>
            <li>Activez votre statut <strong>"En ligne"</strong> pour recevoir des réservations</li>
            <li>Consultez les <strong>réservations disponibles</strong> dans votre zone</li>
          </ul>
        </div>
        
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #92400e; margin-top: 0; margin-bottom: 10px;">💡 Conseils pour bien démarrer :</h3>
          <ul style="color: #92400e; margin: 0; padding-left: 20px; line-height: 1.6;">
            <li>Assurez-vous que votre véhicule est propre et en bon état</li>
            <li>Gardez votre téléphone chargé et à portée de main</li>
            <li>Respectez toujours les horaires convenus avec les clients</li>
            <li>Communiquez poliment et professionnellement</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://tunidrive.net/driver-dashboard" 
             style="background-color: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Accéder à mon tableau de bord
          </a>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #334155; margin-top: 0; margin-bottom: 10px;">📞 Besoin d'aide ?</h3>
          <p style="color: #64748b; margin: 0; line-height: 1.6;">
            Notre équipe support est là pour vous accompagner. N'hésitez pas à nous contacter :
            <br><strong>Email :</strong> ${SUPPORT_EMAIL}
            <br><strong>Heures d'ouverture :</strong> 8h00 - 18h00 (Lun-Ven)
          </p>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px; text-align: center;">
          Bienvenue dans l'équipe TuniDrive ! Nous sommes ravis de vous compter parmi nos chauffeurs partenaires.
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
    console.log('📤 Envoi email de validation chauffeur via Resend...')
    console.log('👤 Destinataire:', driverData.email)
    console.log('📧 Nom:', driverData.first_name, driverData.last_name)
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [driverData.email],
        subject: `TuniDrive - Félicitations ! Votre compte chauffeur a été validé`,
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
    console.log('✅ Email de validation chauffeur envoyé avec succès:', result.id)
    return result
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de validation:', error)
    throw error
  }
}

serve(async (req) => {
  console.log('🚀 Edge Function send-driver-validation-email démarrée')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Réservé aux administrateurs (la clé anon, publique, ne suffit pas)
  const __admin = await requireAdmin(req, corsHeaders)
  if (__admin instanceof Response) return __admin

  try {
    const { driverData } = await req.json()

    if (!driverData) {
      throw new Error('Données manquantes: driverData')
    }

    if (!driverData.email) {
      throw new Error('Adresse email du chauffeur manquante')
    }

    if (!driverData.first_name || !driverData.last_name) {
      throw new Error('Nom complet du chauffeur manquant')
    }

    console.log('📋 Validation des données chauffeur:', {
      email: driverData.email,
      nom: `${driverData.first_name} ${driverData.last_name}`,
      ville: driverData.city,
      statut: driverData.status
    })

    await sendDriverValidationEmail(driverData)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email de validation chauffeur envoyé avec succès',
        driverEmail: driverData.email
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('💥 Erreur dans send-driver-validation-email:', error)
    
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

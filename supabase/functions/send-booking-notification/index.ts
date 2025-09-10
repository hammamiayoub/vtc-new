import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration Resend
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'TuniRide <noreply@tuniride.net>' // Remplacez par votre domaine vérifié

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY non configurée')
    throw new Error('Configuration email manquante')
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
      subject: subject,
      html: html,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Erreur Resend:', response.status, errorText)
    throw new Error(`Erreur envoi email: ${response.status}`)
  }

  const result = await response.json()
  console.log('✅ Email envoyé via Resend:', result.id)
  return result
}
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { bookingData, clientData, driverData } = await req.json()

    // Format the scheduled time
    const scheduledDate = new Date(bookingData.scheduled_time)
    const formattedDate = scheduledDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Email content for client
    const clientEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">TuniRide - Confirmation de réservation</h1>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #333;">Bonjour ${clientData.first_name} ${clientData.last_name},</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Votre réservation a été confirmée avec succès !
          </p>
          
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2d5a2d; margin-top: 0;">Détails de votre course</h3>
            <p><strong>Départ :</strong> ${bookingData.pickup_address}</p>
            <p><strong>Arrivée :</strong> ${bookingData.destination_address}</p>
            <p><strong>Date et heure :</strong> ${formattedDate}</p>
            <p><strong>Distance :</strong> ${bookingData.distance_km} km</p>
            <p><strong>Prix :</strong> ${bookingData.price_tnd} TND</p>
            ${bookingData.notes ? `<p><strong>Notes :</strong> ${bookingData.notes}</p>` : ''}
          </div>
          
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1565c0; margin-top: 0;">Votre chauffeur</h3>
            <p><strong>Nom :</strong> ${driverData.first_name} ${driverData.last_name}</p>
            ${driverData.phone ? `<p><strong>Téléphone :</strong> ${driverData.phone}</p>` : ''}
            ${driverData.vehicle_info ? `
              <p><strong>Véhicule :</strong> ${driverData.vehicle_info.make} ${driverData.vehicle_info.model} (${driverData.vehicle_info.color})</p>
              <p><strong>Plaque :</strong> ${driverData.vehicle_info.licensePlate}</p>
            ` : ''}
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>Important :</strong> Soyez prêt 5 minutes avant l'heure prévue. 
              Votre chauffeur vous contactera si nécessaire.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Merci de faire confiance à TuniRide pour vos déplacements !
          </p>
        </div>
        
        <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0;">TuniRide - Votre transport sur mesure</p>
        </div>
      </div>
    `

    // Email content for driver
    const driverEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">TuniRide - Nouvelle réservation</h1>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #333;">Bonjour ${driverData.first_name} ${driverData.last_name},</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Vous avez reçu une nouvelle réservation !
          </p>
          
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2d5a2d; margin-top: 0;">Détails de la course</h3>
            <p><strong>Départ :</strong> ${bookingData.pickup_address}</p>
            <p><strong>Arrivée :</strong> ${bookingData.destination_address}</p>
            <p><strong>Date et heure :</strong> ${formattedDate}</p>
            <p><strong>Distance :</strong> ${bookingData.distance_km} km</p>
            <p><strong>Prix :</strong> ${bookingData.price_tnd} TND</p>
            ${bookingData.notes ? `<p><strong>Notes du client :</strong> ${bookingData.notes}</p>` : ''}
          </div>
          
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1565c0; margin-top: 0;">Informations client</h3>
            <p><strong>Nom :</strong> ${clientData.first_name} ${clientData.last_name}</p>
            ${clientData.phone ? `<p><strong>Téléphone :</strong> ${clientData.phone}</p>` : ''}
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>Action requise :</strong> Connectez-vous à votre tableau de bord pour 
              accepter ou refuser cette réservation.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Merci de faire partie de l'équipe TuniRide !
          </p>
        </div>
        
        <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0;">TuniRide - Plateforme chauffeurs</p>
        </div>
      </div>
    `

    // Envoi des emails via Resend
    try {
      console.log('📧 Envoi email client à:', clientData.email)
      await sendEmail(
        clientData.email,
        'TuniRide - Confirmation de votre réservation',
        clientEmailContent
      )

      console.log('📧 Envoi email chauffeur à:', driverData.email)
      await sendEmail(
        driverData.email,
        'TuniRide - Nouvelle réservation reçue',
        driverEmailContent
      )

      console.log('✅ Tous les emails ont été envoyés avec succès')
    } catch (emailError) {
      console.error('❌ Erreur lors de l\'envoi des emails:', emailError)
      // Ne pas faire échouer la fonction si les emails échouent
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erreur envoi emails: ' + emailError.message 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notifications envoyées avec succès' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Erreur lors de l\'envoi des notifications:', error)
    
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
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Configuration Resend
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'TuniDrive <noreply@tunidrive.net>'

async function sendEmail(to: string, subject: string, html: string) {
  console.log('🔧 Configuration email:')
  console.log('- RESEND_API_KEY présente:', !!RESEND_API_KEY)
  console.log('- FROM_EMAIL:', FROM_EMAIL)
  console.log('- TO:', to)
  console.log('- SUBJECT:', subject)

  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY non configurée')
    throw new Error('Configuration email manquante: RESEND_API_KEY')
  }

  try {
    console.log('📤 Envoi email via Resend...')
    
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

    console.log('📡 Réponse Resend status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Erreur Resend:', errorText)
      throw new Error(`Erreur Resend ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ Email envoyé avec succès:', result.id)
    return result
    
  } catch (fetchError) {
    console.error('❌ Erreur lors de l\'appel à l\'API Resend:', fetchError)
    throw fetchError
  }
}

serve(async (req) => {
  console.log('🚀 Edge Function send-booking-status-notification démarrée')
  console.log('📥 Méthode:', req.method)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Réponse CORS OPTIONS')
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200
    })
  }

  try {
    console.log('📋 Lecture des données de la requête...')
    const requestData = await req.json()
    console.log('📊 Données reçues:', {
      hasBookingData: !!requestData.bookingData,
      hasClientData: !!requestData.clientData,
      hasDriverData: !!requestData.driverData,
      status: requestData.status
    })

    const { bookingData, clientData, driverData, status } = requestData

    if (!bookingData || !clientData || !driverData || !status) {
      throw new Error('Données manquantes: bookingData, clientData, driverData ou status')
    }

    if (!clientData.email) {
      throw new Error('Adresse email manquante pour le client')
    }

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

    let emailContent = ''
    let emailSubject = ''

    if (status === 'accepted') {
      // Email pour réservation acceptée
      emailSubject = '✅ TuniDrive - Réservation acceptée par le chauffeur'
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10b981; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">✅ Réservation acceptée !</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #333;">Bonjour ${clientData.first_name} ${clientData.last_name},</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #555;">
              Bonne nouvelle ! Votre chauffeur a <strong style="color: #10b981;">accepté votre réservation</strong> !
            </p>
            
            <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="color: #065f46; margin-top: 0;">📍 Détails de votre course</h3>
              <p style="margin: 8px 0;"><strong>Départ :</strong> ${bookingData.pickup_address}</p>
              <p style="margin: 8px 0;"><strong>Arrivée :</strong> ${bookingData.destination_address}</p>
              <p style="margin: 8px 0;"><strong>Date et heure :</strong> ${formattedDate}</p>
              <p style="margin: 8px 0;"><strong>Distance :</strong> ${bookingData.distance_km} km</p>
              <p style="margin: 8px 0;"><strong>Prix :</strong> ${bookingData.price_tnd} TND</p>
              ${bookingData.notes ? `<p style="margin: 8px 0;"><strong>Notes :</strong> ${bookingData.notes}</p>` : ''}
            </div>
            
            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1565c0; margin-top: 0;">👨‍✈️ Votre chauffeur</h3>
              <p style="margin: 8px 0;"><strong>Nom :</strong> ${driverData.first_name} ${driverData.last_name}</p>
              ${driverData.phone ? `<p style="margin: 8px 0;"><strong>Téléphone :</strong> ${driverData.phone}</p>` : ''}
              ${driverData.vehicle_info ? `
                <p style="margin: 8px 0;"><strong>Véhicule :</strong> ${driverData.vehicle_info.make} ${driverData.vehicle_info.model} (${driverData.vehicle_info.color})</p>
                <p style="margin: 8px 0;"><strong>Plaque :</strong> ${driverData.vehicle_info.licensePlate}</p>
              ` : ''}
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>⏰ Important :</strong> Soyez prêt 5 minutes avant l'heure prévue. 
                Votre chauffeur vous contactera directement si nécessaire.
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Merci de faire confiance à TuniDrive pour vos déplacements !
            </p>
          </div>
          
          <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
            <p style="margin: 0;">TuniDrive - Votre transport sur mesure</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #ccc;">
              Pour toute question : support@tunidrive.net
            </p>
          </div>
        </div>
      `
    } else if (status === 'cancelled') {
      // Email pour réservation annulée
      emailSubject = '❌ TuniDrive - Réservation annulée par le chauffeur'
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ef4444; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">❌ Réservation annulée</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #333;">Bonjour ${clientData.first_name} ${clientData.last_name},</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #555;">
              Nous sommes désolés de vous informer que votre chauffeur a dû <strong style="color: #ef4444;">annuler votre réservation</strong>.
            </p>
            
            <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <h3 style="color: #991b1b; margin-top: 0;">📍 Détails de la réservation annulée</h3>
              <p style="margin: 8px 0;"><strong>Départ :</strong> ${bookingData.pickup_address}</p>
              <p style="margin: 8px 0;"><strong>Arrivée :</strong> ${bookingData.destination_address}</p>
              <p style="margin: 8px 0;"><strong>Date et heure :</strong> ${formattedDate}</p>
              <p style="margin: 8px 0;"><strong>Distance :</strong> ${bookingData.distance_km} km</p>
              <p style="margin: 8px 0;"><strong>Prix :</strong> ${bookingData.price_tnd} TND</p>
            </div>
            
            <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">🔄 Que faire maintenant ?</h3>
              <p style="margin: 8px 0;">Vous pouvez :</p>
              <ul style="color: #1e40af; margin: 10px 0; padding-left: 20px;">
                <li style="margin: 8px 0;">Rechercher un autre chauffeur disponible pour le même trajet</li>
                <li style="margin: 8px 0;">Modifier votre date et heure de départ</li>
                <li style="margin: 8px 0;">Nous contacter si vous avez besoin d'aide</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${bookingData.booking_url || 'https://tunidrive.net'}" style="display: inline-block; padding: 15px 30px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Rechercher un autre chauffeur
              </a>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                <strong>💬 Besoin d'aide ?</strong><br>
                Notre équipe support est à votre disposition :<br>
                📧 Email : support@tunidrive.net<br>
                📱 WhatsApp : +216 28 528 477
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Nous nous excusons pour ce désagrément et restons à votre disposition.
            </p>
          </div>
          
          <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
            <p style="margin: 0;">TuniDrive - Votre transport sur mesure</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #ccc;">
              Pour toute question : support@tunidrive.net
            </p>
          </div>
        </div>
      `
    } else {
      throw new Error(`Status non supporté: ${status}`)
    }

    // Envoi de l'email
    try {
      console.log('📧 Envoi email client à:', clientData.email)
      const result = await sendEmail(
        clientData.email,
        emailSubject,
        emailContent
      )
      
      console.log('✅ Email envoyé avec succès')
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email envoyé avec succès',
          emailId: result.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )

    } catch (emailError) {
      console.error('❌ Erreur email:', emailError)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erreur lors de l\'envoi de l\'email',
          details: emailError.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

  } catch (error) {
    console.error('💥 Erreur générale:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})


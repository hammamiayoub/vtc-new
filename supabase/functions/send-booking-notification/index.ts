import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
          <h1 style="color: #333; margin: 0;">MyRide - Confirmation de réservation</h1>
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
            Merci de faire confiance à MyRide pour vos déplacements !
          </p>
        </div>
        
        <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0;">MyRide - Votre transport sur mesure</p>
        </div>
      </div>
    `

    // Email content for driver
    const driverEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">MyRide - Nouvelle réservation</h1>
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
            Merci de faire partie de l'équipe MyRide !
          </p>
        </div>
        
        <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0;">MyRide - Plateforme chauffeurs</p>
        </div>
      </div>
    `

    // In a real implementation, you would use a service like Resend, SendGrid, or similar
    // For now, we'll just log the emails that would be sent
    console.log('Email to client:', {
      to: clientData.email,
      subject: 'MyRide - Confirmation de votre réservation',
      html: clientEmailContent
    })

    console.log('Email to driver:', {
      to: driverData.email,
      subject: 'MyRide - Nouvelle réservation reçue',
      html: driverEmailContent
    })

    // Here you would integrate with your email service
    // Example with a hypothetical email service:
    /*
    await sendEmail({
      to: clientData.email,
      subject: 'MyRide - Confirmation de votre réservation',
      html: clientEmailContent
    })

    await sendEmail({
      to: driverData.email,
      subject: 'MyRide - Nouvelle réservation reçue',
      html: driverEmailContent
    })
    */

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
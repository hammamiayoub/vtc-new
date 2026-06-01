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

    const { bookingData, clientData, driverData, status, cancelledBy } = requestData

    console.log('📊 Données reçues détaillées:');
    console.log('- status:', status);
    console.log('- cancelledBy:', cancelledBy);
    console.log('- clientEmail:', clientData?.email);
    console.log('- driverEmail:', driverData?.email);

    if (!bookingData || !clientData || !driverData || !status) {
      throw new Error('Données manquantes: bookingData, clientData, driverData ou status')
    }

    if (!clientData.email) {
      throw new Error('Adresse email manquante pour le client')
    }
    
    if (!driverData.email && status === 'cancelled') {
      console.warn('⚠️ Email chauffeur manquant pour l\'annulation');
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
      // Email pour réservation annulée - adapter le message selon qui a annulé
      console.log('📧 === EMAIL ANNULATION CLIENT ===');
      console.log('cancelledBy reçu:', cancelledBy);
      console.log('Type de cancelledBy:', typeof cancelledBy);
      
      const cancelledByDriver = cancelledBy === 'driver';
      const cancelledByAdmin = cancelledBy === 'admin';
      console.log('cancelledByDriver calculé:', cancelledByDriver);
      console.log('cancelledByAdmin calculé:', cancelledByAdmin);
      
      emailSubject = cancelledByDriver 
        ? '❌ TuniDrive - Réservation annulée par le chauffeur'
        : cancelledByAdmin
          ? '❌ TuniDrive - Réservation annulée par TuniDrive'
          : '❌ TuniDrive - Réservation annulée';
      
      console.log('Email subject choisi:', emailSubject);
      
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ef4444; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">❌ Réservation annulée</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #333;">Bonjour ${clientData.first_name} ${clientData.last_name},</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #555;">
              ${cancelledByDriver 
                ? 'Nous sommes désolés de vous informer que votre chauffeur a dû <strong style="color: #ef4444;">annuler votre réservation</strong>.'
                : cancelledByAdmin
                  ? 'Nous sommes désolés de vous informer que votre réservation a été <strong style="color: #ef4444;">annulée par notre équipe TuniDrive</strong>.'
                  : 'Votre réservation a été <strong style="color: #ef4444;">annulée avec succès</strong>.'
              }
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
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>ℹ️ À noter :</strong> Les annulations ne sont autorisées que jusqu'à 24h avant le départ. Au-delà, veuillez contacter directement votre chauffeur ou le support.
              </p>
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

    // Envoi des emails
    const emailResults: Array<{type: string, success: boolean, id?: string, error?: string}> = [];
    
    // Email au client
    try {
      console.log('📧 Envoi email client à:', clientData.email)
      const clientResult = await sendEmail(
        clientData.email,
        emailSubject,
        emailContent
      )
      console.log('✅ Email client envoyé avec succès:', clientResult.id)
      emailResults.push({ type: 'client', success: true, id: clientResult.id })
    } catch (emailError) {
      console.error('❌ Erreur email client:', emailError)
      emailResults.push({ type: 'client', success: false, error: emailError.message })
    }

    // Email au chauffeur (pour les annulations uniquement)
    console.log('🔍 === VÉRIFICATION ENVOI EMAIL CHAUFFEUR ===');
    console.log('- status:', status);
    console.log('- driverData complet:', driverData);
    console.log('- driverData.email:', driverData.email);
    console.log('- Type de driverData.email:', typeof driverData.email);
    console.log('- driverData.email trimmed:', driverData.email ? driverData.email.trim() : 'N/A');
    console.log('- Longueur email:', driverData.email ? driverData.email.length : 0);
    console.log('- Condition status === "cancelled":', status === 'cancelled');
    console.log('- Condition driverData.email existe:', !!driverData.email);
    console.log('- Condition driverData.email non vide:', driverData.email && driverData.email.trim() !== '');
    
    if (status === 'cancelled' && driverData.email && driverData.email.trim() !== '') {
      try {
        console.log('📧 Envoi email chauffeur à:', driverData.email)
        
        const cancelledByDriver = cancelledBy === 'driver';
        const cancelledByAdmin = cancelledBy === 'admin';
        const driverEmailSubject = cancelledByDriver
          ? '❌ TuniDrive - Vous avez annulé une course'
          : cancelledByAdmin
            ? '❌ TuniDrive - Course annulée par TuniDrive'
            : '❌ TuniDrive - Course annulée par le client';
        
        const driverEmailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #ef4444; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">❌ Course annulée</h1>
            </div>
            
            <div style="padding: 30px 20px;">
              <h2 style="color: #333;">Bonjour ${driverData.first_name} ${driverData.last_name},</h2>
              
              <p style="font-size: 16px; line-height: 1.6; color: #555;">
                ${cancelledByDriver 
                  ? 'Vous avez annulé la course suivante :'
                  : cancelledByAdmin
                    ? 'La course suivante a été <strong style="color: #ef4444;">annulée par l\'équipe TuniDrive</strong> :'
                    : `Le client <strong>${clientData.first_name} ${clientData.last_name}</strong> a annulé sa réservation.`
                }
              </p>
              
              <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <h3 style="color: #991b1b; margin-top: 0;">📍 Détails de la course annulée</h3>
                <p style="margin: 8px 0;"><strong>Client :</strong> ${clientData.first_name} ${clientData.last_name}</p>
                <p style="margin: 8px 0;"><strong>Départ :</strong> ${bookingData.pickup_address}</p>
                <p style="margin: 8px 0;"><strong>Arrivée :</strong> ${bookingData.destination_address}</p>
                <p style="margin: 8px 0;"><strong>Date et heure :</strong> ${formattedDate}</p>
                <p style="margin: 8px 0;"><strong>Distance :</strong> ${bookingData.distance_km} km</p>
                <p style="margin: 8px 0;"><strong>Prix :</strong> ${bookingData.price_tnd} TND</p>
              </div>
              
              ${cancelledByDriver ? `
                <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #92400e;">
                    <strong>⚠️ Important :</strong> L'annulation fréquente de courses peut affecter votre réputation et votre classement. Veuillez éviter les annulations sauf en cas de force majeure.
                  </p>
                </div>
                <div style="background-color: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #075985; font-size: 14px;">
                    <strong>ℹ️ Rappel :</strong> Les annulations ne sont autorisées que jusqu'à 24h avant le départ. Au-delà de ce délai, veuillez contacter directement le client par téléphone pour convenir d'une solution.
                  </p>
                </div>
              ` : `
                <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #1e40af; margin-top: 0;">✅ Prochaines étapes</h3>
                  <p style="margin: 8px 0; color: #1e40af;">Cette course n'est plus dans votre planning. Vous pouvez accepter de nouvelles courses dès maintenant.</p>
                </div>
                <div style="background-color: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #075985; font-size: 14px;">
                    <strong>ℹ️ Rappel :</strong> Les annulations ne sont autorisées que jusqu'à 24h avant le départ. Au-delà de ce délai, veuillez contacter directement le chauffeur par téléphone pour convenir d'une solution.
                  </p>
                </div>
              `}
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Merci de faire partie de l'équipe TuniDrive !
              </p>
            </div>
            
            <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
              <p style="margin: 0;">TuniDrive - Plateforme chauffeurs</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #ccc;">
                Pour toute question : support@tunidrive.net
              </p>
            </div>
          </div>
        `;
        
        const driverResult = await sendEmail(
          driverData.email,
          driverEmailSubject,
          driverEmailContent
        );
        
        console.log('✅ Email chauffeur envoyé avec succès:', driverResult.id)
        emailResults.push({ type: 'driver', success: true, id: driverResult.id })
      } catch (emailError) {
        console.error('❌ Erreur email chauffeur:', emailError)
        emailResults.push({ type: 'driver', success: false, error: emailError.message })
      }
    } else {
      console.log('⚠️ Email chauffeur NON envoyé:');
      if (status !== 'cancelled') {
        console.log('  - Raison: status n\'est pas "cancelled" (status =', status, ')');
      }
      if (!driverData.email || driverData.email.trim() === '') {
        console.log('  - Raison: driverData.email vide ou manquant');
      }
    }

    // Vérifier les résultats
    const successfulEmails = emailResults.filter(r => r.success);
    console.log('📊 Emails envoyés:', successfulEmails.length, '/', emailResults.length);

    if (successfulEmails.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Aucun email n\'a pu être envoyé',
          results: emailResults
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
        message: `${successfulEmails.length}/${emailResults.length} email(s) envoyé(s) avec succès`,
        results: emailResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

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


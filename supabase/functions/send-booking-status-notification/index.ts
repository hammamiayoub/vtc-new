import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { requireUser, recipientsAllowed, callerInBooking, jsonResponse } from '../_shared/auth.ts'
import { renderEmail, greeting, paragraph, infoCard, notice, bulletList, button, esc, FROM_EMAIL, SUPPORT_EMAIL, SITE_URL } from '../_shared/emailLayout.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Configuration Resend
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

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

  // Utilisateur connecté, partie prenante de la réservation, destinataires = vrais comptes
  const __caller = await requireUser(req, corsHeaders)
  if (__caller instanceof Response) return __caller
  {
    const __p: any = await req.clone().json().catch(() => ({}))
    const __bookingId = __p?.bookingData?.id
    if (__bookingId && !(await callerInBooking(__caller, __bookingId))) {
      return jsonResponse(corsHeaders, 403, { success: false, error: 'forbidden_booking' })
    }
    if (!(await recipientsAllowed(__caller, [__p?.clientData?.email, __p?.driverData?.email], __p?.bookingData?.id))) {
      return jsonResponse(corsHeaders, 403, { success: false, error: 'forbidden_recipients' })
    }
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
      minute: '2-digit',
      timeZone: 'Africa/Tunis'
    })

    const cancellationReason = bookingData.cancellation_reason?.trim() || null

    let emailContent = ''
    let emailSubject = ''

    const tripRows = [
      { label: 'Départ', value: bookingData.pickup_address },
      { label: 'Arrivée', value: bookingData.destination_address },
      { label: 'Date et heure', value: formattedDate },
      { label: 'Distance', value: bookingData.distance_km !== undefined ? `${bookingData.distance_km} km` : '' },
      { label: 'Prix', value: bookingData.price_tnd !== undefined ? `${bookingData.price_tnd} TND` : '' },
    ]
    const clientFullName = `${clientData.first_name ?? ''} ${clientData.last_name ?? ''}`.trim()

    if (status === 'accepted') {
      // Email pour réservation acceptée
      emailSubject = 'TuniDrive — Votre réservation est acceptée'
      const vehicle = driverData.vehicle_info
      const vehicleText = vehicle
        ? `${vehicle.make ?? ''} ${vehicle.model ?? ''}${vehicle.color ? ` (${vehicle.color})` : ''}`.trim()
        : ''
      emailContent = renderEmail({
        title: 'Votre réservation est acceptée',
        preheader: `${formattedDate} — ${bookingData.pickup_address ?? ''} → ${bookingData.destination_address ?? ''}`,
        body: [
          greeting(clientFullName),
          paragraph('Bonne nouvelle : votre chauffeur a <strong>accepté votre réservation</strong>.'),
          infoCard('Votre course', [...tripRows, { label: 'Notes', value: bookingData.notes }], 'success'),
          infoCard('Votre chauffeur', [
            { label: 'Nom', value: `${driverData.first_name ?? ''} ${driverData.last_name ?? ''}`.trim() },
            { label: 'Téléphone', value: driverData.phone, href: driverData.phone ? `tel:${driverData.phone}` : undefined },
            { label: 'Véhicule', value: vehicleText },
            { label: 'Plaque', value: vehicle?.licensePlate },
          ], 'info'),
          notice('<strong>À savoir :</strong> soyez prêt 5 minutes avant l\'heure prévue. Votre chauffeur vous contactera directement si nécessaire.', 'warning'),
          button('Voir ma réservation', `${SITE_URL}/client-dashboard`),
          paragraph('Merci de faire confiance à TuniDrive pour vos déplacements.'),
        ].join(''),
      })
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
        ? 'TuniDrive — Réservation annulée par le chauffeur'
        : cancelledByAdmin
          ? 'TuniDrive — Réservation annulée par TuniDrive'
          : 'TuniDrive — Réservation annulée';

      console.log('Email subject choisi:', emailSubject);

      // Lien du bouton : uniquement une adresse web (jamais un autre schéma)
      const bookingUrl = typeof bookingData.booking_url === 'string' && /^https?:\/\//i.test(bookingData.booking_url)
        ? bookingData.booking_url
        : SITE_URL

      emailContent = renderEmail({
        title: 'Votre réservation est annulée',
        preheader: `${formattedDate} — ${bookingData.pickup_address ?? ''} → ${bookingData.destination_address ?? ''}`,
        body: [
          greeting(clientFullName),
          paragraph(
            cancelledByDriver
              ? 'Nous sommes désolés : votre chauffeur a dû <strong>annuler votre réservation</strong>.'
              : cancelledByAdmin
                ? 'Nous sommes désolés : votre réservation a été <strong>annulée par l\'équipe TuniDrive</strong>.'
                : 'Votre réservation a bien été <strong>annulée</strong>.',
          ),
          infoCard('Réservation annulée', [...tripRows, { label: 'Motif', value: cancellationReason }], 'danger'),
          notice(
            `<strong>Et maintenant ?</strong>${bulletList([
              'Rechercher un autre chauffeur disponible pour le même trajet.',
              'Modifier la date et l\'heure de votre départ.',
              'Nous contacter si vous avez besoin d\'aide.',
            ])}`,
            'info',
          ),
          button('Rechercher un autre chauffeur', bookingUrl),
          paragraph(
            `Besoin d'aide ? Écrivez-nous à <a href="mailto:${SUPPORT_EMAIL}" style="color:#111827;">${SUPPORT_EMAIL}</a> ou contactez-nous sur WhatsApp au +216 28 528 477.`,
          ),
          paragraph('Nous vous présentons nos excuses pour ce désagrément.'),
        ].join(''),
      })
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
          ? 'TuniDrive — Vous avez annulé une course'
          : cancelledByAdmin
            ? 'TuniDrive — Course annulée par TuniDrive'
            : 'TuniDrive — Course annulée par le client';
        
        const driverEmailContent = renderEmail({
          title: cancelledByDriver ? 'Vous avez annulé une course' : 'Une course a été annulée',
          preheader: `${formattedDate} — ${bookingData.pickup_address ?? ''} → ${bookingData.destination_address ?? ''}`,
          body: [
            greeting(`${driverData.first_name ?? ''} ${driverData.last_name ?? ''}`),
            paragraph(
              cancelledByDriver
                ? 'Votre annulation de la course suivante a bien été prise en compte.'
                : cancelledByAdmin
                  ? 'La course suivante a été <strong>annulée par l\'équipe TuniDrive</strong>.'
                  : `Le client <strong>${esc(`${clientData.first_name ?? ''} ${clientData.last_name ?? ''}`.trim())}</strong> a annulé sa réservation.`,
            ),
            infoCard('Course annulée', [
              { label: 'Client', value: `${clientData.first_name ?? ''} ${clientData.last_name ?? ''}`.trim() },
              { label: 'Départ', value: bookingData.pickup_address },
              { label: 'Arrivée', value: bookingData.destination_address },
              { label: 'Date et heure', value: formattedDate },
              { label: 'Distance', value: bookingData.distance_km !== undefined ? `${bookingData.distance_km} km` : '' },
              { label: 'Prix', value: bookingData.price_tnd !== undefined ? `${bookingData.price_tnd} TND` : '' },
              { label: 'Motif', value: cancellationReason },
            ], 'danger'),
            cancelledByDriver
              ? notice('<strong>Important :</strong> les annulations fréquentes peuvent affecter votre réputation et votre classement. Merci de les éviter, sauf cas de force majeure.', 'warning')
              : notice('<strong>Et maintenant ?</strong> Cette course n\'est plus dans votre planning : vous pouvez accepter de nouvelles courses dès maintenant.', 'info'),
            button('Ouvrir mon tableau de bord', `${SITE_URL}/dashboard`),
          ].join(''),
        });
        
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


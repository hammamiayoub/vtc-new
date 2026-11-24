import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { requireUser, recipientsAllowed, callerInBooking, jsonResponse } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration Resend
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
// IMPORTANT: Remplacez par votre domaine vérifié dans Resend
const FROM_EMAIL = 'TuniDrive <noreply@tunidrive.net>' // Ou votre domaine configuré
const SUPPORT_EMAIL = 'support@tunidrive.net'

async function sendEmail(to: string, subject: string, html: string) {
  console.log('🔧 Configuration email:')
  console.log('- RESEND_API_KEY présente:', !!RESEND_API_KEY)
  console.log('- FROM_EMAIL:', FROM_EMAIL)
  console.log('- TO:', to)
  console.log('- SUBJECT:', subject)

  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY non configurée dans les variables d\'environnement')
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
      console.error('❌ Erreur Resend détaillée:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      
      // Messages d'erreur plus spécifiques
      if (response.status === 401) {
        throw new Error('Erreur d\'authentification Resend - Vérifiez votre RESEND_API_KEY')
      } else if (response.status === 403) {
        throw new Error('Domaine non vérifié dans Resend - Vérifiez votre configuration de domaine')
      } else if (response.status === 422) {
        throw new Error('Données invalides - Vérifiez l\'adresse email FROM_EMAIL')
      }
      
      throw new Error(`Erreur Resend ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ Email envoyé avec succès via Resend:', result.id)
    return result
    
  } catch (fetchError) {
    console.error('❌ Erreur lors de l\'appel à l\'API Resend:', fetchError)
    throw fetchError
  }
}

serve(async (req) => {
  console.log('🚀 Edge Function resend-email démarrée')
  console.log('📥 Méthode:', req.method)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Réponse CORS OPTIONS')
    return new Response('ok', { headers: corsHeaders })
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
    if (!(await recipientsAllowed(__caller, [__p?.clientData?.email, __p?.driverData?.email]))) {
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
      clientEmail: requestData.clientData?.email,
      driverEmail: requestData.driverData?.email
    })
    
    console.log('📧 === CONFIGURATION EMAIL SUPPORT ===')
    console.log('📧 SUPPORT_EMAIL configuré:', SUPPORT_EMAIL)
    console.log('📧 FROM_EMAIL configuré:', FROM_EMAIL)
    console.log('📧 RESEND_API_KEY présente:', !!RESEND_API_KEY)

    const { bookingData, clientData, driverData } = requestData

    // Validation des données requises
    if (!bookingData || !clientData || !driverData) {
      throw new Error('Données manquantes: bookingData, clientData ou driverData')
    }

    if (!clientData.email || !driverData.email) {
      throw new Error('Adresses email manquantes pour le client ou le chauffeur')
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

    console.log('📅 Date formatée:', formattedDate)

    // Email content for client
    const clientEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">TuniDrive - Confirmation de réservation</h1>
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
            Merci de faire confiance à TuniDrive pour vos déplacements !
          </p>
        </div>
        
        <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0;">TuniDrive - Votre transport sur mesure</p>
        </div>
      </div>
    `

    // Email content for driver
    const driverEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">TuniDrive - Nouvelle réservation</h1>
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
            Merci de faire partie de l'équipe TuniDrive !
          </p>
        </div>
        
        <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0;">TuniDrive - Plateforme chauffeurs</p>
        </div>
      </div>
    `

    // Email content for support team
    const supportEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">TuniDrive - Nouvelle réservation</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Notification pour l'équipe support</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #333;">Nouvelle réservation créée</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Une nouvelle réservation a été créée et les emails de confirmation ont été envoyés aux parties concernées.
          </p>
          
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2d5a2d; margin-top: 0;">Détails de la réservation</h3>
            <p><strong>ID Réservation :</strong> ${bookingData.id || 'N/A'}</p>
            <p><strong>Départ :</strong> ${bookingData.pickup_address}</p>
            <p><strong>Arrivée :</strong> ${bookingData.destination_address}</p>
            <p><strong>Date et heure :</strong> ${formattedDate}</p>
            <p><strong>Distance :</strong> ${bookingData.distance_km} km</p>
            <p><strong>Prix :</strong> ${bookingData.price_tnd} TND</p>
            <p><strong>Statut :</strong> ${bookingData.status || 'En attente'}</p>
            ${bookingData.notes ? `<p><strong>Notes du client :</strong> ${bookingData.notes}</p>` : ''}
          </div>
          
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1565c0; margin-top: 0;">Informations client</h3>
            <p><strong>Nom :</strong> ${clientData.first_name} ${clientData.last_name}</p>
            <p><strong>Email :</strong> ${clientData.email}</p>
            ${clientData.phone ? `<p><strong>Téléphone :</strong> ${clientData.phone}</p>` : ''}
            <p><strong>Ville :</strong> ${clientData.city || 'Non renseignée'}</p>
          </div>
          
          <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #e65100; margin-top: 0;">Informations chauffeur</h3>
            <p><strong>Nom :</strong> ${driverData.first_name} ${driverData.last_name}</p>
            <p><strong>Email :</strong> ${driverData.email}</p>
            ${driverData.phone ? `<p><strong>Téléphone :</strong> ${driverData.phone}</p>` : ''}
            <p><strong>Ville :</strong> ${driverData.city || 'Non renseignée'}</p>
            ${driverData.vehicle_info ? `
              <p><strong>Véhicule :</strong> ${driverData.vehicle_info.make} ${driverData.vehicle_info.model}</p>
              <p><strong>Plaque :</strong> ${driverData.vehicle_info.licensePlate}</p>
              <p><strong>Année :</strong> ${driverData.vehicle_info.year}</p>
              <p><strong>Couleur :</strong> ${driverData.vehicle_info.color}</p>
            ` : ''}
          </div>
          
          <div style="background-color: #f3e5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #7b1fa2; margin-top: 0;">Actions effectuées</h3>
            <ul style="color: #7b1fa2; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>✅ Email de confirmation envoyé au client</li>
              <li>✅ Email de notification envoyé au chauffeur</li>
              <li>✅ Réservation enregistrée dans la base de données</li>
            </ul>
          </div>
          
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">
              <strong>Note :</strong> Cet email est envoyé automatiquement pour vous tenir informé des nouvelles réservations. 
              Vous pouvez surveiller l'activité via le tableau de bord administrateur.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Équipe TuniDrive - Support technique
          </p>
        </div>
        
        <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0;">TuniDrive - Plateforme de transport</p>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #ccc;">
            Email automatique - Ne pas répondre
          </p>
        </div>
      </div>
    `

    // Envoi des emails via Resend
    const emailResults: Array<{type: string, success: boolean, id?: string, error?: string}> = []
    
    try {
      console.log('📧 Envoi email client à:', clientData.email)
      const clientResult = await sendEmail(
        clientData.email,
        'TuniDrive - Confirmation de votre réservation',
        clientEmailContent
      )
      emailResults.push({ type: 'client', success: true, id: clientResult.id })

    } catch (clientEmailError) {
      console.error('❌ Erreur email client:', clientEmailError)
      emailResults.push({ type: 'client', success: false, error: clientEmailError.message })
    }

    try {
      console.log('📧 Envoi email chauffeur à:', driverData.email)
      const driverResult = await sendEmail(
        driverData.email,
        'TuniDrive - Nouvelle réservation reçue',
        driverEmailContent
      )
      emailResults.push({ type: 'driver', success: true, id: driverResult.id })

    } catch (driverEmailError) {
      console.error('❌ Erreur email chauffeur:', driverEmailError)
      emailResults.push({ type: 'driver', success: false, error: driverEmailError.message })
    }

    // Email support - toujours tenté même si les autres échouent
    try {
      console.log('📧 === ENVOI EMAIL SUPPORT ===')
      console.log('📧 SUPPORT_EMAIL value:', SUPPORT_EMAIL)
      console.log('📧 SUPPORT_EMAIL type:', typeof SUPPORT_EMAIL)
      console.log('📧 Destinataire support:', SUPPORT_EMAIL)
      console.log('📧 Sujet:', 'TuniDrive - Nouvelle réservation créée')
      console.log('📧 Contenu HTML généré:', supportEmailContent ? supportEmailContent.length : 'undefined', 'caractères')
      console.log('📧 FROM_EMAIL:', FROM_EMAIL)
      console.log('📧 RESEND_API_KEY présente:', !!RESEND_API_KEY)
      
      if (!SUPPORT_EMAIL) {
        throw new Error('SUPPORT_EMAIL est undefined ou vide')
      }
      
      const supportResult = await sendEmail(
        SUPPORT_EMAIL,
        'TuniDrive - Nouvelle réservation créée',
        supportEmailContent
      )
      
      console.log('✅ === EMAIL SUPPORT ENVOYÉ AVEC SUCCÈS ===')
      console.log('✅ ID email support:', supportResult.id)
      emailResults.push({ type: 'support', success: true, id: supportResult.id })

    } catch (supportEmailError) {
      console.error('❌ === ERREUR EMAIL SUPPORT ===')
      console.error('❌ Type d\'erreur:', supportEmailError.constructor.name)
      console.error('❌ Erreur détaillée:', supportEmailError)
      console.error('❌ Message d\'erreur:', supportEmailError.message)
      console.error('❌ Stack trace:', supportEmailError.stack)
      console.error('❌ SUPPORT_EMAIL value au moment de l\'erreur:', SUPPORT_EMAIL)
      emailResults.push({ type: 'support', success: false, error: supportEmailError.message })
    }

    // Vérifier si au moins un email a été envoyé
    const successfulEmails = emailResults.filter(result => result.success)
    const failedEmails = emailResults.filter(result => !result.success)

    console.log('📊 === RÉSULTATS FINAUX ENVOI EMAILS ===')
    console.log('📊 Total emails tentés:', emailResults.length)
    console.log('📊 Emails réussis:', successfulEmails.length)
    console.log('📊 Emails échoués:', failedEmails.length)
    console.log('📊 Détail des résultats:', emailResults)
    
    // Vérifier spécifiquement l'email support
    const supportResult = emailResults.find(result => result.type === 'support')
    if (supportResult) {
      console.log('📧 === RÉSULTAT EMAIL SUPPORT ===')
      console.log('📧 Support email success:', supportResult.success)
      console.log('📧 Support email ID:', supportResult.id)
      console.log('📧 Support email error:', supportResult.error)
    } else {
      console.error('❌ === EMAIL SUPPORT NON TROUVÉ DANS LES RÉSULTATS ===')
    }

    if (successfulEmails.length === 0) {
      // Aucun email envoyé avec succès
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Aucun email n\'a pu être envoyé',
          details: emailResults
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    // Au moins un email envoyé avec succès
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${successfulEmails.length}/${emailResults.length} emails envoyés avec succès`,
        results: emailResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('💥 Erreur générale dans la fonction:', error)
    
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
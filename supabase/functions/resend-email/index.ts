import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { requireUser, recipientsAllowed, callerInBooking, jsonResponse } from '../_shared/auth.ts'
import { FROM_EMAIL, SUPPORT_EMAIL } from '../_shared/emailLayout.ts'
import { buildBookingEmails } from '../_shared/vtcBookingEmails.ts'

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

    const { bookingData, clientData, driverData } = requestData

    if (!bookingData || !clientData || !driverData) {
      throw new Error('Données manquantes: bookingData, clientData ou driverData')
    }

    if (!clientData.email || !driverData.email) {
      throw new Error('Adresses email manquantes pour le client ou le chauffeur')
    }

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

    // Contenu des e-mails (gabarit commun, valeurs échappées)
    const {
      client: clientEmailContent,
      driver: driverEmailContent,
      support: supportEmailContent,
    } = buildBookingEmails({ bookingData, clientData, driverData, formattedDate })

    // Envoi des emails via Resend
    const emailResults: Array<{type: string, success: boolean, id?: string, error?: string}> = []
    
    // Email client
    try {
      console.log('📧 Envoi email client à:', clientData.email)
      const clientResult = await sendEmail(
        clientData.email,
        'TuniDrive — Confirmation de votre réservation',
        clientEmailContent
      )
      emailResults.push({ type: 'client', success: true, id: clientResult.id })
    } catch (clientEmailError) {
      console.error('❌ Erreur email client:', clientEmailError)
      emailResults.push({ type: 'client', success: false, error: clientEmailError.message })
    }

    // Email chauffeur
    try {
      console.log('📧 Envoi email chauffeur à:', driverData.email)
      const driverResult = await sendEmail(
        driverData.email,
        'TuniDrive — Nouvelle réservation reçue',
        driverEmailContent
      )
      emailResults.push({ type: 'driver', success: true, id: driverResult.id })
    } catch (driverEmailError) {
      console.error('❌ Erreur email chauffeur:', driverEmailError)
      emailResults.push({ type: 'driver', success: false, error: driverEmailError.message })
    }

    // Email support - envoyé après un délai pour respecter la limite de 2 emails/seconde de Resend
    try {
      console.log('📧 === ENVOI EMAIL SUPPORT (avec délai de 2s) ===')
      console.log('📧 Attente de 2 secondes pour respecter la limite de Resend...')
      
      // Attendre 2 secondes avant d'envoyer l'email support
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      console.log('📧 Destinataire:', SUPPORT_EMAIL)
      
      const supportResult = await sendEmail(
        SUPPORT_EMAIL,
        'TuniDrive — Nouvelle réservation créée',
        supportEmailContent
      )
      
      console.log('✅ Email support envoyé avec succès:', supportResult.id)
      emailResults.push({ type: 'support', success: true, id: supportResult.id })
    } catch (supportEmailError) {
      console.error('❌ Erreur email support:', supportEmailError)
      emailResults.push({ type: 'support', success: false, error: supportEmailError.message })
    }

    // Résultats
    const successfulEmails = emailResults.filter(result => result.success)
    console.log('📊 Emails envoyés:', successfulEmails.length, '/', emailResults.length)

    if (successfulEmails.length === 0) {
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


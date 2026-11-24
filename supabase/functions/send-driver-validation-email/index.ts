import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireAdmin } from '../_shared/auth.ts'
import { renderEmail, greeting, paragraph, infoCard, notice, bulletList, button, FROM_EMAIL, SUPPORT_EMAIL, SITE_URL } from '../_shared/emailLayout.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

async function sendDriverValidationEmail(driverData: any) {
  const fullName = `${driverData.first_name ?? ''} ${driverData.last_name ?? ''}`.trim()
  const vehicle = driverData.vehicle_make
    ? `${driverData.vehicle_make} ${driverData.vehicle_model || ''}`.trim()
    : ''
  const emailContent = renderEmail({
    title: 'Votre compte chauffeur est validé',
    preheader: 'Bienvenue chez TuniDrive : vous pouvez dès maintenant recevoir des courses.',
    body: [
      greeting(fullName),
      paragraph(
        'Bonne nouvelle : votre inscription en tant que chauffeur TuniDrive a été <strong>validée</strong> par notre équipe. Bienvenue parmi nos chauffeurs partenaires !',
      ),
      infoCard('Votre compte', [
        { label: 'Nom', value: fullName },
        { label: 'E-mail', value: driverData.email },
        { label: 'Téléphone', value: driverData.phone || 'Non renseigné' },
        { label: 'Ville', value: driverData.city || 'Non renseignée' },
        { label: 'Véhicule', value: vehicle },
        { label: 'Statut', value: 'Validé' },
      ], 'success'),
      notice(
        `<strong>Pour commencer</strong>${bulletList([
          'Connectez-vous à votre <strong>tableau de bord chauffeur</strong>.',
          'Renseignez vos <strong>disponibilités</strong> et vos zones de service.',
          'Passez en <strong>« En ligne »</strong> pour recevoir des réservations.',
          'Consultez les <strong>réservations disponibles</strong> dans votre zone.',
        ])}`,
        'info',
      ),
      paragraph(
        'Quelques conseils : un véhicule propre et en bon état, un téléphone chargé, le respect des horaires convenus et une communication toujours courtoise avec les clients.',
      ),
      button('Accéder à mon tableau de bord', `${SITE_URL}/dashboard`),
      paragraph(
        `Une question ? Notre équipe vous répond du lundi au vendredi, de 8 h à 18 h, à <a href="mailto:${SUPPORT_EMAIL}" style="color:#111827;">${SUPPORT_EMAIL}</a>.`,
      ),
    ].join(''),
  })

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
        subject: `TuniDrive — Votre compte chauffeur est validé`,
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

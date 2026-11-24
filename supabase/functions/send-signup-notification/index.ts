import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { throttle, adminClient, jsonResponse } from '../_shared/auth.ts'
import { renderEmail, paragraph, infoCard, notice, bulletList, button, esc, FROM_EMAIL, SUPPORT_EMAIL, SITE_URL } from '../_shared/emailLayout.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

async function sendSignupNotificationEmail(userData: any, userType: string) {
  const userTypeLabel = userType === 'client' ? 'Client' : 'Chauffeur'
  const userTypeLabelLower = userType === 'client' ? 'client' : 'chauffeur'
  
  const fullName = `${userData.first_name ?? ''} ${userData.last_name ?? ''}`.trim()
  const vehicle = `${userData.vehicle_make || 'Non renseigné'} ${userData.vehicle_model || ''}`.trim()
  const emailContent = renderEmail({
    title: `Nouvelle inscription ${userTypeLabelLower}`,
    preheader: `${fullName} vient de s'inscrire sur TuniDrive.`,
    body: [
      paragraph(`Un nouveau ${esc(userTypeLabelLower)} s'est inscrit sur la plateforme TuniDrive.`),
      infoCard('Informations du compte', [
        { label: 'Nom', value: fullName },
        { label: 'E-mail', value: userData.email },
        { label: 'Téléphone', value: userData.phone || 'Non renseigné' },
        { label: 'Ville', value: userData.city || 'Non renseignée' },
        {
          label: 'Inscription',
          value: new Date(userData.created_at).toLocaleString('fr-FR', { timeZone: 'Africa/Tunis' }),
        },
        ...(userType === 'driver'
          ? [
              { label: 'Statut', value: userData.status || 'pending' },
              { label: 'Véhicule', value: vehicle },
            ]
          : []),
      ]),
      notice(
        `<strong>À faire</strong>${bulletList([
          'Vérifier les informations du compte.',
          userType === 'driver' ? 'Valider les documents du chauffeur.' : 'Activer le compte client.',
          'Envoyer un e-mail de bienvenue si nécessaire.',
        ])}`,
        'info',
      ),
      button('Ouvrir l\'administration', `${SITE_URL}/admin`),
    ].join(''),
    footnote: 'Notification interne envoyée à chaque nouvelle inscription.',
  })

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
        subject: `TuniDrive — Nouvelle inscription ${userTypeLabel} : ${userData.first_name} ${userData.last_name}`,
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

    // Appel possible sans connexion : le compte doit exister et être récent, une seule notification par adresse
    const __email = String(userData?.email ?? '').trim().toLowerCase()
    const __table = userType === 'driver' ? 'drivers' : 'clients'
    const { data: __acct } = await adminClient()
      .from(__table).select('created_at').ilike('email', __email).maybeSingle()
    const __recent = __acct && Date.now() - new Date(__acct.created_at).getTime() < 60 * 60 * 1000
    if (!__recent || !(await throttle(`signup:${__email}`, 3600))) {
      return jsonResponse(corsHeaders, 200, { success: true, message: 'ignored' })
    }
    // Contenu saisi par l'appelant : échappé par le gabarit (renderEmail / infoCard) avant insertion dans l'e-mail
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

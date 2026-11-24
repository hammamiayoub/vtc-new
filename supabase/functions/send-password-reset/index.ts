import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { throttle, adminClient, jsonResponse } from '../_shared/auth.ts'
import { renderEmail, greeting, paragraph, infoCard, notice, bulletList, esc, FROM_EMAIL, SUPPORT_EMAIL } from '../_shared/emailLayout.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration Resend
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

async function sendPasswordResetEmail(to: string, firstName: string, lastName: string, userType: string) {
  console.log('🔧 Configuration email reset:')
  console.log('- RESEND_API_KEY présente:', !!RESEND_API_KEY)
  console.log('- FROM_EMAIL:', FROM_EMAIL)
  console.log('- TO:', to)
  console.log('- User Type:', userType)

  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY non configurée')
    throw new Error('Configuration email manquante: RESEND_API_KEY')
  }

  const userTypeLabel = userType === 'client' ? 'client' : 'chauffeur';

  const emailContent = renderEmail({
    title: 'Réinitialisation de votre mot de passe',
    preheader: `Vous avez demandé à réinitialiser le mot de passe de votre compte ${userTypeLabel} TuniDrive.`,
    body: [
      greeting(`${firstName ?? ''} ${lastName ?? ''}`),
      paragraph(`Nous avons bien reçu votre demande de réinitialisation du mot de passe de votre compte ${esc(userTypeLabel)} TuniDrive.`),
      notice(
        `<strong>Comment procéder ?</strong>${bulletList([
          'Un autre e-mail, envoyé séparément, contient votre lien sécurisé de réinitialisation.',
          'Cliquez sur ce lien pour choisir votre nouveau mot de passe.',
          'Le lien est valable <strong>1 heure</strong>.',
          'Vous n\'êtes pas à l\'origine de cette demande ? Ignorez simplement ce message : votre mot de passe actuel reste inchangé.',
        ])}`,
        'warning',
      ),
      infoCard('Pour un mot de passe solide', [
        { label: 'Longueur', value: '8 caractères minimum' },
        { label: 'Contenu', value: 'Majuscules, minuscules, chiffres et symboles' },
        { label: 'Unicité', value: 'Un mot de passe différent de vos autres comptes' },
      ], 'info'),
      paragraph(`Besoin d'aide ? Écrivez-nous à <a href="mailto:${SUPPORT_EMAIL}" style="color:#111827;">${SUPPORT_EMAIL}</a>.`),
    ].join(''),
  })

  try {
    console.log('📤 Envoi email reset via Resend...')
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: `TuniDrive — Réinitialisation de votre mot de passe`,
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
    console.log('✅ Email reset envoyé avec succès:', result.id)
    return result
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email reset:', error)
    throw error
  }
}

serve(async (req) => {
  console.log('🚀 Edge Function send-password-reset démarrée')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, firstName, lastName, userType } = await req.json()

    if (!email || !firstName || !lastName || !userType) {
      throw new Error('Données manquantes: email, firstName, lastName ou userType')
    }

    // Appel possible sans connexion : on limite la fréquence, on n'écrit qu'à un compte existant
    // et les noms viennent de la base (jamais de l'appelant). Réponse identique si le compte n'existe pas.
    const __email = String(email).trim().toLowerCase()
    if (!(await throttle(`pwreset:${__email}`, 60))) {
      return jsonResponse(corsHeaders, 429, { success: false, error: 'too_many_requests' })
    }
    const __table = userType === 'driver' ? 'drivers' : 'clients'
    const { data: __acct } = await adminClient()
      .from(__table).select('email, first_name, last_name').ilike('email', __email).maybeSingle()
    if (__acct) {
      await sendPasswordResetEmail(__acct.email, __acct.first_name, __acct.last_name, userType)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email de réinitialisation envoyé avec succès'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('💥 Erreur dans send-password-reset:', error)
    
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
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireUser, recipientsAllowed, callerInBooking, jsonResponse } from '../_shared/auth.ts'
import { renderEmail, greeting, paragraph, infoCard, notice, bulletList, button, esc, FROM_EMAIL, SUPPORT_EMAIL, SITE_URL } from '../_shared/emailLayout.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface CancellationData {
  bookingId: string;
  clientName: string;
  clientEmail: string;
  driverName: string;
  driverEmail: string;
  pickupAddress: string;
  destinationAddress: string;
  scheduledTime: string;
  priceTnd: number;
  cancellationReason?: string;
  cancelledBy: 'client' | 'driver';
}

async function sendCancellationEmails(data: CancellationData) {
  const { 
    clientName, 
    clientEmail, 
    driverName, 
    driverEmail, 
    pickupAddress, 
    destinationAddress, 
    scheduledTime, 
    priceTnd,
    cancelledBy 
  } = data;

  const scheduledDate = new Date(scheduledTime).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Tunis'
  });

  // Email pour le client
  const clientEmailContent = renderEmail({
    title: cancelledBy === 'client' ? 'Votre réservation est annulée' : 'Votre réservation a été annulée par le chauffeur',
    preheader: `Course du ${scheduledDate} — ${pickupAddress} → ${destinationAddress}`,
    body: [
      greeting(clientName),
      paragraph(
        cancelledBy === 'client'
          ? 'Votre réservation a bien été annulée.'
          : 'Votre chauffeur a dû annuler votre réservation. Nous cherchons un autre chauffeur pour vous.',
      ),
      infoCard('Détails de la réservation', [
        { label: 'Départ', value: pickupAddress },
        { label: 'Arrivée', value: destinationAddress },
        { label: 'Date', value: scheduledDate },
        { label: 'Prix', value: `${priceTnd} TND` },
        { label: 'Chauffeur', value: driverName },
      ]),
      cancelledBy === 'driver'
        ? notice(
            `<strong>Et maintenant ?</strong>${bulletList([
              'Nous recherchons un autre chauffeur pour votre course.',
              'Vous serez notifié dès qu\'un chauffeur sera trouvé.',
              'Si aucun chauffeur n\'est disponible, nous vous contacterons.',
            ])}`,
            'info',
          )
        : '',
      paragraph(
        cancelledBy === 'client'
          ? 'Vous pouvez réserver une nouvelle course à tout moment depuis votre espace client.'
          : 'Nous vous présentons nos excuses pour ce désagrément et vous remercions de votre compréhension.',
      ),
      button(cancelledBy === 'client' ? 'Réserver une course' : 'Voir mon espace client', `${SITE_URL}/client-dashboard`),
    ].join(''),
  });

  // Email pour le chauffeur
  const driverEmailContent = renderEmail({
    title: cancelledBy === 'client' ? 'Une course a été annulée' : 'Vous avez annulé une course',
    preheader: `Course du ${scheduledDate} — ${pickupAddress} → ${destinationAddress}`,
    body: [
      greeting(driverName),
      paragraph(
        cancelledBy === 'client'
          ? 'Le client a annulé la course qui vous était assignée.'
          : 'Votre annulation de la course a bien été prise en compte.',
      ),
      infoCard('Détails de la course', [
        { label: 'Client', value: clientName },
        { label: 'Départ', value: pickupAddress },
        { label: 'Arrivée', value: destinationAddress },
        { label: 'Date', value: scheduledDate },
        { label: 'Prix', value: `${priceTnd} TND` },
      ]),
      cancelledBy === 'client'
        ? notice(
            `<strong>Bon à savoir</strong>${bulletList([
              'Cette course n\'est plus dans votre planning.',
              'Vous pouvez accepter de nouvelles courses.',
              'Votre statut reste actif.',
            ])}`,
            'info',
          )
        : notice(
            '<strong>Important :</strong> les annulations répétées peuvent affecter votre réputation. Merci de les éviter, sauf cas de force majeure.',
            'warning',
          ),
      paragraph(
        cancelledBy === 'client'
          ? 'Vous recevrez de nouvelles demandes de courses dès qu\'elles seront disponibles.'
          : `Une question sur cette annulation ? Écrivez-nous à ${esc(SUPPORT_EMAIL)}.`,
      ),
      button('Voir mon tableau de bord', `${SITE_URL}/dashboard`),
    ].join(''),
  });

  const results = [];

  try {
    console.log('📤 Envoi email d\'annulation au client...');
    
    const clientResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [clientEmail],
        subject: `TuniDrive — Réservation annulée ${cancelledBy === 'client' ? '(par vous)' : '(par le chauffeur)'}`,
        html: clientEmailContent,
      }),
    });

    if (clientResponse.ok) {
      const clientResult = await clientResponse.json();
      results.push({ type: 'client', success: true, id: clientResult.id });
      console.log('✅ Email client envoyé:', clientResult.id);
    } else {
      const errorText = await clientResponse.text();
      results.push({ type: 'client', success: false, error: errorText });
      console.error('❌ Erreur email client:', errorText);
    }
  } catch (error) {
    results.push({ type: 'client', success: false, error: error.message });
    console.error('❌ Erreur email client:', error);
  }

  try {
    console.log('📤 Envoi email d\'annulation au chauffeur...');
    
    const driverResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [driverEmail],
        subject: `TuniDrive — Course annulée ${cancelledBy === 'client' ? '(par le client)' : '(par vous)'}`,
        html: driverEmailContent,
      }),
    });

    if (driverResponse.ok) {
      const driverResult = await driverResponse.json();
      results.push({ type: 'driver', success: true, id: driverResult.id });
      console.log('✅ Email chauffeur envoyé:', driverResult.id);
    } else {
      const errorText = await driverResponse.text();
      results.push({ type: 'driver', success: false, error: errorText });
      console.error('❌ Erreur email chauffeur:', errorText);
    }
  } catch (error) {
    results.push({ type: 'driver', success: false, error: error.message });
    console.error('❌ Erreur email chauffeur:', error);
  }

  return results;
}

serve(async (req) => {
  console.log('🚀 Edge Function send-cancellation-emails démarrée')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
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
    const __bookingId = __p?.bookingId
    if (__bookingId && !(await callerInBooking(__caller, __bookingId))) {
      return jsonResponse(corsHeaders, 403, { success: false, error: 'forbidden_booking' })
    }
    if (!(await recipientsAllowed(__caller, [__p?.clientEmail, __p?.driverEmail]))) {
      return jsonResponse(corsHeaders, 403, { success: false, error: 'forbidden_recipients' })
    }
  }

  try {
    const data: CancellationData = await req.json()

    console.log('📧 === DONNÉES REÇUES COMPLÈTES ===');
    console.log('bookingId:', data.bookingId);
    console.log('clientName:', data.clientName);
    console.log('clientEmail:', data.clientEmail, '(type:', typeof data.clientEmail, ')');
    console.log('driverName:', data.driverName);
    console.log('driverEmail:', data.driverEmail, '(type:', typeof data.driverEmail, ')');
    console.log('cancelledBy:', data.cancelledBy);
    console.log('pickupAddress:', data.pickupAddress);
    console.log('destinationAddress:', data.destinationAddress);
    console.log('scheduledTime:', data.scheduledTime);
    console.log('priceTnd:', data.priceTnd);

    // Validation détaillée avec logs
    if (!data) {
      console.error('❌ Aucune donnée reçue');
      throw new Error('Aucune donnée reçue')
    }
    if (!data.bookingId) {
      console.error('❌ bookingId manquant');
      throw new Error('bookingId manquant')
    }
    if (!data.clientEmail || data.clientEmail.trim() === '') {
      console.error('❌ clientEmail manquant ou vide. Valeur:', data.clientEmail);
      throw new Error('clientEmail manquant ou vide')
    }
    if (!data.driverEmail || data.driverEmail.trim() === '') {
      console.error('❌ driverEmail manquant ou vide. Valeur:', data.driverEmail);
      throw new Error('driverEmail manquant ou vide')
    }
    if (!data.clientName) {
      console.error('❌ clientName manquant');
      throw new Error('clientName manquant')
    }
    if (!data.driverName) {
      console.error('❌ driverName manquant');
      throw new Error('driverName manquant')
    }
    if (!data.pickupAddress) {
      console.error('❌ pickupAddress manquant');
      throw new Error('pickupAddress manquant')
    }
    if (!data.destinationAddress) {
      console.error('❌ destinationAddress manquant');
      throw new Error('destinationAddress manquant')
    }
    if (!data.scheduledTime) {
      console.error('❌ scheduledTime manquant');
      throw new Error('scheduledTime manquant')
    }
    if (!data.priceTnd) {
      console.error('❌ priceTnd manquant');
      throw new Error('priceTnd manquant')
    }
    if (!data.cancelledBy) {
      console.error('❌ cancelledBy manquant');
      throw new Error('cancelledBy manquant')
    }
    
    console.log('✅ Toutes les validations passées');

    const results = await sendCancellationEmails(data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Emails d\'annulation envoyés',
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('💥 Erreur dans send-cancellation-emails:', error)
    
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

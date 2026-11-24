import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { requireUser, jsonResponse } from '../_shared/auth.ts'
import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendExpoPushBatch } from '../_shared/expoPush.ts';
import { renderEmail, greeting, paragraph, infoCard, button, FROM_EMAIL, SUPPORT_EMAIL, SITE_URL } from '../_shared/emailLayout.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY manquante');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend ${response.status}: ${err}`);
  }
  return response.json();
}

function directionLabel(direction: string) {
  if (direction === 'tunisia_domestic') return 'Livraison locale (Tunisie)';
  return direction === 'europe_to_tunisia' ? 'Europe → Tunisie' : 'Tunisie → Europe';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  const __caller = await requireUser(req, corsHeaders)
  if (__caller instanceof Response) return __caller

  try {
    const { requestId, clientId } = await req.json();
    if (!requestId || !clientId) throw new Error('requestId et clientId requis');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: request, error: reqErr } = await supabase
      .from('parcel_quote_requests')
      .select('*, parcel_items(*)')
      .eq('id', requestId)
      .single();
    if (reqErr || !request) throw new Error('Demande introuvable');
    if (request.client_id !== __caller.user.id && !__caller.isAdmin) {
      return jsonResponse(corsHeaders, 403, { success: false, error: 'forbidden' });
    }

    const { data: client } = await supabase
      .from('clients')
      .select('first_name, last_name, email')
      .eq('id', clientId)
      .single();

    const { data: transporteurs, error: matchErr } = await supabase.rpc(
      'get_matching_transporteurs',
      { p_request_id: requestId }
    );
    if (matchErr) throw matchErr;

    const isLocal = request.service_scope === 'local';

    const formattedDate = new Date(request.desired_date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const itemsRows = (request.parcel_items || []).map(
      (it: { name: string; quantity: number; weight_kg?: number }) => ({
        label: it.name,
        value: `${it.quantity} colis${it.weight_kg ? ` (${it.weight_kg} kg)` : ''}`,
      })
    );

    const tripRows = [
      { label: 'Direction', value: directionLabel(request.direction) },
      { label: 'Départ', value: request.departure_address },
      { label: 'Arrivée', value: request.arrival_address },
      { label: 'Date souhaitée', value: formattedDate },
      { label: 'Devise des offres', value: request.currency },
    ];
    const serviceLabel = isLocal ? 'livraison locale' : 'transport international';

    const clientHtml = renderEmail({
      title: 'Votre demande de devis est enregistrée',
      preheader: `${request.departure_address} → ${request.arrival_address}`,
      body: [
        greeting(`${client?.first_name || ''} ${client?.last_name || ''}`),
        paragraph(`Votre demande de ${serviceLabel} de colis a bien été enregistrée.`),
        infoCard('Votre demande', tripRows, 'success'),
        paragraph('Les transporteurs éligibles ont été notifiés. Vous recevrez un e-mail à chaque nouvelle proposition.'),
        button('Suivre ma demande', `${SITE_URL}/client-dashboard`),
      ].join(''),
    });

    if (client?.email) {
      await sendEmail(
        client.email,
        'TuniDrive — Confirmation de votre demande de transport de colis',
        clientHtml
      );
    }

    const pushTokens = (transporteurs || [])
      .map((t: { push_token?: string | null }) => t.push_token)
      .filter(Boolean);

    const routeShort = `${request.departure_address} → ${request.arrival_address}`;
    const pushSent = await sendExpoPushBatch(pushTokens, {
      title: '📦 Nouvelle demande de colis',
      body: `${directionLabel(request.direction)} — ${routeShort}. Connectez-vous pour proposer un devis.`,
      data: {
        type: 'parcel_request_new',
        requestId,
        role: 'driver',
      },
    });
    console.log(`[push] transporteurs: ${pushSent}/${pushTokens.length} tokens`);

    for (const t of transporteurs || []) {
      const driverHtml = renderEmail({
        title: 'Nouvelle demande de colis',
        preheader: `${request.departure_address} → ${request.arrival_address}`,
        body: [
          greeting(`${t.first_name ?? ''} ${t.last_name ?? ''}`),
          paragraph(`Une nouvelle demande de ${serviceLabel} correspond à votre profil.`),
          infoCard('Détails de la demande', [
            ...tripRows.slice(0, 4),
            { label: 'Devise', value: request.currency },
          ], 'info'),
          itemsRows.length > 0 ? infoCard('Colis', itemsRows) : '',
          paragraph('Connectez-vous à votre tableau de bord pour envoyer votre proposition de prix.'),
          button('Voir la demande', `${SITE_URL}/dashboard`),
        ].join(''),
      });
      if (t.email) {
        await sendEmail(
          t.email,
          'TuniDrive — Nouvelle demande de transport de colis',
          driverHtml
        );
      }
    }

    await sendEmail(
      SUPPORT_EMAIL,
      `TuniDrive — Nouvelle demande colis ${isLocal ? 'locale' : 'internationale'} (${directionLabel(request.direction)})`,
      renderEmail({
        title: `Nouvelle demande de colis ${isLocal ? 'locale' : 'internationale'}`,
        preheader: `${request.departure_address} → ${request.arrival_address}`,
        body: [
          infoCard('Demande', [
            { label: 'Identifiant', value: requestId },
            { label: 'Direction', value: directionLabel(request.direction) },
            { label: 'Départ', value: request.departure_address },
            { label: 'Arrivée', value: request.arrival_address },
            { label: 'Transporteurs notifiés', value: (transporteurs || []).length },
          ], 'neutral'),
          button('Ouvrir l\'administration', `${SITE_URL}/admin`),
        ].join(''),
        footnote: 'Notification interne envoyée pour chaque demande de colis.',
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        notified: (transporteurs || []).length,
        pushSent,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

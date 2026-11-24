import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { requireUser, jsonResponse } from '../_shared/auth.ts'
import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendExpoPush } from '../_shared/expoPush.ts';
import { renderEmail, greeting, paragraph, infoCard, button, esc, FROM_EMAIL, SITE_URL } from '../_shared/emailLayout.ts';

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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  const __caller = await requireUser(req, corsHeaders)
  if (__caller instanceof Response) return __caller

  try {
    const { proposalId, requestId: bodyRequestId } = await req.json();
    if (!proposalId) throw new Error('proposalId requis');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: proposal } = await supabase
      .from('parcel_quote_proposals')
      .select('id, request_id, driver_id, price, currency, message')
      .eq('id', proposalId)
      .single();
    if (!proposal) throw new Error('Proposition introuvable');
    if (proposal.driver_id !== __caller.user.id && !__caller.isAdmin) {
      return jsonResponse(corsHeaders, 403, { success: false, error: 'forbidden' });
    }

    if (bodyRequestId && bodyRequestId !== proposal.request_id) {
      throw new Error('requestId ne correspond pas à la proposition');
    }

    const { data: request } = await supabase
      .from('parcel_quote_requests')
      .select('id, client_id')
      .eq('id', proposal.request_id)
      .single();
    if (!request?.client_id) throw new Error('Demande introuvable');

    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, push_token')
      .eq('id', request.client_id)
      .single();
    if (clientErr || !client) throw new Error('Client destinataire introuvable');

    const { data: driver } = await supabase
      .from('drivers')
      .select('first_name, last_name, email')
      .eq('id', proposal.driver_id)
      .single();

    const clientHtml = renderEmail({
      title: 'Vous avez reçu une proposition',
      preheader: `${proposal.price} ${proposal.currency} — un transporteur a répondu à votre demande de colis.`,
      body: [
        greeting(`${client.first_name || ''} ${client.last_name || ''}`),
        paragraph('Un transporteur vous a envoyé une proposition pour votre demande de colis.'),
        infoCard('Proposition', [
          { label: 'Transporteur', value: `${driver?.first_name || ''} ${driver?.last_name || ''}`.trim() },
          { label: 'Prix proposé', value: `${proposal.price} ${proposal.currency}` },
          { label: 'Message', value: proposal.message },
        ], 'success'),
        paragraph('Connectez-vous à votre espace client pour comparer les offres et valider celle de votre choix.'),
        button('Voir les propositions', `${SITE_URL}/client-dashboard`),
      ].join(''),
    });

    if (client.email) {
      await sendEmail(
        client.email,
        'TuniDrive — Nouvelle proposition de transport de colis',
        clientHtml
      );
    }

    const driverName = `${driver?.first_name || ''} ${driver?.last_name || ''}`.trim();
    const pushSent = await sendExpoPush(client.push_token, {
      title: '📦 Nouvelle proposition de colis',
      body: `${driverName || 'Un transporteur'} propose ${proposal.price} ${proposal.currency}. Consultez vos devis.`,
      data: {
        type: 'parcel_proposal_received',
        requestId: proposal.request_id,
        proposalId,
        clientId: client.id,
        role: 'client',
      },
    });

    if (!pushSent) {
      console.warn('[push] Aucun push_token pour le client', client.id);
    } else {
      console.log('[push] Proposition colis notifiée au client', client.id);
    }

    if (driver?.email) {
      const driverConfirmHtml = renderEmail({
        title: 'Votre proposition a été envoyée',
        preheader: `Votre offre de ${proposal.price} ${proposal.currency} a été transmise au client.`,
        body: [
          greeting(`${driver.first_name ?? ''} ${driver.last_name ?? ''}`),
          paragraph(`Votre proposition de <strong>${esc(proposal.price)} ${esc(proposal.currency)}</strong> a bien été transmise au client.`),
          paragraph('Vous serez notifié si le client accepte votre offre.'),
          button('Ouvrir mon tableau de bord', `${SITE_URL}/dashboard`),
        ].join(''),
      });
      await sendEmail(
        driver.email,
        'TuniDrive — Votre proposition a été envoyée',
        driverConfirmHtml
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifiedClientId: client.id,
        pushSent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

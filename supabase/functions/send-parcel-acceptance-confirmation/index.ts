import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { requireUser, jsonResponse } from '../_shared/auth.ts'
import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendExpoPush } from '../_shared/expoPush.ts';
import { renderEmail, greeting, paragraph, infoCard, button, FROM_EMAIL, SITE_URL } from '../_shared/emailLayout.ts';

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
    const { proposalId } = await req.json();
    if (!proposalId) throw new Error('proposalId requis');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: proposal } = await supabase
      .from('parcel_quote_proposals')
      .select('*, drivers(first_name, last_name, email, phone, push_token)')
      .eq('id', proposalId)
      .single();
    if (!proposal) throw new Error('Proposition introuvable');

    const { data: request } = await supabase
      .from('parcel_quote_requests')
      .select('*, clients(first_name, last_name, email, phone)')
      .eq('id', proposal.request_id)
      .single();
    if (!request) throw new Error('Demande introuvable');
    if (request.client_id !== __caller.user.id && !__caller.isAdmin) {
      return jsonResponse(corsHeaders, 403, { success: false, error: 'forbidden' });
    }

    const client = request.clients;
    const driver = proposal.drivers;
    const formattedDate = new Date(request.desired_date).toLocaleDateString('fr-FR');

    const tripRows = [
      { label: 'Départ', value: request.departure_address },
      { label: 'Arrivée', value: request.arrival_address },
      { label: 'Date souhaitée', value: formattedDate },
      { label: 'Prix convenu', value: `${proposal.price} ${proposal.currency}` },
    ];

    const clientHtml = renderEmail({
      title: 'Votre offre est confirmée',
      preheader: 'Voici les coordonnées du transporteur pour organiser le rendez-vous.',
      body: [
        greeting(`${client?.first_name || ''} ${client?.last_name || ''}`),
        paragraph('Vous avez validé l\'offre d\'un transporteur. Voici ses coordonnées pour organiser le rendez-vous.'),
        infoCard('Votre envoi', tripRows, 'success'),
        infoCard('Le transporteur', [
          { label: 'Nom', value: `${driver?.first_name || ''} ${driver?.last_name || ''}`.trim() },
          { label: 'Téléphone', value: driver?.phone, href: driver?.phone ? `tel:${driver.phone}` : undefined },
          { label: 'E-mail', value: driver?.email, href: driver?.email ? `mailto:${driver.email}` : undefined },
        ], 'info'),
        button('Ouvrir mon espace client', `${SITE_URL}/client-dashboard`),
      ].join(''),
    });

    const driverHtml = renderEmail({
      title: 'Votre offre a été acceptée',
      preheader: 'Voici les coordonnées du client pour organiser le rendez-vous.',
      body: [
        greeting(`${driver?.first_name || ''} ${driver?.last_name || ''}`),
        paragraph('Le client a accepté votre proposition. Voici ses coordonnées pour organiser le rendez-vous.'),
        infoCard('L\'envoi', tripRows, 'success'),
        infoCard('Le client', [
          { label: 'Nom', value: `${client?.first_name || ''} ${client?.last_name || ''}`.trim() },
          { label: 'Téléphone', value: client?.phone, href: client?.phone ? `tel:${client.phone}` : undefined },
          { label: 'E-mail', value: client?.email, href: client?.email ? `mailto:${client.email}` : undefined },
        ], 'info'),
        button('Ouvrir mon tableau de bord', `${SITE_URL}/dashboard`),
      ].join(''),
    });

    if (client?.email) {
      await sendEmail(
        client.email,
        'TuniDrive — Confirmation : transporteur et coordonnées',
        clientHtml
      );
    }
    if (driver?.email) {
      await sendEmail(
        driver.email,
        'TuniDrive — Votre offre a été acceptée — coordonnées client',
        driverHtml
      );
    }

    const clientName = `${client?.first_name || ''} ${client?.last_name || ''}`.trim();
    await sendExpoPush(driver?.push_token, {
      title: '✅ Offre colis acceptée',
      body: `${clientName || 'Le client'} a accepté votre offre (${proposal.price} ${proposal.currency}). Ouvrez l'app pour les coordonnées.`,
      data: {
        type: 'parcel_proposal_accepted',
        requestId: proposal.request_id,
        proposalId,
        role: 'driver',
      },
    });

    // Notifier les transporteurs non retenus
    const { data: rejected } = await supabase
      .from('parcel_quote_proposals')
      .select('drivers(email, first_name, last_name)')
      .eq('request_id', proposal.request_id)
      .eq('status', 'rejected');

    for (const r of rejected || []) {
      const d = r.drivers;
      if (d?.email) {
        await sendEmail(
          d.email,
          'TuniDrive — Demande de colis : offre non retenue',
          renderEmail({
            title: 'Votre offre n\'a pas été retenue',
            preheader: 'Le client a choisi une autre proposition.',
            body: [
              greeting(`${d.first_name ?? ''} ${d.last_name ?? ''}`),
              paragraph('Le client a choisi une autre offre pour la demande concernée. Merci pour votre proposition.'),
              paragraph('De nouvelles demandes de colis vous attendent sur votre tableau de bord.'),
              button('Voir les demandes', `${SITE_URL}/dashboard`),
            ].join(''),
          })
        );
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

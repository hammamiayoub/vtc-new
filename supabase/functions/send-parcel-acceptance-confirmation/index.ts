import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendExpoPush } from '../_shared/expoPush.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'TuniDrive <noreply@tunidrive.net>';

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

    const client = request.clients;
    const driver = proposal.drivers;
    const formattedDate = new Date(request.desired_date).toLocaleDateString('fr-FR');

    const tripBlock = `
      <p><strong>Départ :</strong> ${request.departure_address}</p>
      <p><strong>Arrivée :</strong> ${request.arrival_address}</p>
      <p><strong>Date souhaitée :</strong> ${formattedDate}</p>
      <p><strong>Prix convenu :</strong> ${proposal.price} ${proposal.currency}</p>`;

    const clientHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background:#f8f9fa;padding:20px;text-align:center;">
          <h1 style="color:#333;margin:0;">TuniDrive — Offre acceptée</h1>
        </div>
        <div style="padding:30px 20px;">
          <h2>Bonjour ${client?.first_name || ''} ${client?.last_name || ''},</h2>
          <p>Vous avez validé l'offre d'un transporteur. Voici ses coordonnées pour organiser le rendez-vous :</p>
          <div style="background:#e8f5e8;padding:20px;border-radius:8px;margin:20px 0;">
            ${tripBlock}
            <hr style="border:none;border-top:1px solid #ccc;margin:15px 0;">
            <p><strong>Transporteur :</strong> ${driver?.first_name || ''} ${driver?.last_name || ''}</p>
            ${driver?.phone ? `<p><strong>Téléphone :</strong> ${driver.phone}</p>` : ''}
            ${driver?.email ? `<p><strong>Email :</strong> ${driver.email}</p>` : ''}
          </div>
        </div>
      </div>`;

    const driverHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background:#f8f9fa;padding:20px;text-align:center;">
          <h1 style="color:#333;margin:0;">TuniDrive — Votre offre a été acceptée</h1>
        </div>
        <div style="padding:30px 20px;">
          <h2>Bonjour ${driver?.first_name || ''} ${driver?.last_name || ''},</h2>
          <p>Le client a accepté votre proposition. Voici ses coordonnées pour organiser le rendez-vous :</p>
          <div style="background:#e3f2fd;padding:20px;border-radius:8px;margin:20px 0;">
            ${tripBlock}
            <hr style="border:none;border-top:1px solid #ccc;margin:15px 0;">
            <p><strong>Client :</strong> ${client?.first_name || ''} ${client?.last_name || ''}</p>
            ${client?.phone ? `<p><strong>Téléphone :</strong> ${client.phone}</p>` : ''}
            ${client?.email ? `<p><strong>Email :</strong> ${client.email}</p>` : ''}
          </div>
        </div>
      </div>`;

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
          `<p>Bonjour ${d.first_name} ${d.last_name},</p>
           <p>Le client a choisi une autre offre pour la demande concernée. Merci pour votre proposition.</p>`
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

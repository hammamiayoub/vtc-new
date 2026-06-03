import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'TuniDrive <noreply@tunidrive.net>';
const SUPPORT_EMAIL = 'support@tunidrive.net';

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
  return direction === 'europe_to_tunisia' ? 'Europe → Tunisie' : 'Tunisie → Europe';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

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

    const formattedDate = new Date(request.desired_date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const itemsHtml = (request.parcel_items || [])
      .map(
        (it: { name: string; quantity: number; weight_kg?: number }) =>
          `<li>${it.name} — ${it.quantity} colis${it.weight_kg ? ` (${it.weight_kg} kg)` : ''}</li>`
      )
      .join('');

    const clientHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background:#f8f9fa;padding:20px;text-align:center;">
          <h1 style="color:#333;margin:0;">TuniDrive — Demande de devis colis</h1>
        </div>
        <div style="padding:30px 20px;">
          <h2>Bonjour ${client?.first_name || ''} ${client?.last_name || ''},</h2>
          <p>Votre demande de transport international de colis a bien été enregistrée.</p>
          <div style="background:#e8f5e8;padding:20px;border-radius:8px;margin:20px 0;">
            <p><strong>Direction :</strong> ${directionLabel(request.direction)}</p>
            <p><strong>Départ :</strong> ${request.departure_address}</p>
            <p><strong>Arrivée :</strong> ${request.arrival_address}</p>
            <p><strong>Date souhaitée :</strong> ${formattedDate}</p>
            <p><strong>Devise des offres :</strong> ${request.currency}</p>
          </div>
          <p>Les transporteurs éligibles ont été notifiés. Vous recevrez un email à chaque nouvelle proposition.</p>
        </div>
      </div>`;

    if (client?.email) {
      await sendEmail(
        client.email,
        'TuniDrive — Confirmation de votre demande de transport de colis',
        clientHtml
      );
    }

    for (const t of transporteurs || []) {
      const driverHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background:#f8f9fa;padding:20px;text-align:center;">
            <h1 style="color:#333;margin:0;">TuniDrive — Nouvelle demande de colis</h1>
          </div>
          <div style="padding:30px 20px;">
            <h2>Bonjour ${t.first_name} ${t.last_name},</h2>
            <p>Une nouvelle demande de transport international correspond à votre profil.</p>
            <div style="background:#e3f2fd;padding:20px;border-radius:8px;margin:20px 0;">
              <p><strong>Direction :</strong> ${directionLabel(request.direction)}</p>
              <p><strong>Départ :</strong> ${request.departure_address}</p>
              <p><strong>Arrivée :</strong> ${request.arrival_address}</p>
              <p><strong>Date souhaitée :</strong> ${formattedDate}</p>
              <p><strong>Devise :</strong> ${request.currency}</p>
              ${itemsHtml ? `<ul>${itemsHtml}</ul>` : ''}
            </div>
            <p>Connectez-vous à votre tableau de bord pour envoyer votre proposition de prix.</p>
            <p style="margin-top:20px;"><a href="https://tunidrive.net/dashboard" style="background:#333;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Voir la demande</a></p>
          </div>
        </div>`;
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
      `[Support] Nouvelle demande colis — ${request.direction}`,
      `<p>Nouvelle demande #${requestId}</p><p>${request.departure_address} → ${request.arrival_address}</p><p>${(transporteurs || []).length} transporteur(s) notifié(s).</p>`
    );

    return new Response(JSON.stringify({ success: true, notified: (transporteurs || []).length }), {
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

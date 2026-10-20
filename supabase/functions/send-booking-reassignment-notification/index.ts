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

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    throw new Error('Configuration email manquante: RESEND_API_KEY');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur Resend ${response.status}: ${errorText}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const { bookingData, clientData, driverData } = await req.json();
    if (!bookingData || !clientData || !driverData?.email || !driverData?.id) {
      throw new Error('Données manquantes: bookingData, clientData ou driverData');
    }

    const scheduledDate = new Date(bookingData.scheduled_time);
    const formattedDate = scheduledDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const driverName = `${escapeHtml(driverData.first_name)} ${escapeHtml(driverData.last_name)}`.trim();
    const clientName = `${escapeHtml(clientData.first_name)} ${escapeHtml(clientData.last_name)}`.trim();
    const notes = bookingData.notes
      ? `<p><strong>Notes du client :</strong> ${escapeHtml(bookingData.notes)}</p>`
      : '';
    const clientPhone = clientData.phone
      ? `<p><strong>Téléphone :</strong> ${escapeHtml(clientData.phone)}</p>`
      : '';

    const driverEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">TuniDrive - Nouvelle réservation</h1>
        </div>
        <div style="padding: 30px 20px;">
          <h2 style="color: #333;">Bonjour ${driverName},</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Vous avez reçu une nouvelle réservation !
          </p>
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2d5a2d; margin-top: 0;">Détails de la course</h3>
            <p><strong>Départ :</strong> ${escapeHtml(bookingData.pickup_address)}</p>
            <p><strong>Arrivée :</strong> ${escapeHtml(bookingData.destination_address)}</p>
            <p><strong>Date et heure :</strong> ${escapeHtml(formattedDate)}</p>
            <p><strong>Distance :</strong> ${escapeHtml(bookingData.distance_km)} km</p>
            <p><strong>Prix :</strong> ${escapeHtml(bookingData.price_tnd)} TND</p>
            ${notes}
          </div>
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1565c0; margin-top: 0;">Informations client</h3>
            <p><strong>Nom :</strong> ${clientName || 'Client'}</p>
            ${clientPhone}
          </div>
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>Action requise :</strong> Connectez-vous à votre tableau de bord pour
              accepter ou refuser cette réservation.
            </p>
          </div>
        </div>
        <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0;">TuniDrive - Plateforme chauffeurs</p>
        </div>
      </div>
    `;

    await sendEmail(
      driverData.email,
      'TuniDrive - Nouvelle réservation reçue',
      driverEmailContent,
    );

    let pushSent = false;
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      const { data: driverRow } = await supabase
        .from('drivers')
        .select('push_token')
        .eq('id', driverData.id)
        .maybeSingle();

      const pushClientName = `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim() || 'Un client';
      pushSent = await sendExpoPush(driverRow?.push_token, {
        title: 'Nouvelle course assignée',
        body: `${pushClientName} vous a assigné une course de ${bookingData.pickup_address} pour le ${formattedDate}`,
        data: {
          type: 'driver-assigned',
          bookingId: bookingData.id,
        },
      });
    } catch (pushError) {
      console.error('Notification téléphone non envoyée:', pushError);
    }

    return new Response(
      JSON.stringify({ success: true, emailSent: true, pushSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la notification';
    console.error(message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});

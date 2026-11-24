import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { requireAdmin } from '../_shared/auth.ts'
import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendExpoPush } from '../_shared/expoPush.ts';
import { FROM_EMAIL } from '../_shared/emailLayout.ts';
import { buildBookingEmails } from '../_shared/vtcBookingEmails.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

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

  // Réservé aux administrateurs (la clé anon, publique, ne suffit pas)
  const __admin = await requireAdmin(req, corsHeaders)
  if (__admin instanceof Response) return __admin

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
      timeZone: 'Africa/Tunis',
    });

    // Même e-mail « nouvelle réservation » que pour une création : gabarit commun, valeurs échappées
    const { driver: driverEmailContent } = buildBookingEmails({
      bookingData,
      clientData,
      driverData,
      formattedDate,
    });

    await sendEmail(
      driverData.email,
      'TuniDrive — Nouvelle réservation reçue',
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

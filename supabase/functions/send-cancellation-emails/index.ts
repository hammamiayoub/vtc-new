import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'TuniDrive <noreply@tunidrive.net>'

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
    minute: '2-digit'
  });

  // Email pour le client
  const clientEmailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #dc2626; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">TuniDrive</h1>
        <p style="color: #fecaca; margin: 10px 0 0 0;">Annulation de réservation</p>
      </div>
      
      <div style="padding: 30px 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">Réservation annulée</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          ${cancelledBy === 'client' 
            ? 'Votre réservation a été annulée avec succès.' 
            : 'Votre réservation a été annulée par le chauffeur. Nous cherchons un autre chauffeur pour vous.'
          }
        </p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e293b; margin-top: 0; margin-bottom: 15px;">Détails de la réservation :</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569; width: 120px;">Départ :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${pickupAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Arrivée :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${destinationAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Date :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${scheduledDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Prix :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${priceTnd} TND</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Chauffeur :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${driverName}</td>
            </tr>
          </table>
        </div>
        
        ${cancelledBy === 'driver' ? `
        <div style="background-color: #e0f2fe; border: 1px solid #0288d1; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #01579b; margin-top: 0; margin-bottom: 10px;">Prochaines étapes :</h3>
          <ul style="color: #01579b; margin: 0; padding-left: 20px;">
            <li>Nous cherchons un autre chauffeur pour votre course</li>
            <li>Vous recevrez une notification dès qu'un chauffeur sera trouvé</li>
            <li>Si aucun chauffeur n'est disponible, nous vous contacterons</li>
          </ul>
        </div>
        ` : ''}
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          ${cancelledBy === 'client' 
            ? 'Si vous souhaitez réserver une nouvelle course, vous pouvez le faire depuis votre tableau de bord.'
            : 'Nous nous excusons pour ce désagrément et vous remercions de votre compréhension.'
          }
        </p>
      </div>
      
      <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
        <p style="margin: 0;">TuniDrive - Votre transport sur mesure</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #ccc;">
          Cet email a été envoyé automatiquement, merci de ne pas y répondre.
        </p>
      </div>
    </div>
  `;

  // Email pour le chauffeur
  const driverEmailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #dc2626; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">TuniDrive</h1>
        <p style="color: #fecaca; margin: 10px 0 0 0;">Course annulée</p>
      </div>
      
      <div style="padding: 30px 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">Course annulée</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          ${cancelledBy === 'client' 
            ? 'Le client a annulé la course qui vous était assignée.'
            : 'Vous avez annulé la course assignée.'
          }
        </p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e293b; margin-top: 0; margin-bottom: 15px;">Détails de la course :</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569; width: 120px;">Client :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${clientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Départ :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${pickupAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Arrivée :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${destinationAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Date :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${scheduledDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Prix :</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${priceTnd} TND</td>
            </tr>
          </table>
        </div>
        
        ${cancelledBy === 'client' ? `
        <div style="background-color: #e0f2fe; border: 1px solid #0288d1; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #01579b; margin-top: 0; margin-bottom: 10px;">Prochaines étapes :</h3>
          <ul style="color: #01579b; margin: 0; padding-left: 20px;">
            <li>Cette course n'est plus dans votre planning</li>
            <li>Vous pouvez accepter de nouvelles courses</li>
            <li>Votre statut reste actif</li>
          </ul>
        </div>
        ` : `
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #92400e; margin-top: 0; margin-bottom: 10px;">Important :</h3>
          <p style="color: #92400e; margin: 0;">
            L'annulation de courses peut affecter votre réputation. Veuillez éviter les annulations sauf en cas de force majeure.
          </p>
        </div>
        `}
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          ${cancelledBy === 'client' 
            ? 'Vous recevrez de nouvelles propositions de courses dès qu\'elles seront disponibles.'
            : 'Si vous avez des questions concernant cette annulation, contactez le support.'
          }
        </p>
      </div>
      
      <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
        <p style="margin: 0;">TuniDrive - Votre transport sur mesure</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #ccc;">
          Cet email a été envoyé automatiquement, merci de ne pas y répondre.
        </p>
      </div>
    </div>
  `;

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
        subject: `TuniDrive - Réservation annulée ${cancelledBy === 'client' ? '(par vous)' : '(par le chauffeur)'}`,
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
        subject: `TuniDrive - Course annulée ${cancelledBy === 'client' ? '(par le client)' : '(par vous)'}`,
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

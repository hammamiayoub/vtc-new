/**
 * Test E2E automatisé : client → demande → transporteur → proposition → acceptation
 *
 * Prérequis dans .env :
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *   TEST_CLIENT_EMAIL, TEST_CLIENT_PASSWORD
 *   TEST_DRIVER_EMAIL, TEST_DRIVER_PASSWORD
 *
 * Usage: node scripts/test-parcel-e2e.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv() {
  const envPath = path.join(root, '.env');
  const vars = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    vars[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return vars;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const clientEmail = env.TEST_CLIENT_EMAIL;
const clientPassword = env.TEST_CLIENT_PASSWORD;
const driverEmail = env.TEST_DRIVER_EMAIL;
const driverPassword = env.TEST_DRIVER_PASSWORD;

function requireEnv(name, val) {
  if (!val) throw new Error(`Variable manquante: ${name}`);
}

requireEnv('VITE_SUPABASE_URL', url);
requireEnv('VITE_SUPABASE_ANON_KEY', anonKey);
requireEnv('TEST_CLIENT_EMAIL', clientEmail);
requireEnv('TEST_CLIENT_PASSWORD', clientPassword);
requireEnv('TEST_DRIVER_EMAIL', driverEmail);
requireEnv('TEST_DRIVER_PASSWORD', driverPassword);

const desiredDate = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
})();

async function signIn(supabase, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Connexion ${email}: ${error.message}`);
  return data.user;
}

async function invokeEmail(fn, body) {
  const res = await fetch(`${url}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${fn} HTTP ${res.status}: ${text}`);
  return text;
}

async function main() {
  console.log('\n🚀 Test E2E — Transport de colis\n');

  const clientSb = createClient(url, anonKey);
  const driverSb = createClient(url, anonKey);

  // ── Étape 1 : Client crée une demande ──
  console.log('1️⃣  Connexion client…');
  const clientUser = await signIn(clientSb, clientEmail, clientPassword);
  console.log(`   ✅ Client: ${clientUser.id}`);

  console.log('2️⃣  Création demande de devis…');
  const { data: request, error: reqErr } = await clientSb
    .from('parcel_quote_requests')
    .insert({
      client_id: clientUser.id,
      direction: 'europe_to_tunisia',
      departure_address: '10 Rue de Rivoli, Paris, France',
      departure_country: 'France',
      arrival_address: 'Avenue Habib Bourguiba, Tunis, Tunisia',
      arrival_country: 'Tunisia',
      desired_date: desiredDate,
      notes: 'Test E2E automatisé',
      status: 'pending',
    })
    .select()
    .single();
  if (reqErr) throw new Error(`Création demande: ${reqErr.message}`);
  console.log(`   ✅ Demande ${request.id} (devise: ${request.currency})`);

  const { error: itemErr } = await clientSb.from('parcel_items').insert({
    request_id: request.id,
    name: 'Cartons test',
    quantity: 2,
    weight_kg: 25,
    volume_m3: 0.5,
  });
  if (itemErr) throw new Error(`Items: ${itemErr.message}`);
  console.log('   ✅ Obets ajoutés');

  console.log('3️⃣  Notification transporteurs (email)…');
  try {
    await invokeEmail('send-parcel-request-to-transporteurs', {
      requestId: request.id,
      clientId: clientUser.id,
    });
    console.log('   ✅ Edge function OK');
  } catch (e) {
    console.log(`   ⚠️  Email: ${e.message}`);
  }

  const { data: matching, error: matchErr } = await clientSb.rpc('get_matching_transporteurs', {
    p_request_id: request.id,
  });
  if (matchErr) console.log(`   ⚠️  Matching RPC: ${matchErr.message}`);
  else console.log(`   📬 Transporteurs éligibles: ${matching?.length ?? 0}`);

  await clientSb.auth.signOut();

  // ── Étape 2 : Transporteur envoie proposition ──
  console.log('\n4️⃣  Connexion transporteur…');
  const driverUser = await signIn(driverSb, driverEmail, driverPassword);
  console.log(`   ✅ Transporteur: ${driverUser.id}`);

  const { data: proposal, error: propErr } = await driverSb
    .from('parcel_quote_proposals')
    .insert({
      request_id: request.id,
      driver_id: driverUser.id,
      price: 450,
      message: 'Proposition test E2E — livraison sous 10 jours',
      status: 'sent',
    })
    .select()
    .single();
  if (propErr) throw new Error(`Proposition: ${propErr.message}`);
  console.log(`   ✅ Proposition ${proposal.id} — ${proposal.price} ${proposal.currency}`);

  console.log('5️⃣  Notification proposition au client…');
  try {
    await invokeEmail('send-parcel-proposal-notification', {
      proposalId: proposal.id,
      requestId: request.id,
    });
    console.log('   ✅ Edge function OK');
  } catch (e) {
    console.log(`   ⚠️  Email: ${e.message}`);
  }

  await driverSb.auth.signOut();

  // ── Étape 3 : Client accepte ──
  console.log('\n6️⃣  Connexion client (acceptation)…');
  await signIn(clientSb, clientEmail, clientPassword);

  const { data: accepted, error: accErr } = await clientSb.rpc('accept_parcel_proposal', {
    p_proposal_id: proposal.id,
  });
  if (accErr) throw new Error(`Acceptation: ${accErr.message}`);
  console.log(`   ✅ Proposition acceptée — statut: ${accepted.status}`);

  console.log('7️⃣  Email confirmation aux 2 parties…');
  try {
    await invokeEmail('send-parcel-acceptance-confirmation', { proposalId: proposal.id });
    console.log('   ✅ Edge function OK');
  } catch (e) {
    console.log(`   ⚠️  Email: ${e.message}`);
  }

  const { data: finalReq } = await clientSb
    .from('parcel_quote_requests')
    .select('status, accepted_proposal_id, currency')
    .eq('id', request.id)
    .single();

  console.log('\n✅ Test E2E terminé avec succès');
  console.log(`   Demande: ${request.id}`);
  console.log(`   Statut final: ${finalReq?.status}`);
  console.log(`   Proposition acceptée: ${finalReq?.accepted_proposal_id}`);
  console.log(`\n   → Vérifiez les emails et l’UI : /client-dashboard (Mes devis colis)\n`);

  await clientSb.auth.signOut();
}

main().catch((e) => {
  console.error('\n❌ Échec:', e.message);
  process.exit(1);
});

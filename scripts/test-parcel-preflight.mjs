/**
 * Vérifications préalables au test E2E transport de colis.
 * Usage: node scripts/test-parcel-preflight.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env introuvable à la racine du projet');
  }
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

if (!url || !anonKey) {
  console.error('❌ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant dans .env');
  process.exit(1);
}

const supabase = createClient(url, anonKey);

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 7);
const testDate = tomorrow.toISOString().slice(0, 10);

console.log('\n🔍 Preflight — Transport international de colis\n');
console.log(`   Supabase: ${url}`);
console.log(`   Date test (disponibilité): ${testDate}\n`);

async function main() {
  // 1. Tables
  const tables = ['parcel_quote_requests', 'parcel_items', 'parcel_photos', 'parcel_quote_proposals'];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    console.log(error ? `❌ Table ${table}: ${error.message}` : `✅ Table ${table} accessible`);
  }

  // 2. Transporteurs actifs (lecture publique limitée par RLS — peut être vide sans auth admin)
  const { data: drivers, error: driversErr } = await supabase
    .from('drivers')
    .select('id, first_name, last_name, email, status, driver_type')
    .in('driver_type', ['transporteur', 'both'])
    .eq('status', 'active');

  if (driversErr) {
    console.log(`\n⚠️  Liste transporteurs (RLS): ${driversErr.message}`);
    console.log('   → Normal sans session admin. Vérifiez manuellement en SQL Editor.\n');
  } else {
    console.log(`\n📦 Transporteurs actifs (transporteur/both): ${drivers?.length ?? 0}`);
    for (const d of drivers || []) {
      const { count: vehicleCount } = await supabase
        .from('vehicles')
        .select('id', { count: 'exact', head: true })
        .eq('driver_id', d.id)
        .is('deleted_at', null);

      const { data: avail } = await supabase
        .from('driver_availability')
        .select('id')
        .eq('driver_id', d.id)
        .eq('date', testDate)
        .eq('is_available', true)
        .limit(1);

      const ok = (vehicleCount ?? 0) > 0 && (avail?.length ?? 0) > 0;
      console.log(
        `   ${ok ? '✅' : '⚠️ '} ${d.first_name} ${d.last_name} (${d.email}) — véhicules: ${vehicleCount ?? 0}, dispo ${testDate}: ${avail?.length ? 'oui' : 'non'}`
      );
    }
  }

  // 3. Edge functions (ping OPTIONS)
  const functions = [
    'send-parcel-request-to-transporteurs',
    'send-parcel-proposal-notification',
    'send-parcel-acceptance-confirmation',
  ];
  console.log('\n📧 Edge Functions:');
  for (const fn of functions) {
    try {
      const res = await fetch(`${url}/functions/v1/${fn}`, { method: 'OPTIONS' });
      console.log(`   ${res.ok ? '✅' : '⚠️ '} ${fn} (HTTP ${res.status})`);
    } catch (e) {
      console.log(`   ❌ ${fn}: ${e.message}`);
    }
  }

  console.log('\n📋 Prochaine étape: lancer le test E2E');
  console.log('   node scripts/test-parcel-e2e.mjs');
  console.log('   (nécessite TEST_CLIENT_EMAIL, TEST_CLIENT_PASSWORD, TEST_DRIVER_EMAIL, TEST_DRIVER_PASSWORD dans .env)\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

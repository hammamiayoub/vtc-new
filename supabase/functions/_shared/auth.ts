/**
 * Contrôles d'accès communs aux fonctions Edge.
 *
 * Contexte : la clé « anon » est publique (visible dans toute trace réseau) et la passerelle Supabase l'accepte
 * comme « jeton valide ». Sans contrôle dans la fonction, n'importe qui peut donc l'appeler. Ce module vérifie
 * que l'appelant est un VRAI utilisateur connecté, puis ce qu'il a le droit de faire.
 *
 * Copie identique dans les deux dépôts (vtc-new et TuniDriveMobile) : à garder synchronisée.
 */
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

export type Caller = { user: User; isAdmin: boolean };

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });
}

/** Utilisateur connecté derrière l'en-tête Authorization, ou null (clé anon, jeton absent / expiré). */
export async function getCaller(req: Request): Promise<Caller | null> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const userClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data?.user) return null; // la clé anon n'a pas de « sub » : refusée ici

  const { data: adminRow } = await adminClient()
    .from('admin_users')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle();

  return { user: data.user, isAdmin: !!adminRow };
}

export function jsonResponse(
  corsHeaders: Record<string, string>,
  status: number,
  body: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Exige un utilisateur connecté. Renvoie le Caller, ou une Response 401 à renvoyer telle quelle. */
export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<Caller | Response> {
  const caller = await getCaller(req);
  return caller ?? jsonResponse(corsHeaders, 401, { success: false, error: 'unauthorized' });
}

/** Exige un administrateur. */
export async function requireAdmin(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<Caller | Response> {
  const caller = await getCaller(req);
  if (!caller) return jsonResponse(corsHeaders, 401, { success: false, error: 'unauthorized' });
  if (!caller.isAdmin) return jsonResponse(corsHeaders, 403, { success: false, error: 'forbidden' });
  return caller;
}

/**
 * Limite de fréquence (une action par clé et par fenêtre). true = autorisé, false = trop fréquent.
 * Dépend de la fonction SQL edge_throttle_hit (migration 20261124120000). En cas d'erreur, on laisse passer
 * pour ne pas bloquer un parcours légitime.
 */
export async function throttle(key: string, windowSeconds: number): Promise<boolean> {
  const { data, error } = await adminClient().rpc('edge_throttle_hit', {
    p_key: key,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error('[throttle] indisponible, requête autorisée:', error.message);
    return true;
  }
  return data === true;
}

/**
 * Les adresses e-mail destinataires doivent toutes appartenir à de vrais comptes (clients ou chauffeurs),
 * et l'appelant doit être administrateur ou l'un des destinataires (client ou chauffeur de la réservation).
 * Empêche d'utiliser nos fonctions pour envoyer du contenu à des adresses externes arbitraires.
 */
export async function recipientsAllowed(caller: Caller, emails: (string | null | undefined)[]): Promise<boolean> {
  const wanted = [...new Set(emails.filter(Boolean).map((e) => String(e).trim().toLowerCase()))];
  if (wanted.length === 0) return false;
  if (caller.isAdmin) return true;

  const callerEmail = (caller.user.email ?? '').toLowerCase();
  if (!wanted.includes(callerEmail)) return false;

  const db = adminClient();
  const [{ data: clients }, { data: drivers }] = await Promise.all([
    db.from('clients').select('email').in('email', wanted),
    db.from('drivers').select('email').in('email', wanted),
  ]);
  const known = new Set(
    [...(clients ?? []), ...(drivers ?? [])].map((r: { email: string }) => r.email.toLowerCase()),
  );
  return wanted.every((e) => known.has(e));
}

/** L'appelant est-il le client ou le chauffeur de cette réservation (ou un administrateur) ? */
export async function callerInBooking(caller: Caller, bookingId: unknown): Promise<boolean> {
  if (caller.isAdmin) return true;
  if (typeof bookingId !== 'string' || !/^[0-9a-f-]{36}$/i.test(bookingId)) return false;
  const { data } = await adminClient()
    .from('bookings')
    .select('client_id, driver_id')
    .eq('id', bookingId)
    .maybeSingle();
  return !!data && (data.client_id === caller.user.id || data.driver_id === caller.user.id);
}

/**
 * Réservé aux appels internes (cron pg_cron, autres fonctions) : le jeton doit être la clé service_role.
 * La clé « anon » (publique) est refusée. Comparaison en temps constant.
 */
export function requireServiceRole(
  req: Request,
  corsHeaders: Record<string, string>,
): Response | null {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  const expected = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  let diff = token.length ^ expected.length;
  for (let i = 0; i < Math.max(token.length, expected.length); i++) {
    diff |= (token.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  }
  if (!expected || diff !== 0) return jsonResponse(corsHeaders, 401, { success: false, error: 'unauthorized' });
  return null;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

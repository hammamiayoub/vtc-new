import { supabase } from '../lib/supabase';

/**
 * Valeur de l'en-tête Authorization pour appeler une fonction Edge avec `fetch`.
 * Utilise le jeton de l'utilisateur connecté : les fonctions refusent la clé « anon » seule, qui est publique.
 * Sans session (inscription, mot de passe oublié), repli sur la clé « anon ».
 */
export async function authBearer(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return `Bearer ${data.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`;
}

import { supabase } from '../lib/supabase';

/**
 * Connexion depuis l'application mobile (bouton « Suivi de souscription »).
 *
 * L'Edge Function `driver-portal-link` ouvre le site avec
 * `?token_hash=…&type=magiclink` : un lien à usage unique, échangé ici contre une
 * session (flux compatible PKCE, contrairement au `#access_token` du lien Supabase brut).
 *
 * Le jeton est retiré de l'URL immédiatement pour ne pas rester dans l'historique.
 * L'appel est mutualisé : React StrictMode exécute deux fois les effets en dev,
 * et un second verifyOtp échouerait (jeton déjà consommé).
 */
let pending: Promise<void> | null = null;

export function consumeAppSignInLink(): Promise<void> {
  if (pending) return pending;

  const url = new URL(window.location.href);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  if (!tokenHash || type !== 'magiclink') {
    pending = Promise.resolve();
    return pending;
  }

  url.searchParams.delete('token_hash');
  url.searchParams.delete('type');
  const search = url.searchParams.toString();
  window.history.replaceState(window.history.state, '', `${url.pathname}${search ? `?${search}` : ''}`);

  pending = (async () => {
    // Remplace une éventuelle session d'un autre compte déjà ouverte dans ce navigateur.
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
    if (error) console.error('Connexion depuis l’application impossible:', error.message);
  })();
  return pending;
}

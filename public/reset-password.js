// Page de réinitialisation de mot de passe (reset-password.html).
// Le lien reçu par e-mail contient une session « recovery » dans l'URL : elle est lue une fois,
// retirée de la barre d'adresse, puis supprimée du navigateur après le changement de mot de passe.
(function () {
  'use strict';

  // Seule une URL Supabase officielle est acceptée (voir loadConfig).
  const SUPABASE_URL_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co$/;
  const MIN_LENGTH = 8;
  // Mêmes règles que l'application mobile (lib/passwordRules.ts).
  const SPECIAL_CHARACTERS = /[@$!%*?&]/;

  const $ = (id) => document.getElementById(id);
  let client = null;

  function setMessage(text) {
    $('message').textContent = text;
  }

  function showError(message) {
    const el = $('error');
    el.style.display = 'block';
    el.textContent = message;
    setMessage('Erreur');
    $('spinner').style.display = 'none';
  }

  function passwordError(password) {
    if (password.length < MIN_LENGTH) return 'Le mot de passe doit contenir au moins ' + MIN_LENGTH + ' caractères.';
    if (!/[a-z]/.test(password)) return 'Le mot de passe doit contenir au moins une minuscule.';
    if (!/[A-Z]/.test(password)) return 'Le mot de passe doit contenir au moins une majuscule.';
    if (!/\d/.test(password)) return 'Le mot de passe doit contenir au moins un chiffre.';
    if (!SPECIAL_CHARACTERS.test(password)) return 'Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&).';
    return null;
  }

  // La configuration vient du serveur du site. Les paramètres d'URL `sbUrl` / `sbAnon` (anciennes
  // versions de l'application) sont ignorés : sinon un lien piégé pourrait envoyer le nouveau mot de
  // passe vers un serveur contrôlé par un tiers.
  async function loadConfig() {
    try {
      const resp = await fetch('/.netlify/functions/public-config', { cache: 'no-store' });
      if (resp.ok) {
        const json = await resp.json();
        const url = json && json.VITE_SUPABASE_URL;
        const key = json && json.VITE_SUPABASE_ANON_KEY;
        if (url && key && SUPABASE_URL_PATTERN.test(url)) return { url, key };
      }
    } catch (e) {
      console.warn('Configuration publique indisponible.');
    }
    return null;
  }

  // Retire les jetons de l'adresse affichée (historique, partage d'écran, copier-coller du lien).
  function clearUrlSecrets() {
    try {
      const params = new URLSearchParams(window.location.search);
      ['code', 'sbUrl', 'sbAnon'].forEach((name) => params.delete(name));
      const query = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (query ? '?' + query : ''));
    } catch (e) {
      // sans conséquence
    }
  }

  async function bootstrapRecoveryPage() {
    try {
      setMessage('Vérification de votre lien de réinitialisation...');

      // Laisser detectSessionInUrl agir un court instant
      await new Promise((r) => setTimeout(r, 50));

      let { data: { session } } = await client.auth.getSession();
      if (!session) {
        // Fallback : extraire les jetons après le DERNIER '#'
        const href = window.location.href;
        const idx = href.lastIndexOf('#');
        if (idx !== -1) {
          const hash = href.substring(idx + 1);
          const access = hash.match(/access_token=([^&]+)/)?.[1];
          const refresh = hash.match(/refresh_token=([^&]+)/)?.[1];
          if (access && refresh) {
            const { data, error } = await client.auth.setSession({
              access_token: decodeURIComponent(access),
              refresh_token: decodeURIComponent(refresh),
            });
            if (error) throw error;
            session = data.session;
          }
        }
      }

      clearUrlSecrets();

      if (!session) {
        showError('Session de réinitialisation expirée. Veuillez demander un nouveau lien.');
        return;
      }

      $('spinner').style.display = 'none';
      setMessage('Entrez votre nouveau mot de passe pour terminer la réinitialisation.');
      $('form').style.display = 'block';
      $('form').addEventListener('submit', onSubmit);
    } catch (e) {
      console.warn('Erreur de préparation de la page.');
      showError('Une erreur est survenue lors de la préparation de la page.');
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    const pwd = $('pwd').value;
    const pwd2 = $('pwd2').value;

    const ruleError = passwordError(pwd);
    if (ruleError) {
      showError(ruleError);
      $('form').style.display = 'block';
      return;
    }
    if (pwd !== pwd2) {
      showError('Les deux mots de passe ne correspondent pas.');
      $('form').style.display = 'block';
      return;
    }

    try {
      $('error').style.display = 'none';
      setMessage('Mise à jour de votre mot de passe...');
      $('spinner').style.display = 'block';

      const { error } = await client.auth.updateUser({ password: pwd });
      if (error) throw error;

      // La session de récupération ne doit pas rester dans le navigateur.
      try {
        await client.auth.signOut({ scope: 'local' });
      } catch (signOutError) {
        // sans conséquence : le mot de passe est déjà changé
      }

      $('pwd').value = '';
      $('pwd2').value = '';
      $('spinner').style.display = 'none';
      setMessage('');
      $('form').style.display = 'none';
      $('success').style.display = 'block';
    } catch (err) {
      // Seuls le code et le statut sont journalisés (jamais le mot de passe ni les jetons).
      console.warn('Échec de la mise à jour du mot de passe :', err && err.code, err && err.status);
      showError(updateErrorMessage(err));
      $('form').style.display = 'block';
    }
  }

  function updateErrorMessage(err) {
    const code = (err && err.code) || '';
    const text = ((err && err.message) || '').toLowerCase();
    if (code === 'same_password' || text.includes('different from the old')) {
      return 'Le nouveau mot de passe doit être différent de l’ancien.';
    }
    if (code === 'weak_password' || text.includes('weak') || text.includes('pwned') || text.includes('at least')) {
      return 'Ce mot de passe est refusé car trop faible ou trop courant. Choisissez-en un plus robuste.';
    }
    if (code === 'session_not_found' || code === 'bad_jwt' || (err && err.status === 401) || text.includes('session')) {
      return 'Le lien a expiré. Veuillez demander un nouveau lien depuis l’application.';
    }
    if (err && (err.status === 429 || code === 'over_request_rate_limit')) {
      return 'Trop de tentatives. Patientez quelques minutes puis réessayez.';
    }
    return 'Impossible de mettre à jour le mot de passe. Réessayez ou demandez un nouveau lien.';
  }

  async function init() {
    // Type de compte (client / chauffeur) : simple indication, jamais utilisée pour une décision.
    const userType = (new URLSearchParams(window.location.search).get('type') || 'client').toLowerCase();
    const typeLabel = userType === 'driver' ? 'Chauffeur' : 'Client';
    setMessage('Compte détecté : ' + typeLabel + ' • Préparation du formulaire de réinitialisation...');

    const cfg = await loadConfig();
    if (!cfg) {
      showError('Service momentanément indisponible. Réessayez depuis l’application ou contactez le support.');
      return;
    }
    if (!window.supabase) {
      showError('Impossible de charger le module de sécurité. Rechargez la page.');
      return;
    }

    client = window.supabase.createClient(cfg.url, cfg.key, {
      auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: true },
    });

    bootstrapRecoveryPage();
  }

  init().catch(() => showError('Une erreur est survenue lors de l’initialisation de la page.'));
})();

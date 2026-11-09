export type SignupCallback = 'confirmed' | 'invalid';

function isClientConfirmPath(path: string): boolean {
  const normalized = path.replace(/\/$/, '') || '/';
  return (
    normalized === '/' ||
    normalized === '/en' ||
    normalized === '/client-login' ||
    normalized === '/en/client-login'
  );
}

/** Lu au premier affichage, avant que Supabase retire le code ou le jeton de l'URL. */
export function readSignupCallback(): SignupCallback | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const search = new URLSearchParams(window.location.search);
  const type = hash.get('type') || search.get('type');
  if (type === 'recovery') return null;

  const accountConfirmed = search.get('account') === 'confirmed';
  const signupType = type === 'signup' || type === 'email';
  const clientLanding = isClientConfirmPath(window.location.pathname);
  const clientCode =
    clientLanding && search.has('code') && type !== 'magiclink' && type !== 'invite';
  const expiredLink =
    clientLanding &&
    (hash.get('error_code') === 'otp_expired' || search.get('error_code') === 'otp_expired');
  const hasError = Boolean(
    hash.get('error') || search.get('error') || hash.get('error_code') || search.get('error_code'),
  );
  const aboutSignup = signupType || accountConfirmed || clientCode || expiredLink;

  if (!aboutSignup) return null;
  if (hasError) return 'invalid';
  return 'confirmed';
}

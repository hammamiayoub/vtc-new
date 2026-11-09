export type SignupCallback = 'confirmed' | 'invalid';
export type SignupAudience = 'client' | 'driver';

export interface SignupCallbackState {
  status: SignupCallback;
  audience: SignupAudience;
}

function normalizePath(path: string): string {
  return path.replace(/\/$/, '') || '/';
}

function isClientConfirmPath(path: string): boolean {
  const normalized = normalizePath(path);
  return (
    normalized === '/' ||
    normalized === '/en' ||
    normalized === '/client-login' ||
    normalized === '/en/client-login'
  );
}

function isDriverConfirmPath(path: string): boolean {
  const normalized = normalizePath(path);
  return normalized === '/driver-login' || normalized === '/en/driver-login';
}

/** Lu au premier affichage, avant que Supabase retire le code ou le jeton de l'URL. */
export function readSignupCallback(): SignupCallbackState | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const search = new URLSearchParams(window.location.search);
  const type = hash.get('type') || search.get('type');
  if (type === 'recovery') return null;

  const driverLanding = isDriverConfirmPath(window.location.pathname);
  const clientLanding = isClientConfirmPath(window.location.pathname);
  const landing = driverLanding || clientLanding;
  const accountConfirmed = search.get('account') === 'confirmed';
  const signupType = type === 'signup' || type === 'email';
  const authCode =
    landing && search.has('code') && type !== 'magiclink' && type !== 'invite';
  const expiredLink =
    landing &&
    (hash.get('error_code') === 'otp_expired' || search.get('error_code') === 'otp_expired');
  const hasError = Boolean(
    hash.get('error') || search.get('error') || hash.get('error_code') || search.get('error_code'),
  );
  const aboutSignup = signupType || (landing && accountConfirmed) || authCode || expiredLink;

  if (!aboutSignup) return null;
  return {
    status: hasError ? 'invalid' : 'confirmed',
    audience: driverLanding ? 'driver' : 'client',
  };
}

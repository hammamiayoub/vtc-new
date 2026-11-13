const APP_VISIT_FLAG = 'td_in_tunidrive_app';

/**
 * Vrai seulement si la page est ouverte par l'application TuniDrive :
 * WebView React Native, user-agent de l'app, ou lien ?source=app.
 * Les navigateurs intégrés (Instagram, Facebook) ne sont pas concernés.
 */
export function isTuniDriveAppVisit(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    if (window.sessionStorage.getItem(APP_VISIT_FLAG) === '1') return true;
  } catch {
    /* sessionStorage indisponible */
  }

  const source = new URLSearchParams(window.location.search).get('source');
  const ua = navigator.userAgent || '';
  const inApp =
    source === 'app' ||
    /TuniDrive|com\.tunidrive\.mobile/i.test(ua) ||
    'ReactNativeWebView' in window;

  if (!inApp) return false;

  try {
    window.sessionStorage.setItem(APP_VISIT_FLAG, '1');
  } catch {
    /* le signal de l'URL ou du WebView suffit pour cette page */
  }
  return true;
}

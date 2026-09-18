export type CookieConsentChoice = 'accepted' | 'rejected';

const STORAGE_KEY = 'tunidrive_cookie_consent';
const BANNER_DISMISS_KEY = 'td_cookie_banner_dismissed_session';

declare global {
  interface Window {
    loadThirdPartyScripts?: () => void;
    __tdThirdPartyLoaded?: boolean;
  }
}

export function getCookieConsent(): CookieConsentChoice | null {
  if (typeof window === 'undefined') return null;

  const value = localStorage.getItem(STORAGE_KEY);
  if (value === 'accepted' || value === 'rejected') {
    return value;
  }
  return null;
}

export function hasCookieConsentChoice(): boolean {
  return getCookieConsent() !== null;
}

export function setCookieConsent(choice: CookieConsentChoice): void {
  localStorage.setItem(STORAGE_KEY, choice);
  sessionStorage.removeItem(BANNER_DISMISS_KEY);

  if (choice === 'accepted') {
    window.loadThirdPartyScripts?.();
  }
}

export function isCookieBannerDismissedThisSession(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(BANNER_DISMISS_KEY) === '1';
}

export function dismissCookieBannerForSession(): void {
  sessionStorage.setItem(BANNER_DISMISS_KEY, '1');
  document.documentElement.style.removeProperty('--td-bottom-banner-offset');
}

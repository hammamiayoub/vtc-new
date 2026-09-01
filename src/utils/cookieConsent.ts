export type CookieConsentChoice = 'accepted' | 'rejected';

const STORAGE_KEY = 'tunidrive_cookie_consent';

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

  if (choice === 'accepted') {
    window.loadThirdPartyScripts?.();
  }
}

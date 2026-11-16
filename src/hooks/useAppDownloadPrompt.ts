import { useCallback, useEffect, useState } from 'react';
import { getCookieConsent, isCookieBannerDismissedThisSession } from '../utils/cookieConsent';
import { isTuniDriveAppVisit } from '../utils/tunidriveApp';

const STORAGE_KEY = 'td_app_prompt_shown_at';
/** Délai avant de reproposer l'application sur le même appareil. */
const REMIND_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
/** Sans défilement, la bannière attend ce délai avant d'apparaître. */
const IDLE_DELAY_MS = 20_000;
/** Part de la page à faire défiler pour déclencher la bannière. */
const SCROLL_RATIO = 0.5;
const COOKIE_BANNER_RECHECK_MS = 3_000;

function wasShownRecently(): boolean {
  try {
    const shownAt = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(shownAt) && shownAt > 0 && Date.now() - shownAt < REMIND_AFTER_MS;
  } catch {
    return false;
  }
}

function rememberShown(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* stockage indisponible : la bannière pourra réapparaître à la prochaine visite */
  }
}

function isCookieBannerVisible(): boolean {
  return getCookieConsent() === null && !isCookieBannerDismissedThisSession();
}

/**
 * Bannière « Téléchargez l'application » : proposée après un signe d'intérêt (défilement de la
 * moitié de la page, ou 20 s passées dessus), jamais par-dessus le bandeau cookies, et au plus
 * une fois par semaine et par appareil.
 */
export function useAppDownloadPrompt(): { isOpen: boolean; close: () => void } {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isTuniDriveAppVisit() || wasShownRecently()) return;

    let done = false;
    let idleTimer = 0;
    let recheckTimer = 0;

    const cleanup = () => {
      window.clearTimeout(idleTimer);
      window.clearTimeout(recheckTimer);
      window.removeEventListener('scroll', onScroll);
    };

    const show = () => {
      if (done) return;
      // Un seul bandeau à la fois : on attend que le visiteur ait répondu aux cookies.
      if (isCookieBannerVisible()) {
        window.clearTimeout(recheckTimer);
        recheckTimer = window.setTimeout(show, COOKIE_BANNER_RECHECK_MS);
        return;
      }
      done = true;
      cleanup();
      rememberShown();
      setIsOpen(true);
    };

    function onScroll() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable > 0 && window.scrollY / scrollable >= SCROLL_RATIO) show();
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    idleTimer = window.setTimeout(show, IDLE_DELAY_MS);

    return () => {
      done = true;
      cleanup();
    };
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, close };
}

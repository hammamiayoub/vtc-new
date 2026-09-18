import React, { useEffect, useRef, useState } from 'react';
import { Cookie, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  dismissCookieBannerForSession,
  getCookieConsent,
  isCookieBannerDismissedThisSession,
  setCookieConsent,
  type CookieConsentChoice,
} from '../utils/cookieConsent';

interface CookieConsentBannerProps {
  onConsentChange: (choice: CookieConsentChoice) => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  onConsentChange,
}) => {
  const bannerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(
    () => getCookieConsent() === null && !isCookieBannerDismissedThisSession(),
  );

  useEffect(() => {
    if (!visible || !bannerRef.current) {
      document.documentElement.style.removeProperty('--td-bottom-banner-offset');
      return;
    }

    const updateOffset = () => {
      const height = bannerRef.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty(
        '--td-bottom-banner-offset',
        `${height + 16}px`,
      );
    };

    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(bannerRef.current);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--td-bottom-banner-offset');
    };
  }, [visible]);

  const handleChoice = (choice: CookieConsentChoice) => {
    setCookieConsent(choice);
    setVisible(false);
    onConsentChange(choice);
  };

  const handleClose = () => {
    dismissCookieBannerForSession();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      ref={bannerRef}
      className="fixed bottom-0 left-0 right-0 z-[100] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none"
      role="region"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
    >
      <div className="page-container pointer-events-auto">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-black flex items-center justify-center">
                <Cookie className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2
                  id="cookie-consent-title"
                  className="text-base sm:text-lg font-bold text-gray-900 leading-snug"
                >
                  Ce site utilise des cookies
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Conformité RGPD
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex-shrink-0 p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label="Fermer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-4 py-4 sm:px-5 sm:py-4 space-y-4">
            <p
              id="cookie-consent-description"
              className="text-sm text-gray-700 leading-relaxed"
            >
              TuniDrive utilise des cookies pour le fonctionnement du site, vos préférences
              de session et, avec votre accord, la mesure d&apos;audience et la publicité.
              Consultez notre{' '}
              <Link
                to="/privacy-policy"
                className="text-blue-600 hover:text-blue-800 underline underline-offset-2 font-medium"
              >
                politique de confidentialité
              </Link>
              .
            </p>

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => handleChoice('accepted')}
                className="px-5 py-2.5 rounded-full bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
              >
                Tout accepter
              </button>
              <button
                type="button"
                onClick={() => handleChoice('rejected')}
                className="px-5 py-2.5 rounded-full border border-gray-300 bg-white text-gray-900 text-sm font-semibold hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                Refuser les cookies non essentiels
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors sm:ml-auto"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

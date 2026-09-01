import React, { useEffect, useState } from 'react';
import { Cookie, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getCookieConsent,
  setCookieConsent,
  type CookieConsentChoice,
} from '../utils/cookieConsent';

interface CookieConsentBannerProps {
  onConsentChange: (choice: CookieConsentChoice) => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  onConsentChange,
}) => {
  const [visible, setVisible] = useState(() => getCookieConsent() === null);

  useEffect(() => {
    if (!visible) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [visible]);

  const handleChoice = (choice: CookieConsentChoice) => {
    setCookieConsent(choice);
    setVisible(false);
    onConsentChange(choice);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" aria-hidden="true" />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-black px-6 py-5 sm:px-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <Cookie className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="cookie-consent-title"
                className="text-lg sm:text-xl font-bold text-white leading-snug"
              >
                Ce site utilise des cookies
              </h2>
              <p className="text-sm text-gray-300 mt-1 flex items-center gap-1.5">
                <Shield className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                Conformité RGPD — choix requis pour continuer
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8 space-y-5">
          <p id="cookie-consent-description" className="text-sm sm:text-base text-gray-700 leading-relaxed">
            TuniDrive utilise des cookies et technologies similaires pour assurer le
            fonctionnement du site, mémoriser vos préférences de session et, avec votre
            accord, mesurer l&apos;audience et afficher des contenus
            publicitaires.
          </p>

          <p className="text-sm text-gray-600">
            Pour poursuivre votre navigation, veuillez indiquer votre choix ci-dessous.
            Consultez notre{' '}
            <Link
              to="/privacy-policy"
              className="text-blue-600 hover:text-blue-800 underline underline-offset-2 font-medium"
            >
              politique de confidentialité
            </Link>{' '}
            pour en savoir plus.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleChoice('accepted')}
              className="flex-1 px-5 py-3 rounded-full bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
            >
              Tout accepter
            </button>
            <button
              type="button"
              onClick={() => handleChoice('rejected')}
              className="flex-1 px-5 py-3 rounded-full border-2 border-gray-300 bg-white text-gray-900 text-sm font-semibold hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              Refuser les cookies non essentiels
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

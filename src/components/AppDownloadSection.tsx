import React from 'react';
import { CheckCircle, Smartphone } from 'lucide-react';
import { AppStoreBadges } from './AppStoreBadges';

const APP_FEATURES = [
  'Inscription simple et gratuite',
  'Réservation instantanée en 3 clics',
  'Suivi GPS en temps réel',
  'Historique de toutes vos courses',
  'Notifications push pour vos courses',
];

interface AppDownloadSectionProps {
  /** Affichage compact sans titre principal (ex. dans le modal) */
  compact?: boolean;
}

export const AppDownloadSection: React.FC<AppDownloadSectionProps> = ({ compact = false }) => {
  return (
    <div className={compact ? 'px-5 py-5 sm:px-6 sm:py-6' : 'py-16 sm:py-20'}>
      <div className={compact ? '' : 'page-container'}>
        <div className={compact ? 'space-y-6' : 'max-w-xl mx-auto text-center space-y-8'}>
          {!compact && (
            <>
              <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 px-4 py-2 rounded-full text-sm font-semibold">
                <Smartphone size={16} />
                Application mobile
              </div>
              <div>
                <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-4 tracking-tight">
                  Téléchargez l&apos;application TuniDrive
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Réservez vos courses en quelques secondes, suivez votre chauffeur en temps réel et gérez
                  tous vos trajets depuis votre smartphone.
                </p>
              </div>
            </>
          )}

          {compact && (
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-black text-white flex items-center justify-center">
                <Smartphone size={28} className="sm:hidden" />
                <Smartphone size={32} className="hidden sm:block" />
              </div>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Réservez, suivez votre chauffeur et gérez vos trajets depuis l&apos;application TuniDrive.
              </p>
            </div>
          )}

          <ul className={`space-y-3 ${compact ? '' : 'text-left max-w-md mx-auto'}`}>
            {APP_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm sm:text-base text-gray-700">
                <CheckCircle size={18} className="text-success-600 flex-shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <AppStoreBadges className={compact ? 'pt-1' : 'justify-center'} />
        </div>
      </div>
    </div>
  );
};

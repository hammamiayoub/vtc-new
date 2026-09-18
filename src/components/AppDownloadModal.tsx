import React from 'react';
import { Smartphone, X } from 'lucide-react';
import { AppStoreBadges } from './AppStoreBadges';

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[90] p-4 pointer-events-none"
      style={{ bottom: 'var(--td-bottom-banner-offset, 1rem)' }}
      role="region"
      aria-labelledby="app-download-banner-title"
    >
      <div className="page-container pointer-events-auto">
        <div className="bg-black text-white rounded-2xl shadow-xl border border-gray-800 overflow-hidden">
          <div className="px-4 py-4 sm:px-5 sm:py-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                  <Smartphone size={22} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="app-download-banner-title"
                    className="text-base sm:text-lg font-bold leading-snug pr-2"
                  >
                    Téléchargez l&apos;application TuniDrive
                  </h2>
                  <p className="text-sm text-gray-300 mt-1">
                    Réservation et suivi en temps réel sur mobile.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-gray-600 text-sm font-semibold text-white hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
              >
                <X size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Fermer</span>
              </button>
            </div>

            <AppStoreBadges layout="row" imageClassName="h-10 w-[135px]" />
          </div>
        </div>
      </div>
    </div>
  );
};

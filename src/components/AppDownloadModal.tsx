import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AppDownloadSection } from './AppDownloadSection';

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onEsc);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-download-modal-title"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />

      <div className="relative bg-white w-full sm:max-w-md md:max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 bg-black border-b border-gray-800 px-5 py-4 sm:px-6 rounded-t-2xl sm:rounded-t-2xl">
          <div className="min-w-0 pr-2">
            <h2 id="app-download-modal-title" className="text-lg sm:text-xl font-bold text-white leading-snug">
              Téléchargez l&apos;application TuniDrive
            </h2>
            <p className="text-sm text-gray-300 mt-1">
              Réservation et suivi en temps réel sur mobile.
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            className="flex-shrink-0 p-2 -mr-1 rounded-full text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-white"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>

        <AppDownloadSection compact />

        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Continuer sur le site web
          </button>
        </div>
      </div>
    </div>
  );
};

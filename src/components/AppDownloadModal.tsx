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
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto sm:rounded-2xl rounded-none sm:mx-4 max-w-4xl">
        {/* Sticky header for mobile */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900">Téléchargez l'application TuniDrive</h3>
              <p className="text-gray-600 text-sm sm:text-base">Accédez rapidement à la réservation et au suivi en temps réel.</p>
            </div>
            <button
              aria-label="Fermer le modal"
              className="p-2 sm:p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black"
              onClick={onClose}
            >
              <X size={22} />
            </button>
          </div>
        </div>
        <div className="p-0">
          <AppDownloadSection qrImageSrc="/qr-app.png" compact />
        </div>
      </div>
    </div>
  );
};

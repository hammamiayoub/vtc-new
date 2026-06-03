import React, { useEffect, useState } from 'react';
import { X, FileText, ZoomIn, Maximize2 } from 'lucide-react';
import type { ParcelPhoto } from '../../types';

interface ParcelAttachmentsGalleryProps {
  photos: ParcelPhoto[];
  /** Taille des vignettes */
  thumbClassName?: string;
}

function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url) || url.toLowerCase().includes('application/pdf');
}

export const ParcelAttachmentsGallery: React.FC<ParcelAttachmentsGalleryProps> = ({
  photos,
  thumbClassName = 'w-20 h-20 sm:w-24 sm:h-24',
}) => {
  const [lightbox, setLightbox] = useState<ParcelPhoto | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox]);

  if (!photos.length) return null;

  const merchandisePhotos = photos.filter((p) => p.documentType !== 'invoice');
  const invoices = photos.filter((p) => p.documentType === 'invoice');

  const openLightbox = (p: ParcelPhoto) => setLightbox(p);

  const renderThumb = (p: ParcelPhoto) => {
    const isPdf = p.documentType === 'invoice' && isPdfUrl(p.photoUrl);
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => openLightbox(p)}
        className={`relative group rounded-lg border border-gray-200 overflow-hidden bg-gray-50 hover:ring-2 hover:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${thumbClassName}`}
        title={p.documentType === 'invoice' ? 'Agrandir la facture' : 'Agrandir la photo'}
      >
        {isPdf ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-gray-600">
            <FileText size={28} className="text-red-600 mb-1" />
            <span className="text-[10px] font-medium text-center leading-tight">Facture PDF</span>
          </div>
        ) : (
          <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
        )}
        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <ZoomIn
            size={22}
            className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow"
          />
        </span>
      </button>
    );
  };

  return (
    <>
      <div className="space-y-3">
        {merchandisePhotos.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Photos de la marchandise</p>
            <div className="flex flex-wrap gap-2">{merchandisePhotos.map(renderThumb)}</div>
          </div>
        )}
        {invoices.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Factures</p>
            <div className="flex flex-wrap gap-2">{invoices.map(renderThumb)}</div>
          </div>
        )}
        <p className="text-xs text-gray-400">Cliquez sur une vignette pour agrandir</p>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 z-10"
            aria-label="Fermer"
          >
            <X size={24} />
          </button>

          <div
            className="relative max-w-[95vw] max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white text-sm mb-3 flex items-center gap-2">
              <Maximize2 size={16} />
              {lightbox.documentType === 'invoice' ? 'Facture' : 'Photo de la marchandise'}
            </p>

            {lightbox.documentType === 'invoice' && isPdfUrl(lightbox.photoUrl) ? (
              <iframe
                src={lightbox.photoUrl}
                title="Facture"
                className="w-[min(90vw,800px)] h-[min(80vh,600px)] bg-white rounded-lg border-0"
              />
            ) : (
              <img
                src={lightbox.photoUrl}
                alt=""
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
            )}

            <a
              href={lightbox.photoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 text-sm text-blue-300 hover:text-blue-200 underline"
            >
              Ouvrir dans un nouvel onglet
            </a>
          </div>
        </div>
      )}
    </>
  );
};

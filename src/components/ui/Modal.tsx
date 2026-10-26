import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

/**
 * Modale accessible : fermeture par Échap ou clic sur le fond, défilement de la page bloqué,
 * focus rendu à l'élément précédent. Plein écran sur mobile, centrée à partir de sm.
 */
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, size = 'md', children, className }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full max-h-[90vh] overflow-y-auto bg-white shadow-overlay animate-slide-up focus:outline-none',
          'rounded-t-sheet sm:rounded-sheet',
          {
            'sm:max-w-sm': size === 'sm',
            'sm:max-w-lg': size === 'md',
            'sm:max-w-3xl': size === 'lg',
          },
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 p-6 pb-0">
          {title ? <h2 className="text-heading-md">{title}</h2> : <span />}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="focus-ring touch-target -mr-2 -mt-2 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

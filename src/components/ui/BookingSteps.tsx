import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLocale } from '../../i18n/locale';

interface BookingStepsProps {
  /** Étape en cours, de 1 (trajet) à 4 (confirmation). */
  current: 1 | 2 | 3 | 4;
  className?: string;
}

const STEPS = [
  { fr: 'Trajet', en: 'Trip' },
  { fr: 'Compte', en: 'Account' },
  { fr: 'Chauffeur', en: 'Driver' },
  { fr: 'Confirmation', en: 'Confirm' },
];

/** Fil conducteur de la réservation, de l'estimation sur l'accueil jusqu'à la confirmation. */
export const BookingSteps: React.FC<BookingStepsProps> = ({ current, className }) => {
  const { locale } = useLocale();
  const en = locale === 'en';

  return (
    <ol
      className={cn('grid grid-cols-4', className)}
      aria-label={en ? 'Booking steps' : 'Étapes de la réservation'}
    >
      {STEPS.map((step, index) => {
        const number = index + 1;
        const done = number < current;
        const active = number === current;
        return (
          <li
            key={step.fr}
            aria-current={active ? 'step' : undefined}
            className="relative flex flex-col items-center gap-1.5 text-center"
          >
            {index > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute right-1/2 top-3 h-px w-full -translate-y-1/2',
                  done || active ? 'bg-gray-900' : 'bg-gray-300',
                )}
              />
            )}
            <span
              className={cn(
                'relative flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                done && 'bg-gray-900 text-white',
                active && 'bg-white text-gray-900 ring-2 ring-gray-900',
                !done && !active && 'bg-white text-gray-500 ring-1 ring-gray-300',
              )}
            >
              {done ? <Check size={14} aria-hidden="true" /> : number}
            </span>
            <span
              className={cn(
                'text-xs leading-tight',
                active ? 'font-semibold text-gray-900' : done ? 'text-gray-900' : 'text-gray-500',
              )}
            >
              {en ? step.en : step.fr}
              {done && <span className="sr-only">{en ? ' (done)' : ' (terminé)'}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

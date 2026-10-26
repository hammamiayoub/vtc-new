import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

interface StepperProps {
  steps: string[];
  /** Index de l'étape courante (à partir de 0). */
  current: number;
  className?: string;
}

/** Indicateur de progression d'un parcours en plusieurs étapes (réservation, inscription). */
export const Stepper: React.FC<StepperProps> = ({ steps, current, className }) => (
  <nav aria-label="Progression" className={className}>
    <ol className="flex items-center gap-2">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className={cn('flex items-center gap-2', index < steps.length - 1 && 'flex-1')}
          >
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-body-sm font-semibold transition-colors',
                done || active ? 'bg-black text-white' : 'bg-gray-100 text-ink-subtle'
              )}
            >
              {done ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
            </span>
            <span
              className={cn(
                'hidden sm:block text-body-sm font-medium whitespace-nowrap',
                active ? 'text-gray-900' : 'text-ink-subtle'
              )}
            >
              {label}
            </span>
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cn('h-0.5 flex-1 rounded-full transition-colors', done ? 'bg-black' : 'bg-gray-200')}
              />
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);

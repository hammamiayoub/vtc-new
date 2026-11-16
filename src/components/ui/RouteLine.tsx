import React from 'react';
import { cn } from '../../utils/cn';

export interface RouteStop {
  label: string;
  meta?: string;
}

interface RouteLineProps {
  from: RouteStop;
  to: RouteStop;
  /** Contenu discret placé sur la ligne, entre les deux arrêts (distance, durée…). */
  between?: React.ReactNode;
  className?: string;
}

/**
 * Signature visuelle des courses : point de départ plein, ligne, point d'arrivée en anneau.
 * Une seule couleur (brand), statique, à réutiliser partout où un trajet est affiché.
 */
export const RouteLine: React.FC<RouteLineProps> = ({ from, to, between, className }) => (
  <div className={cn('flex gap-4', className)}>
    <div className="flex flex-col items-center py-1.5" aria-hidden="true">
      <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
      <span className="my-1 w-px flex-1 bg-brand/30" />
      <span className="h-2 w-2 shrink-0 rounded-full border-2 border-brand bg-white" />
    </div>

    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div className="min-w-0">
        <p className="truncate text-body-md font-medium text-gray-900">{from.label}</p>
        {from.meta && <p className="truncate text-body-sm text-ink-subtle">{from.meta}</p>}
      </div>

      {between && <div className="text-body-sm tabular-nums text-ink-muted">{between}</div>}

      <div className="min-w-0">
        <p className="truncate text-body-md font-medium text-gray-900">{to.label}</p>
        {to.meta && <p className="truncate text-body-sm text-ink-subtle">{to.meta}</p>}
      </div>
    </div>
  </div>
);

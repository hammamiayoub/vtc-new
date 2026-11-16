import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { RouteLine } from './ui/RouteLine';
import { useLocale } from '../i18n/locale';

/**
 * Aperçu d'une course : montre ce que la page promet (trajet, prise en charge à l'heure,
 * prix confirmé avant le départ). Exemple illustratif, sans tarif affiché.
 */
export const HomeRideCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { locale } = useLocale();
  const en = locale === 'en';

  return (
    <figure
      className={`m-0 w-full rounded-card border border-surface-border bg-white p-5 ${className}`}
      aria-label={en ? 'Example of a ride' : 'Exemple de course'}
    >
      <figcaption className="mb-4 flex items-center justify-between text-caption text-ink-subtle">
        <span>{en ? 'Example ride' : 'Exemple de course'}</span>
        <span className="tabular-nums">{en ? 'Pickup 14:30' : 'Prise en charge 14:30'}</span>
      </figcaption>

      <RouteLine
        from={{
          label: en ? 'Tunis-Carthage airport' : 'Aéroport Tunis-Carthage',
          meta: en ? 'Arrivals' : 'Arrivées',
        }}
        to={{ label: 'Hammamet', meta: en ? 'Hotel drop-off' : 'Dépose à l’hôtel' }}
        between={en ? '65 km · about 55 min' : '65 km · environ 55 min'}
      />

      <div className="mt-5 flex items-center gap-2 border-t border-surface-border pt-4 text-body-sm text-ink-muted">
        <ShieldCheck size={16} strokeWidth={1.5} className="shrink-0 text-brand" aria-hidden="true" />
        {en ? 'Verified driver · price confirmed before departure' : 'Chauffeur vérifié · prix confirmé avant le départ'}
      </div>
    </figure>
  );
};

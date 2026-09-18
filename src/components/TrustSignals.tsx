import React, { useEffect, useMemo, useState } from 'react';
import { Shield, Star, MessageCircle, MapPin, CheckCircle, Car } from 'lucide-react';
import { fetchPlatformStats, type PlatformStats } from '../utils/platformStats';

type TrustSignalsVariant = 'compact' | 'bar' | 'grid';

interface TrustSignalsProps {
  variant?: TrustSignalsVariant;
  className?: string;
}

function buildTrustItems(stats: PlatformStats) {
  const items: { icon: typeof Shield; label: string }[] = [
    { icon: Shield, label: 'Chauffeurs vérifiés' },
    { icon: CheckCircle, label: 'Prix confirmé avant le départ' },
    { icon: MessageCircle, label: 'Support WhatsApp 7j/7' },
  ];

  if (stats.averageRating != null && stats.totalRatings > 0) {
    items.push({
      icon: Star,
      label: `${stats.averageRating.toLocaleString('fr-FR')}/5 · ${stats.totalRatings} avis clients`,
    });
  } else {
    items.push({ icon: Star, label: 'Satisfaction clients suivie après chaque course' });
  }

  if (stats.completedBookings > 0) {
    items.push({
      icon: Car,
      label: `${stats.completedBookings.toLocaleString('fr-FR')}+ courses réalisées`,
    });
  }

  if (stats.activeDrivers > 0) {
    items.push({
      icon: MapPin,
      label: `${stats.activeDrivers.toLocaleString('fr-FR')}+ chauffeurs actifs · Tunis, Sfax, Sousse…`,
    });
  } else {
    items.push({ icon: MapPin, label: 'Tunis · Sfax · Sousse · Nabeul · Hammamet…' });
  }

  return items;
}

export const TrustSignals: React.FC<TrustSignalsProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPlatformStats().then((result) => {
      if (!cancelled) setStats(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(() => buildTrustItems(stats ?? {
    completedBookings: 0,
    activeDrivers: 0,
    averageRating: null,
    totalRatings: 0,
  }), [stats]);

  if (variant === 'bar') {
    return (
      <div
        className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm text-gray-600 ${className}`}
      >
        {items.slice(0, 4).map(({ icon: Icon, label }) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <Icon size={14} className="text-gray-900 flex-shrink-0" aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <ul className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}>
        {items.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-start gap-2 text-sm text-gray-700">
            <Icon size={16} className="text-gray-900 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={`space-y-2 ${className}`}>
      {items.slice(0, 3).map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-2 text-sm text-gray-600">
          <Icon size={15} className="text-gray-900 flex-shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
};

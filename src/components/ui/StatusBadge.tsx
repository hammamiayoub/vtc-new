import React from 'react';
import { AlertTriangle, Car, CheckCircle, Clock, MapPin, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocale } from '../../i18n/locale';
import { Badge, type BadgeTone } from './Badge';

export type BookingStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

interface StatusStyle {
  tone: BadgeTone;
  icon: LucideIcon;
  fr: string;
  en: string;
}

/** Source unique des couleurs, icônes et libellés des statuts de course. */
const BOOKING_STATUS: Record<BookingStatus, StatusStyle> = {
  pending: { tone: 'warning', icon: Clock, fr: "En attente d'acceptation", en: 'Waiting for a driver' },
  accepted: { tone: 'info', icon: Car, fr: 'Acceptée', en: 'Accepted' },
  in_progress: { tone: 'success', icon: MapPin, fr: 'En cours', en: 'In progress' },
  completed: { tone: 'success', icon: CheckCircle, fr: 'Terminée', en: 'Completed' },
  cancelled: { tone: 'danger', icon: XCircle, fr: 'Annulée', en: 'Cancelled' },
};

interface BookingStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  /** Libellés spécifiques à un écran (ex. « Programmée » côté chauffeur). */
  labels?: Partial<Record<BookingStatus, string>>;
  className?: string;
}

export const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({ status, size, labels, className }) => {
  const { locale } = useLocale();
  const style = BOOKING_STATUS[status as BookingStatus];

  if (!style) {
    return (
      <Badge size={size} icon={AlertTriangle} className={className}>
        {status}
      </Badge>
    );
  }

  return (
    <Badge tone={style.tone} size={size} icon={style.icon} className={className}>
      {labels?.[status as BookingStatus] ?? (locale === 'en' ? style.en : style.fr)}
    </Badge>
  );
};

type DriverAccountStatus = 'active' | 'pending' | 'rejected';

const DRIVER_STATUS: Record<DriverAccountStatus, { tone: BadgeTone; icon: LucideIcon; label: string }> = {
  active: { tone: 'success', icon: CheckCircle, label: 'Actif' },
  pending: { tone: 'warning', icon: Clock, label: 'En attente' },
  rejected: { tone: 'danger', icon: XCircle, label: 'Rejeté' },
};

/** Statut d'un compte chauffeur (espace admin). */
export const DriverStatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size }) => {
  const style = DRIVER_STATUS[status as DriverAccountStatus];
  if (!style) {
    return (
      <Badge size={size} icon={AlertTriangle}>
        Inconnu
      </Badge>
    );
  }
  return (
    <Badge tone={style.tone} size={size} icon={style.icon}>
      {style.label}
    </Badge>
  );
};

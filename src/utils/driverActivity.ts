import type { Driver, DriverSignupActivity, ParcelServiceScope } from '../types';

export type DriverActivityValue = NonNullable<Driver['driverType']>;

export const DRIVER_ACTIVITY_SIGNUP_OPTIONS: {
  value: DriverSignupActivity;
  label: string;
  description: string;
  labelEn: string;
  descriptionEn: string;
}[] = [
  {
    value: 'vtc',
    label: 'Transport de personnes',
    description: 'Courses et trajets avec des passagers.',
    labelEn: 'Passenger transport',
    descriptionEn: 'Rides with passengers.',
  },
  {
    value: 'transporteur_local',
    label: 'Transport de colis local',
    description: 'Livraison de colis et marchandises en Tunisie.',
    labelEn: 'Local parcel delivery',
    descriptionEn: 'Parcels and goods delivered within Tunisia.',
  },
  {
    value: 'transporteur_international',
    label: 'Transport de colis international',
    description: 'Colis et marchandises Europe↔Tunisie.',
    labelEn: 'International parcel transport',
    descriptionEn: 'Parcels and goods, Europe ↔ Tunisia.',
  },
];

/** Convertit le choix d'inscription en colonnes `drivers`. */
export function signupActivityToDriverColumns(activity: DriverSignupActivity): {
  driver_type: 'vtc' | 'transporteur';
  parcel_scope: ParcelServiceScope | null;
} {
  switch (activity) {
    case 'transporteur_local':
      return { driver_type: 'transporteur', parcel_scope: 'local' };
    case 'transporteur_international':
      return { driver_type: 'transporteur', parcel_scope: 'international' };
    default:
      return { driver_type: 'vtc', parcel_scope: null };
  }
}

export const DRIVER_ACTIVITY_PROFILE_OPTIONS = [
  {
    value: 'vtc' as const,
    label: 'Transport de personnes',
    description: 'Courses et trajets avec des passagers.',
  },
  {
    value: 'transporteur' as const,
    label: 'Transport de colis',
    description: 'Colis et marchandises (local ou international).',
  },
  {
    value: 'both' as const,
    label: 'Les deux activités',
    description: 'Personnes et colis.',
  },
];

export const PARCEL_SCOPE_OPTIONS: { value: ParcelServiceScope; label: string; description: string }[] = [
  {
    value: 'local',
    label: 'Livraison locale (Tunisie)',
    description: 'Vous recevrez les demandes de colis à livrer en Tunisie (devise : TND).',
  },
  {
    value: 'international',
    label: 'Transport international (Europe ↔ Tunisie)',
    description: 'Vous recevrez les demandes de colis Europe ↔ Tunisie.',
  },
];

export function parcelScopeLabel(scope?: ParcelServiceScope | null): string {
  return scope === 'local' ? 'Local' : 'International';
}

export function driverActivityLabel(type?: DriverActivityValue): string {
  const found = DRIVER_ACTIVITY_PROFILE_OPTIONS.find((o) => o.value === type);
  return found?.label ?? 'Transport de personnes';
}

/** Libellé court pour tableaux admin */
export function driverActivityShortLabel(
  type?: DriverActivityValue,
  scope?: ParcelServiceScope | null,
): string {
  // Un transporteur sans scope enregistré est traité comme international (cf. migration)
  const scopeSuffix = scope === 'local' ? 'local' : 'intl';
  switch (type) {
    case 'transporteur':
      return `Colis ${scopeSuffix}`;
    case 'both':
      return `VTC + Colis ${scopeSuffix}`;
    default:
      return 'VTC';
  }
}

export function driverActivityBadgeClasses(
  type?: DriverActivityValue,
  scope?: ParcelServiceScope | null,
): string {
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap';
  switch (type) {
    case 'transporteur':
      // Local en vert, international en orange : distinction immédiate dans les tableaux
      return scope === 'local'
        ? `${base} bg-success-100 text-success-800`
        : `${base} bg-warning-100 text-warning-800`;
    case 'both':
      return `${base} bg-gray-900 text-white`;
    default:
      return `${base} bg-gray-100 text-gray-800`;
  }
}

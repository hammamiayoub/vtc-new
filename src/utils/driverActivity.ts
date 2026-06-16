import type { Driver } from '../types';

export type DriverActivityValue = NonNullable<Driver['driverType']>;

export const DRIVER_ACTIVITY_SIGNUP_OPTIONS = [
  {
    value: 'vtc' as const,
    label: 'Transport de personnes',
    description: 'Courses et trajets avec des passagers.',
  },
  {
    value: 'transporteur' as const,
    label: 'Transport de colis',
    description: 'Colis et marchandises Europe↔Tunisie.',
  },
];

export const DRIVER_ACTIVITY_PROFILE_OPTIONS = [
  ...DRIVER_ACTIVITY_SIGNUP_OPTIONS,
  {
    value: 'both' as const,
    label: 'Les deux activités',
    description: 'Personnes et colis internationaux.',
  },
];

export function driverActivityLabel(type?: DriverActivityValue): string {
  const found = DRIVER_ACTIVITY_PROFILE_OPTIONS.find((o) => o.value === type);
  return found?.label ?? 'Transport de personnes';
}

/** Libellé court pour tableaux admin */
export function driverActivityShortLabel(type?: DriverActivityValue): string {
  switch (type) {
    case 'transporteur':
      return 'Transporteur';
    case 'both':
      return 'VTC + Colis';
    default:
      return 'VTC';
  }
}

export function driverActivityBadgeClasses(type?: DriverActivityValue): string {
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap';
  switch (type) {
    case 'transporteur':
      return `${base} bg-amber-100 text-amber-800`;
    case 'both':
      return `${base} bg-indigo-100 text-indigo-800`;
    default:
      return `${base} bg-sky-100 text-sky-800`;
  }
}

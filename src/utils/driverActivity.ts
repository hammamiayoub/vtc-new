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

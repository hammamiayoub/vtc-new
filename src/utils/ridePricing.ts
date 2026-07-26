/** Grille tarifaire VTC TuniDrive (alignée sur l'application mobile). */

/** Prise en charge selon la distance à vide chauffeur → point de départ. */
export const DRIVER_PICKUP_FARE_TIERS = [
  { upToKm: 10, fareTnd: 10, label: '< 10 km' },
  { upToKm: 30, fareTnd: 20, label: '10–30 km' },
  { upToKm: 50, fareTnd: 30, label: '30–50 km' },
  { upToKm: Infinity, fareTnd: 50, label: '50 km+' },
] as const;

/** Prise en charge par défaut (estimation avant sélection du chauffeur). */
export const RIDE_DEFAULT_PICKUP_FARE_TND = 10;

/** @deprecated Utiliser RIDE_DEFAULT_PICKUP_FARE_TND ou computeDriverPickupFareTnd. */
export const RIDE_BASE_FARE_TND = RIDE_DEFAULT_PICKUP_FARE_TND;

export const RIDE_MIN_PRICE_TND = 14.4;

export interface RideDistanceTier {
  maxKm: number;
  rate: number;
  label: string;
}

/** Tranches progressives (km facturés dans chaque palier) */
export const RIDE_DISTANCE_TIERS: RideDistanceTier[] = [
  { maxKm: 15, rate: 1.53, label: '0–15 km' },
  { maxKm: 35, rate: 1.98, label: '15–50 km' },
  { maxKm: 50, rate: 1.71, label: '50–100 km' },
  { maxKm: 150, rate: 1.35, label: '100–250 km' },
  { maxKm: Infinity, rate: 1.08, label: '250+ km' },
];

export interface ProgressivePriceBreakdownRow {
  label: string;
  km: number;
  rate: number;
  subtotal: number;
}

export interface ProgressivePriceBreakdown {
  rows: ProgressivePriceBreakdownRow[];
  baseFare: number;
  distanceSubtotal: number;
  subtotalBeforeMin: number;
  appliedMinimum: boolean;
  subtotal: number;
  driverToPickupKm?: number;
}

/** Prise en charge TND selon la distance chauffeur → point de départ. */
export function computeDriverPickupFareTnd(driverToPickupKm: number): number {
  if (driverToPickupKm < 0 || !Number.isFinite(driverToPickupKm)) {
    return RIDE_DEFAULT_PICKUP_FARE_TND;
  }

  for (const tier of DRIVER_PICKUP_FARE_TIERS) {
    if (driverToPickupKm < tier.upToKm) {
      return tier.fareTnd;
    }
  }

  return DRIVER_PICKUP_FARE_TIERS[DRIVER_PICKUP_FARE_TIERS.length - 1].fareTnd;
}

function resolvePickupFareTnd(driverToPickupKm?: number): number {
  if (driverToPickupKm != null && Number.isFinite(driverToPickupKm)) {
    return computeDriverPickupFareTnd(driverToPickupKm);
  }
  return RIDE_DEFAULT_PICKUP_FARE_TND;
}

export function getDriverPickupFareSummaryText(): string {
  return DRIVER_PICKUP_FARE_TIERS.map(
    (tier) => `${tier.fareTnd} TND (${tier.label})`,
  ).join(' • ');
}

export function getProgressivePriceBreakdown(
  distanceKm: number,
  driverToPickupKm?: number,
): ProgressivePriceBreakdown {
  let remaining = Math.max(0, distanceKm);
  const rows: ProgressivePriceBreakdownRow[] = [];

  for (const tier of RIDE_DISTANCE_TIERS) {
    if (remaining <= 0) break;
    const km = tier.maxKm === Infinity ? remaining : Math.min(remaining, tier.maxKm);
    remaining -= km;
    if (km > 0) {
      rows.push({
        label: tier.label,
        km,
        rate: tier.rate,
        subtotal: Math.round(km * tier.rate * 100) / 100,
      });
    }
  }

  const pickupFare = resolvePickupFareTnd(driverToPickupKm);
  const distanceSubtotal = Math.round(rows.reduce((sum, row) => sum + row.subtotal, 0) * 100) / 100;
  const subtotalBeforeMin = Math.round((pickupFare + distanceSubtotal) * 100) / 100;
  const appliedMinimum = subtotalBeforeMin < RIDE_MIN_PRICE_TND;
  const subtotal = appliedMinimum ? RIDE_MIN_PRICE_TND : subtotalBeforeMin;

  return {
    rows,
    baseFare: pickupFare,
    distanceSubtotal,
    subtotalBeforeMin,
    appliedMinimum,
    subtotal,
    driverToPickupKm,
  };
}

/** Prix distance + prise en charge, avec plancher minimum (hors multiplicateur véhicule). */
export function calculateProgressiveDistancePrice(
  distanceKm: number,
  driverToPickupKm?: number,
): number {
  return getProgressivePriceBreakdown(distanceKm, driverToPickupKm).subtotal;
}

/** Tarif indicatif au km selon la distance totale (affichage récapitulatif). */
export function getIndicativePricePerKm(distanceKm: number): { price: number; discount: string } {
  if (distanceKm < 15) return { price: 1.53, discount: '' };
  if (distanceKm < 50) return { price: 1.98, discount: '' };
  if (distanceKm < 100) return { price: 1.71, discount: '' };
  if (distanceKm < 250) return { price: 1.35, discount: '' };
  return { price: 1.08, discount: '' };
}

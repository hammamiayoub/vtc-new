/** Grille tarifaire VTC TuniDrive (alignée sur l'application mobile). */

/** Prise en charge selon la distance à vide chauffeur → point de départ. */
export const DRIVER_PICKUP_FARE_TIERS = [
  { upToKm: 10, fareTnd: 3, label: '< 10 km' },
  { upToKm: 30, fareTnd: 6, label: '10–30 km' },
  { upToKm: 50, fareTnd: 10, label: '30–50 km' },
  { upToKm: Infinity, fareTnd: 15, label: '50 km+' },
] as const;

/** Van, minibus et bus : visibles jusqu'à 150 km, avec un supplément fixe par tranche de 50 km atteinte. */
export const LONG_RANGE_VEHICLE_TYPES = ['van', 'minibus', 'bus'] as const;
export const LONG_RANGE_SEARCH_RADIUS_KM = 150;
export const LONG_RANGE_APPROACH_TRANCHE_KM = 50;
export const LONG_RANGE_APPROACH_TRANCHE_TND = 30;

export function isLongRangeVehicleType(vehicleType?: string | null): boolean {
  return (
    vehicleType != null
    && (LONG_RANGE_VEHICLE_TYPES as readonly string[]).includes(vehicleType)
  );
}

/**
 * Supplément ajouté au prix total, sans coefficient véhicule.
 * 0 TND sous 50 km, 30 TND dès 50 km, 60 TND dès 100 km, 90 TND à 150 km.
 */
export function computeLongRangeApproachSurchargeTnd(
  driverToPickupKm: number | undefined,
  vehicleType?: string | null,
): number {
  if (!isLongRangeVehicleType(vehicleType)) return 0;
  if (
    driverToPickupKm == null
    || !Number.isFinite(driverToPickupKm)
    || driverToPickupKm < LONG_RANGE_APPROACH_TRANCHE_KM
  ) {
    return 0;
  }
  const tranches = Math.floor(driverToPickupKm / LONG_RANGE_APPROACH_TRANCHE_KM);
  return tranches * LONG_RANGE_APPROACH_TRANCHE_TND;
}

/** Prise en charge par défaut (estimation avant sélection du chauffeur). */
export const RIDE_DEFAULT_PICKUP_FARE_TND = 3;

/** @deprecated Utiliser RIDE_DEFAULT_PICKUP_FARE_TND ou computeDriverPickupFareTnd. */
export const RIDE_BASE_FARE_TND = RIDE_DEFAULT_PICKUP_FARE_TND;

export const RIDE_MIN_PRICE_TND = 8;

export interface RideDistanceTier {
  maxKm: number;
  rate: number;
  label: string;
}

/** Tranches progressives (km facturés dans chaque palier) */
export const RIDE_DISTANCE_TIERS: RideDistanceTier[] = [
  { maxKm: 15, rate: 1.0, label: '0–15 km' },
  { maxKm: 35, rate: 0.9, label: '15–50 km' },
  { maxKm: 50, rate: 0.85, label: '50–100 km' },
  { maxKm: 150, rate: 0.8, label: '100–250 km' },
  { maxKm: Infinity, rate: 0.75, label: '250+ km' },
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
  if (distanceKm < 15) return { price: 1.0, discount: '' };
  if (distanceKm < 50) return { price: 0.9, discount: '' };
  if (distanceKm < 100) return { price: 0.85, discount: '' };
  if (distanceKm < 250) return { price: 0.8, discount: '' };
  return { price: 0.75, discount: '' };
}

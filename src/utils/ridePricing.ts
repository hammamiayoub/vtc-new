/** Grille tarifaire VTC alignée sur l'application mobile TuniDrive */

export const RIDE_BASE_FARE_TND = 4.8;
export const RIDE_MIN_PRICE_TND = 9.6;

export interface RideDistanceTier {
  maxKm: number;
  rate: number;
  label: string;
}

/** Tranches progressives (km facturés dans chaque palier) */
export const RIDE_DISTANCE_TIERS: RideDistanceTier[] = [
  { maxKm: 15, rate: 1.02, label: '0–15 km' },
  { maxKm: 35, rate: 1.32, label: '15–50 km' },
  { maxKm: 50, rate: 1.14, label: '50–100 km' },
  { maxKm: 150, rate: 0.9, label: '100–250 km' },
  { maxKm: Infinity, rate: 0.72, label: '250+ km' },
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
}

export function getProgressivePriceBreakdown(distanceKm: number): ProgressivePriceBreakdown {
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

  const distanceSubtotal = Math.round(rows.reduce((sum, row) => sum + row.subtotal, 0) * 100) / 100;
  const subtotalBeforeMin = Math.round((RIDE_BASE_FARE_TND + distanceSubtotal) * 100) / 100;
  const appliedMinimum = subtotalBeforeMin < RIDE_MIN_PRICE_TND;
  const subtotal = appliedMinimum ? RIDE_MIN_PRICE_TND : subtotalBeforeMin;

  return {
    rows,
    baseFare: RIDE_BASE_FARE_TND,
    distanceSubtotal,
    subtotalBeforeMin,
    appliedMinimum,
    subtotal,
  };
}

/** Prix distance + prise en charge, avec plancher minimum (hors multiplicateur véhicule). */
export function calculateProgressiveDistancePrice(distanceKm: number): number {
  return getProgressivePriceBreakdown(distanceKm).subtotal;
}

/** Tarif indicatif au km selon la distance totale (affichage récapitulatif). */
export function getIndicativePricePerKm(distanceKm: number): { price: number; discount: string } {
  if (distanceKm < 15) return { price: 1.02, discount: '' };
  if (distanceKm < 50) return { price: 1.32, discount: '' };
  if (distanceKm < 100) return { price: 1.14, discount: '' };
  if (distanceKm < 250) return { price: 0.9, discount: '' };
  return { price: 0.72, discount: '' };
}

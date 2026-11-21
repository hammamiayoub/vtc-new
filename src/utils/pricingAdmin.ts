/**
 * Logique pure de l'écran d'administration de la grille tarifaire :
 * conversion formulaire <-> configuration JSON (format de pricing_config), validation et aperçu des prix.
 * La base revalide tout (pricing_validate_config) : cette validation sert à guider la saisie.
 */

export interface PricingConfigJson {
  default_pickup_fare_tnd: number;
  pickup_tiers: Array<{ up_to_km: number | null; fare_tnd: number }>;
  km_tiers: Array<{ up_to_km: number | null; rate_per_km: number }>;
  minimum_price_tnd: number;
  night_supplement_percent: number;
  weekend_supplement_percent: number;
  max_supplement_percent: number;
}

export interface PricingRow {
  version: number;
  is_active: boolean;
  config: PricingConfigJson;
  note: string | null;
  created_at: string;
}

export interface DraftTier {
  /** Borne haute en km ; chaîne vide pour le dernier palier (sans limite). */
  upTo: string;
  value: string;
}

export interface PricingDraft {
  defaultPickup: string;
  minPrice: string;
  night: string;
  weekend: string;
  max: string;
  pickupTiers: DraftTier[];
  kmTiers: DraftTier[];
  note: string;
}

const str = (n: number | null | undefined): string => (n === null || n === undefined ? '' : String(n));

export function configToDraft(config: PricingConfigJson, note = ''): PricingDraft {
  return {
    defaultPickup: str(config.default_pickup_fare_tnd),
    minPrice: str(config.minimum_price_tnd),
    night: str(config.night_supplement_percent),
    weekend: str(config.weekend_supplement_percent),
    max: str(config.max_supplement_percent),
    pickupTiers: config.pickup_tiers.map((t) => ({ upTo: str(t.up_to_km), value: str(t.fare_tnd) })),
    kmTiers: config.km_tiers.map((t) => ({ upTo: str(t.up_to_km), value: str(t.rate_per_km) })),
    note,
  };
}

/** Accepte « 1,5 » comme « 1.5 ». Retourne NaN si vide ou invalide. */
export function parseNumber(value: string): number {
  const trimmed = value.trim().replace(',', '.');
  if (trimmed === '') return NaN;
  return Number(trimmed);
}

function tiersFromDraft<T>(
  label: string,
  tiers: DraftTier[],
  valueLabel: string,
  maxValue: number,
  build: (upTo: number | null, value: number) => T,
  errors: string[],
): T[] {
  const out: T[] = [];
  let prev = 0;
  tiers.forEach((tier, i) => {
    const n = i + 1;
    const value = parseNumber(tier.value);
    if (!Number.isFinite(value) || value < 0 || value > maxValue) {
      errors.push(`${label}, palier ${n} : ${valueLabel} doit être un nombre entre 0 et ${maxValue}.`);
    }
    const isLast = i === tiers.length - 1;
    if (isLast) {
      out.push(build(null, value));
      return;
    }
    const upTo = parseNumber(tier.upTo);
    if (!Number.isFinite(upTo) || upTo <= prev) {
      errors.push(`${label}, palier ${n} : la borne en km doit être supérieure à la précédente (${prev}).`);
    } else {
      prev = upTo;
    }
    out.push(build(upTo, value));
  });
  return out;
}

export function draftToConfig(draft: PricingDraft): { config: PricingConfigJson | null; errors: string[] } {
  const errors: string[] = [];
  const num = (value: string, label: string, max: number): number => {
    const n = parseNumber(value);
    if (!Number.isFinite(n) || n < 0 || n > max) errors.push(`${label} doit être un nombre entre 0 et ${max}.`);
    return n;
  };

  const defaultPickup = num(draft.defaultPickup, 'La prise en charge par défaut', 200);
  const minPrice = num(draft.minPrice, 'Le prix minimum', 500);
  const night = num(draft.night, 'Le supplément de nuit', 100);
  const weekend = num(draft.weekend, 'Le supplément week-end', 100);
  const max = num(draft.max, 'Le plafond des suppléments', 200);

  const pickupTiers = tiersFromDraft(
    'Prise en charge',
    draft.pickupTiers,
    'le tarif',
    500,
    (up_to_km, fare_tnd) => ({ up_to_km, fare_tnd }),
    errors,
  );
  const kmTiers = tiersFromDraft(
    'Tarif au km',
    draft.kmTiers,
    'le tarif au km',
    50,
    (up_to_km, rate_per_km) => ({ up_to_km, rate_per_km }),
    errors,
  );

  if (errors.length > 0) return { config: null, errors };
  return {
    config: {
      default_pickup_fare_tnd: defaultPickup,
      pickup_tiers: pickupTiers,
      km_tiers: kmTiers,
      minimum_price_tnd: minPrice,
      night_supplement_percent: night,
      weekend_supplement_percent: weekend,
      max_supplement_percent: max,
    },
    errors,
  };
}

/** Prix de base d'un trajet (berline, chauffeur proche, sans supplément ni arrondi) avec cette grille. */
export function previewBasePrice(config: PricingConfigJson, distanceKm: number): number {
  let prev = 0;
  let total = 0;
  for (const tier of config.km_tiers) {
    const cap = tier.up_to_km ?? Infinity;
    const segment = Math.min(distanceKm, cap) - prev;
    if (segment > 0) total += segment * tier.rate_per_km;
    prev = cap;
    if (distanceKm <= cap) break;
  }
  return Math.max(config.minimum_price_tnd, config.default_pickup_fare_tnd + total);
}

export const PREVIEW_TRIPS: Array<{ label: string; km: number }> = [
  { label: 'Course courte', km: 5 },
  { label: 'Trajet urbain', km: 10 },
  { label: 'Aéroport Tunis-Carthage → Gammarth', km: 17 },
  { label: 'Aéroport Tunis-Carthage → Borj Cédria', km: 32 },
  { label: 'Tunis → Hammamet', km: 65 },
  { label: 'Tunis → Sousse', km: 140 },
];

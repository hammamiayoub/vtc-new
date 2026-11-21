/**
 * Charge la grille tarifaire VTC depuis la base (RPC get_pricing_config) et l'applique à ridePricing.
 *
 * Sans réponse valide (réseau, migration non déployée), le site garde la dernière grille connue
 * (localStorage) puis, à défaut, la grille v2 embarquée. Les suppléments nuit / week-end
 * sont lus aussi (utils/geolocation.ts les applique).
 */
import { useSyncExternalStore } from 'react';
import { supabase } from '../lib/supabase';
import { applyRidePricingGrid, getRidePricingVersion, subscribeRidePricing, type RidePricingGrid } from './ridePricing';

const CACHE_KEY = 'tunidrive_pricing_grid_v1';
const FETCH_TIMEOUT_MS = 6000;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const upTo = (v: unknown): number | null => (v === null || v === undefined ? Infinity : isNum(v) ? v : null);

function isIncreasingToInfinity(a: Array<{ upToKm: number }>): boolean {
  return a.length > 0 && a.every((t, i) => i === 0 || t.upToKm > a[i - 1].upToKm) && a[a.length - 1].upToKm === Infinity;
}

/** Valide la réponse de get_pricing_config ; null si elle est incohérente. */
export function parsePricingConfig(raw: unknown): RidePricingGrid | null {
  try {
    const r = raw as { version?: unknown; config?: Record<string, unknown> } | null;
    const c = r?.config;
    if (!r || !c || typeof r.version !== 'number' || !Number.isInteger(r.version) || r.version < 1) return null;

    const pickupTiers: RidePricingGrid['pickupTiers'] = [];
    for (const t of (c.pickup_tiers as Array<Record<string, unknown>>) ?? []) {
      const u = upTo(t.up_to_km);
      if (u === null || !isNum(t.fare_tnd)) return null;
      pickupTiers.push({ upToKm: u, fareTnd: t.fare_tnd });
    }
    const kmTiers: RidePricingGrid['kmTiers'] = [];
    for (const t of (c.km_tiers as Array<Record<string, unknown>>) ?? []) {
      const u = upTo(t.up_to_km);
      if (u === null || !isNum(t.rate_per_km)) return null;
      kmTiers.push({ upToKm: u, ratePerKm: t.rate_per_km });
    }
    if (!isIncreasingToInfinity(pickupTiers) || !isIncreasingToInfinity(kmTiers)) return null;
    if (!isNum(c.default_pickup_fare_tnd) || !isNum(c.minimum_price_tnd)) return null;
    const optional = (v: unknown): number | undefined => (isNum(v) ? v : undefined);

    return {
      version: r.version,
      defaultPickupFareTnd: c.default_pickup_fare_tnd,
      pickupTiers,
      kmTiers,
      minimumPriceTnd: c.minimum_price_tnd,
      nightSupplementPercent: optional(c.night_supplement_percent),
      weekendSupplementPercent: optional(c.weekend_supplement_percent),
      maxSupplementPercent: optional(c.max_supplement_percent),
    };
  } catch {
    return null;
  }
}

async function fetchRemoteConfig(): Promise<unknown> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('pricing config timeout')), FETCH_TIMEOUT_MS),
  );
  const request = (async () => {
    const { data, error } = await supabase.rpc('get_pricing_config');
    if (error) throw error;
    return data;
  })();
  return Promise.race([request, timeout]);
}

let loading: Promise<void> | null = null;

/**
 * Ne lève jamais : en cas d'échec, la grille en cours est conservée.
 * `skipCache` : ne pas réappliquer la copie locale avant la réponse de la base (actualisation).
 */
export function loadPricingConfig(options: { skipCache?: boolean } = {}): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const cached = options.skipCache ? null : localStorage.getItem(CACHE_KEY);
      const grid = cached ? parsePricingConfig(JSON.parse(cached)) : null;
      if (grid) applyRidePricingGrid(grid);
    } catch {
      /* cache indisponible : ignoré */
    }
    try {
      const raw = await fetchRemoteConfig();
      const grid = parsePricingConfig(raw);
      if (grid) {
        applyRidePricingGrid(grid);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(raw));
        } catch {
          /* stockage indisponible : ignoré */
        }
      }
    } catch {
      /* grille actuelle conservée */
    } finally {
      loading = null;
    }
  })();
  return loading;
}

const REFRESH_MIN_INTERVAL_MS = 60_000;

/**
 * Recharge la grille quand l'onglet redevient visible (au plus une fois par minute), pour qu'un changement
 * fait dans l'administration soit pris en compte sans recharger la page.
 */
export function startPricingConfigRefresh(): void {
  let lastRefresh = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || Date.now() - lastRefresh < REFRESH_MIN_INTERVAL_MS) return;
    lastRefresh = Date.now();
    void loadPricingConfig({ skipCache: true });
  });
}

/** Version de grille courante ; provoque un nouveau rendu quand la grille de la base est appliquée. */
export function usePricingGridVersion(): number {
  return useSyncExternalStore(subscribeRidePricing, getRidePricingVersion, getRidePricingVersion);
}

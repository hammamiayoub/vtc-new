import type { Coordinates } from './geolocation';

export const PENDING_QUOTE_KEY = 'td_pending_quote';

export interface PendingQuote {
  pickupAddress: string;
  destinationAddress: string;
  pickupCoords?: Coordinates;
  destinationCoords?: Coordinates;
  distanceKm: number;
  estimatedPrice: number;
  vehicleType?: string;
}

function isValidQuote(data: unknown): data is PendingQuote {
  if (!data || typeof data !== 'object') return false;
  const q = data as Record<string, unknown>;
  return (
    typeof q.pickupAddress === 'string' &&
    q.pickupAddress.trim().length > 0 &&
    typeof q.destinationAddress === 'string' &&
    q.destinationAddress.trim().length > 0 &&
    typeof q.distanceKm === 'number' &&
    q.distanceKm > 0 &&
    typeof q.estimatedPrice === 'number' &&
    q.estimatedPrice > 0
  );
}

function parseCoords(value: unknown): Coordinates | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const c = value as Record<string, unknown>;
  if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') return undefined;
  return { latitude: c.latitude, longitude: c.longitude };
}

export function getPendingQuote(): PendingQuote | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(PENDING_QUOTE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!isValidQuote(parsed)) {
      sessionStorage.removeItem(PENDING_QUOTE_KEY);
      return null;
    }

    return {
      pickupAddress: parsed.pickupAddress.trim(),
      destinationAddress: parsed.destinationAddress.trim(),
      pickupCoords: parseCoords(parsed.pickupCoords),
      destinationCoords: parseCoords(parsed.destinationCoords),
      distanceKm: parsed.distanceKm,
      estimatedPrice: parsed.estimatedPrice,
      vehicleType: typeof parsed.vehicleType === 'string' ? parsed.vehicleType : 'sedan',
    };
  } catch {
    sessionStorage.removeItem(PENDING_QUOTE_KEY);
    return null;
  }
}

export function savePendingQuote(quote: PendingQuote): void {
  sessionStorage.setItem(PENDING_QUOTE_KEY, JSON.stringify(quote));
}

export function clearPendingQuote(): void {
  sessionStorage.removeItem(PENDING_QUOTE_KEY);
}

export function hasPendingQuote(): boolean {
  return getPendingQuote() !== null;
}

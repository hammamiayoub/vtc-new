import type { Coordinates } from './geolocation';

export const PENDING_QUOTE_KEY = 'td_pending_quote';
/** Au-delà, le devis est considéré comme périmé (prix et heure de départ plus fiables). */
const PENDING_QUOTE_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * localStorage et non sessionStorage : le lien de confirmation d'email s'ouvre dans un nouvel
 * onglet, où un sessionStorage serait vide et le devis perdu.
 */
function removeStoredQuote(): void {
  try {
    localStorage.removeItem(PENDING_QUOTE_KEY);
  } catch {
    /* stockage indisponible */
  }
}

export interface PendingQuote {
  pickupAddress: string;
  destinationAddress: string;
  pickupCoords?: Coordinates;
  destinationCoords?: Coordinates;
  distanceKm: number;
  estimatedPrice: number;
  vehicleType?: string;
  /** Départ planifié, au format d'un champ datetime-local (heure locale). Absent = départ immédiat. */
  scheduledTime?: string;
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
    const raw = localStorage.getItem(PENDING_QUOTE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    const savedAt = (parsed as { savedAt?: unknown } | null)?.savedAt;
    const expired =
      typeof savedAt !== 'number' || Math.abs(Date.now() - savedAt) > PENDING_QUOTE_TTL_MS;
    if (expired || !isValidQuote(parsed)) {
      removeStoredQuote();
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
      scheduledTime:
        typeof parsed.scheduledTime === 'string' && !Number.isNaN(new Date(parsed.scheduledTime).getTime())
          ? parsed.scheduledTime
          : undefined,
    };
  } catch {
    removeStoredQuote();
    return null;
  }
}

export function savePendingQuote(quote: PendingQuote): void {
  try {
    localStorage.setItem(PENDING_QUOTE_KEY, JSON.stringify({ ...quote, savedAt: Date.now() }));
  } catch {
    /* stockage indisponible : le devis ne sera simplement pas repris après connexion */
  }
}

export function clearPendingQuote(): void {
  removeStoredQuote();
}

export function hasPendingQuote(): boolean {
  return getPendingQuote() !== null;
}

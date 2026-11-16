import { getCurrentPosition, type Coordinates } from './geolocation';
import { findNearbyFrequentPlace, loadFrequentPlaces } from './frequentPlaces';

export interface CurrentPickup {
  label: string;
  coords: Coordinates;
  /** Code pays ISO en minuscules (« tn »), ou null s'il n'a pas pu être déterminé. */
  countryCode: string | null;
}

/**
 * Transforme la position GPS de l'utilisateur en lieu de prise en charge : un lieu fréquent tout
 * proche (aéroport, gare…) s'il y en a un, sinon l'adresse obtenue par géocodage inverse.
 * Lève une erreur si la position ou l'adresse n'a pas pu être obtenue.
 */
export async function resolveCurrentPickup(): Promise<CurrentPickup> {
  const position = await getCurrentPosition();

  const nearby = findNearbyFrequentPlace(
    await loadFrequentPlaces(),
    position.latitude,
    position.longitude,
    ['tn'],
  );
  if (nearby) {
    return {
      label: nearby.label,
      coords: { latitude: nearby.latitude, longitude: nearby.longitude },
      countryCode: 'tn',
    };
  }

  // Un seul géocodage, au moment où la position est confirmée.
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.latitude}&lon=${position.longitude}&countrycodes=tn`,
  );
  if (!response.ok) throw new Error('Géocodage inverse indisponible');

  const data = (await response.json()) as {
    display_name?: unknown;
    address?: { country_code?: unknown };
  };
  if (typeof data.display_name !== 'string' || !data.display_name.trim()) {
    throw new Error('Adresse introuvable pour cette position');
  }

  const countryCode = data.address?.country_code;
  return {
    label: data.display_name,
    coords: position,
    countryCode: typeof countryCode === 'string' ? countryCode.toLowerCase() : null,
  };
}

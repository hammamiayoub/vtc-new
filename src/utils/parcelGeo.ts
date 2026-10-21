import { googleMapsLoader } from './googleMapsLoader';
import { findNearbyFrequentPlace, loadFrequentPlaces } from './frequentPlaces';
import type { ParcelDirection } from '../types';

// Codes ISO des pays européens couverts par le service
export const EUROPE_COUNTRY_CODES = [
  'fr', 'it', 'de', 'es', 'be', 'nl', 'lu', 'pt', 'ch', 'at',
  'gb', 'ie', 'dk', 'se', 'no', 'fi', 'pl', 'cz', 'sk', 'hu',
  'ro', 'bg', 'gr', 'hr', 'si', 'ee', 'lv', 'lt', 'mt', 'cy',
];

export const TUNISIA_COUNTRY_CODE = 'tn';

/**
 * Restriction de pays pour l'autocomplétion selon la direction et le point.
 * - europe_to_tunisia : départ = Europe, arrivée = Tunisie
 * - tunisia_to_europe : départ = Tunisie, arrivée = Europe
 */
export function countriesForPoint(
  direction: ParcelDirection,
  point: 'departure' | 'arrival'
): string[] {
  const europeSide =
    (direction === 'europe_to_tunisia' && point === 'departure') ||
    (direction === 'tunisia_to_europe' && point === 'arrival');
  return europeSide ? EUROPE_COUNTRY_CODES : [TUNISIA_COUNTRY_CODE];
}

export interface PlaceDetails {
  address: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

const COUNTRY_NAME_MAP: { [key: string]: string } = {
  TN: 'Tunisia',
  Tunisie: 'Tunisia',
  France: 'France',
  Italie: 'Italy',
  Allemagne: 'Germany',
  Espagne: 'Spain',
  Belgique: 'Belgium',
};

/**
 * Extrait adresse formatée, pays et coordonnées d'un PlaceResult Google.
 */
export function extractPlaceDetails(
  place: google.maps.places.PlaceResult
): PlaceDetails {
  const components = place.address_components || [];
  const rawCountry =
    components.find((c) => c.types.includes('country'))?.long_name || '';
  const country = COUNTRY_NAME_MAP[rawCountry] || rawCountry;

  let address = place.formatted_address || place.name || '';
  if (place.name && !place.formatted_address?.startsWith(place.name)) {
    address = place.formatted_address || place.name;
  }

  const location = place.geometry?.location;
  return {
    address,
    country,
    latitude: location?.lat?.(),
    longitude: location?.lng?.(),
  };
}

/**
 * Position GPS confirmée par le bouton « Ma position ».
 * Un lieu fréquent proche est renvoyé sans Google.
 * Sinon un seul géocodage inverse est fait, au moment de cette confirmation.
 */
export async function geolocateCurrentPosition(): Promise<PlaceDetails> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error("La géolocalisation n'est pas supportée par ce navigateur");
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });

  const { latitude, longitude } = position.coords;

  const nearby = findNearbyFrequentPlace(await loadFrequentPlaces(), latitude, longitude);
  if (nearby) {
    return {
      address: nearby.label,
      country: nearby.country_code === 'tn' ? 'Tunisia' : nearby.country_code.toUpperCase(),
      latitude: nearby.latitude,
      longitude: nearby.longitude,
    };
  }

  await googleMapsLoader.loadGoogleMaps();
  const geocoder = new google.maps.Geocoder();

  const result = await new Promise<google.maps.GeocoderResult | null>((resolve) => {
    geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
      if (status === 'OK' && results && results.length > 0) {
        resolve(results[0]);
      } else {
        resolve(null);
      }
    });
  });

  if (!result) {
    return {
      address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      country: '',
      latitude,
      longitude,
    };
  }

  const rawCountry =
    result.address_components.find((c) => c.types.includes('country'))?.long_name || '';
  const country = COUNTRY_NAME_MAP[rawCountry] || rawCountry;

  return {
    address: result.formatted_address,
    country,
    latitude,
    longitude,
  };
}

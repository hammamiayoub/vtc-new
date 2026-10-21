import { supabase } from '../lib/supabase';
import { calculateDistance } from './geolocation';

export type FrequentPlaceKind = 'airport' | 'station' | 'hotel';

export interface FrequentPlace {
  id: string;
  label: string;
  aliases: string[];
  kind: FrequentPlaceKind;
  country_code: string;
  latitude: number;
  longitude: number;
}

const NEARBY_RADIUS_KM: Record<FrequentPlaceKind, number> = {
  airport: 2,
  station: 0.45,
  hotel: 0.3,
};

const STRONG_PREFIXES = new Set(['aeroport', 'airport', 'gare', 'station', 'hotel']);

/** Utilisé seulement si la table n'est pas encore disponible. La base reste la source une fois la migration appliquée. */
const FALLBACK_FREQUENT_PLACES: FrequentPlace[] = [
  { id: 'fallback-tunis-carthage', label: 'Aéroport Tunis-Carthage', aliases: ['aeroport tunis carthage', 'aeroport de tunis', 'aeroport tunis', 'tunis carthage', 'carthage', 'tunis airport'], kind: 'airport', country_code: 'tn', latitude: 36.85111, longitude: 10.22722 },
  { id: 'fallback-enfidha', label: 'Aéroport Enfidha-Hammamet', aliases: ['aeroport enfidha', 'enfidha', 'aeroport hammamet', 'enfidha hammamet'], kind: 'airport', country_code: 'tn', latitude: 36.09194, longitude: 10.41389 },
  { id: 'fallback-djerba', label: 'Aéroport Djerba-Zarzis', aliases: ['aeroport djerba', 'djerba', 'zarzis', 'aeroport zarzis'], kind: 'airport', country_code: 'tn', latitude: 33.875, longitude: 10.77528 },
  { id: 'fallback-monastir-airport', label: 'Aéroport Monastir Habib Bourguiba', aliases: ['aeroport monastir', 'monastir airport', 'habib bourguiba', 'skanes'], kind: 'airport', country_code: 'tn', latitude: 35.75806, longitude: 10.75472 },
  { id: 'fallback-sfax-airport', label: 'Aéroport Sfax-Thyna', aliases: ['aeroport sfax', 'sfax airport', 'thyna'], kind: 'airport', country_code: 'tn', latitude: 34.71778, longitude: 10.69083 },
  { id: 'fallback-tozeur', label: 'Aéroport Tozeur-Nefta', aliases: ['aeroport tozeur', 'tozeur airport', 'nefta'], kind: 'airport', country_code: 'tn', latitude: 33.93972, longitude: 8.11056 },
  { id: 'fallback-tabarka', label: 'Aéroport Tabarka-Aïn Draham', aliases: ['aeroport tabarka', 'tabarka airport', 'ain draham'], kind: 'airport', country_code: 'tn', latitude: 36.98, longitude: 8.87694 },
  { id: 'fallback-gafsa', label: 'Aéroport Gafsa-Ksar', aliases: ['aeroport gafsa', 'gafsa airport'], kind: 'airport', country_code: 'tn', latitude: 34.42194, longitude: 8.8225 },
  { id: 'fallback-gabes-airport', label: 'Aéroport Gabès-Matmata', aliases: ['aeroport gabes', 'gabes airport', 'matmata'], kind: 'airport', country_code: 'tn', latitude: 33.73337, longitude: 9.91821 },
  { id: 'fallback-gare-tunis', label: 'Gare de Tunis', aliases: ['gare tunis', 'gare de barcelone', 'place de barcelone', 'tunis ville'], kind: 'station', country_code: 'tn', latitude: 36.79607, longitude: 10.18053 },
  { id: 'fallback-gare-sousse', label: 'Gare de Sousse', aliases: ['gare sousse', 'gare de sousse'], kind: 'station', country_code: 'tn', latitude: 35.83065, longitude: 10.63833 },
  { id: 'fallback-gare-monastir', label: 'Gare de Monastir', aliases: ['gare monastir', 'gare habib bourguiba monastir'], kind: 'station', country_code: 'tn', latitude: 35.77089, longitude: 10.8264 },
  { id: 'fallback-gare-sfax', label: 'Gare de Sfax', aliases: ['gare sfax', 'gare de sfax'], kind: 'station', country_code: 'tn', latitude: 34.73778, longitude: 10.76639 },
  { id: 'fallback-gare-gabes', label: 'Gare de Gabès', aliases: ['gare gabes', 'gare de gabes'], kind: 'station', country_code: 'tn', latitude: 33.88448, longitude: 10.09936 },
];

let cachedPlaces: FrequentPlace[] | null = null;
let loadingPlaces: Promise<FrequentPlace[]> | null = null;

export function normalizePlaceQuery(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export async function loadFrequentPlaces(): Promise<FrequentPlace[]> {
  if (cachedPlaces) return cachedPlaces;
  if (!loadingPlaces) {
    loadingPlaces = supabase
      .from('frequent_places')
      .select('id, label, aliases, kind, country_code, latitude, longitude')
      .eq('active', true)
      .then(({ data, error }) => {
        if (error || !data) {
          console.error('Lieux fréquents indisponibles:', error);
          cachedPlaces = FALLBACK_FREQUENT_PLACES;
          return FALLBACK_FREQUENT_PLACES;
        }
        const places = (data || []).map((row) => ({
          id: row.id as string,
          label: row.label as string,
          aliases: (row.aliases as string[] | null) ?? [],
          kind: row.kind as FrequentPlaceKind,
          country_code: String(row.country_code || '').toLowerCase(),
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
        }));
        cachedPlaces = places;
        return places;
      })
      .finally(() => {
        loadingPlaces = null;
      });
  }
  return loadingPlaces;
}

function acceptedCountries(countries?: string[] | null): Set<string> | null {
  if (!countries || countries.length === 0) return null;
  return new Set(countries.map((code) => code.toLowerCase()));
}

function placeNames(place: FrequentPlace): string[] {
  return [place.label, ...place.aliases].map(normalizePlaceQuery).filter(Boolean);
}

function nameMatches(name: string, query: string): boolean {
  if (name.includes(query)) return true;
  return name.split(' ').some((word) => word.startsWith(query));
}

function isStrongNameMatch(name: string, query: string): boolean {
  if (!name.startsWith(query)) return false;
  if (name === query) return true;
  const head = name.split(' ')[0];
  if (STRONG_PREFIXES.has(head) && query.length >= 3) return true;
  return name.length - query.length <= 2 && query.length >= 4;
}

export function matchFrequentPlaces(
  places: FrequentPlace[],
  rawQuery: string,
  countries?: string[] | null
): FrequentPlace[] {
  const query = normalizePlaceQuery(rawQuery);
  if (query.length < 2) return [];
  const allowed = acceptedCountries(countries);
  return places
    .filter((place) => !allowed || allowed.has(place.country_code))
    .filter((place) => placeNames(place).some((name) => nameMatches(name, query)))
    .slice(0, 12);
}

/** Vrai quand la saisie vise déjà un lieu connu : Google n'est pas appelé. */
export function queryTargetsFrequentPlace(
  places: FrequentPlace[],
  rawQuery: string,
  countries?: string[] | null
): boolean {
  const query = normalizePlaceQuery(rawQuery);
  if (query.length < 3) return false;
  const allowed = acceptedCountries(countries);
  return places.some((place) => {
    if (allowed && !allowed.has(place.country_code)) return false;
    return placeNames(place).some((name) => isStrongNameMatch(name, query));
  });
}

export function findNearbyFrequentPlace(
  places: FrequentPlace[],
  latitude: number,
  longitude: number,
  countries?: string[] | null
): FrequentPlace | null {
  const allowed = acceptedCountries(countries);
  let best: FrequentPlace | null = null;
  let bestKm = Infinity;
  for (const place of places) {
    if (allowed && !allowed.has(place.country_code)) continue;
    const km = calculateDistance(latitude, longitude, place.latitude, place.longitude);
    const radius = NEARBY_RADIUS_KM[place.kind] ?? 0.3;
    if (km <= radius && km < bestKm) {
      best = place;
      bestKm = km;
    }
  }
  return best;
}

const COUNTRY_LABELS: Record<string, string> = {
  tn: 'Tunisia',
};

export function frequentPlaceToPlaceResult(place: FrequentPlace): google.maps.places.PlaceResult {
  const countryName = COUNTRY_LABELS[place.country_code] || place.country_code.toUpperCase();
  return {
    name: place.label,
    formatted_address: place.label,
    place_id: `frequent:${place.id}`,
    address_components: [
      {
        long_name: countryName,
        short_name: place.country_code.toUpperCase(),
        types: ['country'],
      },
    ],
    geometry: {
      location: {
        lat: () => place.latitude,
        lng: () => place.longitude,
      } as google.maps.LatLng,
    },
  };
}

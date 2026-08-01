import { calculateDistance, getCityCoordinates, type Coordinates } from './geolocation';
import { googleMapsLoader } from './googleMapsLoader';
import { supabase } from '../lib/supabase';

/** Rayon max de recherche de chauffeurs autour du point de départ (web). */
export const DRIVER_SEARCH_RADIUS_KM = 50;

/** Position GPS considérée fraîche (driver_locations). */
export const DRIVER_LOCATION_MAX_AGE_MS = 30 * 60 * 1000;

export interface DriverDistanceInfo {
  distanceKm: number;
  coords: Coordinates;
  source: 'gps' | 'geocode';
}

const geocodeCache = new Map<string, Coordinates | null>();

export function isDriverWithinSearchRadius(distanceKm: number | null | undefined): boolean {
  return (
    distanceKm != null &&
    Number.isFinite(distanceKm) &&
    distanceKm !== Infinity &&
    distanceKm <= DRIVER_SEARCH_RADIUS_KM
  );
}

export function normalizeDriverCityName(city: string | null | undefined): string {
  if (!city?.trim()) return '';
  return city.split(',')[0].trim();
}

async function geocodeWithGoogleMaps(query: string): Promise<Coordinates | null> {
  if (typeof window === 'undefined') return null;

  try {
    await googleMapsLoader.loadGoogleMaps();
  } catch {
    return null;
  }

  const geocoderCtor = window.google?.maps?.Geocoder;
  if (!geocoderCtor) return null;

  return new Promise((resolve) => {
    const geocoder = new geocoderCtor();
    geocoder.geocode({ address: query, region: 'tn' }, (results, status) => {
      const location = results?.[0]?.geometry?.location;
      if (status === 'OK' && location) {
        resolve({
          latitude: location.lat(),
          longitude: location.lng(),
        });
      } else {
        resolve(null);
      }
    });
  });
}

export async function geocodeDriverCityAsync(city: string | null | undefined): Promise<Coordinates | null> {
  const normalized = normalizeDriverCityName(city);
  const cacheKey = (city ?? '').trim().toLowerCase();
  if (!cacheKey) return null;

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) ?? null;
  }

  const staticCoords =
    getCityCoordinates(normalized)
    ?? (normalized !== city?.trim() ? getCityCoordinates(city!.trim()) : null);

  if (staticCoords) {
    geocodeCache.set(cacheKey, staticCoords);
    return staticCoords;
  }

  const query = city!.includes('Tunisia') ? city!.trim() : `${normalized}, Tunisia`;
  const geocoded = await geocodeWithGoogleMaps(query);
  geocodeCache.set(cacheKey, geocoded);
  return geocoded;
}

type DriverLocationRow = {
  driver_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
};

export async function fetchFreshDriverLocations(
  driverIds: string[],
  maxAgeMs = DRIVER_LOCATION_MAX_AGE_MS,
): Promise<Map<string, DriverLocationRow>> {
  const map = new Map<string, DriverLocationRow>();
  if (!driverIds.length) return map;

  const uniqueIds = [...new Set(driverIds)];
  const { data, error } = await supabase
    .from('driver_locations')
    .select('driver_id, latitude, longitude, updated_at')
    .in('driver_id', uniqueIds);

  if (error) {
    console.warn('⚠️ Impossible de lire driver_locations:', error.message);
    return map;
  }

  const minUpdatedAt = Date.now() - maxAgeMs;
  for (const row of data ?? []) {
    const updatedAt = new Date(row.updated_at).getTime();
    if (Number.isNaN(updatedAt) || updatedAt < minUpdatedAt) continue;
    map.set(row.driver_id, row as DriverLocationRow);
  }

  return map;
}

export async function buildDriverDistanceMap(
  drivers: { id: string; city?: string | null }[],
  pickup: Coordinates,
): Promise<Map<string, DriverDistanceInfo>> {
  const distanceMap = new Map<string, DriverDistanceInfo>();
  if (!drivers.length) return distanceMap;

  const uniqueDrivers = new Map<string, { id: string; city?: string | null }>();
  for (const driver of drivers) {
    if (!uniqueDrivers.has(driver.id)) {
      uniqueDrivers.set(driver.id, driver);
    }
  }

  const locationMap = await fetchFreshDriverLocations([...uniqueDrivers.keys()]);

  const citiesToGeocode = new Set<string>();
  for (const driver of uniqueDrivers.values()) {
    if (locationMap.has(driver.id)) continue;
    const city = normalizeDriverCityName(driver.city);
    if (city) citiesToGeocode.add(city);
  }

  await Promise.all([...citiesToGeocode].map((city) => geocodeDriverCityAsync(city)));

  for (const driver of uniqueDrivers.values()) {
    const live = locationMap.get(driver.id);
    let coords: Coordinates | null = null;
    let source: DriverDistanceInfo['source'] = 'geocode';

    if (live) {
      coords = { latitude: live.latitude, longitude: live.longitude };
      source = 'gps';
    } else {
      coords = await geocodeDriverCityAsync(driver.city);
    }

    if (!coords) continue;

    const distanceKm = calculateDistance(
      pickup.latitude,
      pickup.longitude,
      coords.latitude,
      coords.longitude,
    );

    distanceMap.set(driver.id, { distanceKm, coords, source });
  }

  return distanceMap;
}

export function sortDriversByProximity<T extends { distanceFromPickup?: number }>(drivers: T[]): T[] {
  return [...drivers].sort((a, b) => {
    const distA = a.distanceFromPickup ?? Infinity;
    const distB = b.distanceFromPickup ?? Infinity;
    if (distA !== distB) return distA - distB;

    const aPhoto = !!(a as { vehicleInfo?: { photoUrl?: string } }).vehicleInfo?.photoUrl;
    const bPhoto = !!(b as { vehicleInfo?: { photoUrl?: string } }).vehicleInfo?.photoUrl;
    if (aPhoto !== bPhoto) return aPhoto ? -1 : 1;

    const aRating = typeof (a as { averageRating?: number }).averageRating === 'number'
      ? (a as { averageRating: number }).averageRating
      : -1;
    const bRating = typeof (b as { averageRating?: number }).averageRating === 'number'
      ? (b as { averageRating: number }).averageRating
      : -1;
    if (aRating !== bRating) return bRating - aRating;

    const aName = `${(a as { firstName?: string }).firstName ?? ''} ${(a as { lastName?: string }).lastName ?? ''}`;
    const bName = `${(b as { firstName?: string }).firstName ?? ''} ${(b as { lastName?: string }).lastName ?? ''}`;
    return aName.localeCompare(bName);
  });
}

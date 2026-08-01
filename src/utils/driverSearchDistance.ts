/** Rayon max de recherche de chauffeurs autour du point de départ (web). */
export const DRIVER_SEARCH_RADIUS_KM = 50;

export function isDriverWithinSearchRadius(distanceKm: number | null | undefined): boolean {
  return (
    distanceKm != null &&
    Number.isFinite(distanceKm) &&
    distanceKm !== Infinity &&
    distanceKm <= DRIVER_SEARCH_RADIUS_KM
  );
}

/** Illustrations génériques par type (public/) quand le chauffeur n'a pas de photo véhicule. */
export function getVehiclePlaceholderImage(
  vehicleType?: string | null,
): string {
  switch (vehicleType) {
    case 'van':
    case 'minibus':
      return '/van.webp';
    case 'bus':
      return '/bus.webp';
    case 'utility':
    case 'truck':
    case 'pickup':
      return '/utilitaire.webp';
    case 'sedan':
    case 'taxi':
    case 'limousine':
    default:
      return '/limousine.webp';
  }
}

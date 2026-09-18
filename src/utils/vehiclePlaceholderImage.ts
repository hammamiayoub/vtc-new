/** Illustrations génériques par type (public/) quand le chauffeur n'a pas de photo véhicule. */
export const SEDAN_PLACEHOLDER_IMAGE = '/vehicles/sedan-template.svg';

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
    case 'limousine':
      return '/limousine.webp';
    case 'sedan':
    case 'taxi':
    default:
      return SEDAN_PLACEHOLDER_IMAGE;
  }
}

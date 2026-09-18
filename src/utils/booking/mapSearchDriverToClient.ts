import type { Driver, VehicleInfo } from '../../types';

type RawVehicle = {
  id: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  license_plate?: string;
  seats?: number;
  type?: VehicleInfo['type'];
  photo_url?: string;
  is_vip?: boolean;
  is_primary?: boolean;
};

export type DriverSearchEntry = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  city?: string;
  license_number?: string;
  status: string;
  profile_photo_url?: string;
  created_at: string;
  updated_at: string;
  primary_vehicle?: RawVehicle;
  driverVehicleId?: string;
  calculatedDistance?: number;
  driverCoords?: { latitude: number; longitude: number };
  distanceSource?: string;
};

function mapVehicle(vehicle: RawVehicle): VehicleInfo {
  return {
    make: vehicle.make ?? '',
    model: vehicle.model ?? '',
    year: vehicle.year ?? new Date().getFullYear(),
    color: vehicle.color ?? '',
    licensePlate: vehicle.license_plate ?? '',
    seats: vehicle.seats ?? 4,
    type: vehicle.type ?? 'sedan',
    photoUrl: vehicle.photo_url,
    isVip: vehicle.is_vip ?? false,
  };
}

export function mapSearchEntryToDriver(entry: DriverSearchEntry): Driver {
  const vehicle = entry.primary_vehicle;
  return {
    id: entry.id,
    firstName: entry.first_name,
    lastName: entry.last_name,
    email: entry.email,
    phone: entry.phone,
    city: entry.city,
    licenseNumber: entry.license_number,
    vehicleInfo: vehicle ? mapVehicle(vehicle) : undefined,
    status: entry.status,
    profilePhotoUrl: entry.profile_photo_url,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
    distanceFromPickup: entry.calculatedDistance,
    driverVehicleId: entry.driverVehicleId,
    vehicleId: vehicle?.id,
  };
}

import { supabase } from '../lib/supabase';
import { Vehicle, VehicleInfo } from '../types';

export function isLegacyVehicleInfoEmpty(info: unknown): boolean {
  if (!info || typeof info !== 'object') return true;
  const v = info as Record<string, unknown>;
  const make = typeof v.make === 'string' ? v.make.trim() : '';
  const model = typeof v.model === 'string' ? v.model.trim() : '';
  return !make || !model;
}

export function normalizeLegacyVehicleInfo(info: unknown): VehicleInfo | undefined {
  if (isLegacyVehicleInfoEmpty(info)) return undefined;
  const v = info as Record<string, unknown>;
  return {
    make: String(v.make),
    model: String(v.model),
    year: Number(v.year) || 0,
    color: String(v.color ?? ''),
    licensePlate: String(v.licensePlate ?? v.license_plate ?? ''),
    seats: Number(v.seats) || 0,
    type: (v.type as VehicleInfo['type']) || 'sedan',
    photoUrl: (v.photoUrl as string | undefined) ?? (v.photo_url as string | undefined),
    isVip: Boolean(v.isVip ?? v.is_vip),
  };
}

export function vehicleToVehicleInfo(vehicle: Vehicle): VehicleInfo {
  return {
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year ?? 0,
    color: vehicle.color ?? '',
    licensePlate: vehicle.licensePlate ?? '',
    seats: vehicle.seats ?? 0,
    type: vehicle.type ?? 'sedan',
    photoUrl: vehicle.photoUrl,
    isVip: vehicle.isVip,
  };
}

export async function listVehicles(driverId: string): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('driver_id', driverId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapVehicleRowToVehicle);
}

export async function createVehicle(driverId: string, payload: Partial<Vehicle>): Promise<Vehicle> {
  const insert = {
    driver_id: driverId,
    make: payload.make || '',
    model: payload.model || '',
    year: payload.year ?? null,
    color: payload.color ?? null,
    license_plate: payload.licensePlate ?? null,
    seats: payload.seats ?? null,
    type: payload.type ?? null,
    photo_url: payload.photoUrl ?? null,
    is_vip: payload.isVip ?? null
  };
  const { data, error } = await supabase
    .from('vehicles')
    .insert(insert)
    .select('*')
    .single();
  if (error) throw error;
  return mapVehicleRowToVehicle(data);
}

export async function updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<Vehicle> {
  const patch: any = {};
  if (updates.make !== undefined) patch.make = updates.make;
  if (updates.model !== undefined) patch.model = updates.model;
  if (updates.year !== undefined) patch.year = updates.year;
  if (updates.color !== undefined) patch.color = updates.color;
  if (updates.licensePlate !== undefined) patch.license_plate = updates.licensePlate;
  if (updates.seats !== undefined) patch.seats = updates.seats;
  if (updates.type !== undefined) patch.type = updates.type;
  if (updates.photoUrl !== undefined) patch.photo_url = updates.photoUrl;
  if (updates.isVip !== undefined) patch.is_vip = updates.isVip;
  if (updates as any && (updates as any).is_primary !== undefined) patch.is_primary = (updates as any).is_primary;

  const { data, error } = await supabase
    .from('vehicles')
    .update(patch)
    .eq('id', vehicleId)
    .select('*')
    .single();
  if (error) throw error;
  return mapVehicleRowToVehicle(data);
}

export async function softDeleteVehicle(vehicleId: string): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', vehicleId);
  if (error) throw error;
}

export function formatVehicleType(type?: string | null): string {
  if (!type) return 'N/A';
  const labels: Record<string, string> = {
    sedan: 'Berline',
    pickup: 'Pickup',
    van: 'Van',
    minibus: 'Minibus',
    bus: 'Bus',
    truck: 'Camion',
    utility: 'Utilitaire',
    taxi: 'Taxi',
    limousine: 'Limousine',
  };
  return labels[type] || type;
}

export function mapVehicleRowToVehicle(row: any): Vehicle {
  return {
    id: row.id,
    driverId: row.driver_id,
    make: row.make,
    model: row.model,
    year: row.year ?? undefined,
    color: row.color ?? undefined,
    licensePlate: row.license_plate ?? undefined,
    seats: row.seats ?? undefined,
    type: row.type ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    isVip: row.is_vip ?? undefined,
    is_primary: row.is_primary ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}



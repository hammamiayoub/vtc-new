import { supabase } from '../lib/supabase';
import { Vehicle } from '../types';

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
    photo_url: payload.photoUrl ?? null
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

function mapVehicleRowToVehicle(row: any): Vehicle {
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
    is_primary: row.is_primary ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}



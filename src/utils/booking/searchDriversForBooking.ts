import { supabase } from '../../lib/supabase';
import {
  buildDriverDistanceMap,
  getDriverDistanceKm,
  refineTopDriverDistancesWithMatrix,
  SEDAN_VAN_EXTRA_RADIUS_KM,
  type DriverDistanceInfo,
} from '../driverSearchDistance';
import type { Coordinates } from '../geolocation';
import {
  MAX_DRIVER_SEARCH_RADIUS_KM,
  MAX_DRIVERS_MATRIX_REFINE,
} from './bookingSearchConstants';
import { isDriverEligibleAtTime, isVehicleAvailableAtTime } from './driverAvailability';
import { formatScheduledSlot } from './driverSearchTimeUtils';
import type { DriverSearchEntry } from './mapSearchDriverToClient';

type RawVehicle = {
  id: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  license_plate?: string;
  seats?: number;
  type?: string;
  photo_url?: string;
  is_vip?: boolean;
  is_primary?: boolean;
};

type EnrichedDriver = DriverSearchEntry & {
  vehicles?: RawVehicle[];
};

const DRIVER_ENRICH_SELECT = `
  id,
  first_name,
  last_name,
  phone,
  vehicle_info,
  status,
  email,
  city,
  license_number,
  profile_photo_url,
  created_at,
  updated_at,
  driver_availability(
    date,
    start_time,
    end_time,
    is_available,
    vehicle_id
  ),
  vehicles!vehicles_driver_id_fkey(
    id,
    make,
    model,
    year,
    color,
    license_plate,
    seats,
    type,
    photo_url,
    is_primary,
    is_vip
  )
`;

const DRIVER_FALLBACK_SELECT = `
  id,
  first_name,
  last_name,
  phone,
  vehicle_info,
  status,
  email,
  city,
  license_number,
  profile_photo_url,
  created_at,
  updated_at,
  driver_availability(
    date,
    start_time,
    end_time,
    is_available,
    vehicle_id
  ),
  vehicles!vehicles_driver_id_fkey(
    id,
    make,
    model,
    year,
    color,
    license_plate,
    seats,
    type,
    photo_url,
    is_primary
  ),
  driver_subscriptions(
    id,
    subscription_type,
    start_date,
    end_date,
    payment_status
  )
`;

interface SubscriptionStatusRow {
  driver_id: string;
  has_active_subscription: boolean;
  remaining_free_bookings: number;
}

export interface SearchDriversForBookingParams {
  scheduledTimeIso: string;
  pickupCoords: Coordinates | null;
  vehicleType: string;
  refusedDriverIds: Set<string>;
}

export interface SearchDriversForBookingResult {
  drivers: DriverSearchEntry[];
  hasRefusalsExcluded: boolean;
  sortedDriverIds: string[];
}

export class DriverSearchFetchError extends Error {
  readonly userMessage = 'Impossible de récupérer les chauffeurs disponibles';

  constructor(cause?: unknown) {
    super('Driver search fetch failed');
    this.name = 'DriverSearchFetchError';
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

async function fetchDriversWithAvailability(
  scheduledDate: string,
  scheduledTime: string,
): Promise<EnrichedDriver[]> {
  try {
    const { data, error: rpcError } = await supabase.rpc('get_available_drivers', {
      p_date: scheduledDate,
      p_time: scheduledTime,
    });
    if (rpcError) throw rpcError;

    const ids = (data || []).map((d: { id: string }) => d.id);
    if (ids.length === 0) {
      return [];
    }

    const { data: enriched, error: enrichErr } = await supabase
      .from('drivers')
      .select(DRIVER_ENRICH_SELECT)
      .in('id', ids);
    if (enrichErr) throw enrichErr;

    let driversWithAvailability = (enriched || []) as EnrichedDriver[];

    const rpcDriverIds = driversWithAvailability.map((d) => d.id);
    const { data: additionalDriversData, error: additionalErr } = await supabase
      .from('driver_availability')
      .select('driver_id')
      .eq('date', scheduledDate)
      .eq('is_available', true)
      .lte('start_time', scheduledTime)
      .gte('end_time', scheduledTime);

    if (!additionalErr && additionalDriversData) {
      const allDriverIdsWithAvailability = [
        ...new Set(additionalDriversData.map((da: { driver_id: string }) => da.driver_id)),
      ];
      const additionalDriverIds = allDriverIdsWithAvailability.filter(
        (id) => !rpcDriverIds.includes(id),
      );

      if (additionalDriverIds.length > 0) {
        const { data: additionalEnriched, error: additionalEnrichErr } = await supabase
          .from('drivers')
          .select(DRIVER_ENRICH_SELECT)
          .in('id', additionalDriverIds)
          .eq('status', 'active');

        if (!additionalEnrichErr && additionalEnriched) {
          driversWithAvailability = [
            ...driversWithAvailability,
            ...(additionalEnriched as EnrichedDriver[]),
          ];
        }
      }
    }

    return driversWithAvailability;
  } catch (rpcErr) {
    console.warn('RPC get_available_drivers indisponible, fallback client-side:', rpcErr);
    const fallback = await supabase
      .from('drivers')
      .select(DRIVER_FALLBACK_SELECT)
      .eq('status', 'active');
    if (fallback.error) throw fallback.error;
    return (fallback.data || []) as EnrichedDriver[];
  }
}

async function filterDriversBySubscription(drivers: EnrichedDriver[]): Promise<EnrichedDriver[]> {
  const driversWithValidSubscription: EnrichedDriver[] = [];

  try {
    if (drivers.length === 0) {
      return driversWithValidSubscription;
    }

    const driverIds = drivers.map((d) => d.id);
    const { data: batchData, error: batchError } = await supabase.rpc(
      'get_driver_subscription_statuses',
      { p_driver_ids: driverIds },
    );

    if (batchError) {
      console.warn('Erreur RPC get_driver_subscription_statuses — inclusion par défaut:', batchError);
      driversWithValidSubscription.push(...drivers);
    } else {
      const rowById = new Map<string, SubscriptionStatusRow>(
        ((batchData || []) as SubscriptionStatusRow[]).map((row) => [row.driver_id, row]),
      );
      for (const driver of drivers) {
        const status = rowById.get(driver.id);
        if (!status) {
          driversWithValidSubscription.push(driver);
          continue;
        }
        const canAccept =
          status.has_active_subscription || status.remaining_free_bookings > 0;
        if (canAccept) {
          driversWithValidSubscription.push(driver);
        }
      }
    }
  } catch (err) {
    console.warn('Erreur vérification batch abonnements — inclusion par défaut:', err);
    driversWithValidSubscription.push(...drivers);
  }

  return driversWithValidSubscription;
}

function buildDriverVehicleEntries(
  drivers: EnrichedDriver[],
  vehicleType: string,
  pickupCoords: Coordinates | null,
  driverDistanceMap: Map<string, DriverDistanceInfo>,
  scheduledDate: string,
  scheduledTime: string,
): DriverSearchEntry[] {
  const filteredDrivers: DriverSearchEntry[] = [];

  for (const driver of drivers) {
    try {
      if (pickupCoords && !driverDistanceMap.has(driver.id)) {
        continue;
      }

      const vehicles = driver.vehicles;
      if (!vehicles || vehicles.length === 0) {
        continue;
      }

      let availableVehicles: RawVehicle[] = [];

      if (vehicleType) {
        const matchingVehicles = vehicles.filter((v) => v.type === vehicleType);
        availableVehicles.push(...matchingVehicles);

        if (vehicleType === 'sedan' && pickupCoords) {
          const driverDistanceKm = getDriverDistanceKm(driver.id, driverDistanceMap);
          if (
            driverDistanceKm != null
            && driverDistanceKm <= SEDAN_VAN_EXTRA_RADIUS_KM
          ) {
            const vanVehicles = vehicles.filter((v) => v.type === 'van');
            availableVehicles.push(...vanVehicles);
          }
        }

        if (vehicleType === 'utility') {
          const truckVehicles = vehicles.filter((v) => v.type === 'truck');
          availableVehicles.push(...truckVehicles);
        }
      } else {
        availableVehicles = vehicles;
      }

      const freeVehicles = availableVehicles.filter((vehicle) => {
        if (!vehicle?.id) return false;
        return isVehicleAvailableAtTime(
          driver as Parameters<typeof isVehicleAvailableAtTime>[0],
          vehicle.id,
          scheduledDate,
          scheduledTime,
        );
      });

      for (const vehicle of freeVehicles) {
        if (!vehicle?.type) continue;
        filteredDrivers.push({
          ...driver,
          primary_vehicle: vehicle,
          driverVehicleId: `${driver.id}_${vehicle.id}`,
        });
      }
    } catch (e) {
      console.warn(`Erreur filtrage chauffeur ${driver.id}:`, e);
    }
  }

  return filteredDrivers;
}

async function sortDriverEntries(
  filteredDrivers: DriverSearchEntry[],
  pickupCoords: Coordinates | null,
  driverDistanceMap: Map<string, DriverDistanceInfo>,
): Promise<DriverSearchEntry[]> {
  let sortedDrivers: DriverSearchEntry[] = [];

  if (pickupCoords) {
    const withDistance = filteredDrivers
      .map((entry) => {
        const info = driverDistanceMap.get(entry.id);
        if (!info) return null;
        return {
          ...entry,
          calculatedDistance: info.distanceKm,
          driverCoords: info.coords,
          distanceSource: info.source,
        };
      })
      .filter(
        (entry): entry is NonNullable<typeof entry> =>
          entry != null && (entry.calculatedDistance ?? Infinity) <= MAX_DRIVER_SEARCH_RADIUS_KM,
      )
      .sort((a, b) => (a.calculatedDistance ?? Infinity) - (b.calculatedDistance ?? Infinity));

    sortedDrivers = await refineTopDriverDistancesWithMatrix(
      withDistance,
      pickupCoords,
      MAX_DRIVERS_MATRIX_REFINE,
    );
  } else {
    sortedDrivers = filteredDrivers;
  }

  sortedDrivers.sort((a, b) => {
    if ((a.calculatedDistance ?? Infinity) !== (b.calculatedDistance ?? Infinity)) {
      return (a.calculatedDistance ?? Infinity) - (b.calculatedDistance ?? Infinity);
    }
    const aHasPhoto = !!a.primary_vehicle?.photo_url;
    const bHasPhoto = !!b.primary_vehicle?.photo_url;
    if (aHasPhoto !== bHasPhoto) return aHasPhoto ? -1 : 1;
    const aName = `${a.first_name} ${a.last_name}`;
    const bName = `${b.first_name} ${b.last_name}`;
    return aName.localeCompare(bName);
  });

  return sortedDrivers;
}

export async function searchDriversForBooking(
  params: SearchDriversForBookingParams,
): Promise<SearchDriversForBookingResult> {
  const { scheduledTimeIso, pickupCoords, vehicleType, refusedDriverIds } = params;
  const scheduledDateTime = new Date(scheduledTimeIso);
  const { scheduledDate, scheduledTime } = formatScheduledSlot(scheduledDateTime);

  let driversWithAvailability: EnrichedDriver[];
  try {
    driversWithAvailability = await fetchDriversWithAvailability(scheduledDate, scheduledTime);
  } catch (error) {
    console.error('Erreur lors de la recherche des chauffeurs:', error);
    throw new DriverSearchFetchError(error);
  }

  const availableDrivers = driversWithAvailability.filter((driver) =>
    isDriverEligibleAtTime(
      driver as Parameters<typeof isDriverEligibleAtTime>[0],
      scheduledDate,
      scheduledTime,
    ),
  );

  const driversForVehicleCheck = await filterDriversBySubscription(availableDrivers);

  const driverDistanceMap = pickupCoords
    ? await buildDriverDistanceMap(driversForVehicleCheck, pickupCoords)
    : new Map<string, DriverDistanceInfo>();

  const filteredDrivers = buildDriverVehicleEntries(
    driversForVehicleCheck,
    vehicleType,
    pickupCoords,
    driverDistanceMap,
    scheduledDate,
    scheduledTime,
  );

  const sortedDrivers = await sortDriverEntries(
    filteredDrivers,
    pickupCoords,
    driverDistanceMap,
  );

  const drivers = refusedDriverIds.size > 0
    ? sortedDrivers.filter((driver) => !refusedDriverIds.has(driver.id))
    : sortedDrivers;

  return {
    drivers,
    hasRefusalsExcluded: refusedDriverIds.size > 0,
    sortedDriverIds: sortedDrivers.map((driver) => driver.id),
  };
}

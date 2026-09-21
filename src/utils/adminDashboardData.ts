import { supabase } from '../lib/supabase';
import { ClientWithBookings, Driver, DriverAvailability, Vehicle } from '../types';
import {
  mapVehicleRowToVehicle,
  normalizeLegacyVehicleInfo,
  vehicleToVehicleInfo,
} from './vehicles';
import { fetchAllPages } from './fetchAllPages';

export interface DriverBookingStats {
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  inProgressBookings: number;
  totalEarnings: number;
}

export interface ClientBookingStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  totalSpent: number;
}

export interface BookingTotals {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  revenue: number;
}

export interface AdminBookingStats {
  byDriver: Map<string, DriverBookingStats>;
  byClient: Map<string, ClientBookingStats>;
  totals: BookingTotals;
}

export interface AdminDriverRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  license_number?: string | null;
  vehicle_info?: unknown;
  status: string;
  driver_type?: string | null;
  profile_photo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminClientRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  status: string;
  profile_photo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminVehicleRow {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  year?: number | null;
  color?: string | null;
  license_plate?: string | null;
  seats?: number | null;
  type?: string | null;
  photo_url?: string | null;
  is_vip?: boolean | null;
  is_primary?: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface AdminAvailabilityRow {
  id: string;
  driver_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminSubscriptionRow {
  id: string;
  driver_id: string;
  start_date: string;
  end_date: string;
  subscription_type: string;
  billing_period: 'monthly' | 'yearly';
  price_tnd: number;
  vat_percentage: number;
  total_price_tnd: number;
  payment_status: string;
  payment_method?: string | null;
  payment_date?: string | null;
  payment_reference?: string | null;
  status: string;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  drivers?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string | null;
    city?: string | null;
    lifetime_accepted_bookings?: number | null;
  } | null;
}

export interface AdminBookingRow {
  id: string;
  client_id: string;
  driver_id?: string | null;
  pickup_address: string;
  destination_address: string;
  distance_km: number;
  price_tnd: number;
  status: string;
  scheduled_time: string;
  pickup_time?: string | null;
  completion_time?: string | null;
  is_return_trip?: boolean | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  tracking_token?: string | null;
  clients?: {
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  drivers?: {
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
}

const DRIVER_COLUMNS =
  'id, first_name, last_name, email, phone, city, license_number, vehicle_info, status, driver_type, profile_photo_url, created_at, updated_at';

const CLIENT_COLUMNS =
  'id, first_name, last_name, email, phone, city, status, profile_photo_url, created_at, updated_at';

const VEHICLE_COLUMNS =
  'id, driver_id, make, model, year, color, license_plate, seats, type, photo_url, is_vip, is_primary, created_at, updated_at';

const AVAILABILITY_COLUMNS =
  'id, driver_id, date, start_time, end_time, is_available, created_at, updated_at';

const SUBSCRIPTION_COLUMNS = `
  id, driver_id, start_date, end_date, subscription_type, billing_period,
  price_tnd, vat_percentage, total_price_tnd, payment_status, payment_method,
  payment_date, payment_reference, status, admin_notes, created_at, updated_at,
  drivers (
    id, first_name, last_name, email, phone, city, lifetime_accepted_bookings
  )
`;

const BOOKING_LIST_COLUMNS = `
  id, client_id, driver_id, pickup_address, destination_address, distance_km, price_tnd,
  status, scheduled_time, pickup_time, completion_time, is_return_trip, notes,
  created_at, updated_at, tracking_token,
  clients (first_name, last_name, email, phone),
  drivers (first_name, last_name, email, phone)
`;

const CLIENT_HISTORY_COLUMNS = `
  id, pickup_address, destination_address, distance_km, price_tnd, status,
  scheduled_time, is_return_trip, notes, created_at,
  drivers (first_name, last_name, phone)
`;

const emptyDriverStats = (): DriverBookingStats => ({
  completedBookings: 0,
  cancelledBookings: 0,
  pendingBookings: 0,
  inProgressBookings: 0,
  totalEarnings: 0,
});

const emptyClientStats = (): ClientBookingStats => ({
  totalBookings: 0,
  completedBookings: 0,
  cancelledBookings: 0,
  pendingBookings: 0,
  totalSpent: 0,
});

const emptyTotals = (): BookingTotals => ({
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  revenue: 0,
});

function aggregateFromLightRows(
  rows: Array<{
    driver_id?: string | null;
    client_id: string;
    status: string;
    price_tnd?: number | null;
  }>
): AdminBookingStats {
  const byDriver = new Map<string, DriverBookingStats>();
  const byClient = new Map<string, ClientBookingStats>();
  const totals = emptyTotals();

  for (const row of rows) {
    const price = Number(row.price_tnd) || 0;
    totals.total += 1;

    if (row.status === 'pending') totals.pending += 1;
    else if (row.status === 'accepted' || row.status === 'in_progress') totals.inProgress += 1;
    else if (row.status === 'completed') {
      totals.completed += 1;
      totals.revenue += price;
    }

    if (row.driver_id) {
      const driverStats = byDriver.get(row.driver_id) ?? emptyDriverStats();
      if (row.status === 'completed') {
        driverStats.completedBookings += 1;
        driverStats.totalEarnings += price;
      } else if (row.status === 'cancelled') {
        driverStats.cancelledBookings += 1;
      } else if (row.status === 'pending') {
        driverStats.pendingBookings += 1;
      } else if (row.status === 'accepted' || row.status === 'in_progress') {
        driverStats.inProgressBookings += 1;
      }
      byDriver.set(row.driver_id, driverStats);
    }

    const clientStats = byClient.get(row.client_id) ?? emptyClientStats();
    clientStats.totalBookings += 1;
    if (row.status === 'completed') {
      clientStats.completedBookings += 1;
      clientStats.totalSpent += price;
    } else if (row.status === 'cancelled') {
      clientStats.cancelledBookings += 1;
    } else if (row.status === 'pending') {
      clientStats.pendingBookings += 1;
    }
    byClient.set(row.client_id, clientStats);
  }

  return { byDriver, byClient, totals };
}

export async function fetchAdminBookingStats(): Promise<AdminBookingStats> {
  const { data, error } = await supabase.rpc('get_admin_booking_stats');

  if (!error && data) {
    const payload = data as {
      drivers?: Array<{
        driver_id: string;
        completed_bookings?: number;
        cancelled_bookings?: number;
        pending_bookings?: number;
        in_progress_bookings?: number;
        total_earnings?: number;
      }>;
      clients?: Array<{
        client_id: string;
        total_bookings?: number;
        completed_bookings?: number;
        cancelled_bookings?: number;
        pending_bookings?: number;
        total_spent?: number;
      }>;
      totals?: {
        total?: number;
        pending?: number;
        in_progress?: number;
        completed?: number;
        revenue?: number;
      };
    };

    const byDriver = new Map<string, DriverBookingStats>();
    for (const row of payload.drivers ?? []) {
      byDriver.set(row.driver_id, {
        completedBookings: Number(row.completed_bookings) || 0,
        cancelledBookings: Number(row.cancelled_bookings) || 0,
        pendingBookings: Number(row.pending_bookings) || 0,
        inProgressBookings: Number(row.in_progress_bookings) || 0,
        totalEarnings: Number(row.total_earnings) || 0,
      });
    }

    const byClient = new Map<string, ClientBookingStats>();
    for (const row of payload.clients ?? []) {
      byClient.set(row.client_id, {
        totalBookings: Number(row.total_bookings) || 0,
        completedBookings: Number(row.completed_bookings) || 0,
        cancelledBookings: Number(row.cancelled_bookings) || 0,
        pendingBookings: Number(row.pending_bookings) || 0,
        totalSpent: Number(row.total_spent) || 0,
      });
    }

    return {
      byDriver,
      byClient,
      totals: {
        total: Number(payload.totals?.total) || 0,
        pending: Number(payload.totals?.pending) || 0,
        inProgress: Number(payload.totals?.in_progress) || 0,
        completed: Number(payload.totals?.completed) || 0,
        revenue: Number(payload.totals?.revenue) || 0,
      },
    };
  }

  const lightRows = await fetchAllPages<{
    driver_id?: string | null;
    client_id: string;
    status: string;
    price_tnd?: number | null;
  }>(() => supabase.from('bookings').select('driver_id, client_id, status, price_tnd'));

  return aggregateFromLightRows(lightRows);
}

export async function fetchAdminDriverRows(): Promise<AdminDriverRow[]> {
  return fetchAllPages<AdminDriverRow>(() =>
    supabase
      .from('drivers')
      .select(DRIVER_COLUMNS)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
  );
}

export async function fetchAdminClientRows(): Promise<AdminClientRow[]> {
  return fetchAllPages<AdminClientRow>(() =>
    supabase.from('clients').select(CLIENT_COLUMNS).order('created_at', { ascending: false })
  );
}

export async function fetchAdminVehicleRows(): Promise<AdminVehicleRow[]> {
  return fetchAllPages<AdminVehicleRow>(() =>
    supabase
      .from('vehicles')
      .select(VEHICLE_COLUMNS)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
  );
}

export async function fetchUpcomingAvailabilities(
  today: string,
  future: string
): Promise<AdminAvailabilityRow[]> {
  return fetchAllPages<AdminAvailabilityRow>(() =>
    supabase
      .from('driver_availability')
      .select(AVAILABILITY_COLUMNS)
      .eq('is_available', true)
      .gte('date', today)
      .lte('date', future)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
  );
}

export async function fetchAdminSubscriptionRows(): Promise<AdminSubscriptionRow[]> {
  return fetchAllPages<AdminSubscriptionRow>(() =>
    supabase
      .from('driver_subscriptions')
      .select(SUBSCRIPTION_COLUMNS)
      .order('created_at', { ascending: false })
  );
}

export async function fetchAdminBookingRows(): Promise<AdminBookingRow[]> {
  return fetchAllPages<AdminBookingRow>(() =>
    supabase
      .from('bookings')
      .select(BOOKING_LIST_COLUMNS)
      .order('created_at', { ascending: false })
  );
}

export async function fetchAdminParcelStatuses(): Promise<Array<{ status: string }>> {
  return fetchAllPages<{ status: string }>(() =>
    supabase.from('parcel_quote_requests').select('status')
  );
}

export async function fetchClientBookingHistory(clientId: string) {
  return fetchAllPages<AdminBookingRow>(() =>
    supabase
      .from('bookings')
      .select(CLIENT_HISTORY_COLUMNS)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
  );
}

export function assembleAdminDrivers(
  driverRows: AdminDriverRow[],
  vehicleRows: AdminVehicleRow[],
  stats: AdminBookingStats
): Array<
  Driver & {
    vehicles?: Vehicle[];
  }
> {
  const vehiclesByDriver = new Map<string, Vehicle[]>();
  for (const row of vehicleRows) {
    const list = vehiclesByDriver.get(row.driver_id) ?? [];
    list.push(mapVehicleRowToVehicle(row));
    vehiclesByDriver.set(row.driver_id, list);
  }

  return driverRows.map((driver) => {
    const driverVehicles = vehiclesByDriver.get(driver.id) ?? [];
    const primaryVehicle =
      driverVehicles.find((vehicle) => vehicle.is_primary) ?? driverVehicles[0];
    const vehicleInfo = primaryVehicle
      ? vehicleToVehicleInfo(primaryVehicle)
      : normalizeLegacyVehicleInfo(driver.vehicle_info);
    const driverStats = stats.byDriver.get(driver.id) ?? emptyDriverStats();
    const bookingCount =
      driverStats.completedBookings +
      driverStats.cancelledBookings +
      driverStats.inProgressBookings;

    return {
      id: driver.id,
      firstName: driver.first_name,
      lastName: driver.last_name,
      email: driver.email,
      phone: driver.phone ?? undefined,
      city: driver.city ?? undefined,
      licenseNumber: driver.license_number ?? undefined,
      vehicleInfo,
      vehicles: driverVehicles,
      status: driver.status,
      driverType: (driver.driver_type as Driver['driverType']) || 'vtc',
      profilePhotoUrl: driver.profile_photo_url ?? undefined,
      createdAt: driver.created_at,
      updatedAt: driver.updated_at,
      bookingCount,
      totalEarnings: driverStats.totalEarnings,
      completedBookings: driverStats.completedBookings,
      cancelledByDriver: 0,
      cancelledByClient: driverStats.cancelledBookings,
      pendingBookings: driverStats.pendingBookings,
      inProgressBookings: driverStats.inProgressBookings,
    };
  });
}

export function assembleAdminClients(
  clientRows: AdminClientRow[],
  stats: AdminBookingStats
): ClientWithBookings[] {
  return clientRows.map((client) => {
    const clientStats = stats.byClient.get(client.id) ?? emptyClientStats();
    return {
      id: client.id,
      firstName: client.first_name,
      lastName: client.last_name,
      email: client.email,
      phone: client.phone ?? '',
      city: client.city ?? undefined,
      status: client.status,
      profilePhotoUrl: client.profile_photo_url ?? undefined,
      createdAt: client.created_at,
      updatedAt: client.updated_at,
      bookings: [],
      totalBookings: clientStats.totalBookings,
      completedBookings: clientStats.completedBookings,
      cancelledBookings: clientStats.cancelledBookings,
      pendingBookings: clientStats.pendingBookings,
      totalSpent: clientStats.totalSpent,
    };
  });
}

export function mapAvailabilityRow(row: AdminAvailabilityRow): DriverAvailability {
  return {
    id: row.id,
    driverId: row.driver_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    isAvailable: row.is_available,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function assembleAdminVehicles<
  T extends {
    id: string;
    driverId: string;
    make: string;
    model: string;
    year?: number;
    color?: string;
    licensePlate?: string;
    seats?: number;
    type?: Vehicle['type'];
    photoUrl?: string;
    isVip?: boolean;
    is_primary?: boolean;
    createdAt: string;
    updatedAt: string;
    driver?: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      city?: string;
      status: string;
      driverType?: Driver['driverType'];
    };
    upcomingAvailabilities?: DriverAvailability[];
    availabilityCount?: number;
  },
>(
  vehicleRows: AdminVehicleRow[],
  driverRows: AdminDriverRow[],
  availabilityRows: AdminAvailabilityRow[]
): T[] {
  const driverMap = new Map(driverRows.map((driver) => [driver.id, driver]));
  const availByDriver = new Map<string, AdminAvailabilityRow[]>();
  for (const row of availabilityRows) {
    const list = availByDriver.get(row.driver_id) ?? [];
    list.push(row);
    availByDriver.set(row.driver_id, list);
  }

  return vehicleRows
    .map((vehicle) => {
      const driverRow = driverMap.get(vehicle.driver_id);
      const upcoming = (availByDriver.get(vehicle.driver_id) ?? []).slice(0, 5);
      return {
        id: vehicle.id,
        driverId: vehicle.driver_id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year ?? undefined,
        color: vehicle.color ?? undefined,
        licensePlate: vehicle.license_plate ?? undefined,
        seats: vehicle.seats ?? undefined,
        type: vehicle.type as Vehicle['type'],
        photoUrl: vehicle.photo_url ?? undefined,
        isVip: vehicle.is_vip ?? false,
        is_primary: vehicle.is_primary ?? undefined,
        createdAt: vehicle.created_at,
        updatedAt: vehicle.updated_at,
        driver: driverRow
          ? {
              firstName: driverRow.first_name,
              lastName: driverRow.last_name,
              email: driverRow.email,
              phone: driverRow.phone ?? undefined,
              city: driverRow.city ?? undefined,
              status: driverRow.status,
              driverType: (driverRow.driver_type as Driver['driverType']) || 'vtc',
            }
          : undefined,
        upcomingAvailabilities: upcoming.map(mapAvailabilityRow),
        availabilityCount: (availByDriver.get(vehicle.driver_id) ?? []).length,
      } as T;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function aggregateParcelStats(rows: Array<{ status: string }>) {
  return {
    total: rows.length,
    pending: rows.filter((row) => row.status === 'pending').length,
    quoted: rows.filter((row) => row.status === 'quoted').length,
    accepted: rows.filter((row) => row.status === 'accepted' || row.status === 'completed').length,
  };
}

export function mapClientHistoryBookings(rows: AdminBookingRow[]) {
  return rows.map((booking) => ({
    id: booking.id,
    clientId: '',
    driverId: booking.driver_id ?? undefined,
    pickupAddress: booking.pickup_address,
    destinationAddress: booking.destination_address,
    distanceKm: booking.distance_km,
    priceTnd: booking.price_tnd,
    status: booking.status as ClientWithBookings['bookings'][number]['status'],
    scheduledTime: booking.scheduled_time,
    isReturnTrip: Boolean(booking.is_return_trip),
    notes: booking.notes ?? undefined,
    createdAt: booking.created_at,
    updatedAt: booking.created_at,
    drivers: booking.drivers
      ? {
          first_name: booking.drivers.first_name,
          last_name: booking.drivers.last_name,
          phone: booking.drivers.phone ?? undefined,
        }
      : undefined,
  }));
}

import { isTimeInRange } from './driverSearchTimeUtils';

type DriverAvailabilityRow = {
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  vehicle_id?: string | null;
};

type DriverWithAvailability = {
  id: string;
  first_name?: string;
  last_name?: string;
  driver_availability?: DriverAvailabilityRow[];
};

/** Étape 1 : le chauffeur a au moins une disponibilité (ou pas de blocage global) pour le créneau. */
export function isDriverEligibleAtTime(
  driver: DriverWithAvailability,
  scheduledDate: string,
  scheduledTime: string,
): boolean {
  if (!driver.driver_availability || driver.driver_availability.length === 0) {
    return true;
  }

  const availabilitiesForDate = driver.driver_availability.filter(
    (av) => av.date === scheduledDate,
  );

  const hasMatchingAvailability = availabilitiesForDate.some((availability) => {
    if (!availability.is_available) return false;
    return isTimeInRange(scheduledTime, availability.start_time, availability.end_time);
  });

  const hasGlobalBlockingSlot = availabilitiesForDate.some((availability) => {
    if (availability.is_available) return false;
    const blockingVehicleId = availability.vehicle_id?.toString().trim() || null;
    if (blockingVehicleId !== null) return false;
    return isTimeInRange(scheduledTime, availability.start_time, availability.end_time);
  });

  return hasMatchingAvailability || !hasGlobalBlockingSlot;
}

/** Étape 2 : disponibilité d'un véhicule précis pour le créneau. */
export function isVehicleAvailableAtTime(
  driver: DriverWithAvailability,
  vehicleId: string,
  scheduledDate: string,
  scheduledTime: string,
): boolean {
  if (!driver.driver_availability || driver.driver_availability.length === 0) {
    return true;
  }

  const normalizedVehicleId = vehicleId?.toString().trim().toLowerCase() || null;
  const availabilitiesForDate = driver.driver_availability.filter(
    (av) => av.date === scheduledDate,
  );

  const hasMatchingAvailability = availabilitiesForDate.some((availability) => {
    if (!availability.is_available) return false;
    const availabilityVehicleId = availability.vehicle_id?.toString().trim().toLowerCase() || null;
    if (availabilityVehicleId !== normalizedVehicleId) return false;
    return isTimeInRange(scheduledTime, availability.start_time, availability.end_time);
  });

  const hasBlockingSlot = availabilitiesForDate.some((availability) => {
    if (availability.is_available) return false;
    const blockingVehicleId = availability.vehicle_id?.toString().trim().toLowerCase() || null;
    if (blockingVehicleId === null && hasMatchingAvailability) return false;
    if (blockingVehicleId !== null && blockingVehicleId !== normalizedVehicleId) return false;
    return isTimeInRange(scheduledTime, availability.start_time, availability.end_time);
  });

  const hasExplicitEntry = availabilitiesForDate.some((availability) => {
    const availabilityVehicleId = availability.vehicle_id?.toString().trim().toLowerCase() || null;
    return availabilityVehicleId === normalizedVehicleId;
  });

  const hasExplicitBlocking = availabilitiesForDate.some((availability) => {
    if (availability.is_available) return false;
    const availabilityVehicleId = availability.vehicle_id?.toString().trim().toLowerCase() || null;
    const matchesVehicle = availabilityVehicleId === normalizedVehicleId;
    const timeMatches = isTimeInRange(
      scheduledTime,
      availability.start_time,
      availability.end_time,
    );
    return matchesVehicle && timeMatches;
  });

  const hasAnyAvailabilityForTimeSlot = !hasExplicitEntry
    && availabilitiesForDate.some((availability) => {
      if (!availability.is_available) return false;
      return isTimeInRange(scheduledTime, availability.start_time, availability.end_time);
    });

  const hasGlobalBlockingForTimeSlot = !hasExplicitEntry
    && availabilitiesForDate.some((availability) => {
      if (availability.is_available) return false;
      const blockingVehicleId = availability.vehicle_id?.toString().trim().toLowerCase() || null;
      return blockingVehicleId === null
        && isTimeInRange(scheduledTime, availability.start_time, availability.end_time);
    });

  return !hasExplicitBlocking
    && !hasGlobalBlockingForTimeSlot
    && (hasMatchingAvailability
      || hasAnyAvailabilityForTimeSlot
      || (!hasExplicitEntry && !hasBlockingSlot));
}

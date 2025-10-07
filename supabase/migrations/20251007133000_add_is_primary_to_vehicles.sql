-- Add is_primary flag to vehicles and ensure only one primary per driver

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- Unique primary per driver (ignoring soft-deleted)
DROP INDEX IF EXISTS vehicles_primary_unique_per_driver;
CREATE UNIQUE INDEX vehicles_primary_unique_per_driver
  ON public.vehicles(driver_id)
  WHERE is_primary = true AND deleted_at IS NULL;



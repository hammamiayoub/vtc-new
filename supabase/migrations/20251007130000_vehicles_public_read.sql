-- Allow public/clients to read vehicles for active drivers (soft-delete respected)

-- Enable RLS (already enabled in creation migration, but safe to keep)
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Drop old read policies if any
DROP POLICY IF EXISTS vehicles_public_read_active ON public.vehicles;

-- Create a read policy for anonymous and authenticated users to read
-- vehicles that belong to active drivers and are not soft-deleted
CREATE POLICY vehicles_public_read_active
  ON public.vehicles
  FOR SELECT
  TO anon, authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = vehicles.driver_id
        AND d.status = 'active'
    )
  );



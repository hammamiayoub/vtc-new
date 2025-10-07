-- Create vehicles table to allow multiple vehicles per driver

CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  year int2,
  color text,
  license_plate text,
  seats int2,
  type text CHECK (type IN ('sedan','pickup','van','minibus','bus','truck','utility','limousine')),
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON public.vehicles(driver_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_unique_plate_per_driver ON public.vehicles(driver_id, license_plate) WHERE license_plate IS NOT NULL AND deleted_at IS NULL;

-- Update trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vehicles_set_updated_at ON public.vehicles;
CREATE TRIGGER vehicles_set_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS and policies
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Owner can manage their vehicles
DROP POLICY IF EXISTS vehicles_owner_crud ON public.vehicles;
CREATE POLICY vehicles_owner_crud ON public.vehicles
  FOR ALL TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- Admin full access
DROP POLICY IF EXISTS vehicles_admin_all ON public.vehicles;
CREATE POLICY vehicles_admin_all ON public.vehicles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));



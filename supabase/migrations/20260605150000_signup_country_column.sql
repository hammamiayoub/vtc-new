-- Pays de résidence à l'inscription (clients et chauffeurs)

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS country text;

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS country text;

COMMENT ON COLUMN public.clients.country IS 'Code pays de résidence (TN, FR, IT, DE, ES, BE, LU, CH, NL)';
COMMENT ON COLUMN public.drivers.country IS 'Code pays de résidence (TN, FR, IT, DE, ES, BE, LU, CH, NL)';

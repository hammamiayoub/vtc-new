-- Migrate existing drivers.vehicle_info JSON into public.vehicles

-- Optional diagnostics
-- SELECT DISTINCT LOWER(vehicle_info->>'type') AS t, COUNT(*)
-- FROM public.drivers WHERE vehicle_info IS NOT NULL GROUP BY 1 ORDER BY 2 DESC;

INSERT INTO public.vehicles (
  driver_id, make, model, year, color, license_plate, seats, type, photo_url, created_at, updated_at
)
SELECT
  d.id,
  NULLIF(d.vehicle_info->>'make',''),
  NULLIF(d.vehicle_info->>'model',''),
  NULLIF(d.vehicle_info->>'year','')::int,
  NULLIF(d.vehicle_info->>'color',''),
  NULLIF(d.vehicle_info->>'licensePlate',''),
  NULLIF(d.vehicle_info->>'seats','')::int,
  CASE LOWER(d.vehicle_info->>'type')
    WHEN 'sedan' THEN 'sedan'
    WHEN 'pickup' THEN 'pickup'
    WHEN 'van' THEN 'van'
    WHEN 'minibus' THEN 'minibus'
    WHEN 'bus' THEN 'bus'
    WHEN 'truck' THEN 'truck'
    WHEN 'utility' THEN 'utility'
    WHEN 'limousine' THEN 'limousine'
    WHEN 'suv' THEN 'van'           -- map custom values
    WHEN 'luxury' THEN 'limousine'  -- map custom values
    ELSE NULL
  END,
  NULLIF(d.vehicle_info->>'photoUrl',''),
  COALESCE(d.created_at, now()),
  COALESCE(d.updated_at, now())
FROM public.drivers d
LEFT JOIN public.vehicles v
  ON v.driver_id = d.id AND v.deleted_at IS NULL
WHERE d.vehicle_info IS NOT NULL
  AND v.id IS NULL
  -- Filtrer les enregistrements avec des données manquantes requises
  AND d.vehicle_info->>'make' IS NOT NULL 
  AND d.vehicle_info->>'make' != ''
  AND d.vehicle_info->>'model' IS NOT NULL 
  AND d.vehicle_info->>'model' != ''
  AND d.vehicle_info->>'licensePlate' IS NOT NULL 
  AND d.vehicle_info->>'licensePlate' != ''
  AND d.vehicle_info->>'seats' IS NOT NULL 
  AND d.vehicle_info->>'seats' != ''
  AND d.vehicle_info->>'type' IS NOT NULL 
  AND d.vehicle_info->>'type' != '';

-- Optionally clear legacy JSON after successful migration
-- UPDATE public.drivers SET vehicle_info = NULL WHERE vehicle_info IS NOT NULL;



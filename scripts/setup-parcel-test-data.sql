-- =============================================================================
-- Configuration données de test — Transport international de colis
-- À exécuter dans Supabase → SQL Editor (une seule fois)
-- =============================================================================
-- Remplacez YOUR_DRIVER_EMAIL par l'email d'un chauffeur de test existant
-- (compte actif, avec au moins 1 véhicule dans la table vehicles)

DO $$
DECLARE
  v_driver_id uuid;
  v_test_date date := (current_date + interval '7 days')::date;
BEGIN
  SELECT id INTO v_driver_id
  FROM public.drivers
  WHERE email = 'YOUR_DRIVER_EMAIL@example.com'  -- ← MODIFIER ICI
    AND status = 'active'
  LIMIT 1;

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Chauffeur introuvable ou non actif. Vérifiez l''email.';
  END IF;

  -- Passer en transporteur (ou both)
  UPDATE public.drivers
  SET driver_type = 'both'
  WHERE id = v_driver_id;

  -- Disponibilité couvrant la date de test (matching sur la date seule)
  IF EXISTS (
    SELECT 1 FROM public.driver_availability
    WHERE driver_id = v_driver_id AND date = v_test_date
  ) THEN
    UPDATE public.driver_availability
    SET is_available = true, updated_at = now()
    WHERE driver_id = v_driver_id AND date = v_test_date;
  ELSE
    INSERT INTO public.driver_availability (driver_id, date, start_time, end_time, is_available)
    VALUES (v_driver_id, v_test_date, '08:00', '20:00', true);
  END IF;

  -- Vérifier qu'il a au moins un véhicule
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicles WHERE driver_id = v_driver_id AND deleted_at IS NULL
  ) THEN
    RAISE NOTICE 'ATTENTION: ce chauffeur n''a aucun véhicule — ajoutez-en un via le dashboard chauffeur.';
  END IF;

  RAISE NOTICE 'OK — driver_id: %, date dispo: %', v_driver_id, v_test_date;
END $$;

-- Vérification
SELECT d.id, d.email, d.first_name, d.last_name, d.status, d.driver_type,
       (SELECT count(*) FROM vehicles v WHERE v.driver_id = d.id AND v.deleted_at IS NULL) AS vehicles,
       (SELECT count(*) FROM driver_availability da WHERE da.driver_id = d.id AND da.is_available = true) AS avail_slots
FROM drivers d
WHERE d.driver_type IN ('transporteur', 'both')
  AND d.status = 'active';

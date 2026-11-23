-- Retour arrière de 20261124110000_booking_price_floor.sql
-- Retire le contrôle du prix et de la distance à la création (le reste du garde-fou de 20261124100000 est conservé).

CREATE OR REPLACE FUNCTION public.guard_booking_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.admin_users WHERE id = v_uid) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NOT NULL AND NEW.status NOT IN ('pending', 'searching') THEN
      RAISE EXCEPTION 'forbidden_booking_status: une réservation démarre « pending » ou « searching ».'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.price_tnd IS NULL OR NEW.price_tnd <= 0 THEN
      RAISE EXCEPTION 'invalid_booking_price: prix invalide.' USING ERRCODE = '22023';
    END IF;
    IF NEW.accepted_at IS NOT NULL OR NEW.tracking_token IS NOT NULL
       OR NEW.pickup_time IS NOT NULL OR NEW.completion_time IS NOT NULL THEN
      RAISE EXCEPTION 'forbidden_booking_columns: colonnes gérées par le serveur.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.price_tnd IS DISTINCT FROM OLD.price_tnd
     OR NEW.distance_km IS DISTINCT FROM OLD.distance_km
     OR NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.pickup_address IS DISTINCT FROM OLD.pickup_address
     OR NEW.destination_address IS DISTINCT FROM OLD.destination_address
     OR NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time THEN
    RAISE EXCEPTION 'forbidden_booking_columns: prix, distance, client, adresses et horaire ne sont pas modifiables.'
      USING ERRCODE = '42501';
  END IF;

  IF v_uid IS NOT NULL AND v_uid = OLD.client_id AND v_uid IS DISTINCT FROM OLD.driver_id THEN
    IF NEW.driver_id IS DISTINCT FROM OLD.driver_id
       OR NEW.tracking_token IS DISTINCT FROM OLD.tracking_token
       OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
       OR NEW.pickup_time IS DISTINCT FROM OLD.pickup_time
       OR NEW.completion_time IS DISTINCT FROM OLD.completion_time THEN
      RAISE EXCEPTION 'forbidden_booking_columns: modification réservée au chauffeur ou au serveur.'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'forbidden_booking_status: un client ne peut qu''annuler sa réservation.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.pricing_min_plausible_price_tnd(smallint, double precision);
DROP FUNCTION IF EXISTS public.haversine_km(double precision, double precision, double precision, double precision);

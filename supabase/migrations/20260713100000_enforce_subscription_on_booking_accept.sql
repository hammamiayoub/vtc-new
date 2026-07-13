-- Blocage serveur à l'acceptation de course : quota 3 gratuites puis abonnement obligatoire.
-- Protège web, mobile (acceptation directe et dispatch immédiat).
--
-- Prérequis dispatch (mobile) : booking_offers, driver_has_blocking_booking
-- (scripts dispatch-exclude-busy-drivers.sql / alter-bookings-dispatch.sql).
-- Dépend de get_driver_subscription_status(UUID).

-- ─── Helper : le chauffeur peut-il accepter une nouvelle course ? ───────────────

CREATE OR REPLACE FUNCTION public.driver_can_accept_new_booking(p_driver_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_accept BOOLEAN;
BEGIN
  IF p_driver_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT s.can_accept_more_bookings
  INTO v_can_accept
  FROM public.get_driver_subscription_status(p_driver_id) AS s
  LIMIT 1;

  RETURN COALESCE(v_can_accept, FALSE);
END;
$$;

COMMENT ON FUNCTION public.driver_can_accept_new_booking(UUID) IS
  'True si le chauffeur a un abonnement payant actif ou des courses gratuites restantes (< 3).';

GRANT EXECUTE ON FUNCTION public.driver_can_accept_new_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.driver_can_accept_new_booking(UUID) TO service_role;

-- ─── Trigger BEFORE INSERT/UPDATE : refuser le passage à accepted ───────────────

CREATE OR REPLACE FUNCTION public.enforce_driver_subscription_on_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.driver_id IS NOT NULL
         AND NOT public.driver_can_accept_new_booking(NEW.driver_id) THEN
        RAISE EXCEPTION 'subscription_required: Le chauffeur a épuisé ses 3 courses gratuites et doit souscrire un abonnement Premium.'
          USING ERRCODE = 'P0001';
      END IF;
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'accepted' THEN
      IF NEW.driver_id IS NOT NULL
         AND NOT public.driver_can_accept_new_booking(NEW.driver_id) THEN
        RAISE EXCEPTION 'subscription_required: Le chauffeur a épuisé ses 3 courses gratuites et doit souscrire un abonnement Premium.'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_subscription_on_accept ON public.bookings;

CREATE TRIGGER trigger_enforce_subscription_on_accept
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_driver_subscription_on_accept();

-- ─── Compteur lifetime : toute transition vers accepted (pending, searching, …) ─

CREATE OR REPLACE FUNCTION public.increment_driver_lifetime_bookings()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.status IS DISTINCT FROM 'accepted'
     AND NEW.status = 'accepted'
     AND NEW.driver_id IS NOT NULL THEN
    UPDATE public.drivers
    SET
      lifetime_accepted_bookings = lifetime_accepted_bookings + 1,
      has_used_free_trial = CASE
        WHEN lifetime_accepted_bookings + 1 >= 3 THEN TRUE
        ELSE has_used_free_trial
      END
    WHERE id = NEW.driver_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Dispatch immédiat (mobile) : filtrer à la vague + refus explicite à l'acceptation ─

CREATE OR REPLACE FUNCTION public.start_dispatch_wave(
  p_booking_id      UUID,
  p_radius_km       DOUBLE PRECISION DEFAULT 2,
  p_wave            INTEGER DEFAULT 1,
  p_ttl_seconds     INTEGER DEFAULT 20,
  p_max_age_seconds INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking      RECORD;
  v_offers_count INTEGER := 0;
  v_expires_at   TIMESTAMPTZ := now() + make_interval(secs => p_ttl_seconds);
BEGIN
  SELECT id, client_id, status, pickup_address, destination_address,
         price_tnd, pickup_latitude, pickup_longitude
    INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Réservation introuvable';
  END IF;

  IF v_booking.client_id <> auth.uid() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF v_booking.status <> 'searching' THEN
    RETURN 0;
  END IF;

  IF v_booking.pickup_latitude IS NULL OR v_booking.pickup_longitude IS NULL THEN
    RAISE EXCEPTION 'Coordonnées de prise en charge manquantes';
  END IF;

  WITH candidates AS (
    SELECT
      dl.driver_id,
      (
        2 * 6371 * asin(
          sqrt(
            sin(radians((dl.latitude - v_booking.pickup_latitude) / 2)) ^ 2
            + cos(radians(v_booking.pickup_latitude))
              * cos(radians(dl.latitude))
              * sin(radians((dl.longitude - v_booking.pickup_longitude) / 2)) ^ 2
          )
        )
      ) AS distance_km
    FROM public.driver_locations dl
    INNER JOIN public.drivers d ON d.id = dl.driver_id
    WHERE d.status = 'active'
      AND d.is_online = true
      AND d.driver_type IN ('vtc', 'both')
      AND dl.updated_at >= now() - make_interval(secs => p_max_age_seconds)
      AND NOT public.driver_has_blocking_booking(dl.driver_id)
      AND public.driver_can_accept_new_booking(dl.driver_id)
  ),
  eligible AS (
    SELECT c.driver_id, c.distance_km
    FROM candidates c
    WHERE c.distance_km <= p_radius_km
      AND NOT EXISTS (
        SELECT 1 FROM public.booking_offers bo
        WHERE bo.booking_id = p_booking_id
          AND bo.driver_id = c.driver_id
      )
    ORDER BY c.distance_km ASC
    LIMIT 50
  ),
  inserted AS (
    INSERT INTO public.booking_offers (
      booking_id, driver_id, status, wave, distance_km,
      pickup_address, destination_address, price_tnd,
      pickup_latitude, pickup_longitude, expires_at
    )
    SELECT
      p_booking_id, e.driver_id, 'offered', p_wave, e.distance_km,
      v_booking.pickup_address, v_booking.destination_address, v_booking.price_tnd,
      v_booking.pickup_latitude, v_booking.pickup_longitude, v_expires_at
    FROM eligible e
    ON CONFLICT (booking_id, driver_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_offers_count FROM inserted;

  RETURN v_offers_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_booking_offer(
  p_offer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer    RECORD;
  v_booking  RECORD;
  v_token    TEXT;
  v_vehicle  UUID;
BEGIN
  SELECT id, booking_id, driver_id, status, expires_at
    INTO v_offer
  FROM public.booking_offers
  WHERE id = p_offer_id;

  IF v_offer.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'offer_not_found');
  END IF;

  IF v_offer.driver_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authorized');
  END IF;

  IF v_offer.expires_at IS NOT NULL AND v_offer.expires_at < now() THEN
    UPDATE public.booking_offers
      SET status = 'expired', responded_at = now()
      WHERE id = p_offer_id AND status = 'offered';
    RETURN jsonb_build_object('success', false, 'reason', 'offer_expired');
  END IF;

  IF NOT public.driver_can_accept_new_booking(v_offer.driver_id) THEN
    UPDATE public.booking_offers
      SET status = 'expired', responded_at = now()
      WHERE id = p_offer_id AND status = 'offered';
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'subscription_required',
      'message', 'Vous avez épuisé vos 3 courses gratuites. Souscrivez à l''abonnement Premium pour continuer.'
    );
  END IF;

  SELECT id, status, vehicle_id
    INTO v_booking
  FROM public.bookings
  WHERE id = v_offer.booking_id
  FOR UPDATE;

  IF v_booking.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'offer_not_found');
  END IF;

  IF v_booking.status <> 'searching' THEN
    UPDATE public.booking_offers
      SET status = 'expired', responded_at = now()
      WHERE id = p_offer_id AND status = 'offered';
    RETURN jsonb_build_object('success', false, 'reason', 'already_taken');
  END IF;

  PERFORM b.id
  FROM public.bookings b
  WHERE b.driver_id = v_offer.driver_id
    AND b.id <> v_offer.booking_id
    AND b.status IN ('pending', 'accepted', 'in_progress')
  FOR UPDATE;

  IF public.driver_has_blocking_booking(v_offer.driver_id, v_offer.booking_id) THEN
    UPDATE public.booking_offers
      SET status = 'expired', responded_at = now()
      WHERE id = p_offer_id AND status = 'offered';
    RETURN jsonb_build_object('success', false, 'reason', 'driver_busy');
  END IF;

  v_vehicle := v_booking.vehicle_id;
  IF v_vehicle IS NULL THEN
    SELECT v.id INTO v_vehicle
    FROM public.vehicles v
    WHERE v.driver_id = v_offer.driver_id
      AND v.deleted_at IS NULL
    ORDER BY v.is_primary DESC
    LIMIT 1;
  END IF;

  v_token := substring(replace(gen_random_uuid()::text, '-', '') FROM 1 FOR 24);

  UPDATE public.bookings
    SET driver_id      = v_offer.driver_id,
        status         = 'accepted',
        accepted_at    = now(),
        tracking_token = v_token,
        vehicle_id     = v_vehicle
    WHERE id = v_offer.booking_id;

  UPDATE public.booking_offers
    SET status = 'accepted', responded_at = now()
    WHERE id = p_offer_id;

  UPDATE public.booking_offers
    SET status = 'expired', responded_at = now()
    WHERE booking_id = v_offer.booking_id
      AND id <> p_offer_id
      AND status = 'offered';

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_offer.booking_id,
    'tracking_token', v_token
  );
END;
$$;

COMMENT ON FUNCTION public.start_dispatch_wave(UUID, DOUBLE PRECISION, INTEGER, INTEGER, INTEGER) IS
  'Crée une vague d''offres pour les chauffeurs en ligne, disponibles et avec quota/abonnement valide.';

COMMENT ON FUNCTION public.accept_booking_offer(UUID) IS
  'Acceptation atomique d''une offre dispatch. Refuse si quota épuisé (subscription_required) ou chauffeur occupé.';

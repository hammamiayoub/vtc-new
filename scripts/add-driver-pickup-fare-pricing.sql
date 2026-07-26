-- Prise en charge variable selon la distance chauffeur → point de départ.
-- Déploiement : SQL Editor Supabase (après create-start-dispatch-wave-rpc.sql).

CREATE OR REPLACE FUNCTION public.compute_driver_pickup_fare_tnd(p_distance_km DOUBLE PRECISION)
RETURNS DOUBLE PRECISION
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_distance_km < 10 THEN 10
    WHEN p_distance_km < 30 THEN 20
    WHEN p_distance_km < 50 THEN 30
    ELSE 50
  END;
$$;

COMMENT ON FUNCTION public.compute_driver_pickup_fare_tnd(DOUBLE PRECISION) IS
  'Prise en charge TND : <10 km=10, 10–30=20, 30–50=30, 50+=50.';

-- Recréer start_dispatch_wave : prix par offre ajusté selon distance à vide du chauffeur.
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
  v_default_pickup_fare CONSTANT DOUBLE PRECISION := 10;
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
      v_booking.pickup_address, v_booking.destination_address,
      GREATEST(
        0,
        v_booking.price_tnd
          + public.compute_driver_pickup_fare_tnd(e.distance_km)
          - v_default_pickup_fare
      ),
      v_booking.pickup_latitude, v_booking.pickup_longitude, v_expires_at
    FROM eligible e
    ON CONFLICT (booking_id, driver_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_offers_count FROM inserted;

  RETURN v_offers_count;
END;
$$;

-- À l'acceptation, reporter le prix ajusté de l'offre sur la réservation.
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
  SELECT id, booking_id, driver_id, status, expires_at, price_tnd
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
        vehicle_id     = v_vehicle,
        price_tnd      = COALESCE(v_offer.price_tnd, price_tnd)
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

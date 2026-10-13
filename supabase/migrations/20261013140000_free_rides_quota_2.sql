-- Quota gratuit : 2 courses à vie (au lieu de 3), puis abonnement Premium obligatoire.
-- Les chauffeurs déjà à 2 courses acceptées ou plus, sans abonnement payant actif,
-- ne peuvent plus accepter de nouvelle course dès l'application de ce script.

CREATE OR REPLACE FUNCTION public.get_driver_subscription_status(p_driver_id UUID)
RETURNS TABLE (
  has_active_subscription BOOLEAN,
  subscription_type TEXT,
  monthly_accepted_bookings INTEGER,
  can_accept_more_bookings BOOLEAN,
  remaining_free_bookings INTEGER,
  lifetime_accepted_bookings INTEGER,
  has_used_free_trial BOOLEAN,
  subscription_end_date DATE
) AS $$
DECLARE
  v_driver_record RECORD;
  v_has_active_sub BOOLEAN;
  v_sub_end_date DATE;
BEGIN
  SELECT
    d.subscription_type,
    d.lifetime_accepted_bookings,
    d.has_used_free_trial,
    EXISTS(
      SELECT 1 FROM driver_subscriptions ds
      WHERE ds.driver_id = p_driver_id
        AND ds.status = 'active'
        AND ds.payment_status = 'paid'
        AND ds.start_date <= CURRENT_DATE
        AND ds.end_date >= CURRENT_DATE
    ) as has_sub,
    (
      SELECT ds.end_date FROM driver_subscriptions ds
      WHERE ds.driver_id = p_driver_id
        AND ds.status = 'active'
        AND ds.payment_status = 'paid'
        AND ds.start_date <= CURRENT_DATE
        AND ds.end_date >= CURRENT_DATE
      ORDER BY ds.end_date DESC
      LIMIT 1
    ) as sub_end_date
  INTO v_driver_record
  FROM drivers d
  WHERE d.id = p_driver_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'free'::TEXT, 0, FALSE, 0, 0, FALSE, NULL::DATE;
    RETURN;
  END IF;

  v_has_active_sub := v_driver_record.has_sub;
  v_sub_end_date := v_driver_record.sub_end_date;

  IF v_has_active_sub OR v_driver_record.subscription_type = 'premium' THEN
    RETURN QUERY SELECT
      TRUE,
      'premium'::TEXT,
      0,
      TRUE,
      999,
      v_driver_record.lifetime_accepted_bookings,
      v_driver_record.has_used_free_trial,
      v_sub_end_date;
  ELSE
    RETURN QUERY SELECT
      FALSE,
      'free'::TEXT,
      0,
      v_driver_record.lifetime_accepted_bookings < 2,
      GREATEST(0, 2 - v_driver_record.lifetime_accepted_bookings),
      v_driver_record.lifetime_accepted_bookings,
      v_driver_record.has_used_free_trial,
      NULL::DATE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
        WHEN lifetime_accepted_bookings + 1 >= 2 THEN TRUE
        ELSE has_used_free_trial
      END
    WHERE id = NEW.driver_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
        RAISE EXCEPTION 'subscription_required: Le chauffeur a épuisé ses 2 courses gratuites et doit souscrire un abonnement Premium.'
          USING ERRCODE = 'P0001';
      END IF;
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'accepted' THEN
      IF NEW.driver_id IS NOT NULL
         AND NOT public.driver_can_accept_new_booking(NEW.driver_id) THEN
        RAISE EXCEPTION 'subscription_required: Le chauffeur a épuisé ses 2 courses gratuites et doit souscrire un abonnement Premium.'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
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
      'message', 'Vous avez épuisé vos 2 courses gratuites. Souscrivez à l''abonnement Premium pour continuer.'
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

COMMENT ON FUNCTION public.driver_can_accept_new_booking(UUID) IS
  'True si le chauffeur a un abonnement payant actif ou des courses gratuites restantes (< 2).';

COMMENT ON COLUMN public.drivers.has_used_free_trial IS
  'Indique si le chauffeur a utilisé ses 2 courses gratuites';

COMMENT ON COLUMN public.driver_subscriptions.subscription_type IS
  'Type d''abonnement: free (2 courses lifetime) ou premium (illimité)';

COMMENT ON TABLE public.driver_subscriptions IS
  'Gestion des abonnements des chauffeurs. 2 courses gratuites LIFETIME puis abonnement premium requis (mensuel ou annuel avec 10% de réduction)';

UPDATE public.drivers
SET has_used_free_trial = TRUE
WHERE COALESCE(lifetime_accepted_bookings, 0) >= 2
  AND COALESCE(has_used_free_trial, FALSE) = FALSE;

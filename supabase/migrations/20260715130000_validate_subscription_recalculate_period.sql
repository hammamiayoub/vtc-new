-- Recalcule start_date / end_date à la validation du paiement (période complète à partir de l'activation).

CREATE OR REPLACE FUNCTION public.calculate_subscription_end_date(
  p_start_date DATE,
  p_billing_period VARCHAR
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_billing_period = 'yearly' THEN
    RETURN (p_start_date + INTERVAL '1 year')::DATE;
  END IF;
  RETURN (p_start_date + INTERVAL '1 month')::DATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_subscription_activation_start(
  p_driver_id UUID,
  p_pending_subscription_id UUID,
  p_planned_start_date DATE,
  p_activation_date DATE DEFAULT CURRENT_DATE
)
RETURNS DATE
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_paid_end DATE;
BEGIN
  SELECT MAX(ds.end_date)
  INTO v_active_paid_end
  FROM public.driver_subscriptions ds
  WHERE ds.driver_id = p_driver_id
    AND ds.id <> p_pending_subscription_id
    AND ds.payment_status = 'paid'
    AND ds.status = 'active'
    AND ds.end_date >= CURRENT_DATE;

  -- Renouvellement anticipé : start_date planifié à l'expiration de l'abonnement en cours
  IF v_active_paid_end IS NOT NULL AND p_planned_start_date >= v_active_paid_end THEN
    RETURN GREATEST(p_planned_start_date, p_activation_date);
  END IF;

  -- Nouvelle souscription ou paiement tardif : période complète à partir de l'activation
  RETURN p_activation_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_driver_subscription_payment(
  p_subscription_id UUID,
  p_payment_method TEXT,
  p_payment_reference TEXT,
  p_activation_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_start_date DATE;
  v_end_date DATE;
  v_activation DATE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authorized');
  END IF;

  IF p_payment_reference IS NULL OR btrim(p_payment_reference) = '' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'payment_reference_required');
  END IF;

  v_activation := COALESCE(p_activation_date, CURRENT_DATE);

  SELECT
    id,
    driver_id,
    start_date,
    billing_period,
    payment_status,
    status
  INTO v_row
  FROM public.driver_subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  IF v_row.payment_status <> 'pending' OR v_row.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_pending');
  END IF;

  v_start_date := public.compute_subscription_activation_start(
    v_row.driver_id,
    v_row.id,
    v_row.start_date,
    v_activation
  );

  v_end_date := public.calculate_subscription_end_date(v_start_date, v_row.billing_period);

  UPDATE public.driver_subscriptions
  SET
    payment_status = 'paid',
    payment_method = p_payment_method,
    payment_reference = btrim(p_payment_reference),
    payment_date = NOW(),
    start_date = v_start_date,
    end_date = v_end_date,
    status = 'active',
    updated_at = NOW()
  WHERE id = p_subscription_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', p_subscription_id,
    'start_date', v_start_date,
    'end_date', v_end_date,
    'activation_date', v_activation
  );
END;
$$;

COMMENT ON FUNCTION public.validate_driver_subscription_payment(UUID, TEXT, TEXT, DATE) IS
  'Valide un abonnement en attente et recalcule la période couverte à partir de la date d''activation.';

GRANT EXECUTE ON FUNCTION public.validate_driver_subscription_payment(UUID, TEXT, TEXT, DATE) TO authenticated;

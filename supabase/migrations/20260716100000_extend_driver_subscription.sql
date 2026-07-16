-- Prolongation manuelle d'un abonnement chauffeur par l'administration.

CREATE OR REPLACE FUNCTION public.extend_driver_subscription(
  p_subscription_id UUID,
  p_amount INTEGER,
  p_unit TEXT,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_base_date DATE;
  v_new_end_date DATE;
  v_note_line TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authorized');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_amount');
  END IF;

  IF p_unit NOT IN ('days', 'months', 'years') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_unit');
  END IF;

  SELECT
    id,
    driver_id,
    end_date,
    payment_status,
    status,
    admin_notes
  INTO v_row
  FROM public.driver_subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  IF v_row.payment_status <> 'paid' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_paid');
  END IF;

  -- Prolonger à partir de la fin actuelle, ou d'aujourd'hui si déjà expiré
  v_base_date := GREATEST(v_row.end_date, CURRENT_DATE);

  v_new_end_date := CASE p_unit
    WHEN 'days' THEN (v_base_date + make_interval(days => p_amount))::DATE
    WHEN 'months' THEN (v_base_date + make_interval(months => p_amount))::DATE
    WHEN 'years' THEN (v_base_date + make_interval(years => p_amount))::DATE
  END;

  v_note_line := format(
    E'\n[Prolongation admin %s : +%s %s, fin %s]',
    to_char(now() AT TIME ZONE 'Africa/Tunis', 'YYYY-MM-DD HH24:MI'),
    p_amount,
    p_unit,
    to_char(v_new_end_date, 'YYYY-MM-DD')
  );

  IF p_admin_note IS NOT NULL AND btrim(p_admin_note) <> '' THEN
    v_note_line := v_note_line || ' — ' || btrim(p_admin_note);
  END IF;

  UPDATE public.driver_subscriptions
  SET
    end_date = v_new_end_date,
    status = 'active',
    admin_notes = COALESCE(admin_notes, '') || v_note_line,
    updated_at = NOW()
  WHERE id = p_subscription_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', p_subscription_id,
    'previous_end_date', v_row.end_date,
    'new_end_date', v_new_end_date,
    'base_date', v_base_date,
    'amount', p_amount,
    'unit', p_unit
  );
END;
$$;

COMMENT ON FUNCTION public.extend_driver_subscription(UUID, INTEGER, TEXT, TEXT) IS
  'Prolonge un abonnement payé (admin). La prolongation s''ajoute à la date de fin actuelle ou à aujourd''hui si expiré.';

GRANT EXECUTE ON FUNCTION public.extend_driver_subscription(UUID, INTEGER, TEXT, TEXT) TO authenticated;

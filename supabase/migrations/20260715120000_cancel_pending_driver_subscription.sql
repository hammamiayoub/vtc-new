-- Permet au chauffeur d'annuler (supprimer) une demande d'abonnement non payée.

CREATE OR REPLACE FUNCTION public.cancel_pending_driver_subscription(
  p_subscription_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_id UUID;
  v_row       RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  IF p_subscription_id IS NOT NULL THEN
    v_target_id := p_subscription_id;
  ELSE
    SELECT ds.id
    INTO v_target_id
    FROM public.driver_subscriptions ds
    WHERE ds.driver_id = auth.uid()
      AND ds.payment_status = 'pending'
      AND ds.status = 'active'
    ORDER BY ds.created_at DESC
    LIMIT 1;
  END IF;

  IF v_target_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  SELECT id, driver_id, payment_status, status
  INTO v_row
  FROM public.driver_subscriptions
  WHERE id = v_target_id;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  IF v_row.driver_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authorized');
  END IF;

  IF v_row.payment_status <> 'pending' OR v_row.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_cancellable');
  END IF;

  DELETE FROM public.driver_subscriptions
  WHERE id = v_target_id;

  RETURN jsonb_build_object('success', true, 'subscription_id', v_target_id);
END;
$$;

COMMENT ON FUNCTION public.cancel_pending_driver_subscription(UUID) IS
  'Supprime la demande d''abonnement en attente de paiement du chauffeur connecté.';

GRANT EXECUTE ON FUNCTION public.cancel_pending_driver_subscription(UUID) TO authenticated;

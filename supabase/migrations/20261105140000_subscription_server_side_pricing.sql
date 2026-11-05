-- Tarif des abonnements calculé et appliqué côté serveur.
--
-- PROBLÈME
--   Le prix (price_tnd, vat_percentage, total_price_tnd) et les dates étaient calculés dans le navigateur
--   (DriverSubscription.tsx) puis insérés tels quels. Un chauffeur pouvait enregistrer le montant de son
--   choix : l'administrateur voit ce montant au moment de valider le virement.
--
-- CE QUE FAIT CETTE MIGRATION (additive : rien n'est retiré, les apps existantes continuent de marcher)
--   1. subscription_price_for(période)   : SEULE SOURCE du tarif (30 TND HT / mois, TVA 19 %, -10 % annuel).
--   2. get_subscription_pricing()        : le tarif en JSON, pour que l'écran affiche ce que la base facture.
--   3. request_driver_subscription(période) : crée la demande en attente avec le prix et les dates calculés
--      par le serveur. Si un abonnement payé est en cours, la nouvelle période démarre le lendemain de sa
--      fin (le chauffeur ne perd aucun jour). Refuse une seconde demande en attente. Sérialisé par
--      chauffeur : deux clics simultanés ne créent pas deux demandes.
--
-- ÉTAPE SUIVANTE (volontairement séparée) : tant que les applications Android / iOS insèrent encore
--   directement dans driver_subscriptions avec leur propre prix, la faille d'un montant choisi par le
--   chauffeur reste ouverte par ce canal. Quand elles appellent request_driver_subscription, appliquer
--   supabase/deferred/20261105141000_remove_direct_subscription_insert.sql.
--
-- POUR CHANGER LE TARIF : modifier uniquement subscription_price_for (une migration), rien d'autre.
--
-- RETOUR ARRIÈRE : supabase/rollbacks/20261105140000_subscription_server_side_pricing.down.sql

CREATE OR REPLACE FUNCTION public.subscription_price_for(p_billing_period text)
RETURNS TABLE (price_tnd numeric, vat_percentage numeric, total_price_tnd numeric)
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH p AS (
    SELECT
      CASE p_billing_period
        WHEN 'monthly' THEN 30::numeric
        WHEN 'yearly' THEN round(30::numeric * 12 * 0.90, 2) -- 12 mois avec 10 % de réduction
      END AS base,
      19::numeric AS vat
  )
  SELECT base, vat, round(base * (1 + vat / 100), 2)
  FROM p
  WHERE base IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.get_subscription_pricing()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'monthly', (SELECT to_jsonb(p) FROM public.subscription_price_for('monthly') p),
    'yearly',  (SELECT to_jsonb(p) FROM public.subscription_price_for('yearly') p)
  )
$$;

CREATE OR REPLACE FUNCTION public.request_driver_subscription(p_billing_period text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_price RECORD;
  v_pending_id uuid;
  v_active_end date;
  v_start date;
  v_end date;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  IF p_billing_period IS NULL OR p_billing_period NOT IN ('monthly', 'yearly') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_billing_period');
  END IF;

  -- Verrou par chauffeur : deux appels simultanés passent l'un après l'autre
  PERFORM 1 FROM public.drivers WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'driver_not_found');
  END IF;

  SELECT ds.id INTO v_pending_id
  FROM public.driver_subscriptions ds
  WHERE ds.driver_id = v_uid
    AND ds.payment_status = 'pending'
    AND ds.status = 'active'
  ORDER BY ds.created_at DESC
  LIMIT 1;

  IF v_pending_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_pending', 'subscription_id', v_pending_id);
  END IF;

  SELECT * INTO v_price FROM public.subscription_price_for(p_billing_period);

  -- Renouvellement anticipé : la nouvelle période démarre le lendemain de la fin de l'abonnement en cours
  SELECT MAX(ds.end_date) INTO v_active_end
  FROM public.driver_subscriptions ds
  WHERE ds.driver_id = v_uid
    AND ds.payment_status = 'paid'
    AND ds.status = 'active'
    AND ds.end_date >= CURRENT_DATE;

  v_start := CASE WHEN v_active_end IS NOT NULL THEN v_active_end + 1 ELSE CURRENT_DATE END;
  v_end := public.calculate_subscription_end_date(v_start, p_billing_period);

  BEGIN
    INSERT INTO public.driver_subscriptions (
      driver_id, start_date, end_date, subscription_type, billing_period,
      price_tnd, vat_percentage, total_price_tnd, payment_status, status
    )
    VALUES (
      v_uid, v_start, v_end, 'premium', p_billing_period,
      v_price.price_tnd, v_price.vat_percentage, v_price.total_price_tnd, 'pending', 'active'
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'reason', 'duplicate_period');
  END;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_id,
    'billing_period', p_billing_period,
    'start_date', v_start,
    'end_date', v_end,
    'is_early_renewal', v_active_end IS NOT NULL,
    'price_tnd', v_price.price_tnd,
    'vat_percentage', v_price.vat_percentage,
    'total_price_tnd', v_price.total_price_tnd
  );
END;
$$;

REVOKE ALL ON FUNCTION public.subscription_price_for(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_subscription_pricing() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_driver_subscription(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.subscription_price_for(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_subscription_pricing() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_driver_subscription(text) TO authenticated, service_role;

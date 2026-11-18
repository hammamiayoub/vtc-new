-- Retour arrière de 20261118100000_subscription_payment_grace.sql
--
-- Remet les trois fonctions dans leur version précédente AVANT de supprimer les colonnes (elles y
-- font référence). Les chauffeurs en accès provisoire redeviennent bloqués jusqu'à la validation
-- de leur paiement. Revenir aussi à la version précédente du site n'est pas nécessaire : il
-- fonctionne sans l'accès provisoire.

-- 1. Protection des colonnes : version de 20261105120000
CREATE OR REPLACE FUNCTION public.protect_driver_subscription_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Seuls les rôles applicatifs sont contrôlés (postgres, service_role et fonctions SECURITY DEFINER passent)
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_type IS DISTINCT FROM OLD.subscription_type
     OR NEW.lifetime_accepted_bookings IS DISTINCT FROM OLD.lifetime_accepted_bookings
     OR NEW.has_used_free_trial IS DISTINCT FROM OLD.has_used_free_trial
     OR NEW.monthly_accepted_bookings IS DISTINCT FROM OLD.monthly_accepted_bookings
     OR NEW.monthly_bookings_reset_date IS DISTINCT FROM OLD.monthly_bookings_reset_date
  THEN
    RAISE EXCEPTION 'forbidden_column_update: les champs d''abonnement ne sont pas modifiables par le chauffeur.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Statut d'abonnement : version de 20261013140000 (sans accès provisoire)
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

-- 3. Déclaration de paiement : version de 20261117100000 (sans accès provisoire)
CREATE OR REPLACE FUNCTION public.declare_driver_subscription_payment(
  p_subscription_id UUID DEFAULT NULL,
  p_payment_reference TEXT DEFAULT NULL,
  p_proof_path TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row RECORD;
  v_reference TEXT := NULLIF(btrim(COALESCE(p_payment_reference, '')), '');
  v_proof TEXT := NULLIF(btrim(COALESCE(p_proof_path, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  -- Une preuve au moins : la référence du paiement ou le reçu.
  IF v_reference IS NULL AND v_proof IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'proof_required');
  END IF;

  IF v_reference IS NOT NULL AND length(v_reference) > 255 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'reference_too_long');
  END IF;

  -- Le reçu doit être dans le dossier du chauffeur : il ne peut pas désigner le fichier d'un autre.
  IF v_proof IS NOT NULL AND (
       left(v_proof, length(v_uid::text) + 1) <> v_uid::text || '/'
       OR position('..' IN v_proof) > 0
     ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_proof_path');
  END IF;

  SELECT ds.id, ds.driver_id, ds.payment_status, ds.status
  INTO v_row
  FROM public.driver_subscriptions ds
  WHERE ds.driver_id = v_uid
    AND (p_subscription_id IS NULL OR ds.id = p_subscription_id)
    AND ds.payment_status = 'pending'
    AND ds.status = 'active'
  ORDER BY ds.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_pending');
  END IF;

  UPDATE public.driver_subscriptions
  SET
    payment_declared_at = NOW(),
    driver_payment_reference = COALESCE(v_reference, driver_payment_reference),
    payment_proof_path = COALESCE(v_proof, payment_proof_path),
    updated_at = NOW()
  WHERE id = v_row.id;

  RETURN jsonb_build_object('success', true, 'subscription_id', v_row.id);
END;
$$;

COMMENT ON FUNCTION public.driver_can_accept_new_booking(UUID) IS
  'True si le chauffeur a un abonnement payant actif ou des courses gratuites restantes (< 2).';

-- 4. Colonnes
ALTER TABLE public.drivers
  DROP COLUMN IF EXISTS payment_grace_started_at,
  DROP COLUMN IF EXISTS payment_grace_until;

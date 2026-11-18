-- Accès provisoire de 48 h après la déclaration d'un paiement d'abonnement.
--
-- PROBLÈME
--   Entre son virement et la validation par l'administration (jusqu'à 24 h ouvrables), le chauffeur
--   qui a épuisé ses courses gratuites reste bloqué et invisible pour les clients, alors qu'il a payé.
--
-- RÈGLE
--   Quand le chauffeur déclare son paiement (declare_driver_subscription_payment), il peut accepter
--   des courses pendant 48 h, sans attendre la validation.
--   Garde-fous contre une déclaration de complaisance :
--     - un seul accès provisoire tant qu'aucun paiement n'a été validé depuis le précédent : un
--       chauffeur dont la déclaration n'aboutit jamais n'en obtient pas un second ;
--     - l'accès provisoire tombe si le chauffeur annule sa demande ;
--     - l'administrateur peut y mettre fin (payment_grace_until remis à maintenant) ;
--     - les deux colonnes sont protégées comme les autres champs d'abonnement : le chauffeur ne peut
--       pas les écrire lui-même.
--
-- CE QUE FAIT CETTE MIGRATION
--   1. Colonnes drivers.payment_grace_started_at / payment_grace_until.
--   2. protect_driver_subscription_columns : protège aussi ces deux colonnes.
--   3. get_driver_subscription_status : can_accept_more_bookings = true pendant l'accès provisoire.
--      Signature inchangée ; has_active_subscription reste false (ce n'est pas un abonnement payé).
--      Toutes les règles existantes passent par cette fonction (acceptation d'une course, recherche
--      des chauffeurs disponibles), donc aucune autre fonction n'est à modifier.
--   4. declare_driver_subscription_payment : accorde l'accès provisoire et renvoie sa date de fin.
--
-- DÉPEND DE
--   20261117100000_subscription_payment_declaration.sql.
--
-- COMPATIBILITÉ
--   Un client qui décide « peut accepter » avec can_accept_more_bookings n'a rien à changer. Un
--   client qui recalcule lui-même (abonnement actif OU courses gratuites restantes) ne verra pas
--   l'accès provisoire : À VÉRIFIER pour les applications Android / iOS. Le site web est corrigé
--   dans le même lot (searchDriversForBooking.ts).
--
-- VÉRIFICATION (chauffeur sans abonnement, quota épuisé, avec une demande en attente) :
--   select public.declare_driver_subscription_payment(null, 'VIR-12345', null);
--   -- attendu : {"success": true, "grace_until": "..."}
--   select can_accept_more_bookings from public.get_driver_subscription_status(auth.uid());
--   -- attendu : true
--
-- RETOUR ARRIÈRE : supabase/rollbacks/20261118100000_subscription_payment_grace.down.sql

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS payment_grace_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_grace_until TIMESTAMPTZ;

COMMENT ON COLUMN public.drivers.payment_grace_started_at IS
  'Début du dernier accès provisoire accordé après une déclaration de paiement d''abonnement.';
COMMENT ON COLUMN public.drivers.payment_grace_until IS
  'Fin de l''accès provisoire (48 h après la déclaration). Passé cette date, ou sans demande déclarée en attente, il ne donne plus aucun droit.';

-- ---------------------------------------------------------------------------------------------------
-- Protection des colonnes : identique à 20261105120000, avec les deux colonnes d'accès provisoire
-- ---------------------------------------------------------------------------------------------------
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
     OR NEW.payment_grace_started_at IS DISTINCT FROM OLD.payment_grace_started_at
     OR NEW.payment_grace_until IS DISTINCT FROM OLD.payment_grace_until
  THEN
    RAISE EXCEPTION 'forbidden_column_update: les champs d''abonnement ne sont pas modifiables par le chauffeur.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Statut d'abonnement : même signature et mêmes règles que 20261013140000, plus l'accès provisoire
-- ---------------------------------------------------------------------------------------------------
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
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_record RECORD;
  v_has_active_sub BOOLEAN;
  v_sub_end_date DATE;
  v_in_grace BOOLEAN;
BEGIN
  SELECT
    d.subscription_type,
    d.lifetime_accepted_bookings,
    d.has_used_free_trial,
    EXISTS(
      SELECT 1 FROM public.driver_subscriptions ds
      WHERE ds.driver_id = p_driver_id
        AND ds.status = 'active'
        AND ds.payment_status = 'paid'
        AND ds.start_date <= CURRENT_DATE
        AND ds.end_date >= CURRENT_DATE
    ) AS has_sub,
    (
      SELECT ds.end_date FROM public.driver_subscriptions ds
      WHERE ds.driver_id = p_driver_id
        AND ds.status = 'active'
        AND ds.payment_status = 'paid'
        AND ds.start_date <= CURRENT_DATE
        AND ds.end_date >= CURRENT_DATE
      ORDER BY ds.end_date DESC
      LIMIT 1
    ) AS sub_end_date,
    -- Accès provisoire : pas encore échu ET une demande déclarée payée attend toujours la validation
    -- (si le chauffeur annule sa demande, l'accès provisoire tombe aussitôt).
    (
      d.payment_grace_until IS NOT NULL
      AND d.payment_grace_until > NOW()
      AND EXISTS(
        SELECT 1 FROM public.driver_subscriptions ds
        WHERE ds.driver_id = p_driver_id
          AND ds.status = 'active'
          AND ds.payment_status = 'pending'
          AND ds.payment_declared_at IS NOT NULL
      )
    ) AS in_grace
  INTO v_driver_record
  FROM public.drivers d
  WHERE d.id = p_driver_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'free'::TEXT, 0, FALSE, 0, 0, FALSE, NULL::DATE;
    RETURN;
  END IF;

  v_has_active_sub := v_driver_record.has_sub;
  v_sub_end_date := v_driver_record.sub_end_date;
  v_in_grace := v_driver_record.in_grace;

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
      (v_driver_record.lifetime_accepted_bookings < 2) OR v_in_grace,
      GREATEST(0, 2 - v_driver_record.lifetime_accepted_bookings),
      v_driver_record.lifetime_accepted_bookings,
      v_driver_record.has_used_free_trial,
      NULL::DATE;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.driver_can_accept_new_booking(UUID) IS
  'True si le chauffeur a un abonnement payant actif, des courses gratuites restantes (< 2), ou un accès provisoire de 48 h après une déclaration de paiement.';

-- ---------------------------------------------------------------------------------------------------
-- Déclaration du paiement : identique à 20261117100000, plus l'octroi de l'accès provisoire
-- ---------------------------------------------------------------------------------------------------
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
  v_grace_started TIMESTAMPTZ;
  v_grace_until TIMESTAMPTZ;
  v_has_active BOOLEAN;
  v_grace_granted BOOLEAN := FALSE;
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

  -- Verrou sur le chauffeur : deux déclarations simultanées ne peuvent pas accorder deux accès.
  SELECT d.payment_grace_started_at, d.payment_grace_until
  INTO v_grace_started, v_grace_until
  FROM public.drivers d
  WHERE d.id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'driver_not_found');
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

  -- Accès provisoire : inutile si un abonnement payé couvre déjà aujourd'hui (renouvellement
  -- anticipé) ; refusé si le précédent accès provisoire n'a été suivi d'aucun paiement validé.
  v_has_active := EXISTS(
    SELECT 1 FROM public.driver_subscriptions ds
    WHERE ds.driver_id = v_uid
      AND ds.status = 'active'
      AND ds.payment_status = 'paid'
      AND ds.start_date <= CURRENT_DATE
      AND ds.end_date >= CURRENT_DATE
  );

  IF NOT v_has_active AND (
       v_grace_started IS NULL
       OR EXISTS(
         SELECT 1 FROM public.driver_subscriptions ds
         WHERE ds.driver_id = v_uid
           AND ds.payment_status = 'paid'
           AND ds.payment_date > v_grace_started
       )
     ) THEN
    v_grace_until := NOW() + INTERVAL '48 hours';
    v_grace_granted := TRUE;
    UPDATE public.drivers
    SET payment_grace_started_at = NOW(),
        payment_grace_until = v_grace_until
    WHERE id = v_uid;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_row.id,
    'grace_granted', v_grace_granted,
    -- Fin de l'accès provisoire en cours, s'il y en a un (nouveau ou accordé à une déclaration précédente)
    'grace_until', CASE
      WHEN NOT v_has_active AND v_grace_until IS NOT NULL AND v_grace_until > NOW() THEN v_grace_until
      ELSE NULL
    END
  );
END;
$$;

COMMENT ON FUNCTION public.declare_driver_subscription_payment(UUID, TEXT, TEXT) IS
  'Le chauffeur connecté déclare avoir payé sa demande d''abonnement en attente (référence et/ou reçu). N''active rien, mais accorde un accès provisoire de 48 h (une fois tant qu''aucun paiement n''a été validé).';

REVOKE ALL ON FUNCTION public.declare_driver_subscription_payment(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.declare_driver_subscription_payment(UUID, TEXT, TEXT) TO authenticated, service_role;

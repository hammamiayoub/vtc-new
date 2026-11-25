/*
  # Activation du modèle « commission » (blocage des chauffeurs impayés)

  Point d'entrée unique de l'accès chauffeur : get_driver_subscription_status. Il est utilisé par
    - le déclencheur bookings (enforce_driver_subscription_on_accept -> driver_can_accept_new_booking) : refus côté base,
    - la recherche de chauffeurs (get_available_drivers, get_driver_subscription_statuses),
    - l'application et le site (accès, fenêtres d'information).
  Il est donc modifié ici, et NON les clients.

  Tout est piloté par commission_settings.enforcement_enabled (false par défaut : aucun changement tant qu'on ne l'active pas) :

    enforcement_enabled = false : comportement actuel (2 courses gratuites puis abonnement), inchangé.
    enforcement_enabled = true  : plus de quota ni d'abonnement. Un chauffeur actif peut accepter des courses, SAUF s'il a
                                  un relevé de commission « overdue » (échéance dépassée, paiement ni déclaré ni validé).
                                  Un relevé « declared » (paiement déclaré, en attente de validation) ne bloque pas.

  Activer :      UPDATE public.commission_settings SET enforcement_enabled = true,  updated_at = now() WHERE id;
  Désactiver :   UPDATE public.commission_settings SET enforcement_enabled = false, updated_at = now() WHERE id;
  (effet immédiat, sans redéploiement ; la désactivation sert de retour arrière).

  Les anciens clients (app 1.6.x) continuent de fonctionner : le jeton d'erreur « subscription_required » est conservé,
  et un chauffeur bloqué est renvoyé avec remaining_free_bookings = 0 et has_active_subscription = false, ce que l'app
  sait déjà afficher (fenêtre « quota épuisé »).

  Facturation : billing_start_month évite de facturer rétroactivement les courses antérieures (données de test comprises).
  Seul le calcul automatique du 1er du mois est limité ; generate_commission_statements('AAAA-MM-01') reste possible à la main.
*/

-- ---------------------------------------------------------------------------
-- Premier mois facturable (le relevé du 1er janvier 2027 portera donc sur les courses de décembre 2026)
-- ---------------------------------------------------------------------------
ALTER TABLE public.commission_settings
  ADD COLUMN IF NOT EXISTS billing_start_month date NOT NULL DEFAULT DATE '2026-12-01';

CREATE OR REPLACE FUNCTION public.generate_commission_statements(p_month date DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  s            public.commission_settings%ROWTYPE;
  v_start      date;
  v_end        date;
  v_from       timestamptz;
  v_to         timestamptz;
  v_due        timestamptz;
  v_count      integer := 0;
  r            RECORD;
  v_ht         numeric(12,3);
  v_vat        numeric(12,3);
BEGIN
  SELECT * INTO s FROM public.commission_settings WHERE id;

  -- Mois facturé : celui fourni, sinon le mois précédent (heure de Tunis)
  v_start := date_trunc('month', COALESCE(p_month, (now() AT TIME ZONE 'Africa/Tunis')::date - interval '1 month'))::date;

  -- Calcul automatique : jamais avant le premier mois facturable
  IF p_month IS NULL AND v_start < date_trunc('month', s.billing_start_month)::date THEN
    RETURN 0;
  END IF;

  v_end   := (v_start + interval '1 month - 1 day')::date;
  v_from  := v_start::timestamp AT TIME ZONE 'Africa/Tunis';
  v_to    := (v_end + 1)::timestamp AT TIME ZONE 'Africa/Tunis';
  -- Échéance : jour J du mois suivant à 23 h 59 min 59 s (Tunis)
  v_due   := ((v_end + s.due_day)::timestamp + time '23:59:59') AT TIME ZONE 'Africa/Tunis';

  FOR r IN
    WITH ranked AS (
      SELECT b.driver_id,
             b.price_tnd,
             COALESCE(b.completion_time, b.scheduled_time) AS done_at,
             row_number() OVER (
               PARTITION BY b.driver_id
               ORDER BY COALESCE(b.completion_time, b.scheduled_time), b.id
             ) AS rn
      FROM public.bookings b
      WHERE b.status = 'completed' AND b.driver_id IS NOT NULL
    )
    SELECT driver_id,
           count(*) FILTER (WHERE rn > s.free_rides)                         AS billable,
           count(*) FILTER (WHERE rn <= s.free_rides)                        AS free_in_month,
           COALESCE(sum(price_tnd) FILTER (WHERE rn > s.free_rides), 0)      AS gross
    FROM ranked
    WHERE done_at >= v_from AND done_at < v_to
    GROUP BY driver_id
    HAVING count(*) FILTER (WHERE rn > s.free_rides) > 0
  LOOP
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.driver_commission_statements d
      WHERE d.driver_id = r.driver_id AND d.period_start = v_start
    );

    v_ht  := round(r.gross::numeric * s.rate, 3);
    v_vat := round(v_ht * s.vat_percentage / 100, 3);

    INSERT INTO public.driver_commission_statements (
      driver_id, period_start, period_end, invoice_number,
      rides_count, free_rides_excluded, gross_amount_tnd, rate,
      commission_ht_tnd, vat_percentage, vat_amount_tnd, stamp_tnd, total_ttc_tnd,
      status, due_at
    ) VALUES (
      r.driver_id, v_start, v_end,
      'FC-' || to_char(v_start, 'YYYYMM') || '-' || lpad(nextval('public.commission_invoice_seq')::text, 5, '0'),
      r.billable, r.free_in_month, round(r.gross::numeric, 3), s.rate,
      v_ht, s.vat_percentage, v_vat, s.stamp_tnd, v_ht + v_vat + s.stamp_tnd,
      'due', v_due
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_commission_statements(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_commission_statements(date) TO service_role;

-- ---------------------------------------------------------------------------
-- Statut d'accès du chauffeur : branche « commission » ajoutée, branche historique inchangée
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_driver_subscription_status(p_driver_id uuid)
 RETURNS TABLE(has_active_subscription boolean, subscription_type text, monthly_accepted_bookings integer, can_accept_more_bookings boolean, remaining_free_bookings integer, lifetime_accepted_bookings integer, has_used_free_trial boolean, subscription_end_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_driver_record RECORD;
  v_has_active_sub BOOLEAN;
  v_sub_end_date DATE;
  v_in_grace BOOLEAN;
  v_commission_model BOOLEAN;
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

  -- Modèle « commission » (activé par commission_settings.enforcement_enabled)
  SELECT COALESCE((SELECT cs.enforcement_enabled FROM public.commission_settings cs WHERE cs.id), FALSE)
    INTO v_commission_model;

  IF v_commission_model THEN
    IF public.driver_commission_blocked(p_driver_id) THEN
      -- Relevé en retard : accès suspendu jusqu'au paiement (l'app affiche déjà la fenêtre « accès limité »)
      RETURN QUERY SELECT
        FALSE,
        'free'::TEXT,
        0,
        FALSE,
        0,
        v_driver_record.lifetime_accepted_bookings,
        v_driver_record.has_used_free_trial,
        NULL::DATE;
    ELSE
      RETURN QUERY SELECT
        TRUE,
        'premium'::TEXT,
        0,
        TRUE,
        999,
        v_driver_record.lifetime_accepted_bookings,
        v_driver_record.has_used_free_trial,
        NULL::DATE;
    END IF;
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
$function$;

-- ---------------------------------------------------------------------------
-- Refus côté base : le jeton « subscription_required » est conservé (les anciennes apps le reconnaissent)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_driver_subscription_on_accept()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_msg text;
BEGIN
  IF NEW.status = 'accepted'
     AND NEW.driver_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'accepted')) THEN
    IF NOT public.driver_can_accept_new_booking(NEW.driver_id) THEN
      IF COALESCE((SELECT cs.enforcement_enabled FROM public.commission_settings cs WHERE cs.id), FALSE) THEN
        v_msg := 'subscription_required: Votre relevé de commission est en retard. Réglez-le pour reprendre les courses.';
      ELSE
        v_msg := 'subscription_required: Le chauffeur a épuisé ses 2 courses gratuites et doit souscrire un abonnement Premium.';
      END IF;
      RAISE EXCEPTION '%', v_msg USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Colis : un transporteur bloqué ne reçoit plus de demandes (sans effet tant que le blocage est désactivé)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.driver_is_eligible_for_scope(p_driver_id uuid, p_scope text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.id = p_driver_id
      AND d.status = 'active'
      AND d.driver_type IN ('transporteur', 'both')
      AND COALESCE(d.parcel_scope, 'international') = p_scope
      AND NOT public.driver_commission_blocked(d.id)
      AND EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.driver_id = d.id AND v.deleted_at IS NULL
      )
  );
$function$;

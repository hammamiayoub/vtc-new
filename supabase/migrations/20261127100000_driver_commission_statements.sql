/*
  # Commission mensuelle des chauffeurs (remplace l'abonnement à terme)

  Règles :
    - Facturable : course au statut 'completed' (non annulée). Les N premières courses terminées du chauffeur
      (commission_settings.free_rides, 2 par défaut) sont exonérées.
    - Le 1er du mois (01 h 05, heure de Tunis), un relevé est créé pour chaque chauffeur ayant au moins une course
      facturable le mois précédent : commission HT = taux (10 %) x montant des courses, TVA 19 %, total TTC à virer.
      Un chauffeur sans course facturable n'a aucun relevé et ne paie rien.
    - Échéance : le 7 du mois à 23 h 59 (heure de Tunis). Après l'échéance, un relevé « due » passe « overdue ».
      Un relevé « declared » (paiement déclaré, en attente de validation admin) garde le chauffeur actif.
    - Blocage : driver_commission_blocked(driver) vaut true si le blocage est activé (commission_settings.enforcement_enabled)
      ET qu'un relevé « overdue » existe. Le blocage est DÉSACTIVÉ par défaut : cette migration n'a aucun effet
      sur l'accès des chauffeurs tant qu'on ne l'active pas, et ne modifie pas get_driver_subscription_status.

  Fuseau : les mois sont calculés en heure de Tunis (Africa/Tunis).
*/

-- ---------------------------------------------------------------------------
-- Paramètres (une seule ligne)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commission_settings (
  id                   boolean PRIMARY KEY DEFAULT true CHECK (id),
  rate                 numeric(5,4)  NOT NULL DEFAULT 0.10,
  vat_percentage       numeric(5,2)  NOT NULL DEFAULT 19,
  stamp_tnd            numeric(8,3)  NOT NULL DEFAULT 0,
  free_rides           integer       NOT NULL DEFAULT 2,
  due_day              integer       NOT NULL DEFAULT 7 CHECK (due_day BETWEEN 1 AND 28),
  enforcement_enabled  boolean       NOT NULL DEFAULT false,
  updated_at           timestamptz   NOT NULL DEFAULT now()
);
INSERT INTO public.commission_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Relevés mensuels
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.commission_invoice_seq;

CREATE TABLE IF NOT EXISTS public.driver_commission_statements (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id            uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  period_start         date NOT NULL,                     -- 1er jour du mois facturé (heure de Tunis)
  period_end           date NOT NULL,                     -- dernier jour du mois facturé
  invoice_number       text NOT NULL UNIQUE,
  rides_count          integer       NOT NULL,            -- courses facturables (hors exonérées)
  free_rides_excluded  integer       NOT NULL DEFAULT 0,
  gross_amount_tnd     numeric(12,3) NOT NULL,            -- somme des prix des courses facturables
  rate                 numeric(5,4)  NOT NULL,
  commission_ht_tnd    numeric(12,3) NOT NULL,
  vat_percentage       numeric(5,2)  NOT NULL,
  vat_amount_tnd       numeric(12,3) NOT NULL,
  stamp_tnd            numeric(8,3)  NOT NULL DEFAULT 0,
  total_ttc_tnd        numeric(12,3) NOT NULL,
  adjustment_tnd       numeric(12,3) NOT NULL DEFAULT 0,  -- ajustement manuel admin (litige), appliqué au TTC
  status               text NOT NULL DEFAULT 'due' CHECK (status IN ('due','declared','paid','overdue','waived')),
  due_at               timestamptz NOT NULL,
  payment_reference    text,
  payment_proof_path   text,
  payment_declared_at  timestamptz,
  paid_at              timestamptz,
  validated_by         uuid,
  admin_notes          text,
  notified_at          timestamptz,                       -- e-mail / push d'émission envoyés
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (driver_id, period_start)
);

CREATE INDEX IF NOT EXISTS driver_commission_statements_status_idx
  ON public.driver_commission_statements (status, due_at);

ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_commission_statements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.commission_settings FROM anon, authenticated;
REVOKE ALL ON public.driver_commission_statements FROM anon, authenticated;
GRANT SELECT ON public.commission_settings TO authenticated;
GRANT SELECT ON public.driver_commission_statements TO authenticated;

DROP POLICY IF EXISTS "Admins read commission settings" ON public.commission_settings;
CREATE POLICY "Admins read commission settings" ON public.commission_settings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

DROP POLICY IF EXISTS "Driver reads own commission statements" ON public.driver_commission_statements;
CREATE POLICY "Driver reads own commission statements" ON public.driver_commission_statements
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "Admins read commission statements" ON public.driver_commission_statements;
CREATE POLICY "Admins read commission statements" ON public.driver_commission_statements
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Génération des relevés du mois précédent (idempotente)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Passage en retard des relevés non réglés après l'échéance
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_overdue_commission_statements()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.driver_commission_statements
     SET status = 'overdue', updated_at = now()
   WHERE status = 'due' AND due_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- Règle de blocage (utilisée plus tard par get_driver_subscription_status et l'éligibilité colis)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.driver_commission_blocked(p_driver_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT enforcement_enabled FROM public.commission_settings WHERE id), false)
     AND EXISTS (
       SELECT 1 FROM public.driver_commission_statements d
       WHERE d.driver_id = p_driver_id AND d.status = 'overdue'
     );
$$;

-- ---------------------------------------------------------------------------
-- Le chauffeur déclare avoir viré (preuve optionnelle) : le relevé passe « declared », l'accès est conservé
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.declare_commission_payment(
  p_statement_id uuid,
  p_reference text DEFAULT NULL,
  p_proof_path text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.driver_commission_statements
     SET status = 'declared',
         payment_reference = NULLIF(trim(p_reference), ''),
         payment_proof_path = NULLIF(trim(p_proof_path), ''),
         payment_declared_at = now(),
         updated_at = now()
   WHERE id = p_statement_id
     AND driver_id = auth.uid()
     AND status IN ('due', 'overdue');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'statement_not_found_or_not_payable' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- L'administrateur valide ou rejette le paiement déclaré (ou exonère / ajuste un relevé)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_review_commission_payment(
  p_statement_id uuid,
  p_decision text,               -- 'paid' | 'reject' | 'waive'
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_due timestamptz;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('paid', 'reject', 'waive') THEN
    RAISE EXCEPTION 'invalid_decision' USING ERRCODE = 'P0001';
  END IF;

  SELECT due_at INTO v_due FROM public.driver_commission_statements WHERE id = p_statement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'statement_not_found' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.driver_commission_statements
     SET status = CASE p_decision
                    WHEN 'paid'   THEN 'paid'
                    WHEN 'waive'  THEN 'waived'
                    ELSE CASE WHEN v_due <= now() THEN 'overdue' ELSE 'due' END
                  END,
         paid_at = CASE WHEN p_decision = 'paid' THEN now() ELSE paid_at END,
         validated_by = auth.uid(),
         admin_notes = COALESCE(NULLIF(trim(p_notes), ''), admin_notes),
         updated_at = now()
   WHERE id = p_statement_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Droits d'exécution
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.generate_commission_statements(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_overdue_commission_statements() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.driver_commission_blocked(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.declare_commission_payment(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_review_commission_payment(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.driver_commission_blocked(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.declare_commission_payment(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_commission_payment(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_commission_statements(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_overdue_commission_statements() TO service_role;

-- ---------------------------------------------------------------------------
-- Planification (pg_cron, UTC) : le 1er à 00 h 05 UTC = 01 h 05 à Tunis ; contrôle d'échéance toutes les heures
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job
      WHERE jobname IN ('generate-commission-statements', 'mark-overdue-commission-statements');
    PERFORM cron.schedule('generate-commission-statements', '5 0 1 * *',
      $cron$SELECT public.generate_commission_statements();$cron$);
    PERFORM cron.schedule('mark-overdue-commission-statements', '10 * * * *',
      $cron$SELECT public.mark_overdue_commission_statements();$cron$);
  END IF;
END $$;

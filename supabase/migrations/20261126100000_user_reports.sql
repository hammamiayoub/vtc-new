/*
  # Signalement d'un utilisateur (clients <-> chauffeurs / transporteurs)

  Un client peut signaler un chauffeur et inversement, à condition d'avoir une réservation ou une demande de devis
  en commun. Le signalement se fait uniquement par la fonction submit_report (jamais par INSERT direct) ; la lecture
  et le traitement sont réservés aux administrateurs.

  Exigé par Apple (guideline 1.2) et Google Play (politique « contenu généré par les utilisateurs »).
*/

CREATE TABLE IF NOT EXISTS public.user_reports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id       uuid NOT NULL,
  reporter_role     text NOT NULL CHECK (reporter_role IN ('client', 'driver')),
  reported_id       uuid NOT NULL,
  reported_role     text NOT NULL CHECK (reported_role IN ('client', 'driver')),
  booking_id        uuid,
  parcel_request_id uuid,
  reason            text NOT NULL
    CHECK (reason IN ('inappropriate_photo', 'abusive_behavior', 'fake_identity', 'vehicle_issue', 'other')),
  comment           text CHECK (comment IS NULL OR char_length(comment) <= 500),
  status            text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewed', 'dismissed', 'action_taken')),
  admin_note        text,
  handled_by        uuid,
  handled_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (reporter_id <> reported_id)
);

CREATE INDEX IF NOT EXISTS user_reports_status_idx ON public.user_reports (status, created_at);
CREATE INDEX IF NOT EXISTS user_reports_reported_idx ON public.user_reports (reported_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_reports_reporter_idx ON public.user_reports (reporter_id, created_at DESC);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_reports FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.user_reports TO authenticated;

DROP POLICY IF EXISTS "Admins read user reports" ON public.user_reports;
CREATE POLICY "Admins read user reports" ON public.user_reports
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

DROP POLICY IF EXISTS "Admins handle user reports" ON public.user_reports;
CREATE POLICY "Admins handle user reports" ON public.user_reports
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

-- Création d'un signalement : l'auteur est toujours l'utilisateur connecté, la relation est vérifiée côté serveur
CREATE OR REPLACE FUNCTION public.submit_report(
  p_reported_id uuid,
  p_reason text,
  p_comment text DEFAULT NULL,
  p_booking_id uuid DEFAULT NULL,
  p_parcel_request_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_reporter_role text;
  v_reported_role text;
  v_related boolean := false;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_reported_id IS NULL OR p_reported_id = v_uid THEN
    RAISE EXCEPTION 'invalid_report_target' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.drivers WHERE id = v_uid) THEN
    v_reporter_role := 'driver';
  ELSIF EXISTS (SELECT 1 FROM public.clients WHERE id = v_uid) THEN
    v_reporter_role := 'client';
  ELSE
    RAISE EXCEPTION 'unknown_account' USING ERRCODE = '42501';
  END IF;

  -- Personne signalée : le rôle opposé uniquement
  IF v_reporter_role = 'client' THEN
    IF NOT EXISTS (SELECT 1 FROM public.drivers WHERE id = p_reported_id) THEN
      RAISE EXCEPTION 'invalid_report_target' USING ERRCODE = '22023';
    END IF;
    v_reported_role := 'driver';
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_reported_id) THEN
      RAISE EXCEPTION 'invalid_report_target' USING ERRCODE = '22023';
    END IF;
    v_reported_role := 'client';
  END IF;

  IF p_reason NOT IN ('inappropriate_photo', 'abusive_behavior', 'fake_identity', 'vehicle_issue', 'other') THEN
    RAISE EXCEPTION 'invalid_reason' USING ERRCODE = '22023';
  END IF;
  IF p_reason = 'vehicle_issue' AND v_reported_role <> 'driver' THEN
    RAISE EXCEPTION 'invalid_reason' USING ERRCODE = '22023';
  END IF;

  -- Condition : une réservation ou une demande de devis en commun
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE (b.client_id = v_uid AND b.driver_id = p_reported_id)
       OR (b.driver_id = v_uid AND b.client_id = p_reported_id)
  ) INTO v_related;

  IF NOT v_related THEN
    SELECT EXISTS (
      SELECT 1 FROM public.parcel_quote_proposals p
      JOIN public.parcel_quote_requests r ON r.id = p.request_id
      WHERE (r.client_id = v_uid AND p.driver_id = p_reported_id)
         OR (p.driver_id = v_uid AND r.client_id = p_reported_id)
    ) INTO v_related;
  END IF;

  IF NOT v_related THEN
    RAISE EXCEPTION 'no_common_activity: aucune réservation ou demande de devis en commun.' USING ERRCODE = '42501';
  END IF;

  -- Contexte facultatif : doit concerner les deux personnes
  IF p_booking_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = p_booking_id
      AND ((b.client_id = v_uid AND b.driver_id = p_reported_id) OR (b.driver_id = v_uid AND b.client_id = p_reported_id))
  ) THEN
    p_booking_id := NULL;
  END IF;
  IF p_parcel_request_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.parcel_quote_requests r
    LEFT JOIN public.parcel_quote_proposals p ON p.request_id = r.id
    WHERE r.id = p_parcel_request_id
      AND ((r.client_id = v_uid AND p.driver_id = p_reported_id) OR (p.driver_id = v_uid AND r.client_id = p_reported_id))
  ) THEN
    p_parcel_request_id := NULL;
  END IF;

  -- Un seul signalement ouvert par couple et par jour (le même est renvoyé)
  SELECT id INTO v_id FROM public.user_reports
  WHERE reporter_id = v_uid AND reported_id = p_reported_id AND status = 'open'
    AND created_at > now() - interval '1 day'
  ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- Anti-abus : 10 signalements par 24 h et par utilisateur
  IF (SELECT count(*) FROM public.user_reports WHERE reporter_id = v_uid AND created_at > now() - interval '1 day') >= 10 THEN
    RAISE EXCEPTION 'too_many_reports' USING ERRCODE = '54000';
  END IF;

  INSERT INTO public.user_reports (
    reporter_id, reporter_role, reported_id, reported_role, booking_id, parcel_request_id, reason, comment
  ) VALUES (
    v_uid, v_reporter_role, p_reported_id, v_reported_role, p_booking_id, p_parcel_request_id, p_reason,
    NULLIF(left(trim(coalesce(p_comment, '')), 500), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_report(uuid, text, text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_report(uuid, text, text, uuid, uuid) TO authenticated;

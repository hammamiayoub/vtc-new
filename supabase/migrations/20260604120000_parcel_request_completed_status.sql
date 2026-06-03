-- Statut "completed" pour les livraisons colis effectuées par le transporteur retenu

ALTER TABLE public.parcel_quote_requests
  DROP CONSTRAINT IF EXISTS parcel_quote_requests_status_check;

ALTER TABLE public.parcel_quote_requests
  ADD CONSTRAINT parcel_quote_requests_status_check
  CHECK (status IN ('pending', 'quoted', 'accepted', 'completed', 'cancelled', 'expired'));

ALTER TABLE public.parcel_quote_requests
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Transporteur ayant remporté le devis (proposition acceptée)
CREATE OR REPLACE FUNCTION public.driver_is_winning_transporteur(
  p_request_id uuid,
  p_driver_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parcel_quote_requests r
    JOIN public.parcel_quote_proposals p ON p.id = r.accepted_proposal_id
    WHERE r.id = p_request_id
      AND p.driver_id = p_driver_id
      AND p.status = 'accepted'
      AND r.status IN ('accepted', 'completed')
  );
$$;

CREATE OR REPLACE FUNCTION public.driver_can_view_request(p_request_id uuid, p_driver_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parcel_quote_requests r
    WHERE r.id = p_request_id
      AND (
        (r.status IN ('pending', 'quoted', 'accepted')
          AND public.driver_covers_date(p_driver_id, r.desired_date))
        OR EXISTS (
          SELECT 1 FROM public.parcel_quote_proposals p
          WHERE p.request_id = r.id AND p.driver_id = p_driver_id
        )
        OR public.driver_is_winning_transporteur(p_request_id, p_driver_id)
      )
  );
$$;

-- Marquer la livraison comme effectuée (transporteur retenu uniquement)
CREATE OR REPLACE FUNCTION public.complete_parcel_delivery(p_request_id uuid)
RETURNS public.parcel_quote_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.parcel_quote_requests;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT public.driver_is_winning_transporteur(p_request_id, auth.uid()) THEN
    RAISE EXCEPTION 'Seul le transporteur retenu peut confirmer la livraison';
  END IF;

  UPDATE public.parcel_quote_requests
  SET status = 'completed',
      completed_at = now()
  WHERE id = p_request_id
    AND status = 'accepted'
  RETURNING * INTO v_result;

  IF v_result.id IS NULL THEN
    RAISE EXCEPTION 'Demande introuvable ou déjà clôturée';
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_parcel_delivery(uuid) TO authenticated;

DROP POLICY IF EXISTS parcel_requests_transporteur_select ON public.parcel_quote_requests;
CREATE POLICY parcel_requests_transporteur_select ON public.parcel_quote_requests
  FOR SELECT TO authenticated
  USING (
    public.driver_is_winning_transporteur(id, auth.uid())
    OR (
      status IN ('pending', 'quoted', 'accepted')
      AND public.driver_covers_date(auth.uid(), desired_date)
    )
  );

-- Notifications push colis + blocage des propositions après acceptation

DROP FUNCTION IF EXISTS public.get_matching_transporteurs(uuid);

CREATE OR REPLACE FUNCTION public.get_matching_transporteurs(p_request_id uuid)
RETURNS TABLE (
  driver_id uuid,
  email text,
  first_name text,
  last_name text,
  push_token text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.email, d.first_name, d.last_name, d.push_token
  FROM public.drivers d
  JOIN public.parcel_quote_requests r ON r.id = p_request_id
  WHERE d.status = 'active'
    AND d.driver_type IN ('transporteur', 'both')
    AND EXISTS (
      SELECT 1 FROM public.driver_availability da
      WHERE da.driver_id = d.id
        AND da.date = r.desired_date
        AND da.is_available = true
    )
    AND EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.driver_id = d.id
        AND v.deleted_at IS NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.parcel_request_accepts_proposals(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parcel_quote_requests r
    WHERE r.id = p_request_id
      AND r.status IN ('pending', 'quoted')
  );
$$;

CREATE OR REPLACE FUNCTION public.block_parcel_proposal_if_request_closed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.parcel_request_accepts_proposals(NEW.request_id) THEN
    RAISE EXCEPTION 'Cette demande n''accepte plus de nouvelles propositions';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS parcel_proposals_block_if_closed ON public.parcel_quote_proposals;
CREATE TRIGGER parcel_proposals_block_if_closed
  BEFORE INSERT ON public.parcel_quote_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.block_parcel_proposal_if_request_closed();

DROP POLICY IF EXISTS parcel_proposals_transporteur_crud ON public.parcel_quote_proposals;
CREATE POLICY parcel_proposals_transporteur_crud ON public.parcel_quote_proposals
  FOR ALL TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (
    driver_id = auth.uid()
    AND public.driver_can_view_request(request_id, auth.uid())
    AND public.parcel_request_accepts_proposals(request_id)
  );

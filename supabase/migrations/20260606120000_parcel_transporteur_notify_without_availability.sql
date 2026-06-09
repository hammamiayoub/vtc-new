-- Colis : notifier et afficher les demandes à tous les transporteurs actifs
-- (avec véhicule), sans exiger une disponibilité à la date souhaitée.
-- Le transporteur choisit librement s'il propose un devis ou non.

CREATE OR REPLACE FUNCTION public.driver_is_eligible_parcel_transporteur(p_driver_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.drivers d
    WHERE d.id = p_driver_id
      AND d.status = 'active'
      AND d.driver_type IN ('transporteur', 'both')
      AND EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.driver_id = d.id
          AND v.deleted_at IS NULL
      )
  );
$$;

COMMENT ON FUNCTION public.driver_is_eligible_parcel_transporteur(uuid) IS
  'Transporteur colis actif avec au moins un véhicule (sans contrôle de disponibilité calendaire).';

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
  WHERE d.status = 'active'
    AND d.driver_type IN ('transporteur', 'both')
    AND EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.driver_id = d.id
        AND v.deleted_at IS NULL
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
        public.driver_is_winning_transporteur(r.id, p_driver_id)
        OR (
          r.status IN ('pending', 'quoted')
          AND public.driver_is_eligible_parcel_transporteur(p_driver_id)
        )
        OR EXISTS (
          SELECT 1 FROM public.parcel_quote_proposals p
          WHERE p.request_id = r.id AND p.driver_id = p_driver_id
        )
      )
  );
$$;

DROP POLICY IF EXISTS parcel_requests_transporteur_select ON public.parcel_quote_requests;
CREATE POLICY parcel_requests_transporteur_select ON public.parcel_quote_requests
  FOR SELECT TO authenticated
  USING (
    public.driver_is_winning_transporteur(id, auth.uid())
    OR (
      status IN ('pending', 'quoted')
      AND public.driver_is_eligible_parcel_transporteur(auth.uid())
    )
  );

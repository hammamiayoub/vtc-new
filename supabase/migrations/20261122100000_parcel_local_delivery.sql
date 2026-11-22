/*
  # Livraison locale de colis (Tunisie → Tunisie)

  1. Transporteurs
    - `drivers.parcel_scope` : 'international' | 'local'
      Un transporteur est soit local, soit international (exclusif).
      NULL = chauffeur VTC pur. Pour un transporteur sans valeur (ancienne
      app mobile, comptes existants), on retombe sur 'international'.

  2. Demandes
    - `parcel_quote_requests.service_scope` : 'international' (défaut) | 'local'
    - `direction` accepte désormais 'tunisia_domestic' (liée à scope = local)
    - La devise reste dérivée de la direction : TND pour tunisia_domestic.

  3. Matching / RLS
    - Une demande n'est visible et notifiée qu'aux transporteurs du même scope.
    - Les propositions héritent du contrôle via driver_can_view_request.
*/

-- =============================================================
-- 1. Transporteurs : scope exclusif local / international
-- =============================================================
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS parcel_scope text
  CHECK (parcel_scope IS NULL OR parcel_scope IN ('international', 'local'));

UPDATE public.drivers
SET parcel_scope = 'international'
WHERE parcel_scope IS NULL
  AND driver_type IN ('transporteur', 'both');

CREATE INDEX IF NOT EXISTS idx_drivers_parcel_scope ON public.drivers(parcel_scope);

-- =============================================================
-- 2. Demandes : service_scope + nouvelle direction
-- =============================================================
ALTER TABLE public.parcel_quote_requests
  ADD COLUMN IF NOT EXISTS service_scope text NOT NULL DEFAULT 'international'
  CHECK (service_scope IN ('international', 'local'));

CREATE INDEX IF NOT EXISTS idx_parcel_requests_service_scope
  ON public.parcel_quote_requests(service_scope);

ALTER TABLE public.parcel_quote_requests
  DROP CONSTRAINT IF EXISTS parcel_quote_requests_direction_check;
ALTER TABLE public.parcel_quote_requests
  ADD CONSTRAINT parcel_quote_requests_direction_check
  CHECK (direction IN ('europe_to_tunisia', 'tunisia_to_europe', 'tunisia_domestic'));

ALTER TABLE public.parcel_quote_requests
  DROP CONSTRAINT IF EXISTS parcel_requests_scope_matches_direction;
ALTER TABLE public.parcel_quote_requests
  ADD CONSTRAINT parcel_requests_scope_matches_direction
  CHECK ((service_scope = 'local') = (direction = 'tunisia_domestic'));

-- La colonne generated `currency` renvoie déjà 'TND' pour tout sauf europe_to_tunisia.

-- =============================================================
-- 3. Éligibilité par scope
-- =============================================================

-- Transporteur actif avec véhicule, dont le scope correspond.
-- NULL est traité comme 'international' (compatibilité comptes/app existants).
CREATE OR REPLACE FUNCTION public.driver_is_eligible_for_scope(p_driver_id uuid, p_scope text)
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
      AND COALESCE(d.parcel_scope, 'international') = p_scope
      AND EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.driver_id = d.id
          AND v.deleted_at IS NULL
      )
  );
$$;

-- Version sans scope conservée (appelée par d'anciennes fonctions) :
-- éligible à au moins un scope.
CREATE OR REPLACE FUNCTION public.driver_is_eligible_parcel_transporteur(p_driver_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.driver_is_eligible_for_scope(p_driver_id, 'international')
      OR public.driver_is_eligible_for_scope(p_driver_id, 'local');
$$;

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
    AND COALESCE(d.parcel_scope, 'international') = r.service_scope
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
          AND public.driver_is_eligible_for_scope(p_driver_id, r.service_scope)
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
      AND public.driver_is_eligible_for_scope(auth.uid(), service_scope)
    )
  );

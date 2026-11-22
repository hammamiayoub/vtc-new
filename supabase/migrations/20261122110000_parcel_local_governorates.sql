/*
  # Livraison locale : filtre par gouvernorat

  - `drivers.parcel_governorates text[]` : gouvernorats couverts par un transporteur local.
      NULL ou vide = toute la Tunisie (comptes existants, anciennes apps).
  - `parcel_quote_requests.departure_governorate / arrival_governorate` :
      codes de gouvernorat (liste ci-dessous). NULL = inconnu (pas de filtre).
  - Une demande locale n'est visible et notifiée qu'aux transporteurs locaux
    qui couvrent le gouvernorat de DÉPART (ou qui n'ont restreint aucune zone).
  - Les demandes internationales ne sont pas concernées.
*/

-- =============================================================
-- 1. Colonnes
-- =============================================================
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS parcel_governorates text[];

ALTER TABLE public.drivers
  DROP CONSTRAINT IF EXISTS drivers_parcel_governorates_valid;
ALTER TABLE public.drivers
  ADD CONSTRAINT drivers_parcel_governorates_valid
  CHECK (
    parcel_governorates IS NULL
    OR parcel_governorates <@ ARRAY[
      'tunis','ariana','ben_arous','manouba','nabeul','zaghouan','bizerte','beja',
      'jendouba','kef','siliana','sousse','monastir','mahdia','sfax','kairouan',
      'kasserine','sidi_bouzid','gabes','medenine','tataouine','gafsa','tozeur','kebili'
    ]::text[]
  );

ALTER TABLE public.parcel_quote_requests
  ADD COLUMN IF NOT EXISTS departure_governorate text,
  ADD COLUMN IF NOT EXISTS arrival_governorate text;

ALTER TABLE public.parcel_quote_requests
  DROP CONSTRAINT IF EXISTS parcel_requests_departure_governorate_valid;
ALTER TABLE public.parcel_quote_requests
  ADD CONSTRAINT parcel_requests_departure_governorate_valid
  CHECK (departure_governorate IS NULL OR departure_governorate IN (
    'tunis','ariana','ben_arous','manouba','nabeul','zaghouan','bizerte','beja',
    'jendouba','kef','siliana','sousse','monastir','mahdia','sfax','kairouan',
    'kasserine','sidi_bouzid','gabes','medenine','tataouine','gafsa','tozeur','kebili'
  ));

ALTER TABLE public.parcel_quote_requests
  DROP CONSTRAINT IF EXISTS parcel_requests_arrival_governorate_valid;
ALTER TABLE public.parcel_quote_requests
  ADD CONSTRAINT parcel_requests_arrival_governorate_valid
  CHECK (arrival_governorate IS NULL OR arrival_governorate IN (
    'tunis','ariana','ben_arous','manouba','nabeul','zaghouan','bizerte','beja',
    'jendouba','kef','siliana','sousse','monastir','mahdia','sfax','kairouan',
    'kasserine','sidi_bouzid','gabes','medenine','tataouine','gafsa','tozeur','kebili'
  ));

CREATE INDEX IF NOT EXISTS idx_parcel_requests_departure_governorate
  ON public.parcel_quote_requests(departure_governorate);

-- =============================================================
-- 2. Éligibilité pour une demande précise (scope + zone)
-- =============================================================

-- Le transporteur couvre-t-il ce gouvernorat ?
-- Vrai si le gouvernorat est inconnu ou si le transporteur n'a restreint aucune zone.
CREATE OR REPLACE FUNCTION public.driver_covers_governorate(p_driver_id uuid, p_governorate text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_governorate IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.drivers d
      WHERE d.id = p_driver_id
        AND (
          d.parcel_governorates IS NULL
          OR cardinality(d.parcel_governorates) = 0
          OR p_governorate = ANY (d.parcel_governorates)
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.driver_is_eligible_for_request(
  p_driver_id uuid,
  p_scope text,
  p_departure_governorate text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.driver_is_eligible_for_scope(p_driver_id, p_scope)
    AND (
      p_scope <> 'local'
      OR public.driver_covers_governorate(p_driver_id, p_departure_governorate)
    );
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
  WHERE public.driver_is_eligible_for_request(d.id, r.service_scope, r.departure_governorate);
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
          AND public.driver_is_eligible_for_request(
            p_driver_id, r.service_scope, r.departure_governorate
          )
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
      AND public.driver_is_eligible_for_request(auth.uid(), service_scope, departure_governorate)
    )
  );

/*
  # Transport international de colis (devis Europe <-> Tunisie)

  1. Type de chauffeur
    - Ajout de `driver_type` sur `drivers` ('vtc' | 'transporteur' | 'both')

  2. Nouvelles tables
    - `parcel_quote_requests` : demande de devis du client
        - direction (europe_to_tunisia | tunisia_to_europe)
        - adresses + pays + coordonnées géo (départ/arrivée)
        - date souhaitée, devise (EUR pour EU->TN, TND pour TN->EU), statut
    - `parcel_items` : description des objets (nom, nb de colis, poids, volume)
    - `parcel_photos` : photos optionnelles (bucket parcel-photos)
    - `parcel_quote_proposals` : propositions de prix des transporteurs

  3. Sécurité (RLS)
    - Fonctions SECURITY DEFINER pour le matching :
        - driver_covers_date(driver, date)
        - client_owns_request(request, uid)
        - driver_can_view_request(request, driver)
    - RPC : get_matching_transporteurs(request), accept_parcel_proposal(proposal)
    - Politiques par rôle (client / transporteur éligible / admin)

  4. Cycle de vie
    - Statut `expired` quand la date souhaitée est dépassée sans acceptation
        - fonction expire_old_parcel_requests() (planifiable via cron)
*/

-- =============================================================
-- 1. Type de chauffeur
-- =============================================================
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS driver_type text NOT NULL DEFAULT 'vtc'
  CHECK (driver_type IN ('vtc', 'transporteur', 'both'));

CREATE INDEX IF NOT EXISTS idx_drivers_driver_type ON public.drivers(driver_type);

-- =============================================================
-- 2. Tables
-- =============================================================

-- Demande de devis du client
CREATE TABLE IF NOT EXISTS public.parcel_quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('europe_to_tunisia', 'tunisia_to_europe')),
  departure_address text NOT NULL,
  departure_country text,
  departure_latitude double precision,
  departure_longitude double precision,
  arrival_address text NOT NULL,
  arrival_country text,
  arrival_latitude double precision,
  arrival_longitude double precision,
  desired_date date NOT NULL,
  -- Devise dérivée de la direction : EUR pour EU->TN, TND pour TN->EU
  currency text GENERATED ALWAYS AS (
    CASE WHEN direction = 'europe_to_tunisia' THEN 'EUR' ELSE 'TND' END
  ) STORED,
  notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'quoted', 'accepted', 'cancelled', 'expired')),
  accepted_proposal_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parcel_requests_client_id ON public.parcel_quote_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_parcel_requests_status ON public.parcel_quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_parcel_requests_desired_date ON public.parcel_quote_requests(desired_date);

-- Objets à transporter
CREATE TABLE IF NOT EXISTS public.parcel_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.parcel_quote_requests(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  weight_kg numeric CHECK (weight_kg IS NULL OR weight_kg >= 0),
  volume_m3 numeric CHECK (volume_m3 IS NULL OR volume_m3 >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parcel_items_request_id ON public.parcel_items(request_id);

-- Photos optionnelles
CREATE TABLE IF NOT EXISTS public.parcel_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.parcel_quote_requests(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parcel_photos_request_id ON public.parcel_photos(request_id);

-- Propositions de prix des transporteurs
CREATE TABLE IF NOT EXISTS public.parcel_quote_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.parcel_quote_requests(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  price numeric NOT NULL CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  estimated_delivery_date date,
  message text,
  status text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, driver_id)
);

CREATE INDEX IF NOT EXISTS idx_parcel_proposals_request_id ON public.parcel_quote_proposals(request_id);
CREATE INDEX IF NOT EXISTS idx_parcel_proposals_driver_id ON public.parcel_quote_proposals(driver_id);

-- Lien différé vers la proposition acceptée
ALTER TABLE public.parcel_quote_requests
  DROP CONSTRAINT IF EXISTS fk_accepted_proposal;
ALTER TABLE public.parcel_quote_requests
  ADD CONSTRAINT fk_accepted_proposal
  FOREIGN KEY (accepted_proposal_id)
  REFERENCES public.parcel_quote_proposals(id) ON DELETE SET NULL;

-- =============================================================
-- 3. Triggers updated_at + cohérence devise
-- =============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS parcel_requests_set_updated_at ON public.parcel_quote_requests;
CREATE TRIGGER parcel_requests_set_updated_at
  BEFORE UPDATE ON public.parcel_quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS parcel_proposals_set_updated_at ON public.parcel_quote_proposals;
CREATE TRIGGER parcel_proposals_set_updated_at
  BEFORE UPDATE ON public.parcel_quote_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- La devise d'une proposition suit toujours celle de la demande
CREATE OR REPLACE FUNCTION public.set_proposal_currency()
RETURNS TRIGGER AS $$
BEGIN
  SELECT currency INTO NEW.currency
  FROM public.parcel_quote_requests
  WHERE id = NEW.request_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS parcel_proposals_set_currency ON public.parcel_quote_proposals;
CREATE TRIGGER parcel_proposals_set_currency
  BEFORE INSERT ON public.parcel_quote_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_proposal_currency();

-- =============================================================
-- 4. Fonctions SECURITY DEFINER (matching)
-- =============================================================

-- Un transporteur "couvre" une date si :
--  - il est actif et de type transporteur/both
--  - il a au moins une disponibilité (is_available) ce jour-là
--  - il a au moins un véhicule
CREATE OR REPLACE FUNCTION public.driver_covers_date(p_driver_id uuid, p_date date)
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
        SELECT 1 FROM public.driver_availability da
        WHERE da.driver_id = d.id
          AND da.date = p_date
          AND da.is_available = true
      )
      AND EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.driver_id = d.id
          AND v.deleted_at IS NULL
      )
  );
$$;

-- Le client est-il propriétaire de la demande ?
CREATE OR REPLACE FUNCTION public.client_owns_request(p_request_id uuid, p_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parcel_quote_requests r
    WHERE r.id = p_request_id AND r.client_id = p_uid
  );
$$;

-- Un transporteur peut voir une demande s'il est éligible (couvre la date)
-- OU s'il a déjà déposé une proposition dessus.
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
      )
  );
$$;

-- Liste des transporteurs à notifier pour une demande (utilisé côté Edge Function)
CREATE OR REPLACE FUNCTION public.get_matching_transporteurs(p_request_id uuid)
RETURNS TABLE (
  driver_id uuid,
  email text,
  first_name text,
  last_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.email, d.first_name, d.last_name
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

-- Acceptation d'une proposition par le client (atomique)
-- - vérifie que l'appelant possède la demande
-- - marque la proposition 'accepted', rejette les autres
-- - passe la demande en 'accepted' + accepted_proposal_id
CREATE OR REPLACE FUNCTION public.accept_parcel_proposal(p_proposal_id uuid)
RETURNS public.parcel_quote_proposals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
  v_client_id uuid;
  v_status text;
  v_result public.parcel_quote_proposals;
BEGIN
  SELECT p.request_id INTO v_request_id
  FROM public.parcel_quote_proposals p
  WHERE p.id = p_proposal_id;

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'Proposition introuvable';
  END IF;

  SELECT r.client_id, r.status INTO v_client_id, v_status
  FROM public.parcel_quote_requests r
  WHERE r.id = v_request_id;

  IF v_client_id <> auth.uid() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF v_status NOT IN ('pending', 'quoted') THEN
    RAISE EXCEPTION 'Cette demande ne peut plus être modifiée (statut %)', v_status;
  END IF;

  UPDATE public.parcel_quote_proposals
  SET status = CASE WHEN id = p_proposal_id THEN 'accepted' ELSE 'rejected' END
  WHERE request_id = v_request_id;

  UPDATE public.parcel_quote_requests
  SET status = 'accepted', accepted_proposal_id = p_proposal_id
  WHERE id = v_request_id;

  SELECT * INTO v_result FROM public.parcel_quote_proposals WHERE id = p_proposal_id;
  RETURN v_result;
END;
$$;

-- Faire passer les propositions/demandes liées à 'quoted' à la 1re proposition
CREATE OR REPLACE FUNCTION public.mark_request_quoted()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.parcel_quote_requests
  SET status = 'quoted'
  WHERE id = NEW.request_id AND status = 'pending';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS parcel_proposals_mark_quoted ON public.parcel_quote_proposals;
CREATE TRIGGER parcel_proposals_mark_quoted
  AFTER INSERT ON public.parcel_quote_proposals
  FOR EACH ROW EXECUTE FUNCTION public.mark_request_quoted();

-- Expiration des demandes non traitées dont la date souhaitée est passée
CREATE OR REPLACE FUNCTION public.expire_old_parcel_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.parcel_quote_requests
  SET status = 'expired'
  WHERE status IN ('pending', 'quoted')
    AND desired_date < current_date;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Planification quotidienne si pg_cron est disponible
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('expire-parcel-requests')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-parcel-requests');
    PERFORM cron.schedule(
      'expire-parcel-requests',
      '5 0 * * *',
      $cron$ SELECT public.expire_old_parcel_requests(); $cron$
    );
  END IF;
END $$;

-- =============================================================
-- 5. RLS
-- =============================================================
ALTER TABLE public.parcel_quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_quote_proposals ENABLE ROW LEVEL SECURITY;

-- ---- parcel_quote_requests ----
DROP POLICY IF EXISTS parcel_requests_client_select ON public.parcel_quote_requests;
CREATE POLICY parcel_requests_client_select ON public.parcel_quote_requests
  FOR SELECT TO authenticated
  USING (client_id = auth.uid());

DROP POLICY IF EXISTS parcel_requests_client_insert ON public.parcel_quote_requests;
CREATE POLICY parcel_requests_client_insert ON public.parcel_quote_requests
  FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS parcel_requests_client_update ON public.parcel_quote_requests;
CREATE POLICY parcel_requests_client_update ON public.parcel_quote_requests
  FOR UPDATE TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS parcel_requests_transporteur_select ON public.parcel_quote_requests;
CREATE POLICY parcel_requests_transporteur_select ON public.parcel_quote_requests
  FOR SELECT TO authenticated
  USING (
    status IN ('pending', 'quoted', 'accepted')
    AND public.driver_covers_date(auth.uid(), desired_date)
  );

DROP POLICY IF EXISTS parcel_requests_admin_all ON public.parcel_quote_requests;
CREATE POLICY parcel_requests_admin_all ON public.parcel_quote_requests
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

-- ---- parcel_items ----
DROP POLICY IF EXISTS parcel_items_client_crud ON public.parcel_items;
CREATE POLICY parcel_items_client_crud ON public.parcel_items
  FOR ALL TO authenticated
  USING (public.client_owns_request(request_id, auth.uid()))
  WITH CHECK (public.client_owns_request(request_id, auth.uid()));

DROP POLICY IF EXISTS parcel_items_transporteur_select ON public.parcel_items;
CREATE POLICY parcel_items_transporteur_select ON public.parcel_items
  FOR SELECT TO authenticated
  USING (public.driver_can_view_request(request_id, auth.uid()));

DROP POLICY IF EXISTS parcel_items_admin_all ON public.parcel_items;
CREATE POLICY parcel_items_admin_all ON public.parcel_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

-- ---- parcel_photos ----
DROP POLICY IF EXISTS parcel_photos_client_crud ON public.parcel_photos;
CREATE POLICY parcel_photos_client_crud ON public.parcel_photos
  FOR ALL TO authenticated
  USING (public.client_owns_request(request_id, auth.uid()))
  WITH CHECK (public.client_owns_request(request_id, auth.uid()));

DROP POLICY IF EXISTS parcel_photos_transporteur_select ON public.parcel_photos;
CREATE POLICY parcel_photos_transporteur_select ON public.parcel_photos
  FOR SELECT TO authenticated
  USING (public.driver_can_view_request(request_id, auth.uid()));

DROP POLICY IF EXISTS parcel_photos_admin_all ON public.parcel_photos;
CREATE POLICY parcel_photos_admin_all ON public.parcel_photos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

-- ---- parcel_quote_proposals ----
DROP POLICY IF EXISTS parcel_proposals_transporteur_crud ON public.parcel_quote_proposals;
CREATE POLICY parcel_proposals_transporteur_crud ON public.parcel_quote_proposals
  FOR ALL TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (
    driver_id = auth.uid()
    AND public.driver_can_view_request(request_id, auth.uid())
  );

DROP POLICY IF EXISTS parcel_proposals_client_select ON public.parcel_quote_proposals;
CREATE POLICY parcel_proposals_client_select ON public.parcel_quote_proposals
  FOR SELECT TO authenticated
  USING (public.client_owns_request(request_id, auth.uid()));

DROP POLICY IF EXISTS parcel_proposals_admin_all ON public.parcel_quote_proposals;
CREATE POLICY parcel_proposals_admin_all ON public.parcel_quote_proposals
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

-- =============================================================
-- 6. Bucket Storage : parcel-photos
-- =============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'parcel-photos',
  'parcel-photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

DROP POLICY IF EXISTS "Clients can upload parcel photos" ON storage.objects;
CREATE POLICY "Clients can upload parcel photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'parcel-photos');

DROP POLICY IF EXISTS "Public read access to parcel photos" ON storage.objects;
CREATE POLICY "Public read access to parcel photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'parcel-photos');

DROP POLICY IF EXISTS "Clients can delete their parcel photos" ON storage.objects;
CREATE POLICY "Clients can delete their parcel photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'parcel-photos');

-- Correctif prod : afficher les colis acceptés dans "Mes courses" transporteur
-- Copier-coller dans le SQL Editor Supabase (contenu = migration 20260604130000)

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

CREATE OR REPLACE FUNCTION public.get_driver_accepted_parcel_trips(p_driver_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_driver_id THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT COALESCE(
    jsonb_agg(trip ORDER BY trip->>'accepted_at' DESC),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'proposal_id', p.id,
      'price', p.price,
      'currency', p.currency,
      'estimated_delivery_date', p.estimated_delivery_date,
      'accepted_at', p.updated_at,
      'request', jsonb_build_object(
        'id', r.id,
        'client_id', r.client_id,
        'direction', r.direction,
        'departure_address', r.departure_address,
        'departure_country', r.departure_country,
        'arrival_address', r.arrival_address,
        'arrival_country', r.arrival_country,
        'desired_date', r.desired_date,
        'currency', r.currency,
        'notes', r.notes,
        'status', r.status,
        'accepted_proposal_id', r.accepted_proposal_id,
        'completed_at', r.completed_at,
        'created_at', r.created_at,
        'updated_at', r.updated_at,
        'parcel_items', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', i.id,
                'request_id', i.request_id,
                'name', i.name,
                'quantity', i.quantity,
                'weight_kg', i.weight_kg,
                'volume_m3', i.volume_m3,
                'created_at', i.created_at
              )
            )
            FROM public.parcel_items i
            WHERE i.request_id = r.id
          ),
          '[]'::jsonb
        ),
        'clients', (
          SELECT jsonb_build_object(
            'first_name', c.first_name,
            'last_name', c.last_name,
            'email', c.email,
            'phone', c.phone
          )
          FROM public.clients c
          WHERE c.id = r.client_id
        )
      )
    ) AS trip
    FROM public.parcel_quote_proposals p
    INNER JOIN public.parcel_quote_requests r ON r.id = p.request_id
    WHERE p.driver_id = p_driver_id
      AND p.status = 'accepted'
      AND r.status IN ('accepted', 'completed')
      AND r.accepted_proposal_id = p.id
  ) sub;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_driver_accepted_parcel_trips(uuid) TO authenticated;

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

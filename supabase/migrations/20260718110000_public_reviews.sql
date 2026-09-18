-- Avis clients publics pour la homepage (anonymisés)
CREATE OR REPLACE FUNCTION public.get_public_reviews(p_limit int DEFAULT 12)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT
      r.rating,
      r.comment,
      r.created_at,
      LEFT(c.first_name, 1) || '.' AS client_initial,
      COALESCE(NULLIF(TRIM(c.city), ''), 'Tunisie') AS city
    FROM ratings r
    JOIN clients c ON c.id = r.client_id
    WHERE r.comment IS NOT NULL
      AND LENGTH(TRIM(r.comment)) >= 10
    ORDER BY r.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 12), 1), 24)
  ) t;
$$;

COMMENT ON FUNCTION public.get_public_reviews(int) IS
  'Derniers avis clients avec commentaire, anonymisés pour la vitrine (anon).';

GRANT EXECUTE ON FUNCTION public.get_public_reviews(int) TO anon, authenticated;

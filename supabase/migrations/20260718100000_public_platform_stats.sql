-- Statistiques publiques agrégées pour la vitrine (TrustSignals)
CREATE OR REPLACE FUNCTION public.get_public_platform_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'completed_bookings',
      COALESCE((
        SELECT COUNT(*)::int
        FROM bookings
        WHERE status = 'completed'
      ), 0),
    'active_drivers',
      COALESCE((
        SELECT COUNT(*)::int
        FROM drivers
        WHERE status = 'active'
          AND deleted_at IS NULL
      ), 0),
    'average_rating',
      COALESCE((
        SELECT ROUND(AVG(rating)::numeric, 1)
        FROM ratings
      ), 0),
    'total_ratings',
      COALESCE((
        SELECT COUNT(*)::int
        FROM ratings
      ), 0)
  );
$$;

COMMENT ON FUNCTION public.get_public_platform_stats() IS
  'Statistiques agrégées exposées sur la homepage et les pages auth (anon).';

GRANT EXECUTE ON FUNCTION public.get_public_platform_stats() TO anon, authenticated;

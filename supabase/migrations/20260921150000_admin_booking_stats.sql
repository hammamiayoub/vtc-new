-- Agrégats courses pour le dashboard admin (évite le N+1 client/chauffeur).
-- Lecture réservée aux comptes admin_users.

CREATE INDEX IF NOT EXISTS idx_bookings_driver_status
  ON public.bookings (driver_id, status)
  WHERE driver_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_client_status
  ON public.bookings (client_id, status);

CREATE INDEX IF NOT EXISTS idx_driver_availability_upcoming
  ON public.driver_availability (driver_id, date, start_time)
  WHERE is_available = true;

CREATE OR REPLACE FUNCTION public.get_admin_booking_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN jsonb_build_object(
    'drivers', (
      SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb)
      FROM (
        SELECT
          driver_id,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_bookings,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_bookings,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_bookings,
          COUNT(*) FILTER (WHERE status IN ('accepted', 'in_progress'))::int AS in_progress_bookings,
          COALESCE(SUM(price_tnd) FILTER (WHERE status = 'completed'), 0)::numeric AS total_earnings
        FROM public.bookings
        WHERE driver_id IS NOT NULL
        GROUP BY driver_id
      ) s
    ),
    'clients', (
      SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb)
      FROM (
        SELECT
          client_id,
          COUNT(*)::int AS total_bookings,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_bookings,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_bookings,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_bookings,
          COALESCE(SUM(price_tnd) FILTER (WHERE status = 'completed'), 0)::numeric AS total_spent
        FROM public.bookings
        GROUP BY client_id
      ) s
    ),
    'totals', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'pending', COUNT(*) FILTER (WHERE status = 'pending')::int,
        'in_progress', COUNT(*) FILTER (WHERE status IN ('accepted', 'in_progress'))::int,
        'completed', COUNT(*) FILTER (WHERE status = 'completed')::int,
        'revenue', COALESCE(SUM(price_tnd) FILTER (WHERE status = 'completed'), 0)::numeric
      )
      FROM public.bookings
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_booking_stats() IS
  'Agrégats courses (chauffeur / client / totaux) pour le dashboard admin.';

GRANT EXECUTE ON FUNCTION public.get_admin_booking_stats() TO authenticated;

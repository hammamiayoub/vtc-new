-- Aligné sur TuniDriveMobile/scripts/create-get-driver-subscription-statuses-batch.sql
CREATE OR REPLACE FUNCTION public.get_driver_subscription_statuses(p_driver_ids UUID[])
RETURNS TABLE (
    driver_id UUID,
    has_active_subscription BOOLEAN,
    subscription_type TEXT,
    monthly_accepted_bookings INTEGER,
    can_accept_more_bookings BOOLEAN,
    remaining_free_bookings INTEGER,
    lifetime_accepted_bookings INTEGER,
    has_used_free_trial BOOLEAN,
    subscription_end_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_driver_id UUID;
BEGIN
    FOR v_driver_id IN
        SELECT DISTINCT u FROM unnest(COALESCE(p_driver_ids, ARRAY[]::uuid[])) AS u
    LOOP
        IF v_driver_id IS NULL THEN
            CONTINUE;
        END IF;
        RETURN QUERY
        SELECT
            v_driver_id,
            s.has_active_subscription,
            s.subscription_type,
            s.monthly_accepted_bookings,
            s.can_accept_more_bookings,
            s.remaining_free_bookings,
            s.lifetime_accepted_bookings,
            s.has_used_free_trial,
            s.subscription_end_date
        FROM public.get_driver_subscription_status(v_driver_id) AS s;
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_driver_subscription_statuses(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_driver_subscription_statuses(UUID[]) TO service_role;

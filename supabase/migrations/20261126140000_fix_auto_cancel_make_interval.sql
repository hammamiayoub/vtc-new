/*
  # Correction : l'annulation automatique des réservations sans réponse du chauffeur échouait à chaque passage

  SYMPTÔME (constaté en prod le 24/11/2026)
    La tâche planifiée « auto-cancel-pending-bookings-15min » appelle la fonction Edge auto-cancel-pending-bookings, qui
    répondait 500 à chaque exécution :
      « function make_interval(hours => double precision) does not exist »
    Aucune réservation « pending » n'a donc été annulée automatiquement pour absence de réponse.

  CAUSE
    auto_cancel_pending_bookings_no_response(p_grace_hours double precision) passait un nombre décimal à
    make_interval(hours => …), dont le paramètre « hours » est un entier. Le paramètre « secs » accepte un décimal.

  CORRECTION
    make_interval(secs => p_grace_hours * 3600) : même durée, types compatibles (4 h = 14 400 s).
    Le reste de la fonction est inchangé. CREATE OR REPLACE conserve les droits d'exécution existants
    (réservés à service_role par 20261124100000).

  À SAVOIR AVANT D'APPLIQUER
    Une fois la fonction réparée, toute réservation « pending » avec chauffeur, non acceptée et créée il y a plus de
    4 heures est annulée au passage suivant, avec notification. Vérifier avant :
      SELECT count(*) FROM bookings
      WHERE status = 'pending' AND driver_id IS NOT NULL AND accepted_at IS NULL
        AND created_at <= now() - interval '4 hours';
    (0 le 24/11/2026 : aucune annulation rétroactive à craindre à cette date.)
*/

CREATE OR REPLACE FUNCTION public.auto_cancel_pending_bookings_no_response(p_grace_hours double precision DEFAULT 4)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reason CONSTANT TEXT := 'Absence de réponse du chauffeur';
  v_result JSONB;
BEGIN
  WITH to_cancel AS (
    SELECT b.id
    FROM public.bookings b
    WHERE b.status = 'pending'
      AND b.driver_id IS NOT NULL
      AND b.accepted_at IS NULL
      AND b.created_at <= now() - make_interval(secs => p_grace_hours * 3600)
    FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE public.bookings b
    SET
      status = 'cancelled',
      cancellation_reason = v_reason,
      updated_at = now()
    FROM to_cancel tc
    WHERE b.id = tc.id
    RETURNING
      b.id,
      b.client_id,
      b.driver_id,
      b.pickup_address,
      b.destination_address
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'booking_id', u.id,
        'client_id', u.client_id,
        'driver_id', u.driver_id,
        'pickup_address', u.pickup_address,
        'destination_address', u.destination_address,
        'client_name', trim(coalesce(c.first_name, '') || ' ' || coalesce(c.last_name, '')),
        'driver_name', trim(coalesce(d.first_name, '') || ' ' || coalesce(d.last_name, ''))
      )
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM updated u
  INNER JOIN public.clients c ON c.id = u.client_id
  INNER JOIN public.drivers d ON d.id = u.driver_id;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

/*
  # Intégrité des courses terminées (base de calcul de la commission)

  La commission est calculée par le serveur sur les courses au statut 'completed', datées par completion_time
  (à défaut scheduled_time). Aujourd'hui, un chauffeur connecté peut :
    - écrire lui-même completion_time (horodatage fourni par le client) et ainsi déplacer une course d'un mois à l'autre ;
    - remettre une course « completed » à un autre statut avant le calcul du relevé, pour qu'elle ne soit pas facturée.
  Le prix (price_tnd) et l'horaire (scheduled_time) sont déjà verrouillés par guard_booking_columns.

  Ce déclencheur, pour les utilisateurs « authenticated » non administrateurs :
    - fixe completion_time = now() (heure du serveur) au passage à 'completed', quelle que soit la valeur envoyée ;
    - empêche de modifier completion_time d'une course déjà terminée ;
    - interdit de sortir une course du statut 'completed'.
  Les administrateurs et les traitements internes (service_role, cron, fonctions SECURITY DEFINER) ne sont pas concernés.
*/

CREATE OR REPLACE FUNCTION public.enforce_booking_completion_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'completed' AND NEW.status IS DISTINCT FROM 'completed' THEN
      RAISE EXCEPTION 'forbidden_booking_status: une course terminée ne peut plus changer de statut.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
      NEW.completion_time := now();
    ELSIF OLD.status = 'completed' AND NEW.completion_time IS DISTINCT FROM OLD.completion_time THEN
      NEW.completion_time := OLD.completion_time;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_completion_integrity ON public.bookings;
CREATE TRIGGER trigger_enforce_completion_integrity
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_booking_completion_integrity();

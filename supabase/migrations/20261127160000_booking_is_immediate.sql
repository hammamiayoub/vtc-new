-- Suivi des départs immédiats : la case « Départ immédiat » du formulaire de réservation n'était
-- pas conservée (scheduled_time valait simplement l'heure de la demande).
-- Les réservations existantes restent à false : le compteur démarre à la mise en production.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS is_immediate boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_bookings_immediate_created_at
  ON public.bookings (created_at DESC)
  WHERE is_immediate = true;

-- L'app mobile ne renseigne pas is_immediate : son flux « départ immédiat » crée la réservation
-- en recherche automatique de chauffeur (status = 'searching'), alors que le site et les courses
-- planifiées créent en 'pending'. On déduit donc le marqueur à l'insertion, sans nouvelle version de l'app.
CREATE OR REPLACE FUNCTION public.set_booking_is_immediate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'searching' THEN
    NEW.is_immediate := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_booking_is_immediate ON public.bookings;
CREATE TRIGGER trg_set_booking_is_immediate
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_booking_is_immediate();

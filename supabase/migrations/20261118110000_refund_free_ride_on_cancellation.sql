-- Restitue la course comptée au chauffeur quand une course acceptée est annulée par quelqu'un d'autre.
--
-- PROBLÈME
--   Le quota de 2 courses gratuites compte les ACCEPTATIONS (lifetime_accepted_bookings, incrémenté
--   par increment_driver_lifetime_bookings). Si le client annule après l'acceptation, la course
--   reste comptée : un chauffeur peut épuiser son essai, et être bloqué, sans avoir fait une course.
--
-- RÈGLE
--   Quand une réservation passe de « accepted » à « cancelled » et que l'annulation ne vient PAS du
--   chauffeur lui-même, son compteur est diminué de 1 (jamais sous 0).
--     - Annulation par le client, par un administrateur ou par un traitement automatique : restituée.
--     - Annulation par le chauffeur : non restituée. Sinon il suffirait d'accepter puis d'annuler
--       pour garder indéfiniment ses courses gratuites.
--     - Une course déjà commencée (« in_progress ») ou terminée n'est jamais restituée.
--
--   On garde le comptage à l'acceptation plutôt qu'à la fin de la course : compter à la fin
--   permettrait d'accepter un nombre illimité de courses à venir avant d'en terminer une seule.
--
-- LIMITE CONNUE
--   L'auteur de l'annulation est déduit de la session (auth.uid()) : un chauffeur et un client qui
--   s'entendraient pour annuler après une course faite hors plateforme récupéreraient la course.
--
-- CE QUI NE CHANGE PAS
--   Le compteur sert aussi aux abonnés Premium (affichage) : il est diminué de la même façon, sans
--   effet sur leurs droits. Les annulations passées ne sont pas recalculées.
--
-- VÉRIFICATION
--   Avec un chauffeur à 1 course comptée : faire accepter une course (compteur 2), l'annuler depuis
--   le compte client (compteur 1), puis recommencer en annulant depuis le compte chauffeur (reste 2).
--     select lifetime_accepted_bookings, has_used_free_trial from drivers where id = '<chauffeur>';
--
-- RETOUR ARRIÈRE : supabase/rollbacks/20261118110000_refund_free_ride_on_cancellation.down.sql

CREATE OR REPLACE FUNCTION public.refund_driver_ride_on_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'accepted'
     AND NEW.status = 'cancelled'
     AND OLD.driver_id IS NOT NULL
     AND auth.uid() IS DISTINCT FROM OLD.driver_id THEN
    UPDATE public.drivers
    SET
      lifetime_accepted_bookings = GREATEST(0, lifetime_accepted_bookings - 1),
      -- Même règle que increment_driver_lifetime_bookings : l'essai est « utilisé » à partir de 2
      has_used_free_trial = GREATEST(0, lifetime_accepted_bookings - 1) >= 2
    WHERE id = OLD.driver_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.refund_driver_ride_on_cancellation() IS
  'Diminue de 1 le compteur de courses du chauffeur quand une course acceptée est annulée par quelqu''un d''autre que lui.';

DROP TRIGGER IF EXISTS trigger_refund_driver_ride_on_cancellation ON public.bookings;
CREATE TRIGGER trigger_refund_driver_ride_on_cancellation
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (OLD.status = 'accepted' AND NEW.status = 'cancelled')
  EXECUTE FUNCTION public.refund_driver_ride_on_cancellation();

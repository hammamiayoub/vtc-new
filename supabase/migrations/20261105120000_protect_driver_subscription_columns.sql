-- Empêche un chauffeur de modifier lui-même les colonnes d'abonnement et de quota de sa fiche.
--
-- PROBLÈME
--   La politique de mise à jour de `drivers` (auth.uid() = id) ne restreint aucune colonne. Un chauffeur
--   peut donc, avec sa propre session :
--     - se mettre `subscription_type = 'premium'` : get_driver_subscription_status traite cette valeur
--       comme un abonnement actif, sans limite de courses et sans jamais expirer ;
--     - remettre `lifetime_accepted_bookings` à 0 / `has_used_free_trial` à false pour retrouver ses
--       courses gratuites.
--   Cette faille rend la précédente (insertion d'un abonnement payé) inutile à corriger seule.
--
-- CORRECTION
--   Trigger BEFORE UPDATE : si le rôle courant est `authenticated` ou `anon` et que l'utilisateur n'est
--   pas dans admin_users, toute modification de ces colonnes est refusée.
--
--   Ce qui continue de fonctionner :
--     - le compteur de courses (trigger increment_driver_lifetime_bookings) : fonction SECURITY DEFINER,
--       donc exécutée sous le rôle propriétaire, pas `authenticated` ;
--     - les actions admin depuis le dashboard (utilisateur présent dans admin_users) ;
--     - le SQL Editor, service_role et les scripts d'activation manuelle (rôle postgres).
--   Une mise à jour qui renvoie les mêmes valeurs (objet complet) n'est pas considérée comme une
--   modification (IS DISTINCT FROM).
--
-- COMPATIBILITÉ
--   À CONFIRMER pour les applications Android / iOS : elles ne doivent pas écrire ces colonnes.
--   Tester sur staging : accepter une course (le compteur doit toujours s'incrémenter).
--
-- NON TRAITÉ ICI
--   La colonne `status` de `drivers` (validation du compte par l'admin) a le même défaut d'exposition :
--   à examiner à part, car des flux légitimes (désactivation par le chauffeur) peuvent l'utiliser.
--
-- VÉRIFICATION (session chauffeur, doit échouer avec forbidden_column_update) :
--   update drivers set subscription_type = 'premium' where id = auth.uid();
--
-- RETOUR ARRIÈRE : supabase/rollbacks/20261105120000_protect_driver_subscription_columns.down.sql

CREATE OR REPLACE FUNCTION public.protect_driver_subscription_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Seuls les rôles applicatifs sont contrôlés (postgres, service_role et fonctions SECURITY DEFINER passent)
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_type IS DISTINCT FROM OLD.subscription_type
     OR NEW.lifetime_accepted_bookings IS DISTINCT FROM OLD.lifetime_accepted_bookings
     OR NEW.has_used_free_trial IS DISTINCT FROM OLD.has_used_free_trial
     OR NEW.monthly_accepted_bookings IS DISTINCT FROM OLD.monthly_accepted_bookings
     OR NEW.monthly_bookings_reset_date IS DISTINCT FROM OLD.monthly_bookings_reset_date
  THEN
    RAISE EXCEPTION 'forbidden_column_update: les champs d''abonnement ne sont pas modifiables par le chauffeur.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_driver_subscription_columns ON public.drivers;
CREATE TRIGGER trigger_protect_driver_subscription_columns
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_driver_subscription_columns();

-- Empêche un chauffeur de se valider lui-même (colonne drivers.status).
--
-- PROBLÈME
--   Le statut du compte (pending -> active) matérialise la validation par l'administrateur : vérification
--   du permis et des documents du véhicule (24-48 h). Or :
--     - à l'inscription, la politique d'insertion de `drivers` est `WITH CHECK (true)` pour anon et
--       authenticated : un chauffeur peut s'insérer directement avec status = 'active' ;
--     - ensuite, il peut modifier sa propre fiche, y compris `status`, avec sa clé publique et sa session.
--   Il recevrait alors des courses sans avoir jamais été validé.
--
-- CORRECTION (trigger BEFORE INSERT OR UPDATE)
--   Pour les rôles applicatifs (anon / authenticated) hors administrateurs :
--     - INSERT : le statut est forcé à 'pending' et les champs d'abonnement et de quota sont remis à leurs
--       valeurs de départ, quelle que soit la valeur envoyée (l'inscription continue de fonctionner) ;
--     - UPDATE : le statut ne peut être modifié que vers 'pending' (le formulaire de profil l'utilise).
--       Passer à 'active' ou toute autre valeur est refusé (forbidden_status_change).
--   Inchangés : les administrateurs (admin_users), service_role, postgres / SQL Editor, et les fonctions
--   SECURITY DEFINER (par exemple une Edge Function de suppression de compte).
--
-- COMPATIBILITÉ
--   À CONFIRMER pour les apps Android / iOS : elles ne doivent pas faire passer elles-mêmes un chauffeur
--   à 'active' ni à un autre statut que 'pending'. Tester sur staging : inscription, complétion du profil,
--   validation par l'admin.
--
-- VÉRIFICATION (session chauffeur, doit échouer avec forbidden_status_change) :
--   update drivers set status = 'active' where id = auth.uid();
--
-- RETOUR ARRIÈRE : supabase/rollbacks/20261105150000_protect_driver_status.down.sql

CREATE OR REPLACE FUNCTION public.protect_driver_status()
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

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.subscription_type := 'free';
    NEW.lifetime_accepted_bookings := 0;
    NEW.has_used_free_trial := FALSE;
    NEW.monthly_accepted_bookings := 0;
    NEW.monthly_bookings_reset_date := CURRENT_DATE;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'forbidden_status_change: le statut du compte est géré par l''administration.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_driver_status ON public.drivers;
CREATE TRIGGER trigger_protect_driver_status
  BEFORE INSERT OR UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_driver_status();

-- RETOUR ARRIÈRE de 20261105150000_protect_driver_status.sql
--
-- Supprime le trigger et sa fonction : un chauffeur peut de nouveau s'insérer avec le statut de son choix
-- et passer lui-même son compte à « active » sans validation de l'administration.
-- À n'utiliser que si une application cliente légitime est bloquée, le temps de l'adapter.

DROP TRIGGER IF EXISTS trigger_protect_driver_status ON public.drivers;
DROP FUNCTION IF EXISTS public.protect_driver_status();

-- RETOUR ARRIÈRE de 20261105120000_protect_driver_subscription_columns.sql
--
-- Supprime le trigger et sa fonction : un chauffeur peut de nouveau modifier lui-même
-- subscription_type, lifetime_accepted_bookings, has_used_free_trial, etc.
-- ATTENTION : cela rouvre la faille d'auto-attribution d'un abonnement Premium et de remise à zéro
-- du quota gratuit. À utiliser seulement si une application cliente légitime est bloquée.

DROP TRIGGER IF EXISTS trigger_protect_driver_subscription_columns ON public.drivers;
DROP FUNCTION IF EXISTS public.protect_driver_subscription_columns();

-- RETOUR ARRIÈRE de 20261105140000_subscription_server_side_pricing.sql
--
-- Supprime les trois fonctions. L'écran chauffeur web (DriverSubscription.tsx) appelle ces fonctions :
-- si vous annulez cette migration, revenez aussi à la version précédente du front, sinon la
-- souscription échouera.

DROP FUNCTION IF EXISTS public.request_driver_subscription(text);
DROP FUNCTION IF EXISTS public.get_subscription_pricing();
DROP FUNCTION IF EXISTS public.subscription_price_for(text);

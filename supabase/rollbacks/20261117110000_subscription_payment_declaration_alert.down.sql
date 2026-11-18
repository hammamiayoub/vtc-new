-- Retour arrière de 20261117110000_subscription_payment_declaration_alert.sql
-- L'Edge Function process-subscription-expirations ignore cette étape quand la fonction n'existe pas :
-- inutile de la redéployer.

DROP FUNCTION IF EXISTS public.get_subscription_payment_declarations_to_notify();

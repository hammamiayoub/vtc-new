-- RETOUR ARRIÈRE de 20261105110000_restrict_driver_subscription_insert.sql
--
-- Rétablit la politique d'origine (20251010150000_add_driver_subscription_system.sql) :
-- un chauffeur peut insérer n'importe quelle ligne à son nom, y compris « payée ».
-- ATTENTION : cela rouvre la faille de création d'un abonnement sans paiement.
-- À utiliser seulement si une application cliente (mobile) est bloquée par la nouvelle politique,
-- le temps de l'adapter ; elle doit insérer payment_status = 'pending', status = 'active',
-- sans payment_reference ni payment_date.

DROP POLICY IF EXISTS "Drivers can create subscription requests" ON public.driver_subscriptions;

CREATE POLICY "Drivers can create subscription requests"
  ON public.driver_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

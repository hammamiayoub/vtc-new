-- RETOUR ARRIÈRE de supabase/deferred/20261105141000_remove_direct_subscription_insert.sql
--
-- Rétablit l'insertion directe, dans sa version durcie (demande en attente uniquement, sans référence
-- ni date de paiement : voir 20261105110000_restrict_driver_subscription_insert.sql). Le montant reste
-- alors choisi par le client : à n'utiliser que pour débloquer une application mobile, le temps de
-- l'adapter à request_driver_subscription.

DROP POLICY IF EXISTS "Drivers can create subscription requests" ON public.driver_subscriptions;

CREATE POLICY "Drivers can create subscription requests"
  ON public.driver_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = driver_id
    AND payment_status = 'pending'
    AND status = 'active'
    AND payment_reference IS NULL
    AND payment_date IS NULL
  );

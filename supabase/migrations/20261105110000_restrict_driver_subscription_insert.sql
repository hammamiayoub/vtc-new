-- Empêche un chauffeur de créer lui-même un abonnement « payé ».
--
-- PROBLÈME
--   La politique « Drivers can create subscription requests » ne vérifiait que `auth.uid() = driver_id`.
--   Rien n'imposait `payment_status = 'pending'`. Avec la clé publique et sa propre session, un chauffeur
--   pouvait insérer directement une ligne `payment_status = 'paid'`, `status = 'active'` avec une date
--   de fin lointaine : get_driver_subscription_status la considère alors Premium, sans validation de
--   l'administration ni paiement.
--
-- CORRECTION
--   Un chauffeur ne peut insérer qu'une DEMANDE : en attente de paiement, sans référence ni date de
--   paiement. Le passage à « paid » reste réservé à validate_driver_subscription_payment (admin).
--
-- COMPATIBILITÉ
--   Le web insère déjà { payment_status: 'pending', status: 'active' } (DriverSubscription.tsx).
--   À CONFIRMER pour les applications Android / iOS (même base) : leur insertion doit respecter les
--   mêmes valeurs. Tester sur staging avant la production.
--
-- NON TRAITÉ ICI
--   Le montant (price_tnd, total_price_tnd) est toujours envoyé par le client. Étape suivante
--   recommandée : une fonction request_driver_subscription(billing_period) qui calcule le prix côté
--   serveur, puis retrait du droit d'insertion direct.
--
-- VÉRIFICATION (session chauffeur, doit échouer avec « new row violates row-level security policy ») :
--   insert into driver_subscriptions (driver_id, start_date, end_date, subscription_type,
--     billing_period, payment_status, status)
--   values (auth.uid(), current_date, current_date + 365, 'premium', 'yearly', 'paid', 'active');
--
-- RETOUR ARRIÈRE : supabase/rollbacks/20261105110000_restrict_driver_subscription_insert.down.sql

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

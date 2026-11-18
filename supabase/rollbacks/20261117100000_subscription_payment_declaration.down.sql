-- Retour arrière de 20261117100000_subscription_payment_declaration.sql
-- Les reçus déjà déposés restent dans le bucket : le vider puis le supprimer depuis le Dashboard
-- Supabase (Storage) si on veut aussi les retirer.

DROP FUNCTION IF EXISTS public.declare_driver_subscription_payment(UUID, TEXT, TEXT);

DROP POLICY IF EXISTS "Drivers upload their subscription receipts" ON storage.objects;
DROP POLICY IF EXISTS "Drivers read their subscription receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins read subscription receipts" ON storage.objects;

DROP INDEX IF EXISTS public.idx_driver_subscriptions_declared_pending;

ALTER TABLE public.driver_subscriptions
  DROP COLUMN IF EXISTS payment_declared_at,
  DROP COLUMN IF EXISTS driver_payment_reference,
  DROP COLUMN IF EXISTS payment_proof_path;

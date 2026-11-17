-- Alerte à l'administrateur quand un chauffeur déclare le paiement de son abonnement.
--
-- PROBLÈME
--   Depuis 20261117100000, le chauffeur déclare son paiement dans l'application, mais l'admin ne
--   l'apprenait qu'en ouvrant la liste des abonnements.
--
-- CE QUE FAIT CETTE MIGRATION
--   Une fonction de lecture, get_subscription_payment_declarations_to_notify(), que l'Edge Function
--   process-subscription-expirations appelle à chaque passage (toutes les heures) pour envoyer un
--   email aux administrateurs. L'anti-doublon existant (claim_subscription_notification, clé
--   `admin_payment_declared`) garantit un seul email par demande, même si le chauffeur corrige sa
--   déclaration ensuite.
--   La limite de 3 jours évite d'envoyer des mails pour d'anciennes déclarations à la mise en route.
--
-- DÉPEND DE
--   20261117100000_subscription_payment_declaration.sql (colonnes payment_declared_at, etc.).
--
-- DROITS
--   Réservée à service_role (elle renvoie emails et téléphones), comme les autres fonctions de rappel.
--
-- MISE EN SERVICE
--   Redéployer l'Edge Function après cette migration :
--     supabase functions deploy process-subscription-expirations --no-verify-jwt
--   Tant que la migration n'est pas appliquée, la fonction déployée ignore simplement cette étape.
--
-- RETOUR ARRIÈRE : supabase/rollbacks/20261117110000_subscription_payment_declaration_alert.down.sql

CREATE OR REPLACE FUNCTION public.get_subscription_payment_declarations_to_notify()
RETURNS TABLE (
  subscription_id uuid,
  driver_id uuid,
  driver_email text,
  first_name text,
  last_name text,
  phone text,
  billing_period text,
  total_price_tnd numeric,
  payment_declared_at timestamptz,
  driver_payment_reference text,
  has_proof boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ds.id,
    ds.driver_id,
    d.email::text,
    d.first_name::text,
    d.last_name::text,
    d.phone::text,
    ds.billing_period::text,
    ds.total_price_tnd::numeric,
    ds.payment_declared_at,
    ds.driver_payment_reference::text,
    ds.payment_proof_path IS NOT NULL
  FROM public.driver_subscriptions ds
  JOIN public.drivers d ON d.id = ds.driver_id
  WHERE ds.payment_status = 'pending'
    AND ds.status = 'active'
    AND ds.payment_declared_at IS NOT NULL
    AND ds.payment_declared_at > now() - interval '3 days'
  ORDER BY ds.payment_declared_at
$$;

COMMENT ON FUNCTION public.get_subscription_payment_declarations_to_notify() IS
  'Demandes d''abonnement dont le chauffeur a déclaré le paiement depuis moins de 3 jours et qui attendent la validation de l''admin.';

REVOKE ALL ON FUNCTION public.get_subscription_payment_declarations_to_notify() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_subscription_payment_declarations_to_notify() TO service_role;

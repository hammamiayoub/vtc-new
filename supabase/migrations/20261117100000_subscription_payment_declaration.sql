-- Déclaration du paiement d'abonnement par le chauffeur, avec reçu.
--
-- PROBLÈME
--   Après sa demande d'abonnement, le chauffeur devait prévenir le support par WhatsApp ou email pour
--   signaler son virement. Rien dans l'application ne lui indiquait où en était sa demande, et l'admin
--   ne savait pas quelles demandes étaient réellement payées.
--
-- CE QUE FAIT CETTE MIGRATION
--   1. Trois colonnes sur driver_subscriptions : date de déclaration, référence saisie par le
--      chauffeur, chemin du reçu.
--   2. Un bucket privé `subscription-receipts` : le chauffeur dépose dans son propre dossier
--      (<son id>/...), seuls lui et les administrateurs peuvent lire.
--   3. Une fonction declare_driver_subscription_payment : le chauffeur déclare le paiement de SA
--      demande en attente. Elle ne change ni payment_status ni les dates : l'activation reste réservée
--      à validate_driver_subscription_payment (admin).
--
-- COMPATIBILITÉ
--   Ajouts uniquement : rien n'est modifié ni retiré. Le site fonctionne avec ou sans cette migration
--   (sans elle, il garde l'ancien parcours « contactez le support »). Les applications Android / iOS
--   ne sont pas concernées tant qu'elles n'appellent pas la nouvelle fonction.
--
-- VÉRIFICATION (session chauffeur avec une demande en attente) :
--   select public.declare_driver_subscription_payment(null, 'VIR-12345', null);
--   -- attendu : {"success": true, ...} puis payment_declared_at renseigné sur la demande
--
-- RETOUR ARRIÈRE : supabase/rollbacks/20261117100000_subscription_payment_declaration.down.sql

ALTER TABLE public.driver_subscriptions
  ADD COLUMN IF NOT EXISTS payment_declared_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS driver_payment_reference VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_proof_path TEXT;

COMMENT ON COLUMN public.driver_subscriptions.payment_declared_at IS
  'Date à laquelle le chauffeur a déclaré avoir payé (avant validation par l''administration).';
COMMENT ON COLUMN public.driver_subscriptions.driver_payment_reference IS
  'Référence de paiement saisie par le chauffeur. La référence validée par l''admin reste payment_reference.';
COMMENT ON COLUMN public.driver_subscriptions.payment_proof_path IS
  'Chemin du reçu dans le bucket privé subscription-receipts (<driver_id>/<fichier>).';

-- Demandes déclarées payées et pas encore validées : ce que l'admin doit traiter en premier.
CREATE INDEX IF NOT EXISTS idx_driver_subscriptions_declared_pending
  ON public.driver_subscriptions (payment_declared_at)
  WHERE payment_status = 'pending' AND payment_declared_at IS NOT NULL;

-- ---------------------------------------------------------------------------------------------------
-- Bucket privé des reçus
-- ---------------------------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'subscription-receipts',
  'subscription-receipts',
  false,
  5242880, -- 5 Mo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Drivers upload their subscription receipts" ON storage.objects;
CREATE POLICY "Drivers upload their subscription receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'subscription-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Drivers read their subscription receipts" ON storage.objects;
CREATE POLICY "Drivers read their subscription receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'subscription-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Admins read subscription receipts" ON storage.objects;
CREATE POLICY "Admins read subscription receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'subscription-receipts'
    AND EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

-- ---------------------------------------------------------------------------------------------------
-- Déclaration du paiement par le chauffeur
-- ---------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.declare_driver_subscription_payment(
  p_subscription_id UUID DEFAULT NULL,
  p_payment_reference TEXT DEFAULT NULL,
  p_proof_path TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row RECORD;
  v_reference TEXT := NULLIF(btrim(COALESCE(p_payment_reference, '')), '');
  v_proof TEXT := NULLIF(btrim(COALESCE(p_proof_path, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  -- Une preuve au moins : la référence du paiement ou le reçu.
  IF v_reference IS NULL AND v_proof IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'proof_required');
  END IF;

  IF v_reference IS NOT NULL AND length(v_reference) > 255 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'reference_too_long');
  END IF;

  -- Le reçu doit être dans le dossier du chauffeur : il ne peut pas désigner le fichier d'un autre.
  IF v_proof IS NOT NULL AND (
       left(v_proof, length(v_uid::text) + 1) <> v_uid::text || '/'
       OR position('..' IN v_proof) > 0
     ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_proof_path');
  END IF;

  SELECT ds.id, ds.driver_id, ds.payment_status, ds.status
  INTO v_row
  FROM public.driver_subscriptions ds
  WHERE ds.driver_id = v_uid
    AND (p_subscription_id IS NULL OR ds.id = p_subscription_id)
    AND ds.payment_status = 'pending'
    AND ds.status = 'active'
  ORDER BY ds.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_pending');
  END IF;

  UPDATE public.driver_subscriptions
  SET
    payment_declared_at = NOW(),
    driver_payment_reference = COALESCE(v_reference, driver_payment_reference),
    payment_proof_path = COALESCE(v_proof, payment_proof_path),
    updated_at = NOW()
  WHERE id = v_row.id;

  RETURN jsonb_build_object('success', true, 'subscription_id', v_row.id);
END;
$$;

COMMENT ON FUNCTION public.declare_driver_subscription_payment(UUID, TEXT, TEXT) IS
  'Le chauffeur connecté déclare avoir payé sa demande d''abonnement en attente (référence et/ou reçu). N''active rien.';

REVOKE ALL ON FUNCTION public.declare_driver_subscription_payment(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.declare_driver_subscription_payment(UUID, TEXT, TEXT) TO authenticated, service_role;

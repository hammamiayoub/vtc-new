-- ========================================
-- SCRIPT D'ACTIVATION RAPIDE - ABONNEMENT PREMIUM
-- ========================================
-- 
-- Ce script active un abonnement Premium après réception du paiement
-- 
-- ⚠️ INSTRUCTIONS :
-- 1. Remplacer 'EMAIL_DU_CHAUFFEUR' par l'email réel
-- 2. Remplacer 'REFERENCE_PAIEMENT' par la référence fournie par le chauffeur
-- 3. Vérifier 'bank_transfer' ou le remplacer par 'cash_order' si mandat minute
-- 4. Exécuter tout le script d'un coup dans SQL Editor
-- 
-- ========================================

-- CONFIGURATION (MODIFIER ICI)
-- ========================================
DO $$
DECLARE
  v_driver_email TEXT := 'EMAIL_DU_CHAUFFEUR@example.com';  -- ⚠️ MODIFIER
  v_payment_reference TEXT := 'REFERENCE_PAIEMENT';         -- ⚠️ MODIFIER
  v_payment_method TEXT := 'bank_transfer';                 -- ou 'cash_order'
  v_driver_id UUID;
  v_subscription_id UUID;
BEGIN
  -- ========================================
  -- ÉTAPE 1 : Identifier le chauffeur
  -- ========================================
  
  SELECT id INTO v_driver_id
  FROM drivers
  WHERE email = v_driver_email;
  
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION '❌ Chauffeur non trouvé avec email: %', v_driver_email;
  END IF;
  
  RAISE NOTICE '✅ Chauffeur trouvé: %', v_driver_id;
  
  -- ========================================
  -- ÉTAPE 2 : Trouver la demande d''abonnement
  -- ========================================
  
  SELECT id INTO v_subscription_id
  FROM driver_subscriptions
  WHERE driver_id = v_driver_id
    AND payment_status = 'pending'
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION '❌ Aucune demande d''abonnement en attente pour ce chauffeur';
  END IF;
  
  RAISE NOTICE '✅ Demande trouvée: %', v_subscription_id;
  
  -- ========================================
  -- ÉTAPE 3 : Valider le paiement
  -- ========================================
  
  UPDATE driver_subscriptions
  SET 
    payment_status = 'paid',
    payment_date = NOW(),
    payment_reference = v_payment_reference,
    payment_method = v_payment_method,
    admin_notes = 'Paiement validé automatiquement via script le ' || NOW()::TEXT
  WHERE id = v_subscription_id;
  
  RAISE NOTICE '✅ Paiement validé dans driver_subscriptions';
  
  -- ========================================
  -- ÉTAPE 4 : Activer le compte Premium
  -- ========================================
  
  UPDATE drivers
  SET subscription_type = 'premium'
  WHERE id = v_driver_id;
  
  RAISE NOTICE '✅ Compte Premium activé';
  
  -- ========================================
  -- ÉTAPE 5 : Afficher le résultat
  -- ========================================
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 ACTIVATION RÉUSSIE !';
  RAISE NOTICE '========================================';
  
END $$;

-- ========================================
-- VÉRIFICATION FINALE
-- ========================================

SELECT 
  '✅ ACTIVATION CONFIRMÉE' as statut,
  d.first_name || ' ' || d.last_name as chauffeur,
  d.email,
  d.subscription_type,
  d.monthly_accepted_bookings as courses_ce_mois,
  ds.payment_status,
  ds.payment_date,
  ds.payment_reference,
  ds.start_date as debut_abonnement,
  ds.end_date as fin_abonnement,
  ds.total_price_tnd as montant_paye
FROM drivers d
LEFT JOIN driver_subscriptions ds ON ds.driver_id = d.id 
  AND ds.status = 'active' 
  AND ds.payment_status = 'paid'
WHERE d.email = 'EMAIL_DU_CHAUFFEUR@example.com'  -- ⚠️ MODIFIER (même email qu'au début)
ORDER BY ds.created_at DESC
LIMIT 1;

-- ========================================
-- RESULTAT ATTENDU :
-- ========================================
-- statut: '✅ ACTIVATION CONFIRMÉE'
-- chauffeur: 'Prénom Nom'
-- subscription_type: 'premium'
-- payment_status: 'paid'
-- payment_date: [date du jour]
-- ========================================


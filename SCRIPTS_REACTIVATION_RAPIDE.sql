-- ════════════════════════════════════════════════════════════════════════════════
-- SCRIPTS DE RÉACTIVATION RAPIDE - ABONNEMENTS CHAUFFEURS
-- ════════════════════════════════════════════════════════════════════════════════
-- 
-- Instructions :
-- 1. Choisir le script approprié (MENSUEL ou ANNUEL)
-- 2. Remplacer les valeurs entre guillemets simples
-- 3. Exécuter dans Supabase SQL Editor
-- 4. Vérifier la confirmation
-- 5. Informer le chauffeur
--
-- ════════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════════
-- OPTION 1 : RENOUVELLEMENT MENSUEL (35.70 TND)
-- ════════════════════════════════════════════════════════════════════════════════

-- Étape 1 : Trouver le chauffeur
SELECT 
  id,
  first_name,
  last_name,
  email,
  phone,
  lifetime_accepted_bookings
FROM drivers
WHERE email = 'chauffeur@email.com'      -- ⚠️ REMPLACER par l'email du chauffeur
-- OU WHERE phone = '+216 XX XXX XXX'    -- ⚠️ OU par son téléphone
LIMIT 1;

-- 💾 Noter l'UUID retourné : _________________________________


-- Étape 2 : Vérifier son statut actuel
SELECT * FROM get_driver_subscription_status('UUID_DRIVER_ICI'); -- ⚠️ REMPLACER

-- Résultat attendu si bloqué :
-- can_accept_more_bookings: false


-- Étape 3 : Créer l'abonnement MENSUEL
INSERT INTO driver_subscriptions (
  driver_id,
  start_date,
  end_date,
  subscription_type,
  billing_period,
  price_tnd,
  vat_percentage,
  total_price_tnd,
  payment_status,
  payment_method,
  payment_date,
  payment_reference,
  status,
  admin_notes
) VALUES (
  'UUID_DRIVER_ICI',                                    -- ⚠️ REMPLACER par l'UUID du chauffeur
  CURRENT_DATE,                                         -- Commence aujourd'hui
  CURRENT_DATE + INTERVAL '1 month',                    -- Expire dans 1 mois
  'premium',                                            -- Type premium
  'monthly',                                            -- Facturation mensuelle
  30.00,                                                -- Prix HT
  19.00,                                                -- TVA 19%
  35.70,                                                -- Prix TTC
  'paid',                                               -- ✅ PAYÉ (pour activer)
  'bank_transfer',                                      -- Méthode: virement
  NOW(),                                                -- Date du paiement
  'REFERENCE-BANCAIRE-ICI',                            -- ⚠️ REMPLACER par la référence du virement
  'active',                                             -- ✅ ACTIF (pour activer)
  'Abonnement mensuel validé le ' || CURRENT_DATE::TEXT || '. Montant: 35.70 TND.'
)
RETURNING 
  id as subscription_id,
  start_date as debut,
  end_date as fin,
  total_price_tnd as montant;

-- 💾 Noter le subscription_id retourné : _________________________________


-- Étape 4 : Vérifier la réactivation
SELECT * FROM get_driver_subscription_status('UUID_DRIVER_ICI'); -- ⚠️ REMPLACER

-- ✅ Résultat attendu :
-- has_active_subscription: true
-- can_accept_more_bookings: true
-- subscription_end_date: [date dans 1 mois]


-- Étape 5 : Voir le résumé
SELECT 
  d.first_name || ' ' || d.last_name as chauffeur,
  d.email,
  d.phone,
  ds.billing_period as type,
  ds.total_price_tnd as montant,
  ds.start_date as debut,
  ds.end_date as fin,
  ds.end_date - CURRENT_DATE as jours_restants,
  ds.payment_reference as reference
FROM driver_subscriptions ds
JOIN drivers d ON ds.driver_id = d.id
WHERE ds.id = 'SUBSCRIPTION_ID_RETOURNE_CI_DESSUS'; -- ⚠️ Copier l'ID retourné à l'étape 3

-- ✅ TERMINÉ ! Chauffeur réactivé avec abonnement mensuel


-- ════════════════════════════════════════════════════════════════════════════════
-- OPTION 2 : RENOUVELLEMENT ANNUEL (385.56 TND) - ÉCONOMIE 10%
-- ════════════════════════════════════════════════════════════════════════════════

-- Étape 1 : Trouver le chauffeur
SELECT 
  id,
  first_name,
  last_name,
  email,
  phone,
  lifetime_accepted_bookings
FROM drivers
WHERE email = 'chauffeur@email.com'      -- ⚠️ REMPLACER par l'email du chauffeur
-- OU WHERE phone = '+216 XX XXX XXX'    -- ⚠️ OU par son téléphone
LIMIT 1;

-- 💾 Noter l'UUID retourné : _________________________________


-- Étape 2 : Vérifier son statut actuel
SELECT * FROM get_driver_subscription_status('UUID_DRIVER_ICI'); -- ⚠️ REMPLACER


-- Étape 3 : Créer l'abonnement ANNUEL
INSERT INTO driver_subscriptions (
  driver_id,
  start_date,
  end_date,
  subscription_type,
  billing_period,
  price_tnd,
  vat_percentage,
  total_price_tnd,
  payment_status,
  payment_method,
  payment_date,
  payment_reference,
  status,
  admin_notes
) VALUES (
  'UUID_DRIVER_ICI',                                    -- ⚠️ REMPLACER par l'UUID du chauffeur
  CURRENT_DATE,                                         -- Commence aujourd'hui
  CURRENT_DATE + INTERVAL '1 year',                     -- Expire dans 1 AN
  'premium',                                            -- Type premium
  'yearly',                                             -- Facturation annuelle
  324.00,                                               -- Prix HT (30*12*0.9)
  19.00,                                                -- TVA 19%
  385.56,                                               -- Prix TTC
  'paid',                                               -- ✅ PAYÉ (pour activer)
  'bank_transfer',                                      -- Méthode: virement
  NOW(),                                                -- Date du paiement
  'REFERENCE-BANCAIRE-ICI',                            -- ⚠️ REMPLACER par la référence du virement
  'active',                                             -- ✅ ACTIF (pour activer)
  'Abonnement ANNUEL validé le ' || CURRENT_DATE::TEXT || '. Montant: 385.56 TND. Économie: 42.84 TND vs mensuel.'
)
RETURNING 
  id as subscription_id,
  start_date as debut,
  end_date as fin,
  total_price_tnd as montant;

-- 💾 Noter le subscription_id retourné : _________________________________


-- Étape 4 : Vérifier la réactivation
SELECT * FROM get_driver_subscription_status('UUID_DRIVER_ICI'); -- ⚠️ REMPLACER

-- ✅ Résultat attendu :
-- has_active_subscription: true
-- can_accept_more_bookings: true
-- subscription_end_date: [date dans 1 an]


-- Étape 5 : Voir le résumé
SELECT 
  d.first_name || ' ' || d.last_name as chauffeur,
  d.email,
  d.phone,
  ds.billing_period as type,
  ds.total_price_tnd as montant,
  ds.start_date as debut,
  ds.end_date as fin,
  ds.end_date - CURRENT_DATE as jours_restants,
  (35.70 * 12) - ds.total_price_tnd as economie_realisee,
  ds.payment_reference as reference
FROM driver_subscriptions ds
JOIN drivers d ON ds.driver_id = d.id
WHERE ds.id = 'SUBSCRIPTION_ID_RETOURNE_CI_DESSUS'; -- ⚠️ Copier l'ID retourné à l'étape 3

-- ✅ TERMINÉ ! Chauffeur réactivé avec abonnement annuel


-- ════════════════════════════════════════════════════════════════════════════════
-- OPTION 3 : VALIDER UNE DEMANDE EXISTANTE (déjà dans la base)
-- ════════════════════════════════════════════════════════════════════════════════

-- Situation : Le chauffeur a déjà créé une demande via l'interface
-- Vous devez juste la valider après réception du paiement

-- Étape 1 : Trouver la demande en attente
SELECT 
  ds.id,
  d.first_name || ' ' || d.last_name as chauffeur,
  d.email,
  ds.billing_period,
  ds.total_price_tnd,
  ds.created_at,
  ds.start_date,
  ds.end_date
FROM driver_subscriptions ds
JOIN drivers d ON ds.driver_id = d.id
WHERE ds.payment_status = 'pending'
  AND ds.status = 'active'
  AND d.email = 'chauffeur@email.com'    -- ⚠️ REMPLACER
ORDER BY ds.created_at DESC
LIMIT 1;

-- 💾 Noter le subscription_id : _________________________________


-- Étape 2 : Valider le paiement
UPDATE driver_subscriptions
SET 
  payment_status = 'paid',                              -- ✅ Marquer comme payé
  payment_method = 'bank_transfer',                     -- Méthode
  payment_date = NOW(),                                 -- Date du paiement
  payment_reference = 'REFERENCE-BANCAIRE-ICI',        -- ⚠️ REMPLACER
  updated_at = NOW()
WHERE id = 'SUBSCRIPTION_ID_RETOURNE_CI_DESSUS'        -- ⚠️ REMPLACER
  AND payment_status = 'pending';

-- Vérifier la mise à jour
SELECT 
  id,
  payment_status,
  payment_date,
  payment_reference,
  status
FROM driver_subscriptions
WHERE id = 'SUBSCRIPTION_ID_RETOURNE_CI_DESSUS';       -- ⚠️ REMPLACER

-- ✅ payment_status devrait être 'paid'


-- Étape 3 : Vérifier la réactivation du chauffeur
SELECT * FROM get_driver_subscription_status(
  (SELECT driver_id FROM driver_subscriptions WHERE id = 'SUBSCRIPTION_ID_RETOURNE_CI_DESSUS') -- ⚠️ REMPLACER
);

-- ✅ can_accept_more_bookings devrait être true


-- ════════════════════════════════════════════════════════════════════════════════
-- BONUS : SCRIPT DE VÉRIFICATION RAPIDE
-- ════════════════════════════════════════════════════════════════════════════════

-- Vérifier un chauffeur spécifique (toutes les infos)
SELECT 
  d.first_name || ' ' || d.last_name as nom_complet,
  d.email,
  d.phone,
  d.subscription_type,
  d.lifetime_accepted_bookings as courses_total,
  d.has_used_free_trial as a_utilise_essai_gratuit,
  CASE 
    WHEN EXISTS(
      SELECT 1 FROM driver_subscriptions ds
      WHERE ds.driver_id = d.id
        AND ds.payment_status = 'paid'
        AND ds.status = 'active'
        AND ds.end_date >= CURRENT_DATE
    ) THEN '✅ A un abonnement actif'
    ELSE '❌ Pas d''abonnement actif (bloqué)'
  END as statut_abonnement,
  (
    SELECT 
      billing_period || ' - Expire le ' || end_date::TEXT || 
      ' (dans ' || (end_date - CURRENT_DATE) || ' jours)'
    FROM driver_subscriptions ds
    WHERE ds.driver_id = d.id
      AND ds.payment_status = 'paid'
      AND ds.status = 'active'
      AND ds.end_date >= CURRENT_DATE
    ORDER BY end_date DESC
    LIMIT 1
  ) as details_abonnement
FROM drivers d
WHERE d.email = 'chauffeur@email.com'    -- ⚠️ REMPLACER
-- OU d.phone = '+216 XX XXX XXX'        -- ⚠️ OU par téléphone
LIMIT 1;


-- ════════════════════════════════════════════════════════════════════════════════
-- BONUS : VOIR TOUTES LES DEMANDES EN ATTENTE
-- ════════════════════════════════════════════════════════════════════════════════

SELECT 
  ds.id as subscription_id,
  d.first_name || ' ' || d.last_name as chauffeur,
  d.email,
  d.phone,
  ds.billing_period as type,
  ds.total_price_tnd as montant,
  ds.created_at as demande_creee_le,
  AGE(NOW(), ds.created_at) as temps_ecoule,
  CASE 
    WHEN AGE(NOW(), ds.created_at) > INTERVAL '48 hours' THEN '⚠️ URGENT (> 48h)'
    WHEN AGE(NOW(), ds.created_at) > INTERVAL '24 hours' THEN '⚠️ À traiter (> 24h)'
    ELSE '✅ Récent'
  END as priorite
FROM driver_subscriptions ds
JOIN drivers d ON ds.driver_id = d.id
WHERE ds.payment_status = 'pending'
  AND ds.status = 'active'
ORDER BY ds.created_at ASC;  -- Les plus anciennes en premier


-- ════════════════════════════════════════════════════════════════════════════════
-- BONUS : SCRIPT DE RENOUVELLEMENT AUTOMATIQUE (avec détection)
-- ════════════════════════════════════════════════════════════════════════════════

-- Script intelligent qui :
-- 1. Trouve le chauffeur
-- 2. Crée l'abonnement
-- 3. Vérifie la réactivation
-- 4. Affiche un résumé

DO $$
DECLARE
  v_driver_id UUID;
  v_driver_email TEXT := 'chauffeur@email.com';        -- ⚠️ REMPLACER
  v_billing_period VARCHAR(20) := 'monthly';           -- ⚠️ 'monthly' ou 'yearly'
  v_payment_reference TEXT := 'VOTRE-REF-BANCAIRE';   -- ⚠️ REMPLACER
  v_subscription_id UUID;
  v_end_date DATE;
  v_status RECORD;
  v_price_ht DECIMAL;
  v_price_ttc DECIMAL;
BEGIN
  -- Trouver le chauffeur
  SELECT id INTO v_driver_id
  FROM drivers
  WHERE email = v_driver_email;
  
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Chauffeur non trouvé avec email: %', v_driver_email;
  END IF;
  
  RAISE NOTICE '✅ Chauffeur trouvé: % (ID: %)', v_driver_email, v_driver_id;
  
  -- Calculer les prix selon le type
  IF v_billing_period = 'yearly' THEN
    v_price_ht := 324.00;
    v_price_ttc := 385.56;
  ELSE
    v_price_ht := 30.00;
    v_price_ttc := 35.70;
  END IF;
  
  RAISE NOTICE '💰 Montant: % TND TTC (% TND HT)', v_price_ttc, v_price_ht;
  
  -- Créer l'abonnement
  INSERT INTO driver_subscriptions (
    driver_id,
    start_date,
    end_date,
    subscription_type,
    billing_period,
    price_tnd,
    vat_percentage,
    total_price_tnd,
    payment_status,
    payment_method,
    payment_date,
    payment_reference,
    status,
    admin_notes
  ) VALUES (
    v_driver_id,
    CURRENT_DATE,
    CURRENT_DATE + CASE WHEN v_billing_period = 'yearly' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END,
    'premium',
    v_billing_period,
    v_price_ht,
    19.00,
    v_price_ttc,
    'paid',
    'bank_transfer',
    NOW(),
    v_payment_reference,
    'active',
    'Abonnement ' || v_billing_period || ' validé automatiquement le ' || NOW()::TEXT
  )
  RETURNING id, end_date INTO v_subscription_id, v_end_date;
  
  RAISE NOTICE '✅ Abonnement créé: %', v_subscription_id;
  RAISE NOTICE '📅 Valable jusqu''au: %', v_end_date;
  
  -- Vérifier la réactivation
  SELECT * INTO v_status
  FROM get_driver_subscription_status(v_driver_id);
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ RÉACTIVATION TERMINÉE AVEC SUCCÈS';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Chauffeur : %', v_driver_email;
  RAISE NOTICE 'Type : % (% mois)', 
    CASE WHEN v_billing_period = 'yearly' THEN 'ANNUEL (-10%)' ELSE 'MENSUEL' END,
    CASE WHEN v_billing_period = 'yearly' THEN 12 ELSE 1 END;
  RAISE NOTICE 'Montant : % TND TTC', v_price_ttc;
  RAISE NOTICE 'Expire le : %', v_end_date;
  RAISE NOTICE 'Référence : %', v_payment_reference;
  RAISE NOTICE '';
  RAISE NOTICE 'Statut actuel :';
  RAISE NOTICE '  - Abonnement actif : %', v_status.has_active_subscription;
  RAISE NOTICE '  - Peut accepter courses : %', v_status.can_accept_more_bookings;
  RAISE NOTICE '  - Courses lifetime : %', v_status.lifetime_accepted_bookings;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Le chauffeur peut maintenant accepter des courses illimitées !';
  RAISE NOTICE '';
  RAISE NOTICE '📧 N''oubliez pas d''envoyer la confirmation au chauffeur !';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  
END $$;


-- ════════════════════════════════════════════════════════════════════════════════
-- TABLEAU DE BORD ADMIN - Résumé Quotidien
-- ════════════════════════════════════════════════════════════════════════════════

-- Vue d'ensemble des abonnements
SELECT 
  '📊 VUE D''ENSEMBLE' as info,
  COUNT(*) as total_abonnements,
  COUNT(*) FILTER (WHERE payment_status = 'paid' AND status = 'active' AND end_date >= CURRENT_DATE) as actifs_payes,
  COUNT(*) FILTER (WHERE payment_status = 'pending') as en_attente_validation,
  COUNT(*) FILTER (WHERE payment_status = 'paid' AND end_date < CURRENT_DATE) as expires,
  SUM(total_price_tnd) FILTER (WHERE payment_status = 'paid') as revenus_totaux
FROM driver_subscriptions;

-- Abonnements à traiter en priorité
SELECT 
  '⚠️ PRIORITÉS' as info,
  d.first_name || ' ' || d.last_name as chauffeur,
  d.email,
  d.phone,
  ds.billing_period,
  ds.total_price_tnd,
  ds.created_at,
  AGE(NOW(), ds.created_at) as attente
FROM driver_subscriptions ds
JOIN drivers d ON ds.driver_id = d.id
WHERE ds.payment_status = 'pending'
ORDER BY ds.created_at ASC
LIMIT 10;

-- Abonnements qui expirent dans les 7 prochains jours
SELECT 
  '🔔 EXPIRENT BIENTÔT' as info,
  d.first_name || ' ' || d.last_name as chauffeur,
  d.email,
  d.phone,
  ds.billing_period,
  ds.end_date,
  ds.end_date - CURRENT_DATE as jours_restants
FROM driver_subscriptions ds
JOIN drivers d ON ds.driver_id = d.id
WHERE ds.payment_status = 'paid'
  AND ds.status = 'active'
  AND ds.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY ds.end_date ASC;


-- ════════════════════════════════════════════════════════════════════════════════
-- AIDE-MÉMOIRE DES PRIX
-- ════════════════════════════════════════════════════════════════════════════════

/*
┌────────────┬──────────┬───────────┬──────────┬─────────────────┐
│ Type       │ Prix HT  │ TVA (19%) │ Prix TTC │ Économie        │
├────────────┼──────────┼───────────┼──────────┼─────────────────┤
│ Mensuel    │ 30.00    │ 5.70      │ 35.70    │ -               │
│ Annuel     │ 324.00   │ 61.56     │ 385.56   │ 42.84 TND/an    │
└────────────┴──────────┴───────────┴──────────┴─────────────────┘

Calcul économie annuelle :
  (35.70 × 12) - 385.56 = 42.84 TND économisés

Équivalent mensuel annuel :
  385.56 ÷ 12 = 32.13 TND/mois
*/


-- ════════════════════════════════════════════════════════════════════════════════
-- FIN DES SCRIPTS
-- ════════════════════════════════════════════════════════════════════════════════


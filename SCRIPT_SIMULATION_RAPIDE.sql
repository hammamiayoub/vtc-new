-- 🎬 SCRIPT DE SIMULATION RAPIDE - Parcours Chauffeur Complet
-- Copier-coller ce script dans Supabase SQL Editor et exécuter

-- 🧹 PARTIE 1 : Nettoyage (optionnel si vous voulez réinitialiser)
-- Décommenter les lignes suivantes si vous voulez nettoyer d'abord
/*
DELETE FROM bookings WHERE driver_id IN (
  SELECT id FROM drivers WHERE email = 'demo.driver@tunidrive.test'
);
DELETE FROM driver_subscriptions WHERE driver_id IN (
  SELECT id FROM drivers WHERE email = 'demo.driver@tunidrive.test'
);
DELETE FROM drivers WHERE email = 'demo.driver@tunidrive.test';
DELETE FROM clients WHERE email = 'demo.client@tunidrive.test';
*/

-- 🚀 PARTIE 2 : Simulation Automatique Complète
DO $$
DECLARE
  v_driver_id UUID;
  v_client_id UUID;
  v_booking_id UUID;
  v_subscription_id UUID;
  v_status RECORD;
  i INT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎬 DÉBUT DE LA SIMULATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- ✅ ÉTAPE 1 : Créer un chauffeur test
  RAISE NOTICE '📝 Étape 1/7 : Création du chauffeur test...';
  INSERT INTO drivers (
    first_name, 
    last_name, 
    email, 
    phone, 
    city, 
    license_number, 
    status, 
    subscription_type, 
    lifetime_accepted_bookings, 
    has_used_free_trial
  ) VALUES (
    'Demo',
    'Chauffeur',
    'demo.driver@tunidrive.test',
    '+216 12 345 678',
    'Tunis',
    'DEMO123456',
    'active',
    'free',
    0,
    false
  )
  RETURNING id INTO v_driver_id;
  
  RAISE NOTICE '✅ Chauffeur créé : % (demo.driver@tunidrive.test)', v_driver_id;
  RAISE NOTICE '';
  
  -- ✅ ÉTAPE 2 : Créer un client test
  RAISE NOTICE '📝 Étape 2/7 : Création du client test...';
  INSERT INTO clients (
    first_name,
    last_name,
    email,
    phone,
    city,
    status
  ) VALUES (
    'Demo',
    'Client',
    'demo.client@tunidrive.test',
    '+216 98 765 432',
    'Tunis',
    'active'
  )
  RETURNING id INTO v_client_id;
  
  RAISE NOTICE '✅ Client créé : % (demo.client@tunidrive.test)', v_client_id;
  RAISE NOTICE '';
  
  -- ✅ ÉTAPE 3 : Accepter 3 courses gratuites
  RAISE NOTICE '📝 Étape 3/7 : Acceptation des 3 courses gratuites...';
  
  FOR i IN 1..3 LOOP
    -- Créer une réservation
    INSERT INTO bookings (
      client_id,
      driver_id,
      pickup_address,
      destination_address,
      pickup_latitude,
      pickup_longitude,
      destination_latitude,
      destination_longitude,
      distance_km,
      price_tnd,
      scheduled_time,
      status
    ) VALUES (
      v_client_id,
      v_driver_id,
      CASE i
        WHEN 1 THEN 'Aéroport Tunis-Carthage'
        WHEN 2 THEN 'La Marsa'
        WHEN 3 THEN 'Carthage'
      END,
      CASE i
        WHEN 1 THEN 'Avenue Habib Bourguiba'
        WHEN 2 THEN 'Sidi Bou Said'
        WHEN 3 THEN 'Sousse'
      END,
      36.851033 + (i * 0.01),
      10.227255 + (i * 0.01),
      36.806495 + (i * 0.02),
      10.181532 + (i * 0.02),
      10.0 + (i * 5),
      15.00 + (i * 10),
      NOW() + (i || ' hours')::INTERVAL,
      'pending'
    )
    RETURNING id INTO v_booking_id;
    
    -- Accepter la réservation (TRIGGER s'active)
    UPDATE bookings 
    SET status = 'accepted' 
    WHERE id = v_booking_id;
    
    -- Vérifier le statut après chaque course
    SELECT * INTO v_status
    FROM get_driver_subscription_status(v_driver_id);
    
    RAISE NOTICE '  🚗 Course gratuite %/3 acceptée (Booking ID: %)', 
      i, v_booking_id;
    RAISE NOTICE '     📊 Compteur lifetime: % | Restantes: %', 
      v_status.lifetime_accepted_bookings, 
      v_status.remaining_free_bookings;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ 3 courses gratuites acceptées';
  RAISE NOTICE '🔒 Chauffeur maintenant BLOQUÉ (can_accept_more_bookings = false)';
  RAISE NOTICE '';
  
  -- ✅ ÉTAPE 4 : Créer une demande d'abonnement Premium Mensuel
  RAISE NOTICE '📝 Étape 4/7 : Création de la demande d''abonnement...';
  
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
    status
  ) VALUES (
    v_driver_id,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 month',
    'premium',
    'monthly',
    30.00,
    19.00,
    35.70,
    'pending',
    'active'
  )
  RETURNING id INTO v_subscription_id;
  
  RAISE NOTICE '✅ Demande d''abonnement créée : %', v_subscription_id;
  RAISE NOTICE '   💰 Montant: 35.70 TND (mensuel)';
  RAISE NOTICE '   📅 Valable jusqu''au: %', CURRENT_DATE + INTERVAL '1 month';
  RAISE NOTICE '   ⏳ Statut: PENDING (en attente de validation)';
  RAISE NOTICE '';
  
  -- Attendre 1 seconde (simulation)
  PERFORM pg_sleep(1);
  
  -- ✅ ÉTAPE 5 : Valider l'abonnement (rôle Admin)
  RAISE NOTICE '📝 Étape 5/7 : Validation de l''abonnement par l''admin...';
  
  UPDATE driver_subscriptions
  SET 
    payment_status = 'paid',
    payment_method = 'bank_transfer',
    payment_date = NOW(),
    payment_reference = 'DEMO-REF-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    updated_at = NOW()
  WHERE id = v_subscription_id;
  
  RAISE NOTICE '✅ Abonnement VALIDÉ et ACTIVÉ';
  RAISE NOTICE '   💳 Paiement: 35.70 TND reçu';
  RAISE NOTICE '   🔓 Chauffeur DÉBLOQUÉ (courses illimitées)';
  RAISE NOTICE '';
  
  -- ✅ ÉTAPE 6 : Accepter 5 courses premium
  RAISE NOTICE '📝 Étape 6/7 : Acceptation de 5 courses premium...';
  
  FOR i IN 1..5 LOOP
    -- Créer une réservation premium
    INSERT INTO bookings (
      client_id,
      driver_id,
      pickup_address,
      destination_address,
      pickup_latitude,
      pickup_longitude,
      destination_latitude,
      destination_longitude,
      distance_km,
      price_tnd,
      scheduled_time,
      status
    ) VALUES (
      v_client_id,
      v_driver_id,
      'Tunis Premium Pickup ' || i,
      'Destination Premium ' || i,
      36.8 + (i * 0.01),
      10.2 + (i * 0.01),
      36.85 + (i * 0.02),
      10.3 + (i * 0.02),
      15.0 + (i * 3),
      20.00 + (i * 5),
      NOW() + ((i + 3) || ' hours')::INTERVAL,
      'pending'
    )
    RETURNING id INTO v_booking_id;
    
    -- Accepter
    UPDATE bookings 
    SET status = 'accepted' 
    WHERE id = v_booking_id;
    
    RAISE NOTICE '  🚗 Course premium % acceptée (Booking ID: %)', i, v_booking_id;
  END LOOP;
  
  -- Vérifier le statut final
  SELECT * INTO v_status
  FROM get_driver_subscription_status(v_driver_id);
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ 5 courses premium acceptées';
  RAISE NOTICE '   📊 Total lifetime: % courses', v_status.lifetime_accepted_bookings;
  RAISE NOTICE '';
  
  -- ✅ ÉTAPE 7 : Afficher le résumé final
  RAISE NOTICE '📝 Étape 7/7 : Résumé final...';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 SIMULATION TERMINÉE AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 RÉSUMÉ :';
  RAISE NOTICE '  👤 Chauffeur ID : %', v_driver_id;
  RAISE NOTICE '  👤 Client ID : %', v_client_id;
  RAISE NOTICE '  💳 Abonnement ID : %', v_subscription_id;
  RAISE NOTICE '';
  RAISE NOTICE '📊 STATISTIQUES :';
  RAISE NOTICE '  🚗 Courses gratuites : 3/3 (épuisées)';
  RAISE NOTICE '  🚗 Courses premium : 5';
  RAISE NOTICE '  🚗 Total lifetime : %', v_status.lifetime_accepted_bookings;
  RAISE NOTICE '  ✅ Abonnement : ACTIF (Premium Mensuel)';
  RAISE NOTICE '  🔓 Statut : Courses ILLIMITÉES';
  RAISE NOTICE '  📅 Expire le : %', CURRENT_DATE + INTERVAL '1 month';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Pour voir les détails, exécutez :';
  RAISE NOTICE '   SELECT * FROM get_driver_subscription_status(''%'');', v_driver_id;
  RAISE NOTICE '';
  RAISE NOTICE '🧹 Pour nettoyer, exécutez :';
  RAISE NOTICE '   DELETE FROM bookings WHERE driver_id = ''%'';', v_driver_id;
  RAISE NOTICE '   DELETE FROM driver_subscriptions WHERE driver_id = ''%'';', v_driver_id;
  RAISE NOTICE '   DELETE FROM drivers WHERE id = ''%'';', v_driver_id;
  RAISE NOTICE '   DELETE FROM clients WHERE id = ''%'';', v_client_id;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  
END $$;

-- 📊 Afficher le résultat final dans un tableau
SELECT 
  '🎯 RÉSULTAT FINAL' as "Info",
  *
FROM get_driver_subscription_status(
  (SELECT id FROM drivers WHERE email = 'demo.driver@tunidrive.test')
);

-- 📋 Détails du chauffeur
SELECT 
  '👤 DÉTAILS CHAUFFEUR' as "Info",
  id,
  first_name || ' ' || last_name as nom_complet,
  email,
  subscription_type,
  lifetime_accepted_bookings,
  has_used_free_trial
FROM drivers 
WHERE email = 'demo.driver@tunidrive.test';

-- 💳 Détails de l'abonnement
SELECT 
  '💳 DÉTAILS ABONNEMENT' as "Info",
  id,
  billing_period,
  total_price_tnd,
  payment_status,
  start_date,
  end_date
FROM driver_subscriptions
WHERE driver_id = (SELECT id FROM drivers WHERE email = 'demo.driver@tunidrive.test');

-- 🚗 Liste des courses
SELECT 
  '🚗 HISTORIQUE DES COURSES' as "Info",
  id,
  pickup_address,
  destination_address,
  price_tnd,
  status,
  created_at
FROM bookings
WHERE driver_id = (SELECT id FROM drivers WHERE email = 'demo.driver@tunidrive.test')
ORDER BY created_at;


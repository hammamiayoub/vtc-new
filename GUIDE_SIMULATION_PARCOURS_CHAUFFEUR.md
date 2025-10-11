# 🧪 Guide de Simulation - Parcours Complet Chauffeur

## 🎯 Objectif

Simuler le parcours complet d'un chauffeur :
1. ✅ 3 courses gratuites (lifetime)
2. 🔒 Blocage après la 3ème course
3. 💳 Souscription à l'abonnement premium
4. ✅ Validation par l'admin
5. 🚀 Courses illimitées

---

## 📋 Prérequis

Vous aurez besoin de :
- Un **chauffeur** (UUID du chauffeur)
- Un **client** (UUID du client)
- Accès SQL à Supabase (Dashboard ou CLI)

---

## 🚀 Étape 1 : Trouver ou Créer un Chauffeur Test

### Option A : Utiliser un chauffeur existant

```sql
-- Lister les chauffeurs existants
SELECT 
  id,
  first_name,
  last_name,
  email,
  lifetime_accepted_bookings,
  has_used_free_trial,
  subscription_type
FROM drivers
ORDER BY created_at DESC
LIMIT 5;
```

### Option B : Créer un chauffeur test

```sql
-- Créer un nouveau chauffeur test
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
  'Test',
  'Chauffeur',
  'test.chauffeur@example.com',
  '+216 12 345 678',
  'Tunis',
  'TEST123456',
  'active',
  'free',
  0,
  false
)
RETURNING id, email;
```

**💾 Notez l'UUID retourné** : `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

---

## 📝 Étape 2 : Trouver ou Créer un Client Test

```sql
-- Utiliser un client existant
SELECT id, first_name, last_name, email 
FROM clients 
ORDER BY created_at DESC 
LIMIT 1;

-- OU créer un client test
INSERT INTO clients (
  first_name,
  last_name,
  email,
  phone,
  city,
  status
) VALUES (
  'Test',
  'Client',
  'test.client@example.com',
  '+216 98 765 432',
  'Tunis',
  'active'
)
RETURNING id, email;
```

**💾 Notez l'UUID du client**

---

## 🎬 Étape 3 : Vérifier le Statut Initial

```sql
-- Remplacer UUID_DRIVER par l'UUID du chauffeur
SELECT * FROM get_driver_subscription_status('UUID_DRIVER');
```

**Résultat attendu** :
```
has_active_subscription: false
subscription_type: free
lifetime_accepted_bookings: 0
can_accept_more_bookings: true
remaining_free_bookings: 3
has_used_free_trial: false
subscription_end_date: NULL
```

---

## 🚗 Étape 4 : Créer et Accepter la 1ère Course

### Créer la réservation

```sql
-- Remplacer UUID_CLIENT et UUID_DRIVER
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
  'UUID_CLIENT',
  'UUID_DRIVER',
  'Aéroport Tunis-Carthage, Tunis',
  'Avenue Habib Bourguiba, Tunis',
  36.851033,
  10.227255,
  36.806495,
  10.181532,
  15.5,
  25.00,
  NOW() + INTERVAL '2 hours',
  'pending'
)
RETURNING id, status;
```

**💾 Notez l'UUID de la réservation**

### Accepter la réservation (DÉCLENCHE LE TRIGGER)

```sql
-- Remplacer UUID_BOOKING par l'UUID de la réservation
UPDATE bookings
SET status = 'accepted'
WHERE id = 'UUID_BOOKING';
```

### Vérifier le compteur

```sql
-- Vérifier que le compteur a été incrémenté
SELECT * FROM get_driver_subscription_status('UUID_DRIVER');
```

**Résultat attendu** :
```
lifetime_accepted_bookings: 1
remaining_free_bookings: 2
can_accept_more_bookings: true
```

✅ **1ère course acceptée !**

---

## 🚗🚗 Étape 5 : Accepter la 2ème Course

```sql
-- Créer la 2ème réservation
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
  'UUID_CLIENT',
  'UUID_DRIVER',
  'La Marsa, Tunis',
  'Sidi Bou Said, Tunis',
  36.878025,
  10.325461,
  36.868385,
  10.341213,
  5.2,
  12.00,
  NOW() + INTERVAL '3 hours',
  'pending'
)
RETURNING id;

-- Accepter immédiatement
UPDATE bookings
SET status = 'accepted'
WHERE id = 'UUID_BOOKING_2';

-- Vérifier
SELECT * FROM get_driver_subscription_status('UUID_DRIVER');
```

**Résultat attendu** :
```
lifetime_accepted_bookings: 2
remaining_free_bookings: 1
can_accept_more_bookings: true
```

✅ **2ème course acceptée !**

---

## 🚗🚗🚗 Étape 6 : Accepter la 3ème Course (Dernière Gratuite)

```sql
-- Créer la 3ème réservation
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
  'UUID_CLIENT',
  'UUID_DRIVER',
  'Carthage, Tunis',
  'Sousse',
  36.852936,
  10.323457,
  35.825546,
  10.634170,
  145.0,
  80.00,
  NOW() + INTERVAL '5 hours',
  'pending'
)
RETURNING id;

-- Accepter
UPDATE bookings
SET status = 'accepted'
WHERE id = 'UUID_BOOKING_3';

-- Vérifier
SELECT * FROM get_driver_subscription_status('UUID_DRIVER');
```

**Résultat attendu** :
```
lifetime_accepted_bookings: 3
remaining_free_bookings: 0
can_accept_more_bookings: false  ← BLOQUÉ !
has_used_free_trial: true
```

🔒 **Chauffeur maintenant BLOQUÉ !**

---

## 🔒 Étape 7 : Vérifier le Blocage

### Tester qu'on ne peut plus accepter

```sql
-- Créer une 4ème réservation
INSERT INTO bookings (
  client_id,
  driver_id,
  pickup_address,
  destination_address,
  distance_km,
  price_tnd,
  scheduled_time,
  status
) VALUES (
  'UUID_CLIENT',
  'UUID_DRIVER',
  'Tunis Centre',
  'Nabeul',
  55.0,
  40.00,
  NOW() + INTERVAL '1 day',
  'pending'
)
RETURNING id;

-- Essayer d'accepter (devrait être bloqué côté frontend)
-- Mais techniquement on peut toujours UPDATE en SQL
UPDATE bookings
SET status = 'accepted'
WHERE id = 'UUID_BOOKING_4';
```

**Note** : Le blocage est géré côté application (frontend), pas par contrainte SQL. Le compteur sera quand même incrémenté.

---

## 💳 Étape 8 : Créer une Demande d'Abonnement Premium

### Option A : Abonnement Mensuel

```sql
-- Créer une demande d'abonnement MENSUEL
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
  'UUID_DRIVER',
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
RETURNING id, total_price_tnd, end_date;
```

### Option B : Abonnement Annuel (10% de réduction)

```sql
-- Créer une demande d'abonnement ANNUEL
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
  'UUID_DRIVER',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  'premium',
  'yearly',
  324.00,  -- 30 * 12 * 0.9 (10% de réduction)
  19.00,
  385.56,   -- 324 * 1.19
  'pending',
  'active'
)
RETURNING id, total_price_tnd, end_date;
```

**💾 Notez l'UUID de la demande d'abonnement**

### Vérifier le statut (toujours bloqué)

```sql
SELECT * FROM get_driver_subscription_status('UUID_DRIVER');
```

**Résultat attendu** :
```
has_active_subscription: false  ← Toujours false (pending)
can_accept_more_bookings: false ← Toujours bloqué
```

---

## ✅ Étape 9 : Valider l'Abonnement (en tant qu'Admin)

```sql
-- Valider le paiement et activer l'abonnement
UPDATE driver_subscriptions
SET 
  payment_status = 'paid',
  payment_method = 'bank_transfer',
  payment_date = NOW(),
  payment_reference = 'TEST-REF-12345',
  updated_at = NOW()
WHERE id = 'UUID_SUBSCRIPTION';

-- Vérifier immédiatement
SELECT * FROM get_driver_subscription_status('UUID_DRIVER');
```

**Résultat attendu** :
```
has_active_subscription: true  ← ACTIVÉ !
subscription_type: premium
can_accept_more_bookings: true ← DÉBLOQUÉ !
remaining_free_bookings: 999
subscription_end_date: 2025-11-11 (ou dans 1 an)
```

🎉 **Abonnement Premium Activé !**

---

## 🚀 Étape 10 : Tester les Courses Illimitées

```sql
-- Créer et accepter plusieurs courses pour vérifier
DO $$
DECLARE
  i INT;
  booking_id UUID;
BEGIN
  FOR i IN 1..5 LOOP
    -- Créer une réservation
    INSERT INTO bookings (
      client_id,
      driver_id,
      pickup_address,
      destination_address,
      distance_km,
      price_tnd,
      scheduled_time,
      status
    ) VALUES (
      'UUID_CLIENT',
      'UUID_DRIVER',
      'Tunis ' || i,
      'Destination ' || i,
      10.0 + i,
      15.00 + (i * 5),
      NOW() + (i || ' hours')::INTERVAL,
      'pending'
    )
    RETURNING id INTO booking_id;
    
    -- Accepter immédiatement
    UPDATE bookings
    SET status = 'accepted'
    WHERE id = booking_id;
  END LOOP;
END $$;

-- Vérifier le compteur
SELECT * FROM get_driver_subscription_status('UUID_DRIVER');
```

**Résultat attendu** :
```
lifetime_accepted_bookings: 8 (3 gratuites + 5 premium)
can_accept_more_bookings: true ← Toujours true (illimité)
```

✅ **Le chauffeur peut maintenant accepter des courses illimitées !**

---

## 📊 Résumé Complet du Parcours

```sql
-- Vue d'ensemble finale
SELECT 
  d.first_name,
  d.last_name,
  d.email,
  d.subscription_type,
  d.lifetime_accepted_bookings,
  d.has_used_free_trial,
  ds.billing_period,
  ds.payment_status,
  ds.start_date,
  ds.end_date,
  ds.total_price_tnd,
  COUNT(b.id) as total_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'accepted') as accepted_bookings
FROM drivers d
LEFT JOIN driver_subscriptions ds ON d.id = ds.driver_id 
  AND ds.status = 'active' 
  AND ds.payment_status = 'paid'
LEFT JOIN bookings b ON d.id = b.driver_id
WHERE d.id = 'UUID_DRIVER'
GROUP BY d.id, d.first_name, d.last_name, d.email, d.subscription_type, 
         d.lifetime_accepted_bookings, d.has_used_free_trial, 
         ds.billing_period, ds.payment_status, ds.start_date, ds.end_date, ds.total_price_tnd;
```

---

## 🧹 Nettoyage (Optionnel)

Si vous voulez réinitialiser le chauffeur test :

```sql
-- Supprimer les réservations
DELETE FROM bookings WHERE driver_id = 'UUID_DRIVER';

-- Supprimer l'abonnement
DELETE FROM driver_subscriptions WHERE driver_id = 'UUID_DRIVER';

-- Réinitialiser le chauffeur
UPDATE drivers
SET 
  lifetime_accepted_bookings = 0,
  has_used_free_trial = false,
  subscription_type = 'free'
WHERE id = 'UUID_DRIVER';

-- Ou supprimer complètement
DELETE FROM drivers WHERE id = 'UUID_DRIVER';
```

---

## 🎯 Script Complet Automatisé

Voici un script SQL qui fait TOUT automatiquement :

```sql
-- Script de simulation complet
DO $$
DECLARE
  v_driver_id UUID;
  v_client_id UUID;
  v_booking_id UUID;
  v_subscription_id UUID;
  i INT;
BEGIN
  -- 1. Créer un chauffeur test
  INSERT INTO drivers (
    first_name, last_name, email, phone, city, 
    license_number, status, subscription_type, 
    lifetime_accepted_bookings, has_used_free_trial
  ) VALUES (
    'Simulation', 'Chauffeur', 'sim.driver@test.com', '+216 99 999 999', 'Tunis',
    'SIM123456', 'active', 'free', 0, false
  )
  RETURNING id INTO v_driver_id;
  
  RAISE NOTICE 'Chauffeur créé: %', v_driver_id;
  
  -- 2. Créer un client test
  INSERT INTO clients (
    first_name, last_name, email, phone, city, status
  ) VALUES (
    'Simulation', 'Client', 'sim.client@test.com', '+216 88 888 888', 'Tunis', 'active'
  )
  RETURNING id INTO v_client_id;
  
  RAISE NOTICE 'Client créé: %', v_client_id;
  
  -- 3. Accepter 3 courses gratuites
  FOR i IN 1..3 LOOP
    INSERT INTO bookings (
      client_id, driver_id, pickup_address, destination_address,
      distance_km, price_tnd, scheduled_time, status
    ) VALUES (
      v_client_id, v_driver_id, 
      'Pickup ' || i, 'Destination ' || i,
      10.0 + i, 15.00 + (i * 5), 
      NOW() + (i || ' hours')::INTERVAL, 
      'pending'
    )
    RETURNING id INTO v_booking_id;
    
    UPDATE bookings SET status = 'accepted' WHERE id = v_booking_id;
    
    RAISE NOTICE 'Course % acceptée', i;
  END LOOP;
  
  -- 4. Créer une demande d'abonnement
  INSERT INTO driver_subscriptions (
    driver_id, start_date, end_date, subscription_type,
    billing_period, price_tnd, vat_percentage, total_price_tnd,
    payment_status, status
  ) VALUES (
    v_driver_id, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month',
    'premium', 'monthly', 30.00, 19.00, 35.70, 'pending', 'active'
  )
  RETURNING id INTO v_subscription_id;
  
  RAISE NOTICE 'Abonnement créé: %', v_subscription_id;
  
  -- 5. Valider l'abonnement
  UPDATE driver_subscriptions
  SET payment_status = 'paid', payment_method = 'bank_transfer',
      payment_date = NOW(), payment_reference = 'AUTO-TEST'
  WHERE id = v_subscription_id;
  
  RAISE NOTICE 'Abonnement validé!';
  
  -- 6. Accepter 5 courses premium
  FOR i IN 4..8 LOOP
    INSERT INTO bookings (
      client_id, driver_id, pickup_address, destination_address,
      distance_km, price_tnd, scheduled_time, status
    ) VALUES (
      v_client_id, v_driver_id,
      'Pickup Premium ' || i, 'Destination Premium ' || i,
      10.0 + i, 15.00 + (i * 5),
      NOW() + (i || ' hours')::INTERVAL,
      'pending'
    )
    RETURNING id INTO v_booking_id;
    
    UPDATE bookings SET status = 'accepted' WHERE id = v_booking_id;
    
    RAISE NOTICE 'Course Premium % acceptée', i;
  END LOOP;
  
  -- Afficher le résumé
  RAISE NOTICE '=== RÉSUMÉ ===';
  RAISE NOTICE 'Driver ID: %', v_driver_id;
  RAISE NOTICE 'Client ID: %', v_client_id;
  RAISE NOTICE 'Subscription ID: %', v_subscription_id;
  
END $$;

-- Vérifier le résultat
SELECT 
  'Statut final' as info,
  *
FROM get_driver_subscription_status(
  (SELECT id FROM drivers WHERE email = 'sim.driver@test.com')
);
```

---

## ✅ Checklist de Validation

Après la simulation, vérifiez :

- [ ] Compteur lifetime = 8 (3 gratuites + 5 premium)
- [ ] has_used_free_trial = true
- [ ] has_active_subscription = true
- [ ] subscription_type = premium
- [ ] can_accept_more_bookings = true
- [ ] remaining_free_bookings = 999
- [ ] Date d'expiration correcte (dans 1 mois ou 1 an)
- [ ] Payment_status = 'paid'

---

**🎉 Simulation Complète du Parcours Chauffeur !**

Ce guide vous permet de tester tout le système d'abonnement de bout en bout. Vous pouvez l'utiliser pour :
- Tester les fonctionnalités
- Faire des démos
- Valider le comportement du système
- Former les administrateurs


# 🔄 Procédure de Réactivation - Renouvellement d'Abonnement

## 🎯 Quand utiliser cette procédure ?

- ✅ Chauffeur avec abonnement **expiré** qui souhaite renouveler
- ✅ Chauffeur avec abonnement **actif** qui souhaite renouveler à l'avance
- ✅ Chauffeur qui a utilisé ses **3 courses gratuites** et veut s'abonner
- ✅ Chauffeur qui veut **changer de type** (mensuel → annuel ou vice versa)

---

## 📋 Vue d'Ensemble du Processus

```
1. Chauffeur contacte l'admin
    ↓
2. Admin vérifie le statut du chauffeur
    ↓
3. Chauffeur effectue le paiement
    ↓
4. Admin vérifie le virement
    ↓
5. Admin crée/valide l'abonnement dans la base
    ↓
6. Chauffeur est automatiquement réactivé
    ↓
7. Admin confirme au chauffeur
```

---

## 🔍 ÉTAPE 1 : Identifier le Chauffeur

### Via l'AdminDashboard

1. **Connectez-vous** comme admin
2. **Onglet "Abonnements"** → Voir si une demande existe déjà
3. **Onglet "Chauffeurs"** → Trouver le chauffeur

### Via SQL

```sql
-- Rechercher le chauffeur par email
SELECT 
  id,
  first_name,
  last_name,
  email,
  phone,
  subscription_type,
  lifetime_accepted_bookings,
  has_used_free_trial
FROM drivers
WHERE email = 'chauffeur@email.com';
-- OU
WHERE phone = '+216 12 345 678';
-- OU  
WHERE first_name = 'Ahmed' AND last_name = 'Ben Ali';
```

**💾 Notez l'UUID du chauffeur** : `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

---

## 🔎 ÉTAPE 2 : Vérifier le Statut Actuel

```sql
-- Remplacer UUID_DRIVER par l'UUID du chauffeur
SELECT * FROM get_driver_subscription_status('UUID_DRIVER');
```

### Résultats Possibles

#### Scénario A : Compte Gratuit Épuisé
```
has_active_subscription: false
subscription_type: free
lifetime_accepted_bookings: 3
can_accept_more_bookings: false  ← BLOQUÉ
remaining_free_bookings: 0
has_used_free_trial: true
```

➡️ **Action** : Créer un nouvel abonnement (première souscription)

#### Scénario B : Abonnement Expiré
```
has_active_subscription: false
subscription_type: premium
lifetime_accepted_bookings: 47
can_accept_more_bookings: false  ← BLOQUÉ
subscription_end_date: 2025-10-15 (date passée)
```

➡️ **Action** : Créer un nouvel abonnement (renouvellement)

#### Scénario C : Abonnement Actif
```
has_active_subscription: true
subscription_type: premium
lifetime_accepted_bookings: 12
can_accept_more_bookings: true
subscription_end_date: 2025-12-15 (date future)
```

➡️ **Action** : Le chauffeur peut déjà accepter des courses (pas d'action nécessaire, sauf s'il veut renouveler à l'avance)

---

## 💰 ÉTAPE 3 : Réception du Paiement

### Informations à collecter du Chauffeur

1. **Type d'abonnement souhaité** :
   - 🔵 Mensuel : 35.70 TND
   - 🟣 Annuel : 385.56 TND (économie de 42.84 TND)

2. **Preuve de paiement** :
   - Capture d'écran du virement
   - OU Référence bancaire
   - OU Reçu bancaire

3. **Contact** :
   - Email
   - Téléphone (WhatsApp de préférence)

---

## ✅ ÉTAPE 4A : Créer un Nouvel Abonnement (SQL)

### Pour un Abonnement MENSUEL

```sql
-- ABONNEMENT MENSUEL - 35.70 TND
-- Remplacer UUID_DRIVER par l'UUID du chauffeur

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
  'UUID_DRIVER',
  CURRENT_DATE,                          -- Commence aujourd'hui
  CURRENT_DATE + INTERVAL '1 month',     -- Expire dans 1 mois
  'premium',
  'monthly',
  30.00,                                 -- Prix HT
  19.00,                                 -- TVA 19%
  35.70,                                 -- Prix TTC
  'paid',                                -- IMPORTANT: 'paid' pour activer immédiatement
  'bank_transfer',                       -- Méthode de paiement
  NOW(),                                 -- Date du paiement
  'VIREMENT-2025-11-15-001',            -- ⚠️ Remplacer par la vraie référence
  'active',                              -- IMPORTANT: 'active' pour activer
  'Renouvellement validé le ' || CURRENT_DATE::TEXT || '. Paiement vérifié.'
)
RETURNING 
  id as subscription_id,
  start_date,
  end_date,
  total_price_tnd;
```

### Pour un Abonnement ANNUEL (avec -10%)

```sql
-- ABONNEMENT ANNUEL - 385.56 TND (économie de 42.84 TND)
-- Remplacer UUID_DRIVER par l'UUID du chauffeur

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
  'UUID_DRIVER',
  CURRENT_DATE,                          -- Commence aujourd'hui
  CURRENT_DATE + INTERVAL '1 year',      -- Expire dans 1 an
  'premium',
  'yearly',
  324.00,                                -- Prix HT (30 * 12 * 0.9)
  19.00,                                 -- TVA 19%
  385.56,                                -- Prix TTC
  'paid',                                -- IMPORTANT: 'paid' pour activer immédiatement
  'bank_transfer',                       -- Méthode de paiement
  NOW(),                                 -- Date du paiement
  'VIREMENT-2025-11-15-002',            -- ⚠️ Remplacer par la vraie référence
  'active',                              -- IMPORTANT: 'active' pour activer
  'Abonnement annuel validé le ' || CURRENT_DATE::TEXT || '. Paiement vérifié. Économie: 42.84 TND'
)
RETURNING 
  id as subscription_id,
  start_date,
  end_date,
  total_price_tnd;
```

---

## ✅ ÉTAPE 4B : Valider un Abonnement Existant (en attente)

Si le chauffeur a déjà créé une demande via l'interface :

### Via l'AdminDashboard

1. **Onglet "Abonnements"**
2. **Chercher** l'abonnement avec statut "En attente" (🟠)
3. **Cliquer** sur 👁️ (œil) pour ouvrir les détails
4. **Copier** le script SQL affiché dans la section orange
5. **Ouvrir** Supabase SQL Editor
6. **Coller** le script
7. **Remplacer** `'REF-XXX'` par la vraie référence de paiement
8. **Exécuter** ✅

### Via SQL Directement

```sql
-- VALIDER UN ABONNEMENT EN ATTENTE
-- Remplacer UUID_SUBSCRIPTION par l'UUID de l'abonnement
-- Remplacer REF_PAIEMENT par la référence bancaire

UPDATE driver_subscriptions
SET 
  payment_status = 'paid',              -- Passe de 'pending' à 'paid'
  payment_method = 'bank_transfer',     -- Ou 'cash', 'card', etc.
  payment_date = NOW(),                 -- Date du paiement
  payment_reference = 'REF_PAIEMENT',   -- ⚠️ Référence bancaire réelle
  updated_at = NOW()
WHERE id = 'UUID_SUBSCRIPTION'
  AND payment_status = 'pending';       -- Sécurité: seulement si pending

-- Vérifier immédiatement
SELECT 
  id,
  payment_status,
  payment_date,
  start_date,
  end_date
FROM driver_subscriptions
WHERE id = 'UUID_SUBSCRIPTION';
```

---

## 🔍 ÉTAPE 5 : Vérifier la Réactivation

### Vérifier que le Chauffeur est Débloqué

```sql
-- Remplacer UUID_DRIVER
SELECT * FROM get_driver_subscription_status('UUID_DRIVER');
```

**Résultat attendu** :
```
has_active_subscription: true        ← ✅ ACTIVÉ
subscription_type: premium
can_accept_more_bookings: true      ← ✅ DÉBLOQUÉ
remaining_free_bookings: 999        ← Illimité
subscription_end_date: 2025-12-15   ← Date future
```

### Vérifier l'Abonnement dans la Base

```sql
-- Voir les détails de l'abonnement
SELECT 
  id,
  driver_id,
  billing_period,
  start_date,
  end_date,
  total_price_tnd,
  payment_status,
  status,
  CURRENT_DATE as today,
  end_date - CURRENT_DATE as jours_restants
FROM driver_subscriptions
WHERE driver_id = 'UUID_DRIVER'
  AND status = 'active'
  AND payment_status = 'paid'
ORDER BY created_at DESC
LIMIT 1;
```

**Résultat attendu** :
```
payment_status: paid
status: active
jours_restants: 30 (mensuel) ou 365 (annuel)
```

---

## 📧 ÉTAPE 6 : Confirmer au Chauffeur

### Message de Confirmation (WhatsApp)

**Pour Mensuel** :
```
✅ Votre abonnement Premium MENSUEL a été activé avec succès !

📅 Période : Du [DATE_DEBUT] au [DATE_FIN]
💰 Montant reçu : 35.70 TND
🚗 Statut : Courses ILLIMITÉES ✓

Vous pouvez maintenant accepter toutes les courses que vous souhaitez pendant 1 mois.

Votre abonnement expirera automatiquement le [DATE_FIN]. Pensez à renouveler avant cette date.

Merci pour votre confiance ! 🎉
Bonne route avec TuniDrive 🚕
```

**Pour Annuel** :
```
✅ Votre abonnement Premium ANNUEL a été activé avec succès !

📅 Période : Du [DATE_DEBUT] au [DATE_FIN]
💰 Montant reçu : 385.56 TND
🎉 Économie réalisée : 42.84 TND vs mensuel
🚗 Statut : Courses ILLIMITÉES pendant 1 AN ✓

Vous pouvez maintenant accepter toutes les courses que vous souhaitez pendant 12 mois.

Votre abonnement expirera automatiquement le [DATE_FIN].

Merci pour votre confiance ! 🎉
Bonne route avec TuniDrive 🚕
```

### Email de Confirmation

```
Objet : ✅ Abonnement Premium Activé - TuniDrive

Bonjour [Prénom] [Nom],

Nous avons bien reçu votre paiement et votre abonnement Premium a été activé avec succès.

DÉTAILS DE VOTRE ABONNEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━
Type : Premium [Mensuel/Annuel]
Montant payé : [MONTANT] TND TTC
Date d'activation : [DATE_DEBUT]
Valable jusqu'au : [DATE_FIN]
Référence : [REF_PAIEMENT]

[Si annuel]
💰 Économie réalisée : 42.84 TND
   (vs 12 mois d'abonnement mensuel)

VOTRE ACCÈS
━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Courses illimitées activées
✅ Priorité sur les réservations
✅ Support prioritaire

RENOUVELLEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━
Votre abonnement expirera le [DATE_FIN].
Nous vous enverrons un rappel 7 jours avant l'expiration.

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
L'équipe TuniDrive

📧 support@tunidrive.net
📱 WhatsApp : +216 28 528 477
🌐 www.tunidrive.net
```

---

## 🎬 PROCÉDURE COMPLÈTE DÉTAILLÉE

### CAS 1 : Premier Abonnement (après 3 courses gratuites)

#### Contexte
Chauffeur a épuisé ses 3 courses gratuites et contacte pour s'abonner.

#### Étapes

**1️⃣ Vérifier le statut du chauffeur**
```sql
SELECT * FROM get_driver_subscription_status('UUID_DRIVER');
-- Vérifier : has_used_free_trial = true
-- Vérifier : can_accept_more_bookings = false
```

**2️⃣ Chauffeur choisit le type et paie**
- Mensuel : 35.70 TND
- Annuel : 385.56 TND

**3️⃣ Vérifier le virement bancaire**
- Montant correct ✓
- Compte TuniDrive ✓
- Référence/Note présente ✓

**4️⃣ Créer l'abonnement**

**Pour MENSUEL** :
```sql
INSERT INTO driver_subscriptions (
  driver_id, start_date, end_date, subscription_type,
  billing_period, price_tnd, vat_percentage, total_price_tnd,
  payment_status, payment_method, payment_date, payment_reference,
  status, admin_notes
) VALUES (
  'UUID_DRIVER',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 month',
  'premium', 'monthly', 30.00, 19.00, 35.70,
  'paid', 'bank_transfer', NOW(), 'VOTRE-REF-BANCAIRE',
  'active', 
  'Premier abonnement validé le ' || CURRENT_DATE::TEXT
)
RETURNING id, end_date;
```

**Pour ANNUEL** :
```sql
INSERT INTO driver_subscriptions (
  driver_id, start_date, end_date, subscription_type,
  billing_period, price_tnd, vat_percentage, total_price_tnd,
  payment_status, payment_method, payment_date, payment_reference,
  status, admin_notes
) VALUES (
  'UUID_DRIVER',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  'premium', 'yearly', 324.00, 19.00, 385.56,
  'paid', 'bank_transfer', NOW(), 'VOTRE-REF-BANCAIRE',
  'active',
  'Premier abonnement ANNUEL validé le ' || CURRENT_DATE::TEXT || ' - Économie: 42.84 TND'
)
RETURNING id, end_date;
```

**5️⃣ Vérifier la réactivation**
```sql
SELECT * FROM get_driver_subscription_status('UUID_DRIVER');
-- Vérifier : has_active_subscription = true
-- Vérifier : can_accept_more_bookings = true
```

**6️⃣ Envoyer la confirmation** (voir modèles ci-dessus)

---

### CAS 2 : Renouvellement d'un Abonnement Expiré

#### Contexte
Chauffeur avait un abonnement qui a expiré, il veut renouveler.

#### Étapes

**1️⃣ Identifier l'ancien abonnement**
```sql
-- Voir l'historique des abonnements du chauffeur
SELECT 
  id,
  billing_period,
  start_date,
  end_date,
  payment_status,
  status,
  end_date - CURRENT_DATE as jours_restants
FROM driver_subscriptions
WHERE driver_id = 'UUID_DRIVER'
ORDER BY created_at DESC;
```

**2️⃣ Vérifier que le chauffeur est bloqué**
```sql
SELECT * FROM get_driver_subscription_status('UUID_DRIVER');
-- can_accept_more_bookings devrait être false
```

**3️⃣ Créer le nouvel abonnement**

Utiliser les mêmes scripts que CAS 1 (mensuel ou annuel).

**Option** : Vous pouvez aussi faire expirer l'ancien explicitement :
```sql
-- Marquer l'ancien comme expiré (optionnel, se fait automatiquement)
UPDATE driver_subscriptions
SET status = 'expired'
WHERE driver_id = 'UUID_DRIVER'
  AND status = 'active'
  AND end_date < CURRENT_DATE;
```

**4️⃣ Vérifier et confirmer** (mêmes étapes que CAS 1)

---

### CAS 3 : Renouvellement Anticipé (avant expiration)

#### Contexte
Chauffeur a un abonnement actif mais veut renouveler à l'avance.

#### Option A : Prolonger l'Abonnement Existant

**⚠️ Pas recommandé** car complique la gestion.

#### Option B : Créer un Nouvel Abonnement (Recommandé)

**1️⃣ Laisser l'ancien expirer normalement**
```sql
-- L'ancien abonnement
SELECT id, end_date 
FROM driver_subscriptions
WHERE driver_id = 'UUID_DRIVER'
  AND status = 'active'
  AND payment_status = 'paid'
ORDER BY end_date DESC
LIMIT 1;
-- end_date = 2025-12-01 par exemple
```

**2️⃣ Créer le nouveau avec start_date = date de fin de l'ancien**
```sql
-- RENOUVELLEMENT ANTICIPÉ
-- Le nouveau commence APRÈS l'ancien

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
  'UUID_DRIVER',
  '2025-12-01',                         -- ⚠️ = end_date de l'ancien abonnement
  '2025-12-01'::DATE + INTERVAL '1 month', -- OU '1 year' pour annuel
  'premium',
  'monthly',                            -- OU 'yearly'
  30.00,                                -- OU 324.00 pour annuel
  19.00,
  35.70,                                -- OU 385.56 pour annuel
  'paid',
  'bank_transfer',
  NOW(),
  'VOTRE-REF-BANCAIRE',
  'active',
  'Renouvellement anticipé. Commence après expiration de l''abonnement précédent.'
)
RETURNING id, start_date, end_date;
```

**Avantage** : Pas de perte de jours, le nouveau commence pile quand l'ancien se termine.

---

### CAS 4 : Changement de Type (Mensuel → Annuel)

#### Contexte
Chauffeur a un mensuel actif mais veut passer à l'annuel.

**1️⃣ Calculer le crédit restant** (optionnel)
```sql
-- Voir combien de jours il reste sur le mensuel
SELECT 
  id,
  end_date,
  end_date - CURRENT_DATE as jours_restants,
  (end_date - CURRENT_DATE) * (35.70 / 30.0) as credit_prorata
FROM driver_subscriptions
WHERE driver_id = 'UUID_DRIVER'
  AND status = 'active'
  AND payment_status = 'paid';
```

**2️⃣ Option simple : Créer l'annuel pour plus tard**

Créer le nouveau abonnement annuel qui commencera quand le mensuel expire (voir CAS 3).

**3️⃣ Option avec remboursement** :

```sql
-- Annuler le mensuel
UPDATE driver_subscriptions
SET 
  status = 'cancelled',
  end_date = CURRENT_DATE,
  admin_notes = 'Annulé pour passage à abonnement annuel. Crédit: X TND'
WHERE id = 'UUID_MENSUEL';

-- Créer le nouvel annuel avec réduction du crédit
INSERT INTO driver_subscriptions (...)
VALUES (
  ...,
  price_tnd = 324.00 - [CREDIT_RESTANT],  -- Déduire le crédit
  admin_notes = 'Upgrade de mensuel à annuel. Crédit déduit: X TND'
);
```

---

## 📊 ÉTAPE 7 : Mettre à Jour le Chauffeur (si nécessaire)

En principe, ce n'est **PAS nécessaire** car `get_driver_subscription_status()` vérifie automatiquement.

Mais vous pouvez mettre à jour explicitement :

```sql
-- Mettre à jour le type d'abonnement du chauffeur
UPDATE drivers
SET subscription_type = 'premium'
WHERE id = 'UUID_DRIVER';
```

**Note** : La fonction `get_driver_subscription_status()` vérifie dans `driver_subscriptions`, donc ce champ est optionnel.

---

## 🔄 Scénario Complet Type

### Exemple : Renouvellement Mensuel

**Situation** :
- Chauffeur : Ahmed Ben Ali
- Email : ahmed.ben@tunidrive.net
- Ancien abonnement : Expiré le 15/10/2025
- Souhaite : Renouveler mensuel
- Paiement : 35.70 TND reçu le 15/11/2025

**Actions** :

```sql
-- 1. Vérifier le chauffeur
SELECT id, email, lifetime_accepted_bookings
FROM drivers 
WHERE email = 'ahmed.ben@tunidrive.net';
-- Résultat: id = abc-123-def

-- 2. Vérifier son statut
SELECT * FROM get_driver_subscription_status('abc-123-def');
-- can_accept_more_bookings = false (bloqué)

-- 3. Créer le nouvel abonnement mensuel
INSERT INTO driver_subscriptions (
  driver_id, start_date, end_date, subscription_type,
  billing_period, price_tnd, vat_percentage, total_price_tnd,
  payment_status, payment_method, payment_date, payment_reference,
  status, admin_notes
) VALUES (
  'abc-123-def',
  '2025-11-15',
  '2025-12-15',
  'premium', 'monthly', 30.00, 19.00, 35.70,
  'paid', 'bank_transfer', '2025-11-15', 'VIR-2025-11-15-AHMED',
  'active',
  'Renouvellement validé le 15/11/2025'
)
RETURNING id, end_date;
-- Résultat: subscription_id = xyz-456-uvw, end_date = 2025-12-15

-- 4. Vérifier la réactivation
SELECT * FROM get_driver_subscription_status('abc-123-def');
-- has_active_subscription = true ✓
-- can_accept_more_bookings = true ✓
-- subscription_end_date = 2025-12-15 ✓

-- 5. Envoyer WhatsApp de confirmation
```

**✅ Chauffeur réactivé avec succès !**

---

## ⚡ Script Rapide (Copier-Coller)

### Template Mensuel

```sql
-- ════════════════════════════════════════════════════════════
-- SCRIPT DE RENOUVELLEMENT MENSUEL
-- À personnaliser avant exécution !
-- ════════════════════════════════════════════════════════════

-- ⚠️ REMPLACER CES VALEURS :
-- UUID_DRIVER → ID du chauffeur
-- VOTRE-REF-BANCAIRE → Référence du virement

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
  'UUID_DRIVER',                         -- ⚠️ À REMPLACER
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 month',
  'premium',
  'monthly',
  30.00,
  19.00,
  35.70,
  'paid',
  'bank_transfer',
  NOW(),
  'VOTRE-REF-BANCAIRE',                 -- ⚠️ À REMPLACER
  'active',
  'Abonnement validé le ' || CURRENT_DATE::TEXT
)
RETURNING 
  id as subscription_id,
  start_date,
  end_date,
  total_price_tnd;

-- Vérifier immédiatement
SELECT * FROM get_driver_subscription_status('UUID_DRIVER'); -- ⚠️ À REMPLACER
```

### Template Annuel

```sql
-- ════════════════════════════════════════════════════════════
-- SCRIPT DE RENOUVELLEMENT ANNUEL (-10%)
-- À personnaliser avant exécution !
-- ════════════════════════════════════════════════════════════

-- ⚠️ REMPLACER CES VALEURS :
-- UUID_DRIVER → ID du chauffeur
-- VOTRE-REF-BANCAIRE → Référence du virement

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
  'UUID_DRIVER',                         -- ⚠️ À REMPLACER
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  'premium',
  'yearly',
  324.00,
  19.00,
  385.56,
  'paid',
  'bank_transfer',
  NOW(),
  'VOTRE-REF-BANCAIRE',                 -- ⚠️ À REMPLACER
  'active',
  'Abonnement ANNUEL validé le ' || CURRENT_DATE::TEXT || ' - Économie: 42.84 TND'
)
RETURNING 
  id as subscription_id,
  start_date,
  end_date,
  total_price_tnd;

-- Vérifier immédiatement
SELECT * FROM get_driver_subscription_status('UUID_DRIVER'); -- ⚠️ À REMPLACER
```

---

## ✅ Checklist de Validation

Avant d'exécuter le script SQL :

- [ ] UUID du chauffeur vérifié
- [ ] Type d'abonnement confirmé (mensuel/annuel)
- [ ] Montant correct reçu (35.70 ou 385.56 TND)
- [ ] Virement vérifié dans le compte bancaire
- [ ] Référence bancaire notée
- [ ] Date de début définie (généralement CURRENT_DATE)
- [ ] Script SQL préparé avec les bonnes valeurs

Après exécution du script :

- [ ] `subscription_id` retourné (noter pour suivi)
- [ ] `has_active_subscription = true`
- [ ] `can_accept_more_bookings = true`
- [ ] Date d'expiration correcte (dans 1 mois ou 1 an)
- [ ] Chauffeur informé par WhatsApp/Email
- [ ] Note ajoutée dans admin_notes si nécessaire

---

## 🆘 Résolution de Problèmes

### Problème : Le Chauffeur est Toujours Bloqué

**Vérifications** :
```sql
-- 1. L'abonnement existe et est actif ?
SELECT * FROM driver_subscriptions
WHERE driver_id = 'UUID_DRIVER'
  AND status = 'active'
  AND payment_status = 'paid';

-- 2. La date de fin est bien dans le futur ?
SELECT end_date, end_date >= CURRENT_DATE as est_valide
FROM driver_subscriptions
WHERE id = 'UUID_SUBSCRIPTION';

-- 3. Le statut retourné par la fonction
SELECT * FROM get_driver_subscription_status('UUID_DRIVER');
```

**Solutions** :
- Si `end_date` est passée → Créer un nouvel abonnement avec dates correctes
- Si `payment_status` n'est pas 'paid' → UPDATE à 'paid'
- Si `status` n'est pas 'active' → UPDATE à 'active'

### Problème : Deux Abonnements Actifs en Même Temps

**Situation** : Vous avez créé un abonnement alors qu'un ancien existe encore.

**Solution** :
```sql
-- Voir tous les abonnements actifs du chauffeur
SELECT id, start_date, end_date, billing_period, payment_status, status
FROM driver_subscriptions
WHERE driver_id = 'UUID_DRIVER'
  AND status = 'active'
ORDER BY created_at DESC;

-- Annuler le mauvais
UPDATE driver_subscriptions
SET status = 'cancelled'
WHERE id = 'UUID_MAUVAIS_ABONNEMENT';
```

### Problème : Mauvaise Date de Fin

**Situation** : Vous avez mis la mauvaise durée.

**Solution** :
```sql
-- Corriger la date de fin
UPDATE driver_subscriptions
SET 
  end_date = start_date + INTERVAL '1 month',  -- OU '1 year'
  updated_at = NOW()
WHERE id = 'UUID_SUBSCRIPTION';
```

---

## 📊 Requêtes de Suivi

### Voir tous les renouvellements du mois

```sql
SELECT 
  d.first_name || ' ' || d.last_name as chauffeur,
  ds.billing_period,
  ds.total_price_tnd,
  ds.payment_date,
  ds.end_date
FROM driver_subscriptions ds
JOIN drivers d ON ds.driver_id = d.id
WHERE ds.payment_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND ds.payment_status = 'paid'
ORDER BY ds.payment_date DESC;
```

### Statistiques mensuelles

```sql
SELECT 
  DATE_TRUNC('month', payment_date)::DATE as mois,
  COUNT(*) as nombre_abonnements,
  COUNT(*) FILTER (WHERE billing_period = 'monthly') as mensuels,
  COUNT(*) FILTER (WHERE billing_period = 'yearly') as annuels,
  SUM(total_price_tnd) as revenus_total
FROM driver_subscriptions
WHERE payment_status = 'paid'
  AND payment_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', payment_date)
ORDER BY mois DESC;
```

---

## 📝 Modèle de Notes Administratives

Bonnes pratiques pour `admin_notes` :

```sql
-- Lors de la création
'Abonnement validé le [DATE]. Paiement vérifié. Réf: [REF]'

-- Renouvellement
'Renouvellement mensuel validé le [DATE]. Client fidèle depuis [DATE_PREMIERE_SOUSCRIPTION]'

-- Annuel
'Abonnement ANNUEL validé le [DATE]. Économie: 42.84 TND. Expire: [DATE_FIN]'

-- Renouvellement anticipé
'Renouvellement anticipé. Ancien abonnement expire le [DATE]. Nouveau commence le [DATE]'

-- Problème résolu
'Paiement initialement manquant. Retrouvé le [DATE] avec référence [REF]. Validé.'
```

---

## 🎯 Résumé en 5 Étapes

### Pour un Renouvellement Standard

```
1️⃣ Identifier le chauffeur (email/téléphone)
    ↓
2️⃣ Vérifier le virement bancaire (montant + référence)
    ↓
3️⃣ Exécuter le script SQL (mensuel OU annuel)
    ↓
4️⃣ Vérifier que can_accept_more_bookings = true
    ↓
5️⃣ Envoyer la confirmation au chauffeur
```

**Durée estimée** : 2-3 minutes par abonnement

---

## 💡 Conseils

### Bonnes Pratiques

- ✅ Toujours noter la référence de paiement
- ✅ Vérifier le montant exact (35.70 ou 385.56)
- ✅ Tester avec `get_driver_subscription_status()` après validation
- ✅ Envoyer la confirmation au chauffeur
- ✅ Garder une trace dans `admin_notes`

### À Éviter

- ❌ Ne pas créer plusieurs abonnements actifs en même temps
- ❌ Ne pas oublier de mettre `payment_status = 'paid'`
- ❌ Ne pas oublier de mettre `status = 'active'`
- ❌ Ne pas valider sans vérifier le virement
- ❌ Ne pas oublier la date de fin (importante !)

---

## 📞 Support

Questions ou problèmes ?
- Documentation : Ce guide
- Guide admin : `GUIDE_ADMIN_GESTION_ABONNEMENTS.md`
- Support : support@tunidrive.net

---

**✅ Procédure Complète de Réactivation Documentée !**

Utilisez les scripts templates fournis en remplaçant les valeurs marquées ⚠️ et suivez les étapes pour chaque type de renouvellement.

**Temps moyen** : 2-3 minutes par validation  
**Efficacité** : 100% si vous suivez la checklist


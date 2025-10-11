# 🔄 Processus d'Activation d'un Abonnement Premium

## 📋 Vue d'ensemble

L'activation d'un abonnement Premium est un **processus manuel en 2 étapes** qui nécessite l'intervention d'un administrateur pour valider le paiement.

---

## 🎯 Workflow Complet

### Étape 1️⃣ : Le Chauffeur (côté Frontend)

1. **Accède à l'onglet "Abonnement"** dans son tableau de bord
2. **Clique sur "Souscrire à l'abonnement Premium"**
3. Le système crée automatiquement une demande dans la base :
   ```
   Table: driver_subscriptions
   - payment_status: 'pending'
   - status: 'active'
   - driver_id: [ID du chauffeur]
   ```
4. **Consulte les informations de paiement** affichées
5. **Effectue le paiement** (virement ou mandat minute de 47.60 TND)
6. **Contacte le support** via WhatsApp ou Email avec :
   - Sa référence : `ABONNEMENT-[ID]`
   - Le numéro de référence du paiement
   - La preuve de paiement

### Étape 2️⃣ : L'Administrateur (côté Backend)

#### A. Vérification du Paiement

1. **Reçoit la demande** du chauffeur (par WhatsApp/Email)
2. **Vérifie le paiement** :
   - Consulte le relevé bancaire ou le registre des mandats
   - Valide que le montant est correct (47.60 TND)
   - Note la référence du paiement

#### B. Activation dans la Base de Données

**Connexion** : Dashboard Supabase → SQL Editor

**Requête SQL à exécuter** :

```sql
-- ÉTAPE 1 : Trouver la demande du chauffeur
SELECT 
  ds.id,
  ds.driver_id,
  d.first_name,
  d.last_name,
  d.email,
  ds.created_at,
  ds.payment_status
FROM driver_subscriptions ds
JOIN drivers d ON d.id = ds.driver_id
WHERE d.email = 'email-du-chauffeur@example.com'  -- Remplacer par l'email
  OR d.phone = '+216XXXXXXXX'                      -- Ou par le téléphone
  OR ds.driver_id = 'uuid-du-chauffeur'            -- Ou par l'ID
ORDER BY ds.created_at DESC
LIMIT 1;
```

**ÉTAPE 2 : Valider le paiement et activer Premium**

```sql
-- Remplacer les valeurs suivantes :
-- - 'UUID_DU_CHAUFFEUR' : l'ID du chauffeur (de la requête précédente)
-- - 'REFERENCE_DU_VIREMENT' : le numéro de référence du paiement fourni par le chauffeur
-- - 'bank_transfer' : ou 'cash_order' selon la méthode

-- 1. Marquer le paiement comme reçu
UPDATE driver_subscriptions
SET 
  payment_status = 'paid',
  payment_date = NOW(),
  payment_reference = 'REFERENCE_DU_VIREMENT',
  payment_method = 'bank_transfer',
  admin_notes = 'Paiement validé manuellement'
WHERE 
  driver_id = 'UUID_DU_CHAUFFEUR'
  AND payment_status = 'pending'
  AND status = 'active';

-- 2. Activer le compte Premium du chauffeur
UPDATE drivers
SET subscription_type = 'premium'
WHERE id = 'UUID_DU_CHAUFFEUR';

-- 3. Vérification finale
SELECT 
  d.first_name,
  d.last_name,
  d.subscription_type,
  d.monthly_accepted_bookings,
  ds.payment_status,
  ds.payment_date,
  ds.end_date
FROM drivers d
LEFT JOIN driver_subscriptions ds ON ds.driver_id = d.id AND ds.status = 'active'
WHERE d.id = 'UUID_DU_CHAUFFEUR';
```

**Résultat attendu** :
```
subscription_type: 'premium'
payment_status: 'paid'
payment_date: [date du jour]
```

---

## ⚡ Activation Immédiate

Dès que les 2 requêtes SQL sont exécutées, le chauffeur est **immédiatement actif** :

✅ Son compte passe en Premium  
✅ Il peut accepter des courses illimitées  
✅ Il apparaît dans les recherches (même s'il était à 2/2)  
✅ Le compteur continue mais n'a plus de limite  

**Aucun redémarrage ou action supplémentaire n'est nécessaire !**

---

## 🔍 Vérification Côté Chauffeur

Le chauffeur peut vérifier l'activation :

1. **Rafraîchir la page** de son tableau de bord
2. **Aller dans l'onglet "Abonnement"**
3. Il devrait voir :
   ```
   ┌───────────────────────────────────┐
   │ 🌟 Abonnement Premium      [Actif]│
   │ Courses illimitées                │
   │                                   │
   │ Courses acceptées ce mois: X      │
   └───────────────────────────────────┘
   ```
   (Fond orange/doré au lieu de gris)

---

## 📧 Communication avec le Chauffeur

### Email de Confirmation (Optionnel mais Recommandé)

```
De : support@tunidrive.net
À : [email du chauffeur]
Objet : ✅ Votre abonnement Premium est activé !

Bonjour [Prénom] [Nom],

Bonne nouvelle ! Nous avons bien reçu votre paiement de 47.60 TND.

🎉 Votre abonnement Premium est maintenant ACTIF !

✅ Courses illimitées
✅ Priorité sur les réservations
✅ Support prioritaire
✅ Valable jusqu'au [date_fin]

Référence de paiement : [ref]

Vous pouvez maintenant accepter autant de courses que vous le souhaitez.

Connectez-vous à votre tableau de bord pour commencer :
https://votresite.com/driver-login

Bon travail sur TuniDrive !

L'équipe TuniDrive
```

---

## 🚨 Cas Particuliers

### Cas 1 : Chauffeur qui a Déjà 2/2 Courses

**Question** : Si un chauffeur gratuit a déjà accepté 2 courses, que se passe-t-il quand il passe Premium ?

**Réponse** :
```sql
-- Avant activation
subscription_type: 'free'
monthly_accepted_bookings: 2
can_accept_more_bookings: FALSE  ❌

-- Après activation (exécution de UPDATE drivers SET subscription_type = 'premium')
subscription_type: 'premium'
monthly_accepted_bookings: 2  (inchangé)
can_accept_more_bookings: TRUE  ✅
```

✅ Le chauffeur peut **immédiatement** accepter de nouvelles courses  
✅ Le compteur reste à 2 mais n'a plus de limite  
✅ Il réapparaît dans les recherches client  

### Cas 2 : Paiement Reçu mais Référence Incorrecte

Si la référence fournie ne correspond pas :

```sql
-- Rechercher par date et montant
SELECT * FROM driver_subscriptions
WHERE payment_status = 'pending'
  AND DATE(created_at) = '2025-10-10'  -- Date approximative
  AND total_price_tnd = 47.60
ORDER BY created_at DESC;
```

### Cas 3 : Double Demande

Si un chauffeur a créé plusieurs demandes par erreur :

```sql
-- Voir toutes les demandes d'un chauffeur
SELECT * FROM driver_subscriptions
WHERE driver_id = 'UUID_DU_CHAUFFEUR'
ORDER BY created_at DESC;

-- Annuler les demandes en double
UPDATE driver_subscriptions
SET status = 'cancelled'
WHERE id = 'UUID_DE_LA_DEMANDE_EN_TROP';

-- Valider uniquement la bonne demande
-- (suivre le processus normal)
```

---

## ⏱️ Délai d'Activation

| Étape | Délai |
|-------|-------|
| Création demande par chauffeur | Instantané |
| Paiement effectué | Immédiat |
| Contact support | 0-24h (selon disponibilité) |
| **Validation admin** | **Variable** (selon charge admin) |
| Activation technique | **Instantané** après validation |

**Délai total annoncé au chauffeur** : Sous 24h ouvrables  
**Délai technique réel** : Quelques secondes après validation SQL

---

## 🔮 Amélioration Future (Automatisation)

Pour automatiser le processus, vous pourriez implémenter :

### Option 1 : Paiement en Ligne (Stripe, PayPal, etc.)
```
Chauffeur paie → API de paiement valide → Webhook → Activation automatique
```

### Option 2 : Scan de Reçu avec OCR
```
Chauffeur upload reçu → OCR lit la référence → Admin valide en 1 clic
```

### Option 3 : API Bancaire
```
Virement reçu → API bancaire notifie → Matching automatique → Activation
```

**Pour l'instant** : Le système manuel fonctionne bien et permet un contrôle total.

---

## 📝 Checklist Admin pour Validation

- [ ] Paiement reçu et vérifié (47.60 TND)
- [ ] Référence de paiement notée
- [ ] Requête SQL ÉTAPE 1 exécutée (UPDATE driver_subscriptions)
- [ ] Requête SQL ÉTAPE 2 exécutée (UPDATE drivers)
- [ ] Vérification effectuée (SELECT pour confirmer)
- [ ] Email de confirmation envoyé au chauffeur (optionnel)
- [ ] Dossier/ticket fermé

---

## 🎯 Résumé Simple

**Question** : Comment activer un abonnement après paiement ?

**Réponse Courte** :
1. Admin se connecte à Supabase
2. Exécute 2 requêtes SQL (voir ci-dessus)
3. C'est tout ! Le chauffeur est actif immédiatement ✅

**Pas besoin de** :
- ❌ Redémarrer l'application
- ❌ Relogger le chauffeur
- ❌ Attendre un cron job
- ❌ Effectuer d'autres actions

**Le changement est instantané !**

---

## 📞 Support

Si vous avez besoin d'aide pour la première validation :
- Consultez `GUIDE_ADMIN_ABONNEMENTS.md` pour les requêtes SQL complètes
- Les requêtes sont prêtes à copier-coller (remplacer juste les UUID)

---

**Date** : 10 Octobre 2025  
**Version** : 1.0  
**Type** : Guide Admin


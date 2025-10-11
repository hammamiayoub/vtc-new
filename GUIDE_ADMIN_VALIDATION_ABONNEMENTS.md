# 🔐 Guide Admin - Validation des Abonnements

## 📋 Vue d'ensemble

Ce guide explique comment valider les demandes d'abonnement Premium des chauffeurs (mensuel ou annuel).

---

## 🎯 Processus de Validation

### Étape 1 : Réception de la Demande

Le chauffeur vous contacte par :
- **WhatsApp** : +216 28 528 477
- **Email** : support@tunidrive.net

Message type reçu :
```
Bonjour, je souhaite valider mon abonnement Premium MENSUEL/ANNUEL.

Référence : ABONNEMENT-A1B2C3D4

J'ai effectué le paiement de XX.XX TND.
```

### Étape 2 : Vérifier le Paiement

1. **Vérifier le virement bancaire**
   - Connectez-vous au compte bancaire TuniDrive
   - Recherchez le virement avec la référence : `ABONNEMENT-[ID]`
   - Vérifiez le montant :
     - **Mensuel** : 35.70 TND TTC
     - **Annuel** : 385.56 TND TTC

2. **Demander la preuve de paiement** (si nécessaire)
   - Capture d'écran du virement
   - Reçu bancaire
   - Référence de transaction

### Étape 3 : Validation dans Supabase

#### Via l'interface Supabase Dashboard

1. **Connexion**
   - Allez sur [https://supabase.com](https://supabase.com)
   - Connectez-vous au projet TuniDrive
   - Sélectionnez "Table Editor"

2. **Accéder à la table `driver_subscriptions`**
   ```
   Table Editor > driver_subscriptions
   ```

3. **Trouver la demande**
   - Filtrer par `driver_id` (extraire de la référence)
   - Ou filtrer par `payment_status = 'pending'`
   - Identifier la bonne ligne avec la date récente

4. **Valider l'abonnement**
   - Cliquer sur la ligne à modifier
   - Mettre à jour les champs suivants :
     ```
     payment_status: 'paid'
     payment_method: 'bank_transfer'
     payment_date: [Date actuelle]
     payment_reference: [Référence du virement bancaire]
     status: 'active'
     ```
   - Sauvegarder

#### Via SQL (alternative)

```sql
-- Valider un abonnement
UPDATE driver_subscriptions
SET 
  payment_status = 'paid',
  payment_method = 'bank_transfer',
  payment_date = NOW(),
  payment_reference = 'REF_VIREMENT_123456',
  status = 'active',
  updated_at = NOW()
WHERE 
  driver_id = 'UUID_DU_CHAUFFEUR'
  AND payment_status = 'pending'
  AND status = 'active';
```

### Étape 4 : Vérification

1. **Vérifier le statut du chauffeur**
   ```sql
   SELECT * FROM get_driver_subscription_status('UUID_DU_CHAUFFEUR');
   ```

   Résultat attendu :
   ```
   has_active_subscription: true
   subscription_type: 'premium'
   can_accept_more_bookings: true
   subscription_end_date: [Date dans 1 mois ou 1 an]
   ```

2. **Vérifier dans la table `drivers`**
   ```sql
   SELECT 
     first_name, 
     last_name, 
     subscription_type,
     lifetime_accepted_bookings,
     has_used_free_trial
   FROM drivers 
   WHERE id = 'UUID_DU_CHAUFFEUR';
   ```

### Étape 5 : Confirmation au Chauffeur

Envoyez un message de confirmation :

**Via WhatsApp :**
```
✅ Votre abonnement Premium [MENSUEL/ANNUEL] a été activé avec succès !

📅 Valable jusqu'au : [DATE]
🚗 Vous pouvez maintenant accepter des courses illimitées
💳 Montant reçu : [MONTANT] TND

Merci pour votre confiance ! 🎉

Bonne route avec TuniDrive 🚕
```

**Via Email :**
```
Objet : ✅ Abonnement Premium Activé - TuniDrive

Bonjour [Prénom] [Nom],

Nous avons bien reçu votre paiement et votre abonnement Premium [MENSUEL/ANNUEL] 
a été activé avec succès.

Détails de votre abonnement :
• Type : Premium [Mensuel/Annuel]
• Montant : [MONTANT] TND TTC
• Date d'activation : [DATE_ACTIVATION]
• Valable jusqu'au : [DATE_FIN]
• Courses : Illimitées ✓

Vous pouvez dès maintenant accepter autant de courses que vous le souhaitez 
sur la plateforme TuniDrive.

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
L'équipe TuniDrive

📧 support@tunidrive.net
📱 +216 28 528 477
```

---

## 🔍 Cas Particuliers

### Cas 1 : Paiement Incorrect

**Montant insuffisant**
```
⚠️ Le montant reçu ([MONTANT] TND) est insuffisant.
Montant requis : [MONTANT_REQUIS] TND

Veuillez compléter le paiement avec la différence de [DIFFÉRENCE] TND
en utilisant la même référence : ABONNEMENT-[ID]
```

**Montant excessif**
```
✅ Paiement reçu : [MONTANT] TND
📌 Montant requis : [MONTANT_REQUIS] TND
💰 Trop-perçu : [DIFFÉRENCE] TND

Nous garderons cette différence en crédit pour votre prochain renouvellement.
Ou préférez-vous un remboursement ?
```

### Cas 2 : Référence Manquante ou Incorrecte

1. **Identifier le chauffeur** via :
   - Son nom complet
   - Son email
   - Son numéro de téléphone
   - La date du virement

2. **Demander des informations supplémentaires**
   ```
   Pour valider votre paiement, nous avons besoin de :
   • Capture d'écran du virement
   • Date exacte du virement
   • Numéro de référence bancaire
   ```

3. **Ajouter une note dans le champ `admin_notes`**
   ```sql
   UPDATE driver_subscriptions
   SET admin_notes = 'Paiement identifié via capture d écran - Reçu le [DATE]'
   WHERE id = 'UUID_SUBSCRIPTION';
   ```

### Cas 3 : Demande de Remboursement

**Avant activation** (payment_status = 'pending')
```sql
-- Annuler la demande
UPDATE driver_subscriptions
SET 
  status = 'cancelled',
  payment_status = 'refunded',
  admin_notes = 'Remboursement demandé par le chauffeur le [DATE]'
WHERE id = 'UUID_SUBSCRIPTION';
```

**Après activation** (paiement déjà effectué)
1. Calculer le prorata selon les jours restants
2. Effectuer le remboursement bancaire
3. Mettre à jour le statut :
```sql
UPDATE driver_subscriptions
SET 
  status = 'cancelled',
  end_date = CURRENT_DATE,
  admin_notes = 'Remboursement partiel effectué : [MONTANT] TND le [DATE]'
WHERE id = 'UUID_SUBSCRIPTION';
```

### Cas 4 : Changement de Type d'Abonnement

**Passer de Mensuel à Annuel en cours**
1. Calculer le crédit restant du mensuel
2. Déduire du prix annuel
3. Créer un nouvel abonnement annuel
4. Expirer l'ancien abonnement mensuel

```sql
-- Annuler l'ancien
UPDATE driver_subscriptions
SET status = 'cancelled', end_date = CURRENT_DATE
WHERE id = 'UUID_OLD_SUBSCRIPTION';

-- Créer le nouveau avec prix ajusté
INSERT INTO driver_subscriptions (...)
VALUES (..., price_tnd = [PRIX_AJUSTÉ], ...);
```

---

## 📊 Requêtes Utiles

### Voir toutes les demandes en attente

```sql
SELECT 
  ds.id,
  ds.created_at,
  d.first_name,
  d.last_name,
  d.email,
  d.phone,
  ds.billing_period,
  ds.total_price_tnd,
  ds.payment_status
FROM driver_subscriptions ds
JOIN drivers d ON ds.driver_id = d.id
WHERE ds.payment_status = 'pending'
  AND ds.status = 'active'
ORDER BY ds.created_at DESC;
```

### Voir les abonnements actifs

```sql
SELECT 
  d.first_name,
  d.last_name,
  ds.billing_period,
  ds.start_date,
  ds.end_date,
  ds.total_price_tnd
FROM driver_subscriptions ds
JOIN drivers d ON ds.driver_id = d.id
WHERE ds.payment_status = 'paid'
  AND ds.status = 'active'
  AND ds.end_date >= CURRENT_DATE
ORDER BY ds.end_date ASC;
```

### Voir les abonnements qui expirent bientôt

```sql
SELECT 
  d.first_name,
  d.last_name,
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
```

### Statistiques des abonnements

```sql
-- Revenus par type d'abonnement
SELECT 
  billing_period,
  COUNT(*) as nombre_abonnements,
  SUM(total_price_tnd) as revenus_total
FROM driver_subscriptions
WHERE payment_status = 'paid'
  AND status = 'active'
GROUP BY billing_period;

-- Taux de conversion mensuel vs annuel
SELECT 
  billing_period,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM driver_subscriptions WHERE payment_status = 'paid'), 2) as pourcentage
FROM driver_subscriptions
WHERE payment_status = 'paid'
GROUP BY billing_period;
```

---

## ⚡ Actions Rapides

### Valider rapidement un abonnement mensuel

```sql
-- Remplacer UUID_DRIVER et REF_PAIEMENT
UPDATE driver_subscriptions
SET 
  payment_status = 'paid',
  payment_method = 'bank_transfer',
  payment_date = NOW(),
  payment_reference = 'REF_PAIEMENT',
  status = 'active'
WHERE 
  driver_id = 'UUID_DRIVER'
  AND payment_status = 'pending'
  AND billing_period = 'monthly';
```

### Valider rapidement un abonnement annuel

```sql
-- Remplacer UUID_DRIVER et REF_PAIEMENT
UPDATE driver_subscriptions
SET 
  payment_status = 'paid',
  payment_method = 'bank_transfer',
  payment_date = NOW(),
  payment_reference = 'REF_PAIEMENT',
  status = 'active'
WHERE 
  driver_id = 'UUID_DRIVER'
  AND payment_status = 'pending'
  AND billing_period = 'yearly';
```

---

## 🎯 Checklist de Validation

Avant de valider un abonnement, vérifier :

- [ ] Le paiement a bien été reçu sur le compte bancaire
- [ ] Le montant correspond (35.70 TND ou 385.56 TND)
- [ ] La référence correspond à un chauffeur existant
- [ ] Il n'y a pas déjà un abonnement actif pour ce chauffeur
- [ ] Les dates start_date et end_date sont correctes
- [ ] Le champ billing_period est correct (monthly/yearly)

Après validation :

- [ ] Vérifier que le statut est bien 'paid'
- [ ] Tester que le chauffeur peut accepter des courses
- [ ] Envoyer le message de confirmation
- [ ] Mettre à jour le tableau de suivi (si applicable)

---

## 📞 Contact Équipe

Pour toute question sur ce processus :
- Admin Principal : [contact]
- Support Technique : support@tunidrive.net

---

**Dernière mise à jour** : 11 Octobre 2025


# Guide Admin - Gestion des Abonnements Chauffeurs

## 🔧 Installation de la Migration

### Appliquer la Migration Corrigée

La migration a été corrigée pour ne plus dépendre de la table `admins`.

```bash
# Méthode 1 : Via Supabase CLI
supabase db push

# Méthode 2 : Via l'interface Supabase
# 1. Allez sur https://app.supabase.com
# 2. Sélectionnez votre projet
# 3. SQL Editor
# 4. Copiez-collez le contenu de supabase/migrations/20251010150000_add_driver_subscription_system.sql
# 5. Exécutez (RUN)
```

---

## 👨‍💼 Gestion des Demandes d'Abonnement

### 1. Voir les Demandes en Attente

Connectez-vous au Dashboard Supabase et exécutez cette requête SQL :

```sql
-- Voir toutes les demandes d'abonnement en attente de paiement
SELECT 
  ds.id,
  ds.driver_id,
  d.first_name,
  d.last_name,
  d.email,
  d.phone,
  ds.created_at as date_demande,
  ds.total_price_tnd as montant,
  ds.payment_status as statut_paiement,
  ds.payment_reference as reference_paiement
FROM driver_subscriptions ds
JOIN drivers d ON d.id = ds.driver_id
WHERE ds.payment_status = 'pending'
ORDER BY ds.created_at DESC;
```

### 2. Valider un Paiement Reçu

Quand un chauffeur vous contacte avec sa preuve de paiement :

```sql
-- Étape 1 : Valider le paiement dans la table des abonnements
UPDATE driver_subscriptions
SET 
  payment_status = 'paid',
  payment_date = NOW(),
  payment_reference = 'REF_DU_VIREMENT',  -- Remplacer par la vraie référence
  payment_method = 'bank_transfer',        -- ou 'cash_order' pour mandat minute
  admin_notes = 'Paiement validé le [date] - Reçu vérifié'
WHERE 
  driver_id = 'UUID_DU_CHAUFFEUR'
  AND payment_status = 'pending'
  AND status = 'active';

-- Étape 2 : Activer le compte Premium du chauffeur
UPDATE drivers
SET subscription_type = 'premium'
WHERE id = 'UUID_DU_CHAUFFEUR';

-- Étape 3 : Vérifier la mise à jour
SELECT 
  d.first_name,
  d.last_name,
  d.email,
  d.subscription_type,
  ds.payment_status,
  ds.payment_date,
  ds.end_date
FROM drivers d
LEFT JOIN driver_subscriptions ds ON ds.driver_id = d.id AND ds.status = 'active'
WHERE d.id = 'UUID_DU_CHAUFFEUR';
```

### 3. Voir Tous les Abonnements Actifs

```sql
SELECT 
  d.first_name || ' ' || d.last_name as chauffeur,
  d.email,
  d.phone,
  d.subscription_type as type_compte,
  ds.payment_status as statut_paiement,
  ds.start_date as debut,
  ds.end_date as fin,
  ds.total_price_tnd as montant_paye,
  ds.payment_reference as reference
FROM drivers d
JOIN driver_subscriptions ds ON ds.driver_id = d.id
WHERE ds.status = 'active'
  AND ds.end_date >= CURRENT_DATE
ORDER BY ds.end_date DESC;
```

### 4. Refuser/Annuler une Demande

Si un paiement est incorrect ou une demande doit être annulée :

```sql
UPDATE driver_subscriptions
SET 
  status = 'cancelled',
  payment_status = 'failed',
  admin_notes = 'Raison de l''annulation...'
WHERE id = 'UUID_DE_LA_DEMANDE';
```

---

## 📊 Statistiques et Rapports

### Statistiques Mensuelles

```sql
-- Vue d'ensemble des abonnements
SELECT 
  COUNT(CASE WHEN d.subscription_type = 'free' THEN 1 END) as chauffeurs_gratuit,
  COUNT(CASE WHEN d.subscription_type = 'premium' THEN 1 END) as chauffeurs_premium,
  SUM(CASE WHEN d.subscription_type = 'premium' THEN 47.60 ELSE 0 END) as revenus_mensuels_potentiels,
  SUM(d.monthly_accepted_bookings) as total_courses_ce_mois,
  ROUND(AVG(d.monthly_accepted_bookings), 2) as moyenne_courses_par_chauffeur
FROM drivers d
WHERE d.status = 'active';
```

### Revenus des Abonnements

```sql
-- Revenus confirmés ce mois
SELECT 
  COUNT(*) as nb_abonnements_payes,
  SUM(total_price_tnd) as revenus_total,
  COUNT(CASE WHEN payment_method = 'bank_transfer' THEN 1 END) as virements,
  COUNT(CASE WHEN payment_method = 'cash_order' THEN 1 END) as mandats
FROM driver_subscriptions
WHERE payment_status = 'paid'
  AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE);
```

### Chauffeurs Approchant de leur Limite

```sql
-- Chauffeurs gratuits qui ont presque atteint leur limite
SELECT 
  d.first_name || ' ' || d.last_name as chauffeur,
  d.email,
  d.phone,
  d.monthly_accepted_bookings as courses_acceptees,
  3 - d.monthly_accepted_bookings as courses_restantes,
  d.subscription_type
FROM drivers d
WHERE d.status = 'active'
  AND d.subscription_type = 'free'
  AND d.monthly_accepted_bookings >= 2
ORDER BY d.monthly_accepted_bookings DESC;
```

---

## 🔄 Maintenance Mensuelle

### Réinitialisation du Compteur (1er du mois)

Cette fonction devrait être appelée automatiquement, mais vous pouvez la lancer manuellement :

```sql
-- Réinitialiser tous les compteurs mensuels
SELECT reset_monthly_bookings();

-- Vérifier que ça a fonctionné
SELECT 
  first_name,
  last_name,
  monthly_accepted_bookings,
  monthly_bookings_reset_date
FROM drivers
WHERE status = 'active'
LIMIT 10;
```

### Expiration des Abonnements

```sql
-- Marquer les abonnements expirés
UPDATE driver_subscriptions
SET status = 'expired'
WHERE end_date < CURRENT_DATE
  AND status = 'active';

-- Remettre les chauffeurs en compte gratuit si aucun abonnement actif
UPDATE drivers d
SET subscription_type = 'free'
WHERE subscription_type = 'premium'
  AND NOT EXISTS (
    SELECT 1 FROM driver_subscriptions ds
    WHERE ds.driver_id = d.id
      AND ds.status = 'active'
      AND ds.payment_status = 'paid'
      AND ds.end_date >= CURRENT_DATE
  );

-- Voir les chauffeurs remis en gratuit
SELECT 
  first_name,
  last_name,
  email,
  subscription_type,
  monthly_accepted_bookings
FROM drivers
WHERE subscription_type = 'free'
  AND id IN (
    SELECT driver_id FROM driver_subscriptions
    WHERE status = 'expired'
      AND end_date >= CURRENT_DATE - INTERVAL '7 days'
  );
```

---

## 📧 Communication avec les Chauffeurs

### Templates d'Email

#### Email de Confirmation de Paiement

```
Objet : ✅ Votre abonnement Premium est activé !

Bonjour [Prénom] [Nom],

Nous avons bien reçu votre paiement de 47.60 TND.

Votre abonnement Premium est maintenant actif !

✅ Courses illimitées
✅ Valable jusqu'au [date_fin]
✅ Référence de paiement : [reference]

Vous pouvez maintenant accepter autant de courses que vous le souhaitez.

Bon travail sur TuniDrive !

L'équipe TuniDrive
```

#### Email de Rappel d'Expiration (7 jours avant)

```
Objet : ⏰ Votre abonnement Premium expire bientôt

Bonjour [Prénom] [Nom],

Votre abonnement Premium arrive à expiration le [date_fin].

Pour continuer à bénéficier des courses illimitées, pensez à renouveler votre abonnement.

Prix : 47.60 TND TTC/mois
Référence : ABONNEMENT-[ID]

Connectez-vous à votre tableau de bord dans l'onglet "Abonnement" pour renouveler.

L'équipe TuniDrive
```

#### Email de Refus de Paiement

```
Objet : ❌ Problème avec votre demande d'abonnement

Bonjour [Prénom] [Nom],

Nous n'avons pas pu valider votre paiement pour les raisons suivantes :
[Raison du refus]

Veuillez nous contacter pour régulariser la situation.

L'équipe TuniDrive
```

---

## 🆘 Problèmes Courants

### Un chauffeur ne peut pas accepter de courses malgré un paiement

**Solution :**

```sql
-- Vérifier le statut complet
SELECT * FROM get_driver_subscription_status('UUID_DU_CHAUFFEUR');

-- Forcer l'activation si le paiement est confirmé
UPDATE drivers
SET 
  subscription_type = 'premium',
  monthly_accepted_bookings = 0
WHERE id = 'UUID_DU_CHAUFFEUR';
```

### Le compteur ne se réinitialise pas au début du mois

**Solution :**

```sql
-- Réinitialiser manuellement pour un chauffeur
UPDATE drivers
SET 
  monthly_accepted_bookings = 0,
  monthly_bookings_reset_date = CURRENT_DATE
WHERE id = 'UUID_DU_CHAUFFEUR';

-- Ou pour tous les chauffeurs
SELECT reset_monthly_bookings();
```

### Double paiement ou erreur de paiement

**Solution :**

```sql
-- Voir l'historique des abonnements d'un chauffeur
SELECT 
  id,
  start_date,
  end_date,
  payment_status,
  payment_date,
  payment_reference,
  total_price_tnd,
  status,
  created_at
FROM driver_subscriptions
WHERE driver_id = 'UUID_DU_CHAUFFEUR'
ORDER BY created_at DESC;

-- Annuler une demande en double
UPDATE driver_subscriptions
SET status = 'cancelled'
WHERE id = 'UUID_DE_LA_DEMANDE_EN_TROP';
```

---

## 🔐 Sécurité et Bonnes Pratiques

1. **Toujours vérifier la preuve de paiement** avant de valider
2. **Noter la référence exacte du virement** dans `payment_reference`
3. **Conserver les preuves de paiement** (scans/photos) en externe
4. **Logger toutes les actions** dans `admin_notes`
5. **Faire des sauvegardes régulières** de la base de données
6. **Vérifier les expirations** chaque semaine

---

## 📱 Accès Rapide - Requêtes Fréquentes

### Voir les demandes d'aujourd'hui

```sql
SELECT * FROM driver_subscriptions
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;
```

### Compter les chauffeurs Premium actifs

```sql
SELECT COUNT(*) as total_premium
FROM drivers
WHERE subscription_type = 'premium' AND status = 'active';
```

### Rechercher un chauffeur par email ou téléphone

```sql
SELECT 
  d.*,
  (SELECT COUNT(*) FROM driver_subscriptions ds 
   WHERE ds.driver_id = d.id AND ds.status = 'active') as nb_abonnements
FROM drivers d
WHERE d.email ILIKE '%recherche%'
   OR d.phone LIKE '%recherche%';
```

---

## 📞 Support

Pour toute question sur la gestion des abonnements :
- Consultez la documentation technique : `SYSTEME_ABONNEMENT_CHAUFFEURS.md`
- Contactez l'équipe de développement

---

**Version** : 1.0  
**Dernière mise à jour** : 10 Octobre 2025



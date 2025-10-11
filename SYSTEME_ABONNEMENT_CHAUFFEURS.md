# Système d'Abonnement pour Chauffeurs - TuniDrive

## Vue d'ensemble

Le système d'abonnement a été mis en place pour gérer l'accès des chauffeurs aux réservations de courses. Il existe deux types de comptes :

### 🆓 Compte Gratuit (Free)
- **Limite** : 2 courses maximum par mois calendaire
- **Coût** : Gratuit
- **Réinitialisation** : Automatique chaque début de mois
- **Avantages** : Permet de tester la plateforme

### 💎 Compte Premium
- **Limite** : Courses illimitées
- **Coût** : 40 TND HT + 19% TVA = **47.60 TND TTC/mois**
- **Durée** : 1 mois calendaire
- **Renouvellement** : Manuel chaque mois

---

## Fonctionnement du Système

### Compteur Mensuel
Chaque chauffeur possède un compteur qui :
- S'incrémente automatiquement quand il accepte une course (passage de "pending" à "accepted")
- Se réinitialise automatiquement au début de chaque mois
- Est visible dans l'onglet "Abonnement" du tableau de bord

### Vérification Avant Acceptation
Quand un chauffeur tente d'accepter une course :
1. Le système vérifie son type d'abonnement
2. Si compte gratuit : vérifie s'il n'a pas dépassé les 2 courses
3. Si limite atteinte : affiche un message bloquant avec invitation à souscrire au Premium
4. Si Premium ou sous la limite : accepte la course normalement

---

## Structure de la Base de Données

### Table `driver_subscriptions`

Gère les abonnements premium des chauffeurs.

```sql
CREATE TABLE driver_subscriptions (
  id UUID PRIMARY KEY,
  driver_id UUID NOT NULL,          -- Référence au chauffeur
  start_date DATE NOT NULL,          -- Date de début
  end_date DATE NOT NULL,            -- Date de fin
  subscription_type VARCHAR(50),     -- 'free' ou 'premium'
  price_tnd DECIMAL(10, 2),         -- 40.00 TND
  vat_percentage DECIMAL(5, 2),     -- 19.00%
  total_price_tnd DECIMAL(10, 2),   -- 47.60 TND
  payment_status VARCHAR(50),        -- 'pending', 'paid', 'failed'
  payment_method VARCHAR(100),       -- 'bank_transfer', 'cash_order'
  payment_reference VARCHAR(255),    -- Référence du paiement
  status VARCHAR(50),                -- 'active', 'expired', 'cancelled'
  admin_notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Modifications Table `drivers`

Nouvelles colonnes ajoutées :

```sql
ALTER TABLE drivers
ADD COLUMN monthly_accepted_bookings INTEGER DEFAULT 0,
ADD COLUMN monthly_bookings_reset_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN subscription_type VARCHAR(50) DEFAULT 'free';
```

---

## Fonctions SQL Importantes

### `get_driver_subscription_status(p_driver_id UUID)`

Retourne le statut d'abonnement complet d'un chauffeur :

```sql
SELECT * FROM get_driver_subscription_status('driver-uuid-here');
```

**Retourne :**
- `has_active_subscription` : TRUE si abonnement premium actif
- `subscription_type` : 'free' ou 'premium'
- `monthly_accepted_bookings` : Nombre de courses acceptées ce mois
- `can_accept_more_bookings` : TRUE si peut encore accepter des courses
- `remaining_free_bookings` : Nombre de courses gratuites restantes

### `increment_driver_monthly_bookings()`

Trigger automatique qui incrémente le compteur quand une réservation passe en "accepted".

### `reset_monthly_bookings()`

Fonction qui réinitialise tous les compteurs mensuels (peut être appelée par un cron job).

---

## Interface Utilisateur (Chauffeur)

### Onglet "Abonnement"

L'onglet affiche :

1. **Carte de Statut Principal**
   - Affichage du type de compte (Gratuit/Premium)
   - Nombre de courses acceptées ce mois
   - Barre de progression (pour compte gratuit)
   - Alerte si limite atteinte

2. **Section Premium (si compte gratuit)**
   - Présentation des avantages Premium
   - Prix détaillé (HT, TVA, TTC)
   - Bouton de souscription
   - Instructions de paiement

3. **Informations de Paiement**
   - Méthode 1 : Virement bancaire
     * Bénéficiaire : TuniDrive SARL
     * Numéro de compte : `[À fournir]`
     * Montant : 47.60 TND
     * Référence : ABONNEMENT-[ID_CHAUFFEUR]
   
   - Méthode 2 : Mandat minute (Poste/Banque)
     * Bénéficiaire : TuniDrive SARL
     * Montant : 47.60 TND
     * Référence : ABONNEMENT-[ID_CHAUFFEUR]

4. **Instructions Post-Paiement**
   - Conserver le reçu
   - Noter la référence de paiement
   - Contacter le support
   - Activation sous 24h ouvrables

### Alertes dans le Tableau de Bord

- **Alerte Orange** : Affichée sur le tableau de bord principal quand la limite est atteinte
- **Message Bloquant** : Popup lors de tentative d'acceptation au-delà du quota

---

## Workflow Complet

### Pour le Chauffeur

1. **Inscription** : Compte gratuit par défaut
2. **Acceptation de courses** : Peut accepter jusqu'à 2 courses
3. **Limite atteinte** : Message d'alerte sur le dashboard
4. **Souscription Premium** :
   - Va dans l'onglet "Abonnement"
   - Clique sur "Souscrire à l'abonnement Premium"
   - Crée une demande d'abonnement (statut: pending)
   - Consulte les informations de paiement
5. **Paiement** :
   - Effectue le virement ou mandat minute
   - Conserve la preuve de paiement
   - Note la référence
6. **Validation** :
   - Contacte le support avec la référence
   - L'admin valide le paiement dans le système
7. **Activation** : Compte passe en Premium (courses illimitées)

### Pour l'Admin

1. Reçoit la notification de demande d'abonnement
2. Vérifie le paiement (virement/mandat)
3. Met à jour la demande d'abonnement :
   ```sql
   UPDATE driver_subscriptions
   SET payment_status = 'paid',
       payment_date = NOW(),
       payment_reference = 'REF_PAIEMENT'
   WHERE driver_id = 'xxx' AND status = 'active';
   
   -- Optionnel: mettre à jour le type d'abonnement du chauffeur
   UPDATE drivers
   SET subscription_type = 'premium'
   WHERE id = 'xxx';
   ```
4. Notifie le chauffeur de l'activation

---

## Fichiers Modifiés/Créés

### Migrations SQL
- `supabase/migrations/20251010150000_add_driver_subscription_system.sql`
  * Création table `driver_subscriptions`
  * Ajout colonnes dans `drivers`
  * Fonctions SQL
  * Triggers automatiques
  * Politiques RLS

### Composants React
- `src/components/DriverSubscription.tsx`
  * Nouveau composant complet de gestion d'abonnement
  * Affichage du statut
  * Interface de souscription
  * Informations de paiement

- `src/components/DriverDashboard.tsx`
  * Ajout onglet "Abonnement"
  * Vérification du quota avant acceptation
  * Alertes sur le dashboard
  * Intégration du composant DriverSubscription

---

## Configuration à Compléter

### ⚠️ Numéro de Compte Bancaire

Dans `src/components/DriverSubscription.tsx`, ligne ~23 :

```typescript
const BANK_ACCOUNT = "À fournir"; // ⚠️ À REMPLACER
```

**Action requise** : Remplacer par le vrai numéro de compte bancaire de TuniDrive.

### Exemple de remplacement :
```typescript
const BANK_ACCOUNT = "10 123 4567890123456 78"; // RIB complet
```

---

## Tarification

| Élément | Montant |
|---------|---------|
| Prix de base HT | 40.00 TND |
| TVA (19%) | 7.60 TND |
| **Total TTC** | **47.60 TND** |

---

## Tests Recommandés

### Test 1 : Compte Gratuit - Limite Normale
1. Créer un nouveau chauffeur
2. Accepter 2 courses → OK
3. Tenter d'en accepter une 3ème → Message bloquant

### Test 2 : Abonnement Premium
1. Créer une demande d'abonnement
2. Simuler le paiement (admin valide)
3. Vérifier que le chauffeur peut accepter >2 courses (illimité)

### Test 3 : Réinitialisation Mensuelle
1. Chauffeur à 2/2 courses
2. Simuler passage au mois suivant
3. Vérifier reset automatique à 0/2

### Test 4 : Interface Chauffeur
1. Vérifier l'affichage correct du compteur
2. Tester les alertes visuelles
3. Vérifier les informations de paiement

---

## Maintenance

### Réinitialisation Mensuelle Automatique

La fonction `reset_monthly_bookings()` devrait être appelée automatiquement via un cron job au début de chaque mois :

```sql
-- À exécuter le 1er de chaque mois
SELECT reset_monthly_bookings();
```

**Recommandation** : Configurer un cron job Supabase ou un service externe pour appeler cette fonction.

### Expiration des Abonnements

Les abonnements qui ont dépassé leur `end_date` devraient être marqués comme expirés :

```sql
-- Script à exécuter quotidiennement
UPDATE driver_subscriptions
SET status = 'expired'
WHERE end_date < CURRENT_DATE
  AND status = 'active';
  
-- Remettre les chauffeurs en compte gratuit
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
```

---

## Support et Questions

Pour toute question sur le système d'abonnement :

1. **Chauffeurs** : Consulter l'onglet "Abonnement" dans le dashboard
2. **Admins** : Voir la documentation admin (à créer)
3. **Développeurs** : Consulter le code source et les commentaires SQL

---

## Améliorations Futures Possibles

- [ ] Abonnement trimestriel/annuel avec réduction
- [ ] Paiement en ligne automatisé (carte bancaire)
- [ ] Renouvellement automatique
- [ ] Historique des paiements dans l'interface chauffeur
- [ ] Notifications email automatiques pour expiration proche
- [ ] Système de factures PDF automatiques
- [ ] Dashboard admin pour gérer les abonnements

---

## Changelog

### Version 1.0 (10 Octobre 2025)
- ✅ Système d'abonnement de base
- ✅ Limitation 2 courses/mois gratuit
- ✅ Abonnement Premium 47.60 TND/mois
- ✅ Interface chauffeur complète
- ✅ Paiement par virement/mandat minute
- ✅ Réinitialisation mensuelle automatique

---

**Date de création** : 10 Octobre 2025  
**Version** : 1.0  
**Auteur** : Équipe TuniDrive


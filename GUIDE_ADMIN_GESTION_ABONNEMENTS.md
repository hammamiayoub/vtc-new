# 📊 Guide Admin - Gestion des Abonnements dans le Dashboard

## 🎯 Nouvelle Fonctionnalité

L'AdminDashboard dispose maintenant d'un **onglet "Abonnements"** complet pour gérer et visualiser tous les abonnements des chauffeurs.

---

## ✅ Ce qui a été ajouté

### 1. Nouvel Onglet "Abonnements"

Un quatrième onglet dans l'AdminDashboard :
```
┌─────────────┬──────────┬──────────────┬──────────────────┐
│ Chauffeurs  │ Clients  │  Véhicules   │  🆕 Abonnements  │
└─────────────┴──────────┴──────────────┴──────────────────┘
```

### 2. Statistiques en Temps Réel

4 cartes de statistiques :
- **Total abonnements** : Nombre total d'abonnements créés
- **Actifs (payés)** : Abonnements actifs et non expirés
- **En attente** : Demandes d'abonnement en attente de paiement
- **Revenus totaux** : Somme de tous les paiements reçus

### 3. Tableau Détaillé

Affichage en tableau (desktop) ou cartes (mobile) avec :
- **Chauffeur** : Nom, email, téléphone
- **Type** : Mensuel ou Annuel (avec badge -10%)
- **Période** : Dates de début et fin
- **Montant** : Prix HT et TTC
- **Paiement** : Statut (payé/en attente/échoué/remboursé)
- **Expiration** : Jours restants avec alertes
- **Statut** : Actif/Expiré/Annulé
- **Actions** : Bouton pour voir les détails

### 4. Modal de Détails Complet

Pour chaque abonnement, affichage de :
- ✅ Type d'abonnement (mensuel/annuel)
- ✅ Dates de début, fin et expiration
- ✅ Détails financiers (HT, TVA, TTC)
- ✅ Économie réalisée (pour annuel)
- ✅ Statut de paiement et méthode
- ✅ Référence de paiement
- ✅ Informations du chauffeur
- ✅ Nombre de courses lifetime
- ✅ Notes administratives
- ✅ Timeline (création, paiement, mise à jour)
- ✅ Script SQL pour validation (si pending)

---

## 📊 Vue d'Ensemble

### Exemple de Statistiques

```
┌─────────────────────────┐
│ Total abonnements: 45   │
│ Actifs (payés): 38      │
│ En attente: 7           │
│ Revenus totaux: 1,356   │
└─────────────────────────┘
```

### Exemple de Liste

| Chauffeur | Type | Période | Montant | Paiement | Expiration | Statut |
|-----------|------|---------|---------|----------|------------|--------|
| Ahmed Ben | 🟣 Annuel | 15/10/25 - 15/10/26 | 385.56 TND | ✅ Payé | 65 jours | ✅ Actif |
| Ali Triki | 🔵 Mensuel | 01/11/25 - 01/12/25 | 35.70 TND | ⏳ En attente | - | ⏳ Pending |
| Sami K. | 🔵 Mensuel | 10/09/25 - 10/10/25 | 35.70 TND | ✅ Payé | Expiré | ❌ Expiré |

---

## 🎨 Interface Utilisateur

### Tableau (Desktop)

Colonnes affichées :
1. **Chauffeur** : Photo, nom, email, téléphone
2. **Type** : Badge Mensuel/Annuel avec -10%
3. **Période** : Date début et fin
4. **Montant** : Prix TTC + Prix HT
5. **Paiement** : Badge de statut + date
6. **Expiration** : Jours restants avec alertes
7. **Statut** : Badge Actif/Expiré/Annulé
8. **Actions** : Bouton "Voir détails"

### Cartes (Mobile)

Affichage en cartes empilées avec :
- Nom du chauffeur
- Type d'abonnement
- Montant
- Statut de paiement
- Expiration
- Période

### Modal de Détails

Sections affichées :
1. **En-tête** : Titre + bouton fermer
2. **Informations abonnement** : Type, statut, dates, durée
3. **Informations paiement** : HT, TVA, TTC, économie, méthode
4. **Informations chauffeur** : Nom, contact, courses lifetime
5. **Notes admin** : Si présentes
6. **Actions admin** : Script SQL pour validation (si pending)
7. **Timeline** : Dates de création, paiement, mise à jour

---

## 🔔 Alertes Visuelles

### Alertes d'Expiration

Le système affiche automatiquement :

| Jours Restants | Couleur | Message |
|----------------|---------|---------|
| > 7 jours | 🟢 Vert | "Actif" |
| 1-7 jours | 🟠 Orange | "⚠️ Expire bientôt" + "Expire dans X jours" |
| 0 jour | 🟠 Orange | "Expire aujourd'hui" |
| < 0 jours | 🔴 Rouge | "Expiré" + "Il y a X jours" |

### Badges de Statut

**Paiement** :
- ✅ **Vert** : Payé
- ⏳ **Orange** : En attente
- ❌ **Rouge** : Échoué
- 💰 **Gris** : Remboursé

**Abonnement** :
- ✅ **Vert** : Actif
- ❌ **Rouge** : Expiré
- ⚫ **Gris** : Annulé

**Type** :
- 🔵 **Bleu** : Mensuel
- 🟣 **Violet** : Annuel (avec badge "-10%")

---

## 🔍 Cas d'Usage

### Cas 1 : Valider un Abonnement en Attente

**Situation** : Chauffeur a payé, vous recevez le virement

**Étapes** :
1. Aller dans l'onglet "Abonnements"
2. Filtrer visuellement les "En attente" (badge orange)
3. Cliquer sur 👁️ pour voir les détails
4. Vérifier le montant et les informations
5. Copier le script SQL fourni dans la modal
6. Coller dans Supabase SQL Editor
7. Remplacer `REF-XXX` par la référence bancaire
8. Exécuter → Abonnement activé !

**Script fourni dans la modal** :
```sql
UPDATE driver_subscriptions
SET payment_status = 'paid',
    payment_method = 'bank_transfer',
    payment_date = NOW(),
    payment_reference = 'REF-XXX'
WHERE id = 'uuid-de-l-abonnement';
```

### Cas 2 : Suivre les Expirations

**Situation** : Vous voulez voir qui doit renouveler bientôt

**Étapes** :
1. Onglet "Abonnements"
2. Regarder la colonne "Expiration"
3. Les abonnements avec ⚠️ expirent dans moins de 7 jours
4. Contacter ces chauffeurs pour renouvellement

**Filtrage visuel** :
- 🟢 Pas d'action nécessaire
- 🟠 **⚠️ Expire bientôt** → À contacter
- 🔴 **Expiré** → Blocké, doit renouveler

### Cas 3 : Consulter les Revenus

**Situation** : Vous voulez voir les revenus des abonnements

**Dans les statistiques** :
- Carte "Revenus totaux" affiche la somme des paiements reçus

**Pour plus de détails** :
- Compter visuellement les mensuels vs annuels
- Voir les montants dans le tableau
- Analyser les dates de paiement

### Cas 4 : Analyser un Chauffeur

**Situation** : Vous voulez voir l'historique d'un chauffeur

**Étapes** :
1. Onglet "Abonnements"
2. Chercher le chauffeur par nom/email (Ctrl+F)
3. Cliquer sur 👁️ pour voir les détails
4. Voir :
   - Son type d'abonnement actuel
   - Combien de courses il a accepté (lifetime)
   - Quand son abonnement expire
   - S'il a payé

---

## 📊 Informations Affichées

### Niveau Liste

Pour chaque abonnement :
- Chauffeur (nom, email, téléphone)
- Type (Mensuel/Annuel avec réduction)
- Dates de début et fin
- Montant (TTC + HT)
- Statut de paiement + date
- Jours restants avant expiration
- Statut global (actif/expiré/annulé)

### Niveau Détails (Modal)

Informations complètes :
- **Abonnement** : Type, statut, dates, durée, expiration
- **Financier** : Prix HT, TVA, TTC, économie (annuel)
- **Paiement** : Statut, méthode, date, référence
- **Chauffeur** : Nom, contact, ville, courses lifetime
- **Administration** : Notes, timeline, script validation

---

## 💡 Fonctionnalités Intelligentes

### 1. Calcul Automatique des Jours Restants

Le système calcule automatiquement :
```javascript
daysRemaining = (end_date - today) en jours
```

### 2. Statut d'Expiration Dynamique

Messages automatiques selon les jours :
- "Actif" (> 30 jours)
- "Expire dans X jours" (1-30 jours)
- "Expire demain" (1 jour)
- "Expire aujourd'hui" (0 jour)
- "Expiré" (< 0 jours)

### 3. Économie Calculée

Pour les abonnements annuels :
```
Économie = (Prix mensuel × 12) - Prix annuel
         = (35.70 × 12) - 385.56
         = 42.84 TND
```

### 4. Rafraîchissement Automatique

Les données se rafraîchissent automatiquement toutes les 30 secondes (comme les autres onglets).

---

## 🛠️ Requêtes SQL Utiles

### Voir tous les abonnements en attente

```sql
SELECT 
  ds.id,
  d.first_name || ' ' || d.last_name as chauffeur,
  d.email,
  ds.billing_period,
  ds.total_price_tnd,
  ds.created_at
FROM driver_subscriptions ds
JOIN drivers d ON ds.driver_id = d.id
WHERE ds.payment_status = 'pending'
ORDER BY ds.created_at DESC;
```

### Valider rapidement un abonnement

```sql
-- Remplacer UUID_SUBSCRIPTION et REF_PAIEMENT
UPDATE driver_subscriptions
SET 
  payment_status = 'paid',
  payment_method = 'bank_transfer',
  payment_date = NOW(),
  payment_reference = 'REF_PAIEMENT'
WHERE id = 'UUID_SUBSCRIPTION';
```

### Voir les abonnements qui expirent bientôt

```sql
SELECT 
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
```

### Statistiques revenus

```sql
-- Revenus par type
SELECT 
  billing_period,
  COUNT(*) as nombre,
  SUM(total_price_tnd) as revenus
FROM driver_subscriptions
WHERE payment_status = 'paid'
GROUP BY billing_period;

-- Résultat attendu:
-- billing_period | nombre | revenus
-- monthly        | 38     | 1,356.60
-- yearly         | 7      | 2,698.92
```

---

## 📱 Responsive Design

### Desktop (> 1024px)
- Tableau complet avec toutes les colonnes
- Défilement horizontal si nécessaire
- Actions visibles sur chaque ligne

### Mobile/Tablet (< 1024px)
- Affichage en cartes empilées
- Informations essentielles visibles
- Bouton détails en haut à droite

---

## ⚡ Actions Rapides

### Vérifier un Chauffeur Spécifique

1. Ouvrir l'onglet "Abonnements"
2. Utiliser Ctrl+F pour chercher par nom ou email
3. Cliquer sur 👁️ pour voir tous les détails

### Identifier les Priorités

**En attente (🟠)** :
- Action requise : Vérifier le paiement
- Délai : Le plus tôt possible

**Expire bientôt (⚠️)** :
- Action requise : Contacter le chauffeur
- Délai : Avant expiration

**Expiré (🔴)** :
- Action requise : Relancer le chauffeur
- Impact : Chauffeur bloqué

---

## 🔄 Workflow de Validation

```
Chauffeur crée demande
    ↓
Statut: PENDING (🟠)
    ↓
Admin vérifie le virement bancaire
    ↓
Admin valide dans Supabase SQL
    ↓
Statut: PAID (✅)
    ↓
Chauffeur débloqué automatiquement
    ↓
Courses illimitées pour 1 mois/1 an
    ↓
À l'expiration → Statut: EXPIRED (🔴)
    ↓
Chauffeur doit renouveler
```

---

## 📋 Checklist Admin Quotidienne

**Matin** (10 minutes) :
- [ ] Ouvrir l'onglet "Abonnements"
- [ ] Vérifier les demandes "En attente" (badge orange)
- [ ] Consulter les virements bancaires reçus
- [ ] Valider les paiements correspondants
- [ ] Vérifier les alertes ⚠️ "Expire bientôt"

**Hebdomadaire** :
- [ ] Contacter les chauffeurs dont l'abonnement expire dans 7 jours
- [ ] Relancer les chauffeurs avec paiement pending > 48h
- [ ] Analyser les statistiques de revenus
- [ ] Vérifier les abonnements expirés non renouvelés

---

## 🎯 Détails Affichés

### Dans le Tableau

```
Chauffeur: Ahmed Ben Ali
           ahmed.ben@email.com
           +216 12 345 678

Type: [🟣 Annuel] -10%

Période: Début: 15/10/2025
         Fin: 15/10/2026

Montant: 385.56 TND TTC
         HT: 324.00 TND

Paiement: [✅ Payé]
          15/10/2025

Expiration: 65 jours
            Actif

Statut: [✅ Actif]
```

### Dans la Modal

**Section Abonnement** :
- Type : Badge Annuel/Mensuel
- Statut : Badge Actif/Expiré/Annulé
- Date début : Lundi 15 octobre 2025
- Date fin : Mardi 15 octobre 2026
- Expiration : Expire dans 65 jours (avec couleur)
- Durée : 12 mois (ou 1 mois)

**Section Paiement** :
- Prix HT : 324.00 TND
- TVA (19%) : 61.56 TND
- **Total TTC** : **385.56 TND**
- Économie : 42.84 TND vs mensuel (si annuel)
- Statut : Payé
- Méthode : Virement bancaire
- Date paiement : 15/10/2025
- Référence : VIREMENT-2025-10-15-001

**Section Chauffeur** :
- Nom : Ahmed Ben Ali
- Email : ahmed.ben@email.com
- Téléphone : +216 12 345 678
- Ville : Tunis
- Courses lifetime : 47

**Timeline** :
- Créé le : 15/10/2025 14:30
- Mis à jour : 15/10/2025 15:45
- Payé le : 15/10/2025 15:45

---

## 📈 Utilisation des Statistiques

### Revenus Totaux

```
Total = Σ(total_price_tnd) WHERE payment_status = 'paid'
```

Affiche la somme de tous les paiements reçus (mensuels + annuels).

### Abonnements Actifs

```
Actifs = COUNT WHERE payment_status = 'paid' 
                AND status = 'active'
                AND end_date >= today
```

Exclut les expirés et les non payés.

### En Attente

```
Pending = COUNT WHERE payment_status = 'pending'
```

Demandes qui nécessitent une action de votre part.

---

## 🆘 Actions Administratives

### Valider un Paiement

Depuis la modal d'un abonnement pending :
1. Copier le script SQL affiché
2. Ouvrir Supabase SQL Editor
3. Coller et adapter la référence
4. Exécuter
5. Rafraîchir le dashboard (automatique après 30s max)

### Ajouter une Note

```sql
UPDATE driver_subscriptions
SET admin_notes = 'Paiement reçu par virement le 15/10/2025. Référence: VIR-123456'
WHERE id = 'UUID_SUBSCRIPTION';
```

### Marquer comme Expiré Manuellement

```sql
UPDATE driver_subscriptions
SET status = 'expired'
WHERE id = 'UUID_SUBSCRIPTION';
```

### Rembourser un Abonnement

```sql
UPDATE driver_subscriptions
SET 
  payment_status = 'refunded',
  status = 'cancelled',
  admin_notes = 'Remboursé sur demande du chauffeur le ' || CURRENT_DATE
WHERE id = 'UUID_SUBSCRIPTION';
```

---

## ✅ Avantages de cette Interface

### Pour l'Administration
- ✅ Vision globale instantanée
- ✅ Identification rapide des priorités
- ✅ Validation facilitée avec scripts SQL
- ✅ Suivi des expirations
- ✅ Statistiques de revenus

### Pour la Gestion
- ✅ Détection des abonnements à renouveler
- ✅ Analyse mensuel vs annuel
- ✅ Suivi de la trésorerie
- ✅ Historique complet

### Pour le Support
- ✅ Informations complètes du chauffeur
- ✅ Historique des paiements
- ✅ Notes administratives
- ✅ Référence de contact rapide

---

## 🎯 Prochaines Améliorations Possibles

- [ ] Validation directe depuis l'interface (sans SQL)
- [ ] Ajout de notes depuis l'interface
- [ ] Filtres par statut/type/expiration
- [ ] Export CSV des abonnements
- [ ] Graphiques de revenus
- [ ] Notifications automatiques avant expiration
- [ ] Lien direct vers le chauffeur (onglet chauffeurs)

---

## 📞 En Cas de Question

Pour toute question sur l'utilisation :
- Documentation : Voir ce guide
- Support technique : support@tunidrive.net
- Formation : Contactez l'équipe dev

---

**✅ Interface Complète de Gestion des Abonnements Disponible !**

L'onglet "Abonnements" dans l'AdminDashboard vous donne une vision complète et en temps réel de tous les abonnements chauffeurs avec toutes les informations nécessaires pour une gestion efficace.

**Accès** : AdminDashboard → Onglet "Abonnements" 💳


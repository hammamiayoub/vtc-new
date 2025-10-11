# 🎉 Nouveau Système d'Abonnement - Documentation

## 📋 Résumé des modifications

Le système d'abonnement a été complètement refondu avec les changements suivants :

### ✅ Changements Majeurs

1. **3 courses gratuites LIFETIME** (au lieu de 2 courses par mois)
   - Les chauffeurs bénéficient de 3 courses gratuites UNE SEULE FOIS
   - Plus de reset mensuel pour les courses gratuites
   - Après les 3 courses, abonnement Premium obligatoire

2. **Deux options d'abonnement Premium**
   - **Mensuel** : 30 TND HT / mois (35.70 TND TTC)
   - **Annuel** : 324 TND HT / an (385.56 TND TTC) - **ÉCONOMIE DE 10%**

### 💰 Détails des Prix

#### Abonnement Mensuel
- Prix HT : 30.00 TND
- TVA (19%) : 5.70 TND
- **Total TTC : 35.70 TND/mois**

#### Abonnement Annuel (avec 10% de réduction)
- Prix sans réduction : 360 TND (30 × 12)
- Réduction (10%) : -36 TND
- Prix HT : 324.00 TND
- TVA (19%) : 61.56 TND
- **Total TTC : 385.56 TND/an**
- **Équivalent mensuel : 32.13 TND/mois**

**💡 Économie annuelle : 42.84 TND** (12 × 35.70 - 385.56)

---

## 🗄️ Modifications de la Base de Données

### Nouvelle Migration SQL

**Fichier** : `supabase/migrations/20251011000000_update_subscription_logic_lifetime_and_yearly.sql`

#### Nouvelles Colonnes

1. **Table `drivers`**
   ```sql
   - lifetime_accepted_bookings INTEGER (compteur de courses lifetime)
   - has_used_free_trial BOOLEAN (a utilisé les 3 courses gratuites)
   ```

2. **Table `driver_subscriptions`**
   ```sql
   - billing_period VARCHAR(20) ('monthly' ou 'yearly')
   ```

#### Nouvelles Fonctions

1. **`increment_driver_lifetime_bookings()`**
   - Remplace l'ancien trigger mensuel
   - Incrémente le compteur lifetime au lieu du mensuel
   - Met à jour `has_used_free_trial` après 3 courses

2. **`get_driver_subscription_status()`** (mise à jour)
   - Retourne maintenant :
     - `lifetime_accepted_bookings` : nombre total de courses
     - `has_used_free_trial` : booléen indiquant si les 3 courses sont utilisées
     - `subscription_end_date` : date de fin de l'abonnement actif
     - `remaining_free_bookings` : courses gratuites restantes (max 3)

3. **`calculate_subscription_price()`** (nouvelle)
   - Calcule les prix selon la période (mensuelle ou annuelle)
   - Applique automatiquement la réduction de 10% pour l'annuel
   - Retourne : prix HT, TVA, prix TTC, équivalent mensuel

#### Nouvelle Vue

**`driver_subscription_details`**
- Vue SQL facilitant les requêtes sur les abonnements
- Combine les données des tables `drivers` et `driver_subscriptions`
- Indique si l'abonnement est actif

---

## 💻 Modifications du Code Frontend

### Composant `DriverSubscription.tsx`

#### Nouvelles Fonctionnalités

1. **Sélecteur de période d'abonnement**
   - Interface avec 2 cartes cliquables (Mensuel / Annuel)
   - Badge "-10%" sur l'option annuelle
   - Affichage de l'économie réalisée

2. **Calcul dynamique des prix**
   ```typescript
   const calculatePrices = (billingPeriod: BillingPeriod) => {
     // Calcule basePrice, vatAmount, totalPrice, monthlyEquivalent
     // Applique la réduction de 10% si annuel
   }
   ```

3. **Affichage amélioré**
   - Compteur de courses lifetime (au lieu de mensuel)
   - Barre de progression sur 3 courses
   - Date d'expiration de l'abonnement Premium
   - Messages adaptés selon la période choisie

4. **Création d'abonnement**
   - Calcule automatiquement la date de fin (+1 mois ou +1 an)
   - Enregistre le `billing_period` dans la base de données
   - Calcule les prix selon la période sélectionnée

5. **Informations de paiement**
   - Montant affiché selon la période choisie
   - Liens WhatsApp et Email pré-remplis avec le bon montant
   - Mention de la période (MENSUEL / ANNUEL) dans les messages

---

## 📊 Logique Métier

### Flux pour un Nouveau Chauffeur

1. **Inscription** : Le chauffeur s'inscrit sur la plateforme
2. **3 Courses Gratuites** : Il peut accepter 3 courses sans abonnement
3. **Après 3 courses** : Message l'invitant à s'abonner
4. **Blocage** : Ne peut plus accepter de courses sans abonnement Premium

### Flux d'Abonnement

1. **Sélection** : Le chauffeur choisit entre mensuel ou annuel
2. **Demande** : Crée une demande d'abonnement (statut: pending)
3. **Paiement** : Effectue le virement bancaire
4. **Validation** : Contacte le support avec la référence
5. **Activation** : L'admin valide (passe à: paid + active)
6. **Accès illimité** : Le chauffeur peut accepter toutes les courses

### Avantages de l'Abonnement Annuel

- **Économie de 10%** : 42.84 TND d'économie par an
- **Paiement unique** : Une seule transaction pour toute l'année
- **Simplicité** : Pas besoin de renouveler chaque mois
- **Priorité** : Même avantages que le mensuel

---

## 🔄 Migration des Données Existantes

La migration SQL gère automatiquement les données existantes :

```sql
UPDATE drivers
SET 
  lifetime_accepted_bookings = COALESCE(monthly_accepted_bookings, 0),
  has_used_free_trial = CASE 
    WHEN COALESCE(monthly_accepted_bookings, 0) >= 3 THEN TRUE 
    ELSE FALSE 
  END
WHERE lifetime_accepted_bookings = 0;
```

**Important** : Les chauffeurs qui ont déjà accepté 3 courses ou plus verront leur `has_used_free_trial` = TRUE et devront s'abonner pour continuer.

---

## 🎨 Interface Utilisateur

### Affichage pour Compte Gratuit

```
┌─────────────────────────────────────┐
│ 🔒 Compte Gratuit                   │
│ 3 courses gratuites                 │
│                                     │
│ Courses gratuites utilisées         │
│ ▓▓▓▓▓░░░░░░░  2 / 3                │
│ ✓ 1 course gratuite restante        │
└─────────────────────────────────────┘
```

### Affichage pour Compte Premium

```
┌─────────────────────────────────────┐
│ 🚀 Abonnement Premium               │
│ Courses illimitées                  │
│                                     │
│ Courses acceptées: 47               │
│ 📅 Valable jusqu'au 15/11/2025      │
└─────────────────────────────────────┘
```

### Sélecteur d'Abonnement

```
┌──────────────┬──────────────┐
│   MENSUEL    │   ANNUEL     │
│              │   💚 -10%    │
│  35.70 TND   │  385.56 TND  │
│  par mois    │  32.13/mois  │
└──────────────┴──────────────┘

🎉 Économisez 42.84 TND par an !
```

---

## 🧪 Tests à Effectuer

### 1. Nouveau Chauffeur
- [ ] S'inscrire comme nouveau chauffeur
- [ ] Vérifier le compteur à 0/3
- [ ] Accepter 1 course → compteur à 1/3
- [ ] Accepter 2 courses → compteur à 2/3
- [ ] Accepter 3 courses → compteur à 3/3
- [ ] Vérifier le message de blocage
- [ ] Essayer d'accepter une 4ème course (doit être bloqué)

### 2. Abonnement Mensuel
- [ ] Cliquer sur "Mensuel"
- [ ] Vérifier le prix : 35.70 TND
- [ ] Créer la demande d'abonnement
- [ ] Vérifier les infos de paiement
- [ ] Valider en tant qu'admin
- [ ] Vérifier l'accès illimité
- [ ] Vérifier la date d'expiration (+1 mois)

### 3. Abonnement Annuel
- [ ] Cliquer sur "Annuel"
- [ ] Vérifier le badge "-10%"
- [ ] Vérifier le prix : 385.56 TND
- [ ] Vérifier l'équivalent mensuel : 32.13 TND/mois
- [ ] Vérifier le message d'économie : 42.84 TND
- [ ] Créer la demande d'abonnement
- [ ] Valider en tant qu'admin
- [ ] Vérifier la date d'expiration (+1 an)

### 4. Expiration d'Abonnement
- [ ] Modifier manuellement la date de fin pour qu'elle soit passée
- [ ] Vérifier le retour au statut "gratuit"
- [ ] Vérifier que le compteur lifetime est conservé
- [ ] Vérifier qu'on ne peut plus accepter de courses

---

## 📝 Notes Importantes

1. **Migration irréversible** : Les chauffeurs perdent le reset mensuel
2. **Courses gratuites uniques** : Offre valable une seule fois par chauffeur
3. **Compatibilité** : L'ancien système `monthly_accepted_bookings` est conservé pour compatibilité
4. **Trigger** : L'ancien trigger mensuel a été remplacé par le trigger lifetime
5. **Prix fixes** : Les prix sont codés en dur (30 TND HT + 19% TVA)

---

## 🚀 Déploiement

### Étapes

1. **Backup de la base de données**
   ```bash
   # Créer un backup avant migration
   ```

2. **Appliquer la migration SQL**
   ```bash
   supabase db push
   # ou via l'interface Supabase Dashboard
   ```

3. **Déployer le frontend**
   ```bash
   npm run build
   # Déployer sur Netlify/Vercel
   ```

4. **Vérifications post-déploiement**
   - Tester avec un compte test
   - Vérifier les compteurs
   - Tester les deux types d'abonnement
   - Vérifier les emails/WhatsApp

---

## 📞 Support

Pour toute question ou problème :
- Email : support@tunidrive.net
- WhatsApp : +216 28 528 477

---

**Date de mise à jour** : 11 Octobre 2025
**Version** : 2.0
**Auteur** : TuniDrive Dev Team


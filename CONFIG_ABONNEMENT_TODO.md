# Configuration à Compléter - Système d'Abonnement

## ⚠️ ACTIONS REQUISES AVANT LE DÉPLOIEMENT

### 1. Numéro de Compte Bancaire

**Fichier** : `src/components/DriverSubscription.tsx`  
**Ligne** : ~23

```typescript
// AVANT (à remplacer)
const BANK_ACCOUNT = "À fournir";

// APRÈS (exemple)
const BANK_ACCOUNT = "10 123 4567890123456 78"; // Votre RIB complet
```

**Action** : Remplacer par le vrai numéro de compte bancaire de TuniDrive SARL.

---

### 2. Appliquer la Migration SQL

Une fois le numéro de compte configuré, exécuter la migration :

```bash
# Depuis le répertoire du projet
supabase db push

# OU si vous utilisez un autre outil
psql -d votre_base -f supabase/migrations/20251010150000_add_driver_subscription_system.sql
```

---

### 3. Configurer le Cron Job de Réinitialisation Mensuelle

Le compteur de courses gratuites doit être réinitialisé chaque début de mois.

#### Option A : Supabase (recommandé si disponible)
```sql
-- Créer un cron job Supabase (si disponible dans votre plan)
-- À exécuter le 1er de chaque mois à 00:00
SELECT cron.schedule(
  'reset-monthly-bookings',
  '0 0 1 * *',  -- Le 1er de chaque mois à minuit
  'SELECT reset_monthly_bookings()'
);
```

#### Option B : Service externe
Configurer un service externe (comme un GitHub Action, AWS Lambda, etc.) pour appeler :
```sql
SELECT reset_monthly_bookings();
```

#### Option C : Manuel (temporaire)
En attendant la mise en place automatique, exécuter manuellement chaque 1er du mois :
```sql
SELECT reset_monthly_bookings();
```

**Note** : Le quota gratuit est de **2 courses par mois**.

---

### 4. Configurer le Cron Job d'Expiration des Abonnements

Pour marquer les abonnements expirés :

```sql
-- À exécuter quotidiennement
SELECT cron.schedule(
  'expire-subscriptions',
  '0 2 * * *',  -- Chaque jour à 2h du matin
  $$
  -- Expirer les abonnements
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
  $$
);
```

---

### 5. Test Initial

Après configuration, tester le système :

1. **Créer un chauffeur de test**
2. **Accepter 2 courses** → Devrait fonctionner normalement
3. **Tenter d'en accepter une 3ème** → Message bloquant attendu
4. **Créer une demande d'abonnement Premium**
5. **Valider le paiement** (admin) :
   ```sql
   UPDATE driver_subscriptions
   SET payment_status = 'paid',
       payment_date = NOW(),
       payment_reference = 'TEST-001'
   WHERE driver_id = 'votre-test-driver-id';
   
   UPDATE drivers
   SET subscription_type = 'premium'
   WHERE id = 'votre-test-driver-id';
   ```
6. **Vérifier que le chauffeur peut accepter >2 courses (illimité)**

---

### 6. Formation de l'Équipe Admin

S'assurer que les admins savent comment :

1. **Vérifier une demande d'abonnement**
   ```sql
   SELECT * FROM driver_subscriptions
   WHERE payment_status = 'pending'
   ORDER BY created_at DESC;
   ```

2. **Valider un paiement**
   ```sql
   UPDATE driver_subscriptions
   SET 
     payment_status = 'paid',
     payment_date = NOW(),
     payment_reference = 'REF_DU_VIREMENT'
   WHERE id = 'id-de-la-demande';
   
   -- Activer le compte Premium du chauffeur
   UPDATE drivers
   SET subscription_type = 'premium'
   WHERE id = 'id-du-chauffeur';
   ```

3. **Annuler une demande**
   ```sql
   UPDATE driver_subscriptions
   SET status = 'cancelled'
   WHERE id = 'id-de-la-demande';
   ```

---

## Checklist de Déploiement

- [ ] Numéro de compte bancaire configuré dans `DriverSubscription.tsx`
- [ ] Migration SQL appliquée sur la base de production
- [ ] Cron job de réinitialisation mensuelle configuré
- [ ] Cron job d'expiration des abonnements configuré
- [ ] Tests effectués sur environnement de test
- [ ] Équipe admin formée sur la validation des paiements
- [ ] Documentation distribuée à l'équipe
- [ ] Système de notification configuré pour les nouvelles demandes
- [ ] Sauvegarde de la base de données avant déploiement

---

## Support et Maintenance

### Requêtes SQL Utiles

**Voir tous les chauffeurs avec leur statut d'abonnement :**
```sql
SELECT 
  d.id,
  d.first_name || ' ' || d.last_name as name,
  d.subscription_type,
  d.monthly_accepted_bookings,
  COALESCE(
    (SELECT COUNT(*) 
     FROM driver_subscriptions ds 
     WHERE ds.driver_id = d.id 
       AND ds.status = 'active'
       AND ds.payment_status = 'paid'
       AND ds.end_date >= CURRENT_DATE
    ), 0
  ) as active_premium_count
FROM drivers d
ORDER BY d.subscription_type DESC, d.monthly_accepted_bookings DESC;
```

**Voir les demandes d'abonnement en attente :**
```sql
SELECT 
  ds.id,
  ds.driver_id,
  d.first_name || ' ' || d.last_name as driver_name,
  d.email,
  d.phone,
  ds.created_at,
  ds.total_price_tnd,
  ds.payment_status
FROM driver_subscriptions ds
JOIN drivers d ON d.id = ds.driver_id
WHERE ds.payment_status = 'pending'
ORDER BY ds.created_at DESC;
```

**Statistiques mensuelles :**
```sql
SELECT 
  COUNT(CASE WHEN subscription_type = 'free' THEN 1 END) as free_drivers,
  COUNT(CASE WHEN subscription_type = 'premium' THEN 1 END) as premium_drivers,
  SUM(monthly_accepted_bookings) as total_bookings_this_month,
  AVG(monthly_accepted_bookings) as avg_bookings_per_driver
FROM drivers
WHERE status = 'active';
```

---

## Contact

En cas de problème ou question :
- Consulter `SYSTEME_ABONNEMENT_CHAUFFEURS.md` pour la documentation complète
- Contacter l'équipe de développement
- Vérifier les logs Supabase pour les erreurs

---

**Date de création** : 10 Octobre 2025  
**Priorité** : HAUTE - Requis pour la production  
**Responsable** : Équipe Admin & DevOps


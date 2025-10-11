# 🔧 Correction de la Migration SQL - Résolu

## ❌ Problème Rencontré

```
ERROR: 42P13: cannot change return type of existing function
DETAIL: Row type defined by OUT parameters is different.
HINT: Use DROP FUNCTION get_driver_subscription_status(uuid) first.
```

## ✅ Solution Appliquée

La migration a été corrigée pour supprimer toutes les fonctions et vues existantes avant de les recréer.

### Modifications Apportées

#### 1. Nettoyage Général (début de migration)
```sql
-- 0. Nettoyage des anciennes fonctions
DROP FUNCTION IF EXISTS reset_monthly_bookings();
```

#### 2. Fonction `increment_driver_lifetime_bookings`
```sql
-- Avant la création, supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS increment_driver_monthly_bookings();

CREATE OR REPLACE FUNCTION increment_driver_lifetime_bookings()
...
```

#### 3. Fonction `get_driver_subscription_status`
```sql
-- Avant la création, supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS get_driver_subscription_status(UUID);

CREATE OR REPLACE FUNCTION get_driver_subscription_status(p_driver_id UUID)
...
```

#### 4. Fonction `calculate_subscription_price`
```sql
-- Avant la création, supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS calculate_subscription_price(VARCHAR, DECIMAL, DECIMAL);

CREATE OR REPLACE FUNCTION calculate_subscription_price(...)
...
```

#### 5. Vue `driver_subscription_details`
```sql
-- Avant la création, supprimer l'ancienne vue
DROP VIEW IF EXISTS driver_subscription_details;

CREATE OR REPLACE VIEW driver_subscription_details AS
...
```

## 🚀 Réessayer la Migration

Maintenant vous pouvez réessayer d'appliquer la migration :

### Via Supabase Dashboard
1. Allez dans SQL Editor
2. Collez le contenu du fichier `20251011000000_update_subscription_logic_lifetime_and_yearly.sql`
3. Cliquez sur "Run"

### Via Supabase CLI
```bash
supabase db push
```

### Via Migration Manuelle
```bash
# Copier le fichier dans le bon dossier puis
supabase migration up
```

## ✅ Vérification Post-Migration

Après avoir appliqué la migration, vérifiez que tout fonctionne :

### 1. Vérifier les nouvelles colonnes
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'drivers' 
  AND column_name IN ('lifetime_accepted_bookings', 'has_used_free_trial');
```

Résultat attendu :
```
column_name                  | data_type
-----------------------------+-----------
lifetime_accepted_bookings   | integer
has_used_free_trial          | boolean
```

### 2. Vérifier la fonction
```sql
SELECT proname, prorettype 
FROM pg_proc 
WHERE proname = 'get_driver_subscription_status';
```

### 3. Tester la fonction avec un chauffeur
```sql
-- Remplacer UUID_DRIVER par un vrai ID
SELECT * FROM get_driver_subscription_status('UUID_DRIVER');
```

Résultat attendu :
```
has_active_subscription | subscription_type | monthly_accepted_bookings | can_accept_more_bookings | remaining_free_bookings | lifetime_accepted_bookings | has_used_free_trial | subscription_end_date
-----------------------|-------------------|---------------------------|--------------------------|------------------------|---------------------------|--------------------|-----------------------
false                  | free              | 0                         | true                     | 3                      | 0                         | false              | NULL
```

### 4. Vérifier la vue
```sql
SELECT * FROM driver_subscription_details LIMIT 5;
```

### 5. Vérifier la migration des données
```sql
-- Vérifier que les données ont été migrées
SELECT 
  COUNT(*) as total_drivers,
  COUNT(*) FILTER (WHERE lifetime_accepted_bookings > 0) as drivers_avec_courses,
  COUNT(*) FILTER (WHERE has_used_free_trial = TRUE) as drivers_trial_epuise
FROM drivers;
```

## 🔍 En Cas de Problème

### Si vous avez encore des erreurs

1. **Vérifier les dépendances**
   ```sql
   -- Voir toutes les fonctions qui utilisent get_driver_subscription_status
   SELECT DISTINCT p.proname
   FROM pg_proc p
   WHERE p.prosrc LIKE '%get_driver_subscription_status%';
   ```

2. **Supprimer manuellement toutes les versions**
   ```sql
   -- Supprimer toutes les versions de la fonction
   DROP FUNCTION IF EXISTS get_driver_subscription_status(UUID) CASCADE;
   ```

3. **Vérifier les triggers**
   ```sql
   -- Voir tous les triggers sur bookings
   SELECT tgname, tgrelid::regclass, tgfoid::regproc
   FROM pg_trigger
   WHERE tgrelid = 'bookings'::regclass;
   ```

### Si la migration échoue à mi-parcours

PostgreSQL effectue la migration dans une transaction, donc :
- ✅ Soit TOUT est appliqué
- ✅ Soit RIEN n'est appliqué (rollback automatique)

Vous pouvez réessayer sans risque !

## 📝 Changements Clés de la Migration

### Colonnes Ajoutées
- `drivers.lifetime_accepted_bookings` → Compteur de courses à vie
- `drivers.has_used_free_trial` → A utilisé ses 3 courses gratuites
- `driver_subscriptions.billing_period` → 'monthly' ou 'yearly'

### Fonctions Modifiées
- `get_driver_subscription_status()` → Retourne 3 nouvelles colonnes
- Nouvelle : `calculate_subscription_price()` → Calcule les prix

### Triggers Modifiés
- `trigger_increment_monthly_bookings` → Remplacé par `trigger_increment_lifetime_bookings`

### Vues Ajoutées
- `driver_subscription_details` → Vue combinée drivers + subscriptions

## ✨ Résultat Final

Après migration réussie, vous aurez :
- ✅ 3 courses gratuites lifetime au lieu de 2/mois
- ✅ Support de l'abonnement annuel avec 10% de réduction
- ✅ Toutes les données existantes migrées automatiquement
- ✅ Compatibilité arrière maintenue

## 🆘 Support

Si vous rencontrez toujours des problèmes après cette correction :
1. Vérifiez les logs complets de l'erreur
2. Consultez la documentation PostgreSQL sur les fonctions
3. Créez un backup avant toute manipulation manuelle

---

**✅ Migration Corrigée et Prête !**

La migration devrait maintenant fonctionner sans erreur. Réessayez l'application de la migration avec le fichier mis à jour.

**Fichier corrigé** : `supabase/migrations/20251011000000_update_subscription_logic_lifetime_and_yearly.sql`


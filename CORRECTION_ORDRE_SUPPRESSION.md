# 🔧 Correction Ordre de Suppression - Triggers et Fonctions

## ❌ Nouvelle Erreur Rencontrée

```
ERROR: 2BP01: cannot drop function increment_driver_monthly_bookings() 
because other objects depend on it
DETAIL: trigger trigger_increment_monthly_bookings on table bookings 
depends on function increment_driver_monthly_bookings()
HINT: Use DROP ... CASCADE to drop the dependent objects too.
```

## 🎯 Cause du Problème

PostgreSQL ne peut pas supprimer une fonction si un trigger l'utilise encore.

**Ordre incorrect** ❌ :
1. Supprimer la fonction
2. Le trigger essaie de l'utiliser → ERREUR

**Ordre correct** ✅ :
1. Supprimer le trigger d'abord
2. Puis supprimer la fonction

## ✅ Solution Appliquée

### Modifications dans la Migration

**Section de Nettoyage (lignes 4-10)** :

```sql
-- 0. Nettoyage des anciennes fonctions et triggers (dans le bon ordre)
-- D'abord supprimer les triggers qui dépendent des fonctions
DROP TRIGGER IF EXISTS trigger_increment_monthly_bookings ON bookings;

-- Ensuite supprimer les fonctions
DROP FUNCTION IF EXISTS reset_monthly_bookings();
DROP FUNCTION IF EXISTS increment_driver_monthly_bookings();
```

**Ordre d'exécution** :
1. ✅ Supprimer le **trigger** `trigger_increment_monthly_bookings`
2. ✅ Supprimer la **fonction** `increment_driver_monthly_bookings()`
3. ✅ Supprimer la **fonction** `reset_monthly_bookings()`
4. ✅ Créer la nouvelle fonction `increment_driver_lifetime_bookings()`
5. ✅ Créer le nouveau trigger `trigger_increment_lifetime_bookings`

## 🔍 Ordre des Dépendances PostgreSQL

Dans PostgreSQL, l'ordre de suppression est important :

```
Trigger (dépend de) → Fonction
    ↓
Doit être supprimé EN PREMIER

Fonction
    ↓
Peut être supprimée APRÈS
```

### Règle Générale
1. **Supprimer les objets dépendants d'abord** (triggers, vues, contraintes)
2. **Supprimer les objets de base ensuite** (fonctions, tables)

## 🚀 Réessayer la Migration

Le fichier a été corrigé :
**`supabase/migrations/20251011000000_update_subscription_logic_lifetime_and_yearly.sql`**

### Via Supabase Dashboard
1. Ouvrez **SQL Editor**
2. Copiez-collez le contenu du fichier corrigé
3. Cliquez sur **"Run"**
4. ✅ Devrait fonctionner maintenant !

### Via Supabase CLI
```bash
supabase db push
```

## 📋 Checklist de Vérification

Après migration réussie :

### 1. Vérifier que l'ancien trigger a été supprimé
```sql
SELECT tgname 
FROM pg_trigger 
WHERE tgrelid = 'bookings'::regclass 
  AND tgname = 'trigger_increment_monthly_bookings';
```
**Résultat attendu** : Aucune ligne (trigger supprimé)

### 2. Vérifier que le nouveau trigger existe
```sql
SELECT tgname, tgfoid::regproc
FROM pg_trigger 
WHERE tgrelid = 'bookings'::regclass 
  AND tgname = 'trigger_increment_lifetime_bookings';
```
**Résultat attendu** : 
```
tgname                           | tgfoid
---------------------------------|--------------------------------
trigger_increment_lifetime_bookings | increment_driver_lifetime_bookings
```

### 3. Vérifier les nouvelles colonnes
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'drivers' 
  AND column_name IN ('lifetime_accepted_bookings', 'has_used_free_trial');
```
**Résultat attendu** :
```
column_name                 | data_type | column_default
---------------------------|-----------|-----------------
lifetime_accepted_bookings  | integer   | 0
has_used_free_trial         | boolean   | false
```

### 4. Tester le nouveau trigger
```sql
-- Créer une réservation test et l'accepter
INSERT INTO bookings (client_id, driver_id, status, ...)
VALUES (...);

-- L'accepter
UPDATE bookings 
SET status = 'accepted' 
WHERE id = 'UUID_TEST';

-- Vérifier que le compteur lifetime a été incrémenté
SELECT lifetime_accepted_bookings 
FROM drivers 
WHERE id = 'UUID_DRIVER';
```

### 5. Vérifier la fonction de statut
```sql
SELECT * FROM get_driver_subscription_status('UUID_DRIVER');
```
**Résultat attendu** : Retourne 7 colonnes dont `lifetime_accepted_bookings`

## 🔧 Commandes de Dépannage

### Si vous devez nettoyer manuellement

```sql
-- Supprimer tous les anciens triggers
DROP TRIGGER IF EXISTS trigger_increment_monthly_bookings ON bookings CASCADE;

-- Supprimer toutes les anciennes fonctions
DROP FUNCTION IF EXISTS increment_driver_monthly_bookings() CASCADE;
DROP FUNCTION IF EXISTS reset_monthly_bookings() CASCADE;

-- Vérifier qu'il n'y a plus de dépendances
SELECT * FROM pg_depend 
WHERE refobjid = 'increment_driver_monthly_bookings'::regproc;
```

### Voir tous les triggers sur bookings
```sql
SELECT 
  tgname as trigger_name,
  tgfoid::regproc as function_name,
  tgenabled as enabled
FROM pg_trigger 
WHERE tgrelid = 'bookings'::regclass
  AND tgname NOT LIKE 'pg_%'
ORDER BY tgname;
```

### Voir toutes les fonctions liées aux bookings
```sql
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
WHERE p.proname LIKE '%booking%'
  OR p.proname LIKE '%driver%'
ORDER BY p.proname;
```

## 💡 Comprendre les Dépendances PostgreSQL

### Hiérarchie des Objets
```
TABLE (bookings)
  ↓
TRIGGER (trigger_increment_monthly_bookings)
  ↓
FUNCTION (increment_driver_monthly_bookings)
```

### Règles de Suppression
- **Sans CASCADE** : Erreur si dépendances existent
- **Avec CASCADE** : Supprime l'objet ET toutes ses dépendances
- **IF EXISTS** : Pas d'erreur si l'objet n'existe pas

### Exemple avec CASCADE
```sql
-- Supprime la fonction ET le trigger qui l'utilise
DROP FUNCTION increment_driver_monthly_bookings() CASCADE;

-- Équivalent à :
DROP TRIGGER trigger_increment_monthly_bookings ON bookings;
DROP FUNCTION increment_driver_monthly_bookings();
```

## 📊 Comparaison Avant/Après

### Avant (Ancien Système)
```
bookings UPDATE → trigger_increment_monthly_bookings
                       ↓
                 increment_driver_monthly_bookings()
                       ↓
                 drivers.monthly_accepted_bookings++
                       ↓
                 Reset chaque mois
```

### Après (Nouveau Système)
```
bookings UPDATE → trigger_increment_lifetime_bookings
                       ↓
                 increment_driver_lifetime_bookings()
                       ↓
                 drivers.lifetime_accepted_bookings++
                       ↓
                 Jamais de reset (lifetime)
```

## ✅ Résultat Attendu

Après migration réussie :
- ✅ Ancien trigger supprimé
- ✅ Nouvelle fonction créée
- ✅ Nouveau trigger créé
- ✅ Compteur lifetime opérationnel
- ✅ Système de 3 courses gratuites lifetime actif

## 🆘 Si Ça ne Fonctionne Toujours Pas

1. **Vérifier qu'il n'y a pas d'autres dépendances** :
   ```sql
   SELECT 
     classid::regclass as dependent_type,
     objid,
     objsubid,
     deptype
   FROM pg_depend
   WHERE refobjid = 'increment_driver_monthly_bookings'::regproc;
   ```

2. **Forcer la suppression avec CASCADE** :
   ```sql
   DROP FUNCTION increment_driver_monthly_bookings() CASCADE;
   ```

3. **Relancer la migration complète**

---

**✅ Migration Corrigée !**

Le fichier de migration respecte maintenant l'ordre correct de suppression :
1. Triggers d'abord
2. Fonctions ensuite
3. Création des nouveaux objets

**Fichier mis à jour** : `supabase/migrations/20251011000000_update_subscription_logic_lifetime_and_yearly.sql`

La migration devrait maintenant s'exécuter sans erreur ! 🚀


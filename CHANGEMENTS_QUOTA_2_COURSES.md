# ✅ Modification du Quota Gratuit : 3 → 2 Courses

## 📋 Résumé des Changements

Le quota de courses gratuites pour les chauffeurs a été réduit de **3 à 2 courses par mois**.

---

## 🔧 Changements Effectués

### 1. Migration SQL

**Fichier** : `supabase/migrations/20251010150000_add_driver_subscription_system.sql`

**Modifications** :
- ✅ Fonction `get_driver_subscription_status()` mise à jour
- ✅ Condition changée : `monthly_accepted_bookings < 2` (au lieu de < 3)
- ✅ Calcul restant : `GREATEST(0, 2 - monthly_accepted_bookings)` (au lieu de 3)
- ✅ Commentaire SQL mis à jour

**Nouvelle migration** : `supabase/migrations/20251010151000_update_free_quota_to_2.sql`
- Migration additionnelle pour mettre à jour uniquement la fonction si la première migration a déjà été appliquée

### 2. Composant DriverSubscription.tsx

**Modifications** :
- ✅ Message "Limité à 2 courses/mois" (ligne ~196)
- ✅ Compteur affiche "/ 2" (ligne ~217)
- ✅ Barre de progression calculée sur 2 (ligne ~226)
- ✅ Message d'alerte "vos 2 courses gratuites" (ligne ~256)

### 3. Composant DriverDashboard.tsx

**Modifications** :
- ✅ Message popup : "accepté 2 courses" (ligne ~241)
- ✅ Alerte dashboard : "vos 2 courses gratuites" (ligne ~1068)

### 4. Documentation

**Fichiers mis à jour** :
- ✅ `SYSTEME_ABONNEMENT_CHAUFFEURS.md`
- ✅ `RESUME_ABONNEMENT.md`
- ✅ `CONFIG_ABONNEMENT_TODO.md`

---

## 🗄️ Impact Base de Données

### Si la migration n'a PAS encore été appliquée :

**Action** : Appliquer la migration principale (déjà corrigée)
```bash
supabase db push
```

La migration contient déjà la limite de 2 courses.

### Si la migration a DÉJÀ été appliquée avec 3 courses :

**Action** : Appliquer la migration additionnelle
```bash
# Appliquer la nouvelle migration
supabase db push

# OU manuellement via SQL Editor
```

**Ou exécuter directement ce SQL** :
```sql
-- Recréer la fonction avec le quota de 2
CREATE OR REPLACE FUNCTION get_driver_subscription_status(p_driver_id UUID)
RETURNS TABLE (
  has_active_subscription BOOLEAN,
  subscription_type VARCHAR(50),
  monthly_accepted_bookings INTEGER,
  can_accept_more_bookings BOOLEAN,
  remaining_free_bookings INTEGER
) AS $$
DECLARE
  v_driver_record RECORD;
  v_has_active_sub BOOLEAN;
BEGIN
  SELECT 
    d.subscription_type,
    d.monthly_accepted_bookings,
    d.monthly_bookings_reset_date,
    EXISTS(
      SELECT 1 FROM driver_subscriptions ds
      WHERE ds.driver_id = p_driver_id
        AND ds.status = 'active'
        AND ds.payment_status = 'paid'
        AND ds.start_date <= CURRENT_DATE
        AND ds.end_date >= CURRENT_DATE
    ) as has_sub
  INTO v_driver_record
  FROM drivers d
  WHERE d.id = p_driver_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'free'::VARCHAR(50), 0, FALSE, 0;
    RETURN;
  END IF;
  
  IF v_driver_record.monthly_bookings_reset_date < DATE_TRUNC('month', CURRENT_DATE) THEN
    UPDATE drivers
    SET 
      monthly_accepted_bookings = 0,
      monthly_bookings_reset_date = CURRENT_DATE
    WHERE id = p_driver_id;
    
    v_driver_record.monthly_accepted_bookings := 0;
  END IF;
  
  v_has_active_sub := v_driver_record.has_sub;
  
  IF v_has_active_sub OR v_driver_record.subscription_type = 'premium' THEN
    RETURN QUERY SELECT 
      TRUE,
      'premium'::VARCHAR(50),
      v_driver_record.monthly_accepted_bookings,
      TRUE,
      999;
  ELSE
    -- NOUVEAU : Quota de 2 courses pour compte gratuit
    RETURN QUERY SELECT 
      FALSE,
      'free'::VARCHAR(50),
      v_driver_record.monthly_accepted_bookings,
      v_driver_record.monthly_accepted_bookings < 2,
      GREATEST(0, 2 - v_driver_record.monthly_accepted_bookings);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📊 Comparaison Avant/Après

| Aspect | Avant | Maintenant |
|--------|-------|------------|
| Quota gratuit | 3 courses/mois | 2 courses/mois |
| Message limite | "3 courses gratuites" | "2 courses gratuites" |
| Barre de progression | /3 | /2 |
| Calcul restant | 3 - X | 2 - X |

---

## 🎯 Comportement Attendu

### Nouveau Chauffeur (après migration)
1. S'inscrit → Compte gratuit (0/2)
2. Accepte 1ère course → (1/2) ✅
3. Accepte 2ème course → (2/2) ✅
4. Tente d'accepter 3ème course → ❌ Bloqué avec message Premium

### Chauffeur Existant (qui avait 2/3 avant)
1. Situation avant : 2/3 courses
2. Situation après migration : 2/2 courses (limite atteinte)
3. Ne peut plus accepter de courses
4. Doit attendre le mois prochain OU passer Premium

### Chauffeur Existant (qui avait 3/3 avant)
1. Situation avant : 3/3 courses
2. Situation après migration : 3/2 courses (au-delà de la limite!)
3. Ne peut plus accepter de courses
4. Sera réinitialisé à 0/2 le mois prochain

---

## ⚠️ Impact sur les Chauffeurs Existants

### Scénario A : Chauffeur avec 0 ou 1 course acceptée
- ✅ Pas d'impact, peut continuer normalement
- Nouvelle limite : Peut encore accepter 2 ou 1 courses

### Scénario B : Chauffeur avec 2 courses acceptées
- ⚠️ Atteint maintenant la limite (avant était à 2/3)
- Bloqué jusqu'au mois prochain ou passage Premium

### Scénario C : Chauffeur avec 3 courses acceptées
- ⚠️ Au-delà de la nouvelle limite
- Bloqué jusqu'au reset mensuel ou passage Premium

**Note** : Ces chauffeurs recevront automatiquement l'alerte sur leur dashboard pour passer Premium.

---

## 🔄 Si Vous Voulez Faire une Transition en Douceur

### Option 1 : Appliquer immédiatement
Les chauffeurs à 2 ou 3 courses seront bloqués. C'est acceptable si vous voulez inciter au passage Premium.

### Option 2 : Attendre le début du mois prochain
1. Ne pas appliquer la migration maintenant
2. Laisser finir le mois en cours avec quota de 3
3. Appliquer la migration le 1er du mois prochain
4. Tout le monde repart à 0/2

**Recommandation** : Option 1 pour inciter rapidement au Premium, Option 2 pour une transition plus douce.

---

## 📝 Checklist d'Application

- [ ] Vérifier si la migration principale a déjà été appliquée
- [ ] Décider de la stratégie (immédiat vs début de mois)
- [ ] Appliquer la migration SQL appropriée
- [ ] Tester avec un chauffeur de test
- [ ] Vérifier l'interface (compteur /2, messages corrects)
- [ ] Informer les chauffeurs du changement (email optionnel)
- [ ] Build et déploiement frontend

---

## 🧪 Test Rapide

```sql
-- Tester la nouvelle fonction
SELECT * FROM get_driver_subscription_status('uuid-dun-chauffeur-test');

-- Devrait retourner :
-- can_accept_more_bookings = TRUE si monthly_accepted_bookings < 2
-- can_accept_more_bookings = FALSE si monthly_accepted_bookings >= 2
```

---

## ✅ Validation

- ✅ Tous les fichiers code mis à jour
- ✅ Toutes les documentations mises à jour
- ✅ Migration SQL créée
- ✅ Compilation réussie
- ✅ Aucune erreur TypeScript

**Le changement est prêt à être déployé !**

---

**Date** : 10 Octobre 2025  
**Changement** : Quota gratuit 3 → 2 courses/mois  
**Version** : 1.1



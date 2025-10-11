# 📅 Guide - Gestion de l'Expiration des Abonnements

## 🎯 Vue d'Ensemble

### Comment ça fonctionne ?

```
Chauffeur Premium
    ↓
Temps passe...
    ↓
J-7 jours → 🔔 Notification "Expire bientôt"
    ↓
J-1 jour → 🔔 Notification "Expire demain"
    ↓
Jour J (end_date) → 🔒 BLOCAGE automatique
    ↓
Chauffeur ne peut plus accepter de courses
    ↓
Doit renouveler son abonnement
```

---

## ✅ Vérification Automatique en Temps Réel

### 1. Vérification à chaque requête

La fonction `get_driver_subscription_status()` vérifie **automatiquement** :

```sql
-- Vérifie si la date actuelle est dans la période d'abonnement
WHERE ds.start_date <= CURRENT_DATE
  AND ds.end_date >= CURRENT_DATE
```

**Exemple** :
- Abonnement mensuel : `end_date = 2025-11-15`
- Aujourd'hui : `2025-11-15` → ✅ Actif
- Demain : `2025-11-16` → ❌ Expiré (bloqué automatiquement)

### 2. Comportement selon le type

| Type | Durée | Expiration | Blocage |
|------|-------|------------|---------|
| **Mensuel** | 30 jours | Après 1 mois | Automatique le jour J |
| **Annuel** | 365 jours | Après 1 an | Automatique après 1 an |

**Important** : 
- ✅ L'abonnement **annuel** reste actif pendant **toute l'année**
- ✅ Pas de vérification mensuelle pour l'annuel
- ✅ Expiration automatique à la date `end_date`

---

## 🔔 Système de Notifications (Nouveau)

### Migration SQL

J'ai créé une nouvelle migration : `20251011001000_add_subscription_expiration_management.sql`

Elle ajoute :
- ✅ Fonction pour marquer les abonnements expirés
- ✅ Fonction pour trouver ceux qui expirent bientôt
- ✅ Table de log des notifications
- ✅ Vue de surveillance
- ✅ Statistiques d'expiration

### Fonctions Principales

#### 1. Marquer les abonnements expirés

```sql
-- Exécuter quotidiennement (manuellement ou via cron)
SELECT * FROM mark_expired_subscriptions();
```

**Résultat** :
```
subscription_id | driver_id | driver_email | billing_period | expired_date
----------------|-----------|--------------|----------------|-------------
uuid-xxx        | uuid-yyy  | driver@...   | monthly        | 2025-11-15
```

**Action** : Change `status` de 'active' → 'expired'

#### 2. Obtenir ceux qui expirent bientôt

```sql
-- Abonnements qui expirent dans les 7 prochains jours
SELECT * FROM get_expiring_soon_subscriptions(7);

-- Dans 1 jour
SELECT * FROM get_expiring_soon_subscriptions(1);

-- Dans 30 jours
SELECT * FROM get_expiring_soon_subscriptions(30);
```

**Résultat** :
```
subscription_id | driver_name | driver_email | billing_period | end_date   | days_remaining | total_price_tnd
----------------|-------------|--------------|----------------|------------|----------------|----------------
uuid-xxx        | Ahmed Ben   | ahmed@...    | monthly        | 2025-11-20 | 5              | 35.70
```

#### 3. Statistiques d'expiration

```sql
-- Vue d'ensemble des expirations
SELECT * FROM get_subscription_expiration_stats();
```

**Résultat** :
```
total_active | expiring_in_7_days | expiring_in_30_days | expired_this_month | monthly_active | yearly_active
-------------|--------------------|--------------------|--------------------|--------------|--------------
45           | 8                  | 15                 | 12                 | 38           | 7
```

#### 4. Traitement quotidien automatique

```sql
-- Fonction principale à exécuter chaque jour
SELECT * FROM process_subscription_expirations();
```

**Résultat JSON** :
```json
{
  "processed_at": "2025-11-15 02:00:00",
  "expired_subscriptions_marked": 3,
  "expiring_in_7_days": 8,
  "expiring_in_1_day": 2,
  "status": "success"
}
```

---

## 📊 Vue de Surveillance

### Utiliser la vue `subscription_monitoring`

```sql
-- Voir tous les abonnements avec leur statut d'expiration
SELECT * FROM subscription_monitoring
ORDER BY days_remaining ASC
LIMIT 20;
```

**Résultat** :
```
driver_name | driver_email | billing_period | end_date   | days_remaining | expiration_status
------------|--------------|----------------|------------|----------------|------------------
Ahmed Ben   | ahmed@...    | monthly        | 2025-11-16 | 1              | Expire bientôt (7j)
Ali Triki   | ali@...      | monthly        | 2025-11-20 | 5              | Expire bientôt (7j)
Sami Khaled | sami@...     | yearly         | 2026-01-15 | 65             | Actif
```

### Filtrer par statut

```sql
-- Seulement ceux qui expirent bientôt
SELECT * FROM subscription_monitoring
WHERE expiration_status LIKE 'Expire%'
ORDER BY days_remaining ASC;

-- Seulement les expirés
SELECT * FROM subscription_monitoring
WHERE expiration_status = 'Expiré';
```

---

## 🤖 Automatisation avec Supabase

### Option 1 : Edge Function Quotidienne (Recommandé)

Créer une Edge Function qui s'exécute tous les jours :

**`supabase/functions/daily-subscription-check/index.ts`** :

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Exécuter le traitement quotidien
    const { data, error } = await supabase
      .rpc('process_subscription_expirations')

    if (error) throw error

    console.log('Traitement des expirations:', data)

    // Récupérer ceux qui expirent dans 7 jours
    const { data: expiring7d } = await supabase
      .rpc('get_expiring_soon_subscriptions', { days_before: 7 })

    // Envoyer des notifications (email, SMS, push)
    for (const subscription of expiring7d || []) {
      // TODO: Envoyer notification au chauffeur
      console.log(`Notification à envoyer: ${subscription.driver_email}`)
      
      // Logger la notification
      await supabase.rpc('log_expiration_notification', {
        p_subscription_id: subscription.subscription_id,
        p_driver_id: subscription.driver_id,
        p_notification_type: 'expiring_soon_7d',
        p_sent_via: 'email'
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        result: data,
        notifications_sent: expiring7d?.length || 0
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

**Automatiser avec Supabase Cron** :

Dans le Dashboard Supabase → Database → Cron Jobs :

```sql
SELECT cron.schedule(
  'daily-subscription-check',
  '0 2 * * *',  -- Tous les jours à 2h du matin
  $$
  SELECT net.http_post(
    url := 'https://votre-projet.supabase.co/functions/v1/daily-subscription-check',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  )
  $$
);
```

### Option 2 : Script Manuel (Temporaire)

Créer un script Node.js pour exécuter manuellement :

**`scripts/check-subscriptions.js`** :

```javascript
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSubscriptions() {
  console.log('🔍 Vérification des abonnements...')
  
  // Traiter les expirations
  const { data, error } = await supabase
    .rpc('process_subscription_expirations')
  
  if (error) {
    console.error('❌ Erreur:', error)
    return
  }
  
  console.log('✅ Résultat:', data)
  
  // Afficher ceux qui expirent bientôt
  const { data: expiring } = await supabase
    .rpc('get_expiring_soon_subscriptions', { days_before: 7 })
  
  console.log(`\n📊 ${expiring?.length || 0} abonnements expirent dans 7 jours`)
  
  expiring?.forEach(sub => {
    console.log(`  - ${sub.driver_email}: ${sub.days_remaining} jours restants`)
  })
}

checkSubscriptions()
```

**Exécuter** :
```bash
node scripts/check-subscriptions.js
```

---

## 📧 Notifications aux Chauffeurs

### Scénarios de notification

| Événement | Quand | Message |
|-----------|-------|---------|
| **J-7** | 7 jours avant | "Votre abonnement expire dans 7 jours" |
| **J-1** | 1 jour avant | "Votre abonnement expire demain" |
| **Jour J** | Le jour même | "Votre abonnement a expiré - Renouvelez maintenant" |

### Logger les notifications envoyées

```sql
-- Enregistrer qu'une notification a été envoyée
SELECT log_expiration_notification(
  'UUID_SUBSCRIPTION',
  'UUID_DRIVER',
  'expiring_soon_7d',
  'email'
);

-- Vérifier si déjà envoyée
SELECT has_notification_been_sent(
  'UUID_SUBSCRIPTION',
  'expiring_soon_7d'
);
```

### Voir l'historique des notifications

```sql
SELECT 
  sen.notification_type,
  sen.sent_at,
  sen.sent_via,
  d.email as driver_email,
  ds.end_date
FROM subscription_expiration_notifications sen
JOIN drivers d ON sen.driver_id = d.id
JOIN driver_subscriptions ds ON sen.subscription_id = ds.id
ORDER BY sen.sent_at DESC;
```

---

## 🧪 Tests

### Tester l'expiration manuelle

```sql
-- Créer un abonnement qui expire demain
INSERT INTO driver_subscriptions (
  driver_id,
  start_date,
  end_date,
  subscription_type,
  billing_period,
  price_tnd,
  vat_percentage,
  total_price_tnd,
  payment_status,
  status
) VALUES (
  'UUID_DRIVER',
  CURRENT_DATE - INTERVAL '29 days',
  CURRENT_DATE + INTERVAL '1 day',  -- Expire demain
  'premium',
  'monthly',
  30.00,
  19.00,
  35.70,
  'paid',
  'active'
);

-- Vérifier qu'il apparaît dans les expirations
SELECT * FROM get_expiring_soon_subscriptions(2);

-- Avancer manuellement la date (pour test)
UPDATE driver_subscriptions
SET end_date = CURRENT_DATE - INTERVAL '1 day'
WHERE id = 'UUID_SUBSCRIPTION';

-- Marquer comme expiré
SELECT * FROM mark_expired_subscriptions();

-- Vérifier le statut du chauffeur
SELECT * FROM get_driver_subscription_status('UUID_DRIVER');
-- Devrait retourner can_accept_more_bookings = false
```

---

## 📊 Requêtes Utiles

### Dashboard admin

```sql
-- Vue d'ensemble
SELECT 
  (SELECT COUNT(*) FROM drivers WHERE subscription_type = 'premium') as total_premium,
  (SELECT COUNT(*) FROM subscription_monitoring WHERE expiration_status LIKE 'Expire%') as expiring_soon,
  (SELECT COUNT(*) FROM subscription_monitoring WHERE expiration_status = 'Expiré') as expired,
  (SELECT SUM(total_price_tnd) FROM driver_subscriptions 
   WHERE payment_status = 'paid' AND end_date >= CURRENT_DATE) as revenue_active;
```

### Chauffeurs à contacter

```sql
-- Liste des chauffeurs à relancer (expire dans 7 jours)
SELECT 
  driver_email,
  driver_phone,
  billing_period,
  days_remaining,
  total_price_tnd
FROM subscription_monitoring
WHERE days_remaining BETWEEN 1 AND 7
ORDER BY days_remaining ASC;
```

### Revenus mensuels

```sql
-- Revenus des renouvellements du mois
SELECT 
  DATE_TRUNC('month', start_date) as month,
  billing_period,
  COUNT(*) as subscriptions,
  SUM(total_price_tnd) as revenue
FROM driver_subscriptions
WHERE payment_status = 'paid'
  AND start_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY month, billing_period;
```

---

## ✅ Checklist de Déploiement

- [ ] Appliquer la migration `20251011001000_add_subscription_expiration_management.sql`
- [ ] Vérifier que les fonctions sont créées
- [ ] Tester `mark_expired_subscriptions()`
- [ ] Tester `get_expiring_soon_subscriptions()`
- [ ] Configurer l'automatisation (Edge Function ou Cron)
- [ ] Mettre en place l'envoi de notifications (email/SMS)
- [ ] Tester le parcours complet
- [ ] Documenter pour l'équipe

---

## 🎯 Résumé

### ✅ Ce qui est automatique
- Vérification en temps réel à chaque requête
- Blocage immédiat après expiration
- Abonnement annuel valide toute l'année

### ✅ Ce qui nécessite automatisation
- Marquage des statuts "expired"
- Envoi des notifications J-7, J-1
- Rapports statistiques quotidiens

### 💡 Recommandations
1. Exécuter `process_subscription_expirations()` **quotidiennement**
2. Envoyer notifications à J-7 et J-1
3. Surveiller la vue `subscription_monitoring`
4. Analyser les statistiques hebdomadairement

---

**✅ Système Complet de Gestion des Expirations !**

Les chauffeurs seront bloqués automatiquement après expiration et pourront renouveler leur abonnement (mensuel ou annuel) via l'interface.


# Déploiement : abonnements chauffeurs (sécurité, tarif, notifications)

Ce document regroupe tout ce qu'il faut faire, dans l'ordre, pour mettre en production les correctifs
et fonctionnalités du module d'abonnement des chauffeurs. **Rien n'est appliqué automatiquement** :
les migrations sont dans `supabase/migrations/`, les retours arrière dans `supabase/rollbacks/`, la
migration différée dans `supabase/deferred/`.

> Les apps Android et iOS partagent la même base. Les étapes 6 et 7 peuvent bloquer une app mobile
> qui n'a pas été adaptée : voir la checklist de la section 5 et testez d'abord sur un projet de
> staging.

## 1. Ce qui change

| Sujet | Problème corrigé | Où |
|---|---|---|
| Insertion d'un abonnement « payé » | Un chauffeur pouvait créer lui-même une ligne `paid` | migration `110000` |
| Colonnes d'abonnement de `drivers` | Un chauffeur pouvait se mettre `premium` ou remettre son quota à 0 | migration `120000` |
| Statut du compte `drivers.status` | Un chauffeur pouvait se valider lui-même | migration `150000` |
| Fonctions d'expiration et vue de supervision | Emails et téléphones lisibles avec la clé publique | migration `100000` |
| Prix de l'abonnement | Calculé et envoyé par le navigateur | migration `140000` + front |
| Expiration | Jamais traitée, aucune notification | migration `130000` + Edge Function |
| Email d'activation | Fonction publique, destinataire libre, échec silencieux | Edge Function + front admin |
| Dernier jour valide | Modal « expiré » affiché un jour trop tôt | front |
| Bouton « Copier » le RIB | Copiait `XXXX XXX XXX XXX XXX` | front |
| Renouvellement anticipé | Les jours restants étaient perdus | migration `140000` + front |

## 2. Fichiers concernés

**Migrations** (`supabase/migrations/`)

| Fichier | Rôle |
|---|---|
| `20261105100000_lock_subscription_functions_and_view.sql` | Verrouille les fonctions d'expiration et la vue `subscription_monitoring` |
| `20261105110000_restrict_driver_subscription_insert.sql` | Insertion d'une demande en attente uniquement |
| `20261105120000_protect_driver_subscription_columns.sql` | Trigger sur les colonnes d'abonnement et de quota de `drivers` |
| `20261105130000_subscription_expiration_notifications.sql` | Liste des rappels, anti-doublon, job `pg_cron` horaire |
| `20261105140000_subscription_server_side_pricing.sql` | Tarif et création de la demande côté serveur |
| `20261105150000_protect_driver_status.sql` | Trigger sur `drivers.status` |

**Différée** : `supabase/deferred/20261105141000_remove_direct_subscription_insert.sql`

**Edge Functions** (`supabase/functions/`)

| Fonction | Rôle |
|---|---|
| `process-subscription-expirations` | Nouvelle. Rappels J-7, J-1, expiré ; accusé de réception et alerte admin. Voir son `README.md`. |
| `send-driver-subscription-email` | Modifiée. Réservée aux admins, destinataire lu en base, une seule fois par événement. |
| `_shared/subscriptionReminders.ts` | Gabarits d'emails partagés par les deux fonctions |

**Front** : `DriverSubscription.tsx`, `DriverDashboard.tsx`, `AdminDashboard.tsx`, `utils/subscriptionPeriod.ts`.

## 3. Avant de commencer (vérifications en production)

À exécuter dans le SQL Editor de Supabase.

```sql
-- La table du journal existe (créée par la migration 20251011001000). Doit renvoyer son nom, pas null.
select to_regclass('public.subscription_expiration_notifications');

-- La colonne des notifications push existe sur drivers. Doit renvoyer une ligne.
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'drivers' and column_name = 'push_token';

-- Extensions du planificateur (déjà utilisées pour le blog). Doit renvoyer pg_cron et pg_net.
select extname from pg_extension where extname in ('pg_cron', 'pg_net');

-- Secret Vault déjà créé pour le blog. Doit renvoyer une ligne.
select name from vault.decrypted_secrets where name = 'project_url';

-- État réel des politiques (elles ont pu être modifiées à la main dans le dashboard).
select tablename, policyname, cmd, roles, with_check
  from pg_policies
 where tablename in ('drivers', 'driver_subscriptions')
 order by tablename, policyname;
```

Si l'une des deux premières requêtes renvoie `null` ou aucune ligne, **ne pas appliquer la migration
`130000`** avant d'avoir corrigé la cause.

## 4. Ordre d'application

### Étape 1 : verrouiller les fonctions et la vue
Appliquer `20261105100000`. À faire en premier : `process-subscription-expirations` appelle
`mark_expired_subscriptions` avec `service_role`, et ce droit est accordé ici.

Vérifier, avec la clé publique et sans session (doit répondre 401 ou 403) :

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/get_expiring_soon_subscriptions" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" -d '{"days_before": 30}'
```

### Étape 2 : notifications (journal et planification)
Appliquer `20261105130000`. Sans risque pour les apps : le job `pg_cron` ne fait rien tant que le secret
Vault `subscription_cron_secret` n'existe pas, donc aucun envoi ne part encore.

Cette migration est aussi **requise par le nouvel email d'activation** (étape 4) : il utilise les
fonctions `claim_subscription_notification` et `release_subscription_notification` qu'elle crée.

### Étape 3 : tarif et demande côté serveur
Appliquer `20261105140000`. À faire **avant** de déployer le nouveau front : l'écran chauffeur appelle
`get_subscription_pricing` et `request_driver_subscription`.

### Étape 4 : déployer les fonctions et le front, ensemble
1. Secrets de la fonction (Dashboard > Edge Functions > Secrets, ou `supabase secrets set`) :

   | Nom | Obligatoire | Rôle |
   |---|---|---|
   | `SUBSCRIPTION_CRON_SECRET` | oui | secret partagé avec le job cron (étape 5). **Valeur nouvelle et aléatoire, sans rapport avec `BLOG_CRON_SECRET`** : générer avec `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `RESEND_API_KEY` | oui | envoi des emails |
   | `SITE_URL` | non | défaut `https://tunidrive.net` |
   | `ADMIN_NOTIFICATION_EMAILS` | non | destinataires des alertes admin, séparés par des virgules ; **défaut : `support@tunidrive.net`** |

2. Déployer :

   ```bash
   supabase functions deploy process-subscription-expirations --no-verify-jwt
   supabase functions deploy send-driver-subscription-email
   ```

3. Déployer le front.

> **`--no-verify-jwt` est obligatoire pour `process-subscription-expirations`** : le job cron s'authentifie
> avec son secret (`x-subscription-cron-secret`), pas avec un JWT. Si la vérification JWT est active
> (cas par défaut d'un déploiement depuis le Dashboard), la passerelle répond **401
> `UNAUTHORIZED_NO_AUTH_HEADER`** avant même d'atteindre la fonction. Le `config.toml` du dossier de la
> fonction ne remplace pas ce drapeau (la CLI lit `supabase/config.toml`, section `[functions.nom]`).
> `send-driver-subscription-email`, elle, garde la vérification JWT activée : l'admin envoie son jeton.

Le front admin et `send-driver-subscription-email` doivent partir **en même temps** : leur format
d'appel a changé. Si un seul des deux est à jour, l'email d'activation échoue (l'admin voit alors un
message d'alerte l'invitant à prévenir le chauffeur directement).

### Étape 5 : mettre en route les rappels
1. Créer le secret Vault, avec **la même valeur** que `SUBSCRIPTION_CRON_SECRET` (la valeur nouvelle de l'étape 4, pas celle du blog). Les secrets des Edge Functions ne sont pas relisibles : la conserver jusqu'à ce que les deux soient enregistrés, sinon en générer une nouvelle et la remettre aux deux endroits :

   ```sql
   select vault.create_secret('<la-même-valeur>', 'subscription_cron_secret');
   ```

2. **Essai à blanc** : liste ce qui serait envoyé, sans rien envoyer ni modifier.

   ```bash
   curl -X POST "$SUPABASE_URL/functions/v1/process-subscription-expirations" \
     -H "x-subscription-cron-secret: $SUBSCRIPTION_CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"dry_run": true, "force": true}'
   ```

   Lire `reminders.planned` et `requests.planned`. **Le premier passage réel enverra un email à tous
   les chauffeurs déjà dans la fenêtre J-7 ou expirés depuis moins de 7 jours** : vérifier la liste
   avant de laisser le cron tourner.

3. Le job horaire démarre seul dès que le secret existe (minute 5 de chaque heure). Vérifier :

   ```sql
   select jobname, schedule, active from cron.job where jobname = 'process-subscription-expirations';
   select status, return_message, start_time from cron.job_run_details
    where jobid = (select jobid from cron.job where jobname = 'process-subscription-expirations')
    order by start_time desc limit 5;
   ```

   Pour arrêter : `select cron.unschedule('process-subscription-expirations');`

### Étape 6 : durcissements pouvant bloquer une app mobile
Tester sur staging avec les apps Android et iOS (section 5), puis appliquer **une migration à la fois**
en surveillant les erreurs avant la suivante :
- `20261105110000` : insertion d'une demande en attente uniquement ;
- `20261105120000` : colonnes d'abonnement et de quota protégées ;
- `20261105150000` : statut du compte protégé.

### Étape 7 : fermer définitivement l'insertion directe
Quand **toutes** les apps créent leurs demandes avec `request_driver_subscription` : copier
`supabase/deferred/20261105141000_remove_direct_subscription_insert.sql` dans `supabase/migrations/`
et l'appliquer. Tant que ce n'est pas fait, le montant d'une demande reste modifiable par l'API directe :
**vérifier le montant reçu avant de valider un virement.**

## 5. Checklist de compatibilité avec les apps mobiles

À confirmer dans le code des apps (ou par un test sur staging) :

- [ ] La demande d'abonnement insère `payment_status = 'pending'` et `status = 'active'`, sans
      `payment_reference` ni `payment_date` (sinon bloquée par `110000`).
- [ ] La demande d'abonnement appelle `request_driver_subscription` (nécessaire avant l'étape 7).
- [ ] L'app ne modifie jamais `subscription_type`, `lifetime_accepted_bookings`, `has_used_free_trial`,
      `monthly_accepted_bookings` ni `monthly_bookings_reset_date` (sinon bloquée par `120000`).
- [ ] L'app ne fait jamais passer un chauffeur à un statut autre que `pending` (sinon bloquée par `150000`).
- [ ] L'inscription chauffeur fonctionne (le statut est forcé à `pending`).
- [ ] Accepter une course incrémente toujours le compteur de courses gratuites.
- [ ] Le renouvellement d'un abonnement encore actif démarre la nouvelle période le **lendemain de la
      fin de l'actuelle** (comme le web), sinon le chauffeur perd les jours restants.
- [ ] Les notifications push de type `subscription` sont gérées (le champ `data` contient
      `{ type: 'subscription', screen: 'subscription' }`).

## 6. Retours arrière

Chaque migration a son fichier dans `supabase/rollbacks/` (voir le `README.md` de ce dossier). Ils sont
rangés hors de `migrations/` pour ne jamais s'exécuter automatiquement. Chaque fichier explique ce
qu'il rouvre comme risque.

| Migration | Retour arrière |
|---|---|
| `20261105100000` | `20261105100000_lock_subscription_functions_and_view.down.sql` |
| `20261105110000` | `20261105110000_restrict_driver_subscription_insert.down.sql` |
| `20261105120000` | `20261105120000_protect_driver_subscription_columns.down.sql` |
| `20261105130000` | `20261105130000_subscription_expiration_notifications.down.sql` (conserve le journal des envois) |
| `20261105140000` | `20261105140000_subscription_server_side_pricing.down.sql` (revenir aussi à l'ancien front) |
| `20261105150000` | `20261105150000_protect_driver_status.down.sql` |
| différée `141000` | `20261105141000_remove_direct_subscription_insert.down.sql` |

Les `.down.sql` ne s'exécutent que pour **annuler** : ne jamais les lancer pour activer une fonctionnalité.

## 7. Comportement attendu une fois en service

- **Chauffeurs** : rappels par email (et push si l'appareil a un token) à J-7, à J-1 ou le jour même,
  et à l'expiration (jusqu'à 7 jours après), **entre 8 h et 20 h heure de Tunis**. Un seul message par
  échéance ; une prolongation par l'admin déclenche de nouveaux rappels pour la nouvelle échéance.
  Aucun rappel si l'abonnement a été renouvelé ou prolongé. Un bandeau « Votre abonnement expire dans
  N jours » s'affiche aussi dans l'espace chauffeur dès 7 jours.
- **Nouvelle demande d'abonnement** : accusé de réception au chauffeur (référence de virement,
  montant) et alerte à l'admin, à toute heure.
- **Statuts** : les abonnements échus passent à `expired` automatiquement.
- **Email d'activation ou de prolongation** : envoyé depuis l'espace admin, une seule fois par
  événement ; en cas d'échec, l'admin est prévenu.

## 8. Ce qui n'est pas couvert

- Le prix est désormais fixé par la base, mais le canal d'insertion directe reste ouvert jusqu'à
  l'étape 7.
- Les autres Edge Functions d'envoi (`resend-email`, `send-password-reset`, `send-booking-*`, etc.)
  sont toujours publiques et peuvent être utilisées comme relais d'emails.
- La fonction `delete-account`, appelée par la page de suppression de compte, n'est pas dans
  `supabase/functions/` : vérifier qu'elle est déployée.
- `get_driver_subscription_status` et sa version groupée restent appelables par tout utilisateur
  connecté (la recherche de chauffeurs en dépend) : elles révèlent la date de fin d'abonnement.
- Pas de paiement en ligne : le rapprochement des virements reste manuel.

## 9. Ce qui a été testé, et ce qui ne l'a pas été

Testé sur une base PostgreSQL locale temporaire, avec les vraies migrations du dépôt, de vrais rôles
`anon` / `authenticated` / `service_role` et des emails simulés : accès refusés et autorisés, création
de demande, renouvellement anticipé validé par l'admin, protection des colonnes et du statut,
anti-doublon des emails, panne puis reprise, plage horaire, migration différée et retours arrière.

**Non testé** : le planificateur `pg_cron` et `pg_net` réels, les envois réels Resend et Expo, le runtime
Deno réel, les apps mobiles, et l'état exact de votre base de production (politiques modifiées à la main).
D'où l'étape de vérification de la section 3 et le passage par staging.

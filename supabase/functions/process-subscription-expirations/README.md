# process-subscription-expirations

Traitement horaire des abonnements chauffeurs, appelé par `pg_cron` (migration
`20261105130000_subscription_expiration_notifications.sql`).

## Ce qu'elle fait à chaque passage

1. Passe en `expired` les abonnements dont la date de fin est dépassée.
2. **Rappels aux chauffeurs** (email + push), uniquement entre 8 h et 20 h heure de Tunis :
   - `expiring_soon_7d` : fin dans 2 à 7 jours ;
   - `expiring_soon_1d` : fin aujourd'hui ou demain ;
   - `expired` : expiré depuis 7 jours au plus.
   Pas de rappel si l'abonnement a déjà été renouvelé ou prolongé.
3. **Nouvelles demandes d'abonnement** (à toute heure) : accusé de réception au chauffeur et alerte
   à l'administrateur.

Chaque message n'est envoyé qu'une fois par échéance (table `subscription_expiration_notifications`).
En cas d'échec d'envoi, la réservation est libérée et l'envoi est retenté au passage suivant.

## Mise en service

1. **Secrets de la fonction** (Dashboard Supabase > Edge Functions > Secrets, ou `supabase secrets set`) :

   | Nom | Obligatoire | Rôle |
   |---|---|---|
   | `SUBSCRIPTION_CRON_SECRET` | oui | secret partagé avec le job cron. Valeur nouvelle et aléatoire, **sans rapport avec `BLOG_CRON_SECRET`** (générer : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
   | `RESEND_API_KEY` | oui | envoi des emails (déjà utilisé par les autres fonctions) |
   | `SITE_URL` | non | défaut `https://tunidrive.net` (liens des emails) |
   | `ADMIN_NOTIFICATION_EMAILS` | non | destinataires des alertes admin, séparés par des virgules ; défaut `support@tunidrive.net` |

2. **Vault** (SQL Editor) : le secret `project_url` existe déjà pour le blog ; ajouter le même secret
   que `SUBSCRIPTION_CRON_SECRET` :

   ```sql
   select vault.create_secret('<la-même-valeur>', 'subscription_cron_secret');
   ```

3. **Déploiement** :

   ```bash
   supabase functions deploy process-subscription-expirations --no-verify-jwt
   ```

4. **Appliquer la migration** `20261105130000_subscription_expiration_notifications.sql`.

## Dépannage : erreur 401

| Réponse | Cause | Remède |
|---|---|---|
| `401` avec `UNAUTHORIZED_NO_AUTH_HEADER` | La vérification JWT est active : la passerelle Supabase rejette la requête avant la fonction | Redéployer avec `--no-verify-jwt`, ou désactiver « Verify JWT » dans les paramètres de la fonction (Dashboard) |
| `401` avec `{"error":"unauthorized"}` | La fonction est atteinte mais l'en-tête `x-subscription-cron-secret` est absent ou différent de `SUBSCRIPTION_CRON_SECRET` | Vérifier que la valeur est identique dans le secret de la fonction et dans Vault (`subscription_cron_secret`) |

Réponses du job cron : `select status_code, content from net._http_response order by created desc limit 5;`

## Tester sans rien envoyer

```bash
curl -X POST "$SUPABASE_URL/functions/v1/process-subscription-expirations" \
  -H "x-subscription-cron-secret: $SUBSCRIPTION_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true, "force": true}'
```

La réponse liste, dans `reminders.planned` et `requests.planned`, ce qui serait envoyé.
`force` ignore la plage 8 h - 20 h ; `dry_run` ne modifie ni n'envoie rien.

## Vérifier que le cron tourne

```sql
select jobname, schedule, active from cron.job where jobname = 'process-subscription-expirations';
select status, return_message, start_time from cron.job_run_details
  where jobid = (select jobid from cron.job where jobname = 'process-subscription-expirations')
  order by start_time desc limit 5;
```

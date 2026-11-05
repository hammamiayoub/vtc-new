# Retours arrière des migrations

Ces fichiers annulent des migrations de `supabase/migrations/`. Ils sont rangés **ici** et non
dans `migrations/` pour que `supabase db push` ne les exécute jamais automatiquement.

Pour annuler une migration : ouvrir le fichier `.down.sql` correspondant dans le SQL Editor de
Supabase et l'exécuter. Chaque fichier explique ce qu'il rouvre comme risque.

| Migration | Retour arrière |
|---|---|
| `20261105100000_lock_subscription_functions_and_view.sql` | `20261105100000_lock_subscription_functions_and_view.down.sql` |
| `20261105110000_restrict_driver_subscription_insert.sql` | `20261105110000_restrict_driver_subscription_insert.down.sql` |
| `20261105120000_protect_driver_subscription_columns.sql` | `20261105120000_protect_driver_subscription_columns.down.sql` |
| `20261105130000_subscription_expiration_notifications.sql` | `20261105130000_subscription_expiration_notifications.down.sql` |
| `20261105140000_subscription_server_side_pricing.sql` | `20261105140000_subscription_server_side_pricing.down.sql` |
| `20261105150000_protect_driver_status.sql` | `20261105150000_protect_driver_status.down.sql` |
| `deferred/20261105141000_remove_direct_subscription_insert.sql` | `20261105141000_remove_direct_subscription_insert.down.sql` |

Ordre conseillé en production : tester sur un projet de staging avec les applications web, Android
et iOS, puis appliquer une migration à la fois et surveiller les erreurs avant la suivante.

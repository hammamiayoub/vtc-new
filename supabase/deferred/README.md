# Migrations différées

Ces fichiers sont **prêts mais non actifs** : ils ne sont pas dans `supabase/migrations/`, donc
`supabase db push` ne les applique pas. Chacun explique en tête de fichier ce qu'il faut vérifier
avant de le déplacer dans `migrations/`.

| Fichier | À activer quand |
|---|---|
| `20261105141000_remove_direct_subscription_insert.sql` | Les apps Android et iOS créent leurs demandes d'abonnement avec `request_driver_subscription` |

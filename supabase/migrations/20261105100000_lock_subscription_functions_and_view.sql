-- Verrouille les fonctions d'expiration d'abonnement et la vue de supervision.
--
-- PROBLÈME
--   Ces objets exposent des données personnelles de chauffeurs (nom, email, téléphone, prix, statut de
--   paiement) et, pour certains, modifient des données. Ils étaient SECURITY DEFINER / hors RLS sans
--   REVOKE : par défaut Supabase autorise leur appel à `anon`, donc à toute personne qui détient la clé
--   publique du projet.
--     - mark_expired_subscriptions()              renvoie les emails ET met à jour les abonnements
--     - get_expiring_soon_subscriptions(integer)  renvoie nom, email, téléphone
--     - get_subscription_expiration_stats()       indicateurs de chiffre d'affaires
--     - process_subscription_expirations()        met à jour les abonnements
--     - log_expiration_notification / has_notification_been_sent
--     - vue subscription_monitoring               nom, email, téléphone, montants (ignore la RLS)
--
-- EFFET
--   Seuls `service_role` (Edge Functions, pg_cron) et `postgres` (SQL Editor) peuvent les appeler.
--   Aucun écran web n'appelle ces objets (vérifié dans src/). Les applications mobiles : à confirmer.
--   À l'avenir, un écran admin devra passer par une fonction qui vérifie `admin_users`.
--
-- NON TRAITÉ ICI (volontairement)
--   get_driver_subscription_status(es) restent ouvertes aux utilisateurs connectés : la recherche de
--   chauffeurs côté client en dépend. À restreindre séparément (ne renvoyer que des booléens).
--
-- VÉRIFICATION (avant puis après, avec la clé anon, sans session) :
--   curl -X POST "$SUPABASE_URL/rest/v1/rpc/get_expiring_soon_subscriptions" \
--     -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
--     -H "Content-Type: application/json" -d '{"days_before": 30}'
--   Avant : 200 avec des lignes. Après : 401/403 (permission denied for function).
--
-- RETOUR ARRIÈRE : supabase/rollbacks/20261105100000_lock_subscription_functions_and_view.down.sql

DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.mark_expired_subscriptions()',
    'public.get_expiring_soon_subscriptions(integer)',
    'public.get_subscription_expiration_stats()',
    'public.process_subscription_expirations()',
    'public.log_expiration_notification(uuid, uuid, character varying, character varying)',
    'public.has_notification_been_sent(uuid, character varying)'
  ]
  LOOP
    -- to_regprocedure renvoie NULL si la fonction n'existe pas : le script reste rejouable
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    END IF;
  END LOOP;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.subscription_monitoring') IS NOT NULL THEN
    -- La vue n'est utilisée par aucun écran : accès réservé au service
    REVOKE ALL ON public.subscription_monitoring FROM PUBLIC, anon, authenticated;
    GRANT SELECT ON public.subscription_monitoring TO service_role;

    -- Ceinture et bretelles : la vue applique les droits de l'appelant (PostgreSQL 15+),
    -- si on rouvre un jour l'accès à `authenticated`.
    BEGIN
      ALTER VIEW public.subscription_monitoring SET (security_invoker = true);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'security_invoker indisponible (%), l''accès restreint suffit', SQLERRM;
    END;
  END IF;
END
$$;

-- RETOUR ARRIÈRE de 20261105100000_lock_subscription_functions_and_view.sql
--
-- Rend aux fonctions d'expiration et à la vue de supervision leurs droits d'origine.
-- ATTENTION : cela rouvre l'accès aux données personnelles des chauffeurs (nom, email, téléphone)
-- à toute personne détenant la clé publique du projet. À n'utiliser que pour débloquer un usage
-- légitime en urgence, puis préférer une fonction qui vérifie admin_users.

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
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC, anon, authenticated, service_role', fn);
    END IF;
  END LOOP;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.subscription_monitoring') IS NOT NULL THEN
    BEGIN
      ALTER VIEW public.subscription_monitoring SET (security_invoker = false);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'security_invoker non modifié (%)', SQLERRM;
    END;
    GRANT SELECT ON public.subscription_monitoring TO anon, authenticated, service_role;
  END IF;
END
$$;

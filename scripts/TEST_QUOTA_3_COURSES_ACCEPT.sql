-- =============================================================================
-- TEST AUTOMATISÉ — Quota 3 courses gratuites + blocage serveur à l'acceptation
-- =============================================================================
--
-- Objectif :
--   1. Simuler 3 acceptations de course (pending → accepted)
--   2. Vérifier le compteur et get_driver_subscription_status après chaque étape
--   3. Tenter une 4e acceptation → doit échouer avec subscription_required
--   4. (Optionnel) Tester le chemin dispatch searching → accepted
--
-- Prérequis :
--   - Migration 20260713100000_enforce_subscription_on_booking_accept.sql déployée
--   - get_driver_subscription_status(UUID) disponible
--   - Exécution dans le SQL Editor Supabase (rôle postgres / service)
--
-- Usage :
--   Copier-coller ce fichier entier dans le SQL Editor Supabase, puis Run.
--
-- Données de test (email) :
--   Chauffeur : quota-test.driver@tunidrive.test
--   Client    : quota-test.client@tunidrive.test
--
-- Nettoyage : décommenter la PARTIE 1 si vous voulez repartir de zéro.
-- =============================================================================

-- ─── PARTIE 0 : Vérifications préalables ─────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'driver_can_accept_new_booking'
      AND pg_function_is_visible(oid)
  ) THEN
    RAISE EXCEPTION 'Prérequis manquant : driver_can_accept_new_booking(). Déployez la migration 20260713100000.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_enforce_subscription_on_accept'
  ) THEN
    RAISE EXCEPTION 'Prérequis manquant : trigger trigger_enforce_subscription_on_accept. Déployez la migration 20260713100000.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_driver_subscription_status'
      AND pg_function_is_visible(oid)
  ) THEN
    RAISE EXCEPTION 'Prérequis manquant : get_driver_subscription_status().';
  END IF;

  RAISE NOTICE '✅ Prérequis OK (driver_can_accept_new_booking, trigger, get_driver_subscription_status)';
END $$;

-- ─── PARTIE 1 : Nettoyage optionnel ──────────────────────────────────────────
-- Décommenter pour supprimer les données de test précédentes.

/*
DELETE FROM booking_offers
WHERE booking_id IN (
  SELECT b.id FROM bookings b
  JOIN drivers d ON d.id = b.driver_id
  WHERE d.email = 'quota-test.driver@tunidrive.test'
);

DELETE FROM bookings
WHERE driver_id IN (SELECT id FROM drivers WHERE email = 'quota-test.driver@tunidrive.test')
   OR client_id IN (SELECT id FROM clients WHERE email = 'quota-test.client@tunidrive.test');

DELETE FROM driver_subscriptions
WHERE driver_id IN (SELECT id FROM drivers WHERE email = 'quota-test.driver@tunidrive.test');

DELETE FROM drivers WHERE email = 'quota-test.driver@tunidrive.test';
DELETE FROM clients WHERE email = 'quota-test.client@tunidrive.test';
*/

-- ─── PARTIE 2 : Helpers de test (session) ────────────────────────────────────

CREATE TEMP TABLE IF NOT EXISTS _quota_test_results (
  test_id   TEXT PRIMARY KEY,
  status    TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL', 'SKIP')),
  detail    TEXT
);

TRUNCATE _quota_test_results;

CREATE OR REPLACE FUNCTION _quota_test_record(
  p_test_id TEXT,
  p_status  TEXT,
  p_detail  TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO _quota_test_results (test_id, status, detail)
  VALUES (p_test_id, p_status, p_detail)
  ON CONFLICT (test_id) DO UPDATE
    SET status = EXCLUDED.status,
        detail = EXCLUDED.detail;
END;
$$;

CREATE OR REPLACE FUNCTION _quota_test_assert(
  p_test_id TEXT,
  p_condition BOOLEAN,
  p_detail TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_condition THEN
    PERFORM _quota_test_record(p_test_id, 'PASS', COALESCE(p_detail, 'OK'));
    RAISE NOTICE '✅ % — %', p_test_id, COALESCE(p_detail, 'OK');
  ELSE
    PERFORM _quota_test_record(p_test_id, 'FAIL', COALESCE(p_detail, 'Assertion échouée'));
    RAISE NOTICE '❌ % — %', p_test_id, COALESCE(p_detail, 'Assertion échouée');
  END IF;
END;
$$;

-- ─── PARTIE 3 : Simulation principale ─────────────────────────────────────────

DO $$
DECLARE
  -- Optionnel : renseigner un UUID chauffeur existant si la création échoue (FK auth.users).
  v_forced_driver_id UUID := NULL;
  v_forced_client_id UUID := NULL;

  v_driver_id        UUID;
  v_client_id        UUID;
  v_booking_id       UUID;
  v_status           RECORD;
  v_lifetime         INTEGER;
  v_can_accept       BOOLEAN;
  v_blocked          BOOLEAN := FALSE;
  v_error_message    TEXT;
  v_searching_ok     BOOLEAN := FALSE;
  v_dispatch_booking UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🧪 TEST QUOTA 3 COURSES — DÉBUT';
  RAISE NOTICE '========================================';

  -- Réutiliser ou créer le chauffeur test
  v_driver_id := v_forced_driver_id;

  IF v_driver_id IS NULL THEN
    SELECT id INTO v_driver_id
    FROM drivers
    WHERE email = 'quota-test.driver@tunidrive.test';
  END IF;

  IF v_driver_id IS NULL THEN
    BEGIN
      INSERT INTO drivers (
      first_name,
      last_name,
      email,
      phone,
      city,
      license_number,
      status,
      subscription_type,
      lifetime_accepted_bookings,
      has_used_free_trial
    ) VALUES (
      'Quota',
      'TestDriver',
      'quota-test.driver@tunidrive.test',
      '+216 11 111 111',
      'Tunis',
      'QUOTA-TEST-001',
      'active',
      'free',
      0,
      FALSE
    )
    RETURNING id INTO v_driver_id;

      RAISE NOTICE '📝 Chauffeur test créé : %', v_driver_id;
    EXCEPTION
      WHEN foreign_key_violation THEN
        RAISE EXCEPTION
          'Impossible de créer le chauffeur test (FK auth.users). '
          'Créez d''abord un compte chauffeur dans Auth, ou renseignez v_forced_driver_id '
          'en tête du bloc DO avec l''UUID d''un chauffeur existant.';
    END;
  END IF;

  UPDATE drivers
  SET
    lifetime_accepted_bookings = 0,
    has_used_free_trial = FALSE,
    subscription_type = 'free',
    status = 'active'
  WHERE id = v_driver_id;

  DELETE FROM driver_subscriptions WHERE driver_id = v_driver_id;

  RAISE NOTICE '📝 Chauffeur test prêt (compteurs réinitialisés) : %', v_driver_id;

  -- Réutiliser ou créer le client test
  v_client_id := v_forced_client_id;

  IF v_client_id IS NULL THEN
    SELECT id INTO v_client_id
    FROM clients
    WHERE email = 'quota-test.client@tunidrive.test';
  END IF;

  IF v_client_id IS NULL THEN
    BEGIN
      INSERT INTO clients (
      first_name,
      last_name,
      email,
      phone,
      city,
      status
    ) VALUES (
      'Quota',
      'TestClient',
      'quota-test.client@tunidrive.test',
      '+216 22 222 222',
      'Tunis',
      'active'
    )
    RETURNING id INTO v_client_id;

      RAISE NOTICE '📝 Client test créé : %', v_client_id;
    EXCEPTION
      WHEN foreign_key_violation THEN
        RAISE EXCEPTION
          'Impossible de créer le client test (FK auth.users). '
          'Renseignez v_forced_client_id en tête du bloc DO avec l''UUID d''un client existant.';
    END;
  ELSE
    RAISE NOTICE '📝 Client test réutilisé : %', v_client_id;
  END IF;

  -- Supprimer les anciennes réservations de test pour ce chauffeur
  DELETE FROM bookings
  WHERE driver_id = v_driver_id
     OR (client_id = v_client_id AND pickup_address LIKE 'QUOTA-TEST-%');

  -- T01 — État initial
  SELECT * INTO v_status
  FROM get_driver_subscription_status(v_driver_id);

  PERFORM _quota_test_assert(
    'T01_initial_can_accept',
    v_status.can_accept_more_bookings = TRUE,
    format('can_accept=%s, remaining=%s', v_status.can_accept_more_bookings, v_status.remaining_free_bookings)
  );

  PERFORM _quota_test_assert(
    'T02_initial_remaining_3',
    v_status.remaining_free_bookings = 3,
    format('remaining=%s', v_status.remaining_free_bookings)
  );

  PERFORM _quota_test_assert(
    'T03_driver_can_accept_helper',
    driver_can_accept_new_booking(v_driver_id) = TRUE,
    'driver_can_accept_new_booking() = true'
  );

  -- T04–T06 — Accepter 3 courses gratuites
  FOR i IN 1..3 LOOP
    INSERT INTO bookings (
      client_id,
      driver_id,
      pickup_address,
      destination_address,
      pickup_latitude,
      pickup_longitude,
      destination_latitude,
      destination_longitude,
      distance_km,
      price_tnd,
      scheduled_time,
      status
    ) VALUES (
      v_client_id,
      v_driver_id,
      'QUOTA-TEST-pickup-' || i,
      'QUOTA-TEST-destination-' || i,
      36.8065 + (i * 0.001),
      10.1815 + (i * 0.001),
      36.8891 + (i * 0.001),
      10.3223 + (i * 0.001),
      5.0 + i,
      14.40 + i,
      NOW() + (i || ' hours')::INTERVAL,
      'pending'
    )
    RETURNING id INTO v_booking_id;

    UPDATE bookings
    SET status = 'accepted'
    WHERE id = v_booking_id;

    SELECT lifetime_accepted_bookings
    INTO v_lifetime
    FROM drivers
    WHERE id = v_driver_id;

    SELECT * INTO v_status
    FROM get_driver_subscription_status(v_driver_id);

    PERFORM _quota_test_assert(
      'T0' || (3 + i) || '_accept_course_' || i,
      v_lifetime = i AND v_status.lifetime_accepted_bookings = i,
      format('lifetime=%s, remaining=%s, can_accept=%s',
        v_status.lifetime_accepted_bookings,
        v_status.remaining_free_bookings,
        v_status.can_accept_more_bookings)
    );
  END LOOP;

  -- T07 — Après 3 courses : plus de quota
  SELECT * INTO v_status
  FROM get_driver_subscription_status(v_driver_id);

  PERFORM _quota_test_assert(
    'T07_blocked_after_3',
    v_status.can_accept_more_bookings = FALSE
      AND v_status.remaining_free_bookings = 0
      AND v_status.has_used_free_trial = TRUE,
    format('can_accept=%s, remaining=%s, free_trial_used=%s',
      v_status.can_accept_more_bookings,
      v_status.remaining_free_bookings,
      v_status.has_used_free_trial)
  );

  PERFORM _quota_test_assert(
    'T08_helper_false_after_3',
    driver_can_accept_new_booking(v_driver_id) = FALSE,
    'driver_can_accept_new_booking() = false'
  );

  -- T09 — 4e acceptation pending → accepted (doit être bloquée)
  INSERT INTO bookings (
    client_id,
    driver_id,
    pickup_address,
    destination_address,
    pickup_latitude,
    pickup_longitude,
    destination_latitude,
    destination_longitude,
    distance_km,
    price_tnd,
    scheduled_time,
    status
  ) VALUES (
    v_client_id,
    v_driver_id,
    'QUOTA-TEST-pickup-4-blocked',
    'QUOTA-TEST-destination-4-blocked',
    36.8100,
    10.1900,
    36.8900,
    10.3300,
    8.0,
    20.00,
    NOW() + INTERVAL '5 hours',
    'pending'
  )
  RETURNING id INTO v_booking_id;

  BEGIN
    UPDATE bookings
    SET status = 'accepted'
    WHERE id = v_booking_id;

    PERFORM _quota_test_record(
      'T09_fourth_accept_blocked',
      'FAIL',
      'La 4e acceptation aurait dû lever subscription_required'
    );
  EXCEPTION
    WHEN OTHERS THEN
      v_error_message := SQLERRM;
      v_blocked := v_error_message ILIKE '%subscription_required%';
      PERFORM _quota_test_assert(
        'T09_fourth_accept_blocked',
        v_blocked,
        v_error_message
      );
  END;

  -- T10 — INSERT direct en accepted (doit être bloqué)
  BEGIN
    INSERT INTO bookings (
      client_id,
      driver_id,
      pickup_address,
      destination_address,
      distance_km,
      price_tnd,
      scheduled_time,
      status
    ) VALUES (
      v_client_id,
      v_driver_id,
      'QUOTA-TEST-pickup-insert-blocked',
      'QUOTA-TEST-destination-insert-blocked',
      6.0,
      18.00,
      NOW() + INTERVAL '6 hours',
      'accepted'
    );

    PERFORM _quota_test_record(
      'T10_insert_accepted_blocked',
      'FAIL',
      'INSERT accepted aurait dû lever subscription_required'
    );
  EXCEPTION
    WHEN OTHERS THEN
      v_error_message := SQLERRM;
      PERFORM _quota_test_assert(
        'T10_insert_accepted_blocked',
        v_error_message ILIKE '%subscription_required%',
        v_error_message
      );
  END;

  -- T11 — Chemin dispatch : searching → accepted (si statut autorisé)
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'bookings'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%searching%'
  ) INTO v_searching_ok;

  IF v_searching_ok THEN
    INSERT INTO bookings (
      client_id,
      driver_id,
      pickup_address,
      destination_address,
      pickup_latitude,
      pickup_longitude,
      destination_latitude,
      destination_longitude,
      distance_km,
      price_tnd,
      scheduled_time,
      status
    ) VALUES (
      v_client_id,
      NULL,
      'QUOTA-TEST-dispatch-pickup',
      'QUOTA-TEST-dispatch-destination',
      36.8065,
      10.1815,
      36.8891,
      10.3223,
      4.0,
      14.40,
      NOW() + INTERVAL '1 hour',
      'searching'
    )
    RETURNING id INTO v_dispatch_booking;

    BEGIN
      UPDATE bookings
      SET driver_id = v_driver_id,
          status = 'accepted'
      WHERE id = v_dispatch_booking;

      PERFORM _quota_test_record(
        'T11_dispatch_searching_to_accepted_blocked',
        'FAIL',
        'searching→accepted aurait dû lever subscription_required'
      );
    EXCEPTION
      WHEN OTHERS THEN
        v_error_message := SQLERRM;
        PERFORM _quota_test_assert(
          'T11_dispatch_searching_to_accepted_blocked',
          v_error_message ILIKE '%subscription_required%',
          v_error_message
        );
    END;

    DELETE FROM bookings WHERE id = v_dispatch_booking;
  ELSE
    PERFORM _quota_test_record(
      'T11_dispatch_searching_to_accepted_blocked',
      'SKIP',
      'Statut searching non disponible (script alter-bookings-dispatch.sql non déployé)'
    );
    RAISE NOTICE '⏭️  T11 SKIP — statut searching non disponible';
  END IF;

  -- T12 — Compteur inchangé après tentatives bloquées
  SELECT lifetime_accepted_bookings
  INTO v_lifetime
  FROM drivers
  WHERE id = v_driver_id;

  PERFORM _quota_test_assert(
    'T12_lifetime_still_3',
    v_lifetime = 3,
    format('lifetime=%s (attendu 3)', v_lifetime)
  );

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🧪 TEST QUOTA 3 COURSES — FIN';
  RAISE NOTICE '========================================';
END $$;

-- ─── PARTIE 4 : Rapport final ────────────────────────────────────────────────

SELECT
  test_id,
  status,
  detail
FROM _quota_test_results
ORDER BY test_id;

SELECT
  COUNT(*) FILTER (WHERE status = 'PASS') AS passed,
  COUNT(*) FILTER (WHERE status = 'FAIL') AS failed,
  COUNT(*) FILTER (WHERE status = 'SKIP') AS skipped,
  COUNT(*) AS total
FROM _quota_test_results;

DO $$
DECLARE
  v_fail INT;
BEGIN
  SELECT COUNT(*) INTO v_fail
  FROM _quota_test_results
  WHERE status = 'FAIL';

  IF v_fail > 0 THEN
    RAISE EXCEPTION '❌ % test(s) en échec — voir le tableau _quota_test_results ci-dessus.', v_fail;
  ELSE
    RAISE NOTICE '✅ Tous les tests exécutés ont réussi (PASS ou SKIP).';
  END IF;
END $$;

-- Nettoyage helpers temporaires
DROP FUNCTION IF EXISTS _quota_test_assert(TEXT, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS _quota_test_record(TEXT, TEXT, TEXT);

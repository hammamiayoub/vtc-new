-- Test du cloisonnement des demandes de colis : international / local / zone (gouvernorat).
--
-- COMMENT L'UTILISER
--   Collez ce script dans l'éditeur SQL de Supabase (staging de préférence) et exécutez-le.
--   Il se termine VOLONTAIREMENT par une erreur : cela annule toutes les données de test
--   (comptes, véhicules, demandes), rien n'est conservé. Le rapport est dans le message d'erreur :
--     « ISOLATION: TOUS LES TESTS PASSENT » ou « ISOLATION: n ECHEC(S) ».
--
-- CE QUI EST VÉRIFIÉ (avec les vraies règles de sécurité, rôle « authenticated »)
--   1. get_matching_transporteurs : qui est notifié pour chaque demande.
--   2. Lecture directe de parcel_quote_requests : qui voit quelle demande.
--   3. Écriture : qui peut déposer une proposition sur quelle demande.
--
-- Prérequis : migrations 20261122100000 et 20261122110000 appliquées.

DO $test$
DECLARE
  v_out text := '';
  v_fail int := 0;

  -- chauffeurs
  d_intl uuid := gen_random_uuid();        -- transporteur international
  d_both uuid := gen_random_uuid();        -- VTC + colis, scope vide (traité comme international)
  d_loc_tunis uuid := gen_random_uuid();   -- local, zone Tunis
  d_loc_sfax uuid := gen_random_uuid();    -- local, zone Sfax
  d_loc_all uuid := gen_random_uuid();     -- local, aucune zone (toute la Tunisie)
  d_vtc uuid := gen_random_uuid();         -- VTC pur
  c_client uuid := gen_random_uuid();

  -- demandes
  r_intl uuid := gen_random_uuid();
  r_loc_tunis uuid := gen_random_uuid();
  r_loc_unknown uuid := gen_random_uuid();

  v_actual text;
  v_ok boolean;
  v_tag text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
BEGIN
  -- ---------- comptes ----------
  INSERT INTO auth.users (id, email, aud, role)
  SELECT x.id, 'scope-test-' || x.n || '-' || v_tag || '@example.invalid', 'authenticated', 'authenticated'
  FROM (VALUES (d_intl,'intl'),(d_both,'both'),(d_loc_tunis,'loctunis'),(d_loc_sfax,'locsfax'),
               (d_loc_all,'locall'),(d_vtc,'vtc'),(c_client,'client')) AS x(id, n);

  INSERT INTO public.clients (id, first_name, last_name, email, phone)
  VALUES (c_client, 'Test', 'Client', 'scope-test-client-' || v_tag || '@example.invalid', '+21600000000')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.drivers (id, first_name, last_name, email, status, driver_type, parcel_scope, parcel_governorates)
  VALUES
    (d_intl,      'T', 'Intl',     'scope-test-intl-'     || v_tag || '@example.invalid', 'active', 'transporteur', 'international', NULL),
    (d_both,      'T', 'Both',     'scope-test-both-'     || v_tag || '@example.invalid', 'active', 'both',         NULL,            NULL),
    (d_loc_tunis, 'T', 'LocTunis', 'scope-test-loctunis-' || v_tag || '@example.invalid', 'active', 'transporteur', 'local',         ARRAY['tunis']),
    (d_loc_sfax,  'T', 'LocSfax',  'scope-test-locsfax-'  || v_tag || '@example.invalid', 'active', 'transporteur', 'local',         ARRAY['sfax']),
    (d_loc_all,   'T', 'LocAll',   'scope-test-locall-'   || v_tag || '@example.invalid', 'active', 'transporteur', 'local',         NULL),
    (d_vtc,       'T', 'Vtc',      'scope-test-vtc-'      || v_tag || '@example.invalid', 'active', 'vtc',          NULL,            NULL)
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status, driver_type = EXCLUDED.driver_type,
    parcel_scope = EXCLUDED.parcel_scope, parcel_governorates = EXCLUDED.parcel_governorates;

  INSERT INTO public.vehicles (driver_id, make, model)
  SELECT id, 'Test', 'Van' FROM (VALUES (d_intl),(d_both),(d_loc_tunis),(d_loc_sfax),(d_loc_all),(d_vtc)) AS v(id);

  INSERT INTO public.parcel_quote_requests
    (id, client_id, direction, service_scope, departure_address, arrival_address, desired_date, departure_governorate)
  VALUES
    (r_intl,        c_client, 'europe_to_tunisia', 'international', 'Paris',         'Tunis',  current_date + 3, NULL),
    (r_loc_tunis,   c_client, 'tunisia_domestic',  'local',         'Tunis centre',  'Sfax',   current_date + 3, 'tunis'),
    (r_loc_unknown, c_client, 'tunisia_domestic',  'local',         'Adresse libre', 'Sousse', current_date + 3, NULL);

  -- ---------- 1. Qui est notifié (get_matching_transporteurs) ----------
  -- Libellé de chaque chauffeur de test, pour un rapport lisible
  SELECT string_agg(s.lbl, ',' ORDER BY s.lbl)
    INTO v_actual
  FROM (
    SELECT CASE m.driver_id
             WHEN d_intl THEN 'intl' WHEN d_both THEN 'both' WHEN d_loc_tunis THEN 'loc_tunis'
             WHEN d_loc_sfax THEN 'loc_sfax' WHEN d_loc_all THEN 'loc_all' WHEN d_vtc THEN 'vtc' END AS lbl
    FROM public.get_matching_transporteurs(r_intl) m
    WHERE m.driver_id IN (d_intl, d_both, d_loc_tunis, d_loc_sfax, d_loc_all, d_vtc)
  ) s;
  v_ok := v_actual IS NOT DISTINCT FROM 'both,intl';
  v_out := v_out || format(E'%s notifies/demande INTERNATIONALE  attendu=both,intl  obtenu=%s\n', CASE WHEN v_ok THEN 'OK   ' ELSE 'ECHEC' END, v_actual);
  IF NOT v_ok THEN v_fail := v_fail + 1; END IF;

  SELECT string_agg(s.lbl, ',' ORDER BY s.lbl)
    INTO v_actual
  FROM (
    SELECT CASE m.driver_id
             WHEN d_intl THEN 'intl' WHEN d_both THEN 'both' WHEN d_loc_tunis THEN 'loc_tunis'
             WHEN d_loc_sfax THEN 'loc_sfax' WHEN d_loc_all THEN 'loc_all' WHEN d_vtc THEN 'vtc' END AS lbl
    FROM public.get_matching_transporteurs(r_loc_tunis) m
    WHERE m.driver_id IN (d_intl, d_both, d_loc_tunis, d_loc_sfax, d_loc_all, d_vtc)
  ) s;
  v_ok := v_actual IS NOT DISTINCT FROM 'loc_all,loc_tunis';
  v_out := v_out || format(E'%s notifies/demande LOCALE Tunis        attendu=loc_all,loc_tunis  obtenu=%s\n', CASE WHEN v_ok THEN 'OK   ' ELSE 'ECHEC' END, v_actual);
  IF NOT v_ok THEN v_fail := v_fail + 1; END IF;

  SELECT string_agg(s.lbl, ',' ORDER BY s.lbl)
    INTO v_actual
  FROM (
    SELECT CASE m.driver_id
             WHEN d_intl THEN 'intl' WHEN d_both THEN 'both' WHEN d_loc_tunis THEN 'loc_tunis'
             WHEN d_loc_sfax THEN 'loc_sfax' WHEN d_loc_all THEN 'loc_all' WHEN d_vtc THEN 'vtc' END AS lbl
    FROM public.get_matching_transporteurs(r_loc_unknown) m
    WHERE m.driver_id IN (d_intl, d_both, d_loc_tunis, d_loc_sfax, d_loc_all, d_vtc)
  ) s;
  v_ok := v_actual IS NOT DISTINCT FROM 'loc_all,loc_sfax,loc_tunis';
  v_out := v_out || format(E'%s notifies/demande LOCALE zone inconnue attendu=loc_all,loc_sfax,loc_tunis  obtenu=%s\n', CASE WHEN v_ok THEN 'OK   ' ELSE 'ECHEC' END, v_actual);
  IF NOT v_ok THEN v_fail := v_fail + 1; END IF;

  -- ---------- 2. Qui voit quoi (règles de sécurité de lecture) ----------
  DECLARE
    v_driver uuid;
    v_label text;
    v_expected text;
  BEGIN
    FOR v_driver, v_label, v_expected IN
      SELECT * FROM (VALUES
        (d_intl,      'intl',      'INTL'),
        (d_both,      'both',      'INTL'),
        (d_loc_tunis, 'loc_tunis', 'LOC_TUNIS,LOC_UNKNOWN'),
        (d_loc_sfax,  'loc_sfax',  'LOC_UNKNOWN'),
        (d_loc_all,   'loc_all',   'LOC_TUNIS,LOC_UNKNOWN'),
        (d_vtc,       'vtc',       NULL)
      ) AS t(d, l, e)
    LOOP
      PERFORM set_config('request.jwt.claim.sub', v_driver::text, true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_driver, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;

      SELECT string_agg(s.lbl, ',' ORDER BY s.lbl)
        INTO v_actual
      FROM (
        SELECT CASE r.id WHEN r_intl THEN 'INTL' WHEN r_loc_tunis THEN 'LOC_TUNIS' WHEN r_loc_unknown THEN 'LOC_UNKNOWN' END AS lbl
        FROM public.parcel_quote_requests r
        WHERE r.id IN (r_intl, r_loc_tunis, r_loc_unknown)
      ) s;

      RESET ROLE;

      v_ok := v_actual IS NOT DISTINCT FROM v_expected;
      v_out := v_out || format(E'%s lecture   chauffeur %-10s attendu=%s  obtenu=%s\n',
                               CASE WHEN v_ok THEN 'OK   ' ELSE 'ECHEC' END, v_label, coalesce(v_expected, '(rien)'), coalesce(v_actual, '(rien)'));
      IF NOT v_ok THEN v_fail := v_fail + 1; END IF;
    END LOOP;
  END;

  -- ---------- 3. Qui peut proposer un prix ----------
  DECLARE
    v_case record;
    v_allowed boolean;
  BEGIN
    FOR v_case IN
      SELECT * FROM (VALUES
        ('intl',      d_intl,      r_loc_tunis,   false, 'international -> demande locale'),
        ('loc_sfax',  d_loc_sfax,  r_loc_tunis,   false, 'local Sfax -> demande locale de Tunis'),
        ('loc_tunis', d_loc_tunis, r_intl,        false, 'local -> demande internationale'),
        ('vtc',       d_vtc,       r_intl,        false, 'VTC pur -> demande internationale'),
        ('intl',      d_intl,      r_intl,        true,  'international -> demande internationale'),
        ('loc_tunis', d_loc_tunis, r_loc_tunis,   true,  'local Tunis -> demande locale de Tunis')
      ) AS t(label, drv, req, should_work, descr)
    LOOP
      PERFORM set_config('request.jwt.claim.sub', v_case.drv::text, true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_case.drv, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      BEGIN
        INSERT INTO public.parcel_quote_proposals (request_id, driver_id, price) VALUES (v_case.req, v_case.drv, 100);
        v_allowed := true;
      EXCEPTION WHEN OTHERS THEN
        v_allowed := false;
      END;
      RESET ROLE;

      v_ok := v_allowed = v_case.should_work;
      v_out := v_out || format(E'%s proposition %s  attendu=%s  obtenu=%s\n',
                               CASE WHEN v_ok THEN 'OK   ' ELSE 'ECHEC' END, v_case.descr,
                               CASE WHEN v_case.should_work THEN 'autorisee' ELSE 'refusee' END,
                               CASE WHEN v_allowed THEN 'autorisee' ELSE 'refusee' END);
      IF NOT v_ok THEN v_fail := v_fail + 1; END IF;
    END LOOP;
  END;

  -- Annulation de tout (comptes, véhicules, demandes de test) via une erreur volontaire
  RAISE EXCEPTION E'\nISOLATION: %\n\n%\n(Données de test annulées.)',
    CASE WHEN v_fail = 0 THEN 'TOUS LES TESTS PASSENT' ELSE v_fail || ' ECHEC(S)' END, v_out;
END
$test$;

-- ============================================================================
-- Suppression définitive des comptes marqués status = 'deleted'
-- (tables clients, drivers et auth.users)
--
-- Contexte : les anciennes versions des applications (mobile jusqu'au 04/11/2026,
-- web jusqu'au 03/11/2026) « supprimaient » un compte en passant status à 'deleted'
-- sans supprimer le compte de connexion. Ce script termine la suppression.
--
-- UTILISATION (SQL Editor Supabase) :
--   1. Exécuter l'ÉTAPE 1 (sauvegarde), puis l'ÉTAPE 2 (aperçu).
--   2. Exécuter l'ÉTAPE 3 telle quelle : mode SIMULATION, rien n'est supprimé,
--      les NOTICE indiquent ce qui le serait.
--   3. Pour supprimer : dans l'ÉTAPE 3, passer v_execute à true et ré-exécuter.
--      Tout est dans une seule transaction : en cas d'erreur, rien n'est supprimé.
--
-- CE QUE FAIT LA SUPPRESSION (même logique que l'Edge Function delete-account) :
--   - annule les demandes de course encore en attente des clients ;
--   - anonymise les courses conservées (notes et jeton de suivi effacés) ;
--   - supprime clients, drivers puis auth.users (cascade sur véhicules, disponibilités,
--     abonnements, demandes de colis, notations, etc.).
--
-- NON TRAITÉ : les fichiers dans Storage (photos de profil, véhicules, documents).
-- Une suppression SQL de storage.objects ne supprime pas les fichiers réels.
-- Voir la requête de repérage en fin de fichier.
-- ============================================================================


-- ============================================================================
-- ÉTAPE 1 : SAUVEGARDE (irréversible ensuite). Contient des données personnelles :
-- à supprimer (drop table) une fois la vérification terminée.
-- ============================================================================
create table if not exists public.backup_clients_deleted_20261105 as
  select * from public.clients where status = 'deleted';
create table if not exists public.backup_drivers_deleted_20261105 as
  select * from public.drivers where status = 'deleted';
-- Les comptes de connexion ne sont pas sauvegardés (mots de passe) : on garde id et email.
create table if not exists public.backup_auth_users_deleted_20261105 as
  select u.id, u.email, u.created_at, u.last_sign_in_at
  from auth.users u
  where u.id in (select id from public.clients where status = 'deleted'
                 union select id from public.drivers where status = 'deleted');


-- ============================================================================
-- ÉTAPE 2 : APERÇU (lecture seule)
-- ============================================================================
select 'client' as role, c.id, c.email, c.updated_at, c.created_at,
       (select count(*) from public.bookings b where b.client_id = c.id) as courses,
       (select count(*) from public.bookings b where b.client_id = c.id
          and b.status in ('accepted', 'in_progress')) as courses_actives,
       (u.id is not null) as compte_connexion_existe
from public.clients c left join auth.users u on u.id = c.id
where c.status = 'deleted'
union all
select 'driver', d.id, d.email, d.updated_at, d.created_at,
       (select count(*) from public.bookings b where b.driver_id = d.id),
       (select count(*) from public.bookings b where b.driver_id = d.id
          and b.status in ('accepted', 'in_progress')),
       (u.id is not null)
from public.drivers d left join auth.users u on u.id = d.id
where d.status = 'deleted'
order by 1, 4;


-- ============================================================================
-- ÉTAPE 3 : SIMULATION PUIS SUPPRESSION
-- ============================================================================
do $$
declare
  -- ---- PARAMÈTRES ---------------------------------------------------------
  v_execute                       boolean := false;  -- false = simulation, true = suppression réelle
  v_grace_days                    integer := 30;     -- ne touche que les comptes marqués depuis plus de N jours
  v_delete_drivers                boolean := true;   -- false = ne traiter que les clients
  v_drivers_with_paid_subs        boolean := false;  -- false = conserver les chauffeurs ayant un abonnement payé
                                                     --         (pièces comptables, supprimées en cascade sinon)
  -- -------------------------------------------------------------------------
  v_client_ids  uuid[];
  v_driver_ids  uuid[];
  v_all_ids     uuid[];
  v_skipped_active integer;
  v_skipped_paid   integer;
  v_cancelled   integer := 0;
  v_anonymized  integer := 0;
  r             record;
begin
  -- Garde-fou 1 : les courses doivent être conservées (SET NULL), pas supprimées en cascade.
  for r in
    select c.conrelid::regclass as tbl, c.conname, a.attname as col, c.confdeltype
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.bookings'::regclass
      and c.contype = 'f'
      and ((c.confrelid = 'public.clients'::regclass and a.attname = 'client_id')
        or (c.confrelid = 'public.drivers'::regclass and a.attname = 'driver_id'))
      and c.confdeltype <> 'n'            -- 'n' = ON DELETE SET NULL
  loop
    raise exception
      'ARRET : bookings.% (contrainte %) n''est pas en ON DELETE SET NULL (code %). La suppression effacerait les courses. Appliquer d''abord la migration 20261103_allow_anonymized_bookings.sql.',
      r.col, r.conname, r.confdeltype;
  end loop;

  if exists (
    select 1 from pg_attribute
    where attrelid = 'public.bookings'::regclass and attname = 'client_id' and attnotnull
  ) then
    raise exception 'ARRET : bookings.client_id est encore NOT NULL (migration 20261103_allow_anonymized_bookings.sql non appliquée).';
  end if;

  -- Garde-fou 2 : aucune clé étrangère bloquante (NO ACTION / RESTRICT) vers ces tables.
  for r in
    select c.conrelid::regclass as tbl, c.conname, c.confrelid::regclass as ref
    from pg_constraint c
    where c.contype = 'f'
      and c.confdeltype in ('a', 'r')
      and c.confrelid in ('public.clients'::regclass, 'public.drivers'::regclass, 'auth.users'::regclass)
  loop
    if v_execute then
      raise exception 'ARRET : la table % a une clé étrangère bloquante (%) vers %. À traiter avant la suppression.', r.tbl, r.conname, r.ref;
    else
      raise notice 'ATTENTION : la table % a une clé étrangère bloquante (%) vers % : la suppression réelle sera refusée.', r.tbl, r.conname, r.ref;
    end if;
  end loop;

  -- Sélection des comptes éligibles
  select coalesce(array_agg(c.id), '{}') into v_client_ids
  from public.clients c
  where c.status = 'deleted'
    and c.updated_at < now() - make_interval(days => v_grace_days)
    and not exists (select 1 from public.bookings b
                    where b.client_id = c.id and b.status in ('accepted', 'in_progress'));

  select coalesce(array_agg(d.id), '{}') into v_driver_ids
  from public.drivers d
  where v_delete_drivers
    and d.status = 'deleted'
    and coalesce(d.deleted_at, d.updated_at) < now() - make_interval(days => v_grace_days)
    and not exists (select 1 from public.bookings b
                    where b.driver_id = d.id and b.status in ('accepted', 'in_progress'))
    and (v_drivers_with_paid_subs or not exists (
          select 1 from public.driver_subscriptions s
          where s.driver_id = d.id and s.payment_status = 'paid'));

  v_all_ids := v_client_ids || v_driver_ids;

  -- Information sur ce qui est écarté
  select count(*) into v_skipped_active from (
    select c.id from public.clients c where c.status = 'deleted' and c.id <> all (v_client_ids)
      and exists (select 1 from public.bookings b where b.client_id = c.id and b.status in ('accepted','in_progress'))
    union all
    select d.id from public.drivers d where d.status = 'deleted' and d.id <> all (v_driver_ids)
      and exists (select 1 from public.bookings b where b.driver_id = d.id and b.status in ('accepted','in_progress'))
  ) x;

  select count(*) into v_skipped_paid
  from public.drivers d
  where d.status = 'deleted' and d.id <> all (v_driver_ids)
    and exists (select 1 from public.driver_subscriptions s where s.driver_id = d.id and s.payment_status = 'paid');

  raise notice 'Clients à supprimer : %', cardinality(v_client_ids);
  raise notice 'Chauffeurs à supprimer : %', cardinality(v_driver_ids);
  raise notice 'Écartés (course acceptée/en cours) : %', v_skipped_active;
  raise notice 'Chauffeurs écartés (abonnement payé à conserver) : %', v_skipped_paid;
  raise notice 'Comptes plus récents que % jours : conservés', v_grace_days;

  if not v_execute then
    raise notice '*** SIMULATION : rien n''a été modifié. Passer v_execute à true pour supprimer. ***';
    return;
  end if;

  if cardinality(v_all_ids) = 0 then
    raise notice 'Rien à supprimer.';
    return;
  end if;

  -- 1. Annuler les demandes en attente des clients supprimés
  update public.bookings
     set status = 'cancelled', cancellation_reason = 'account_deleted'
   where client_id = any (v_client_ids) and status = 'pending';
  get diagnostics v_cancelled = row_count;

  -- 2. Anonymiser les courses conservées
  update public.bookings
     set notes = null, tracking_token = null
   where client_id = any (v_client_ids) or driver_id = any (v_driver_ids);
  get diagnostics v_anonymized = row_count;

  -- 3. Supprimer profils puis comptes de connexion
  delete from public.clients where id = any (v_client_ids);
  delete from public.drivers where id = any (v_driver_ids);
  delete from auth.users     where id = any (v_all_ids);

  raise notice 'Terminé : % demandes annulées, % courses anonymisées, % comptes supprimés.',
    v_cancelled, v_anonymized, cardinality(v_all_ids);
end $$;


-- ============================================================================
-- VÉRIFICATION APRÈS EXÉCUTION
-- ============================================================================
-- select count(*) from public.clients where status = 'deleted';   -- restants (récents / écartés)
-- select count(*) from public.drivers where status = 'deleted';
-- select count(*) from auth.users u
--  where u.id in (select id from public.backup_auth_users_deleted_20261105);  -- doit valoir 0 pour les supprimés


-- ============================================================================
-- FICHIERS STORAGE À NETTOYER (repérage uniquement ; suppression via le Dashboard
-- Storage ou l'API, pas en SQL)
-- ============================================================================
-- select bucket_id, name from storage.objects o
--  where exists (select 1 from public.backup_auth_users_deleted_20261105 b
--                where o.name like '%' || b.id::text || '%');

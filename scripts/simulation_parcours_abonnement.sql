-- ════════════════════════════════════════════════════════════════════════════════════════════════
--  SIMULATION DU PARCOURS D'ABONNEMENT D'UN CHAUFFEUR DE TEST
--  Compte : chia94700@gmail.com
--
--  Parcours simulé : 2 courses gratuites → 3e course refusée → demande d'abonnement mensuel →
--  validation par l'admin → abonnement actif → rappels d'expiration → renouvellement anticipé →
--  expiration → course refusée → nettoyage.
--
--  COMMENT L'UTILISER
--    - Supabase > SQL Editor. Exécuter UNE ÉTAPE À LA FOIS (sélectionner le bloc, puis « Run »).
--      Chaque bloc commence par « ▶ ÉTAPE n » et se termine avant le suivant.
--    - Entre les étapes, ouvrir l'espace chauffeur de ce compte dans l'application pour voir ce que
--      voit réellement le chauffeur (indiqué dans chaque étape).
--    - Avant de commencer : remplacer CLIENT_TEST_EMAIL (chercher / remplacer dans tout le fichier)
--      par l'email d'un compte CLIENT DE TEST (étape 0 bis).
--    - À la fin : exécuter l'étape 17 (nettoyage), même si une étape a échoué en cours de route.
--    - L'éditeur n'affiche que le résultat de la DERNIÈRE requête d'un bloc : chaque étape est écrite pour
--      que cette dernière requête soit celle à lire.
--
--  CE QUE LE SCRIPT MODIFIE (uniquement pour ce chauffeur)
--    - 3 ou 4 réservations de test, repérées par la note « [SIMULATION ABONNEMENT] », rattachées au
--      client de test choisi ;
--    - ses lignes de driver_subscriptions et son journal de notifications ;
--    - ses compteurs de courses gratuites (remis à zéro au nettoyage).
--    Aucun autre chauffeur n'est modifié.
--
--  ⚠ À FAIRE SUR STAGING DE PRÉFÉRENCE. Si votre base de production a des webhooks ou triggers qui envoient
--    un email / une notification quand une réservation change de statut (non visibles dans les migrations
--    du dépôt), le client de test les recevra. Utiliser un client dont l'email vous appartient.
--
--  CONVENTION : le chauffeur est désigné par son email dans chaque requête (aucune variable à copier).
-- ════════════════════════════════════════════════════════════════════════════════════════════════


-- ▶ ÉTAPE 0 : repérer le chauffeur et son état de départ
-- ATTENDU : 1 ligne ; lifetime_accepted_bookings = 0 ; has_used_free_trial = false ; subscription_type = free.
select d.id, d.email, d.status, d.lifetime_accepted_bookings, d.has_used_free_trial, d.subscription_type
from public.drivers d
where lower(d.email) = 'chia94700@gmail.com';


-- ▶ ÉTAPE 0 bis : choisir le client de test
-- Lister quelques clients, puis remplacer CLIENT_TEST_EMAIL dans tout le fichier par l'email choisi.
select c.id, c.email, c.first_name, c.last_name
from public.clients c
order by c.created_at desc
limit 10;


-- ▶ ÉTAPE 1 : statut d'abonnement au départ
-- ATTENDU : has_active_subscription = false ; subscription_type = free ; can_accept_more_bookings = true ;
--           remaining_free_bookings = 2 ; lifetime_accepted_bookings = 0.
select s.*
from public.get_driver_subscription_status(
  (select id from public.drivers where lower(email) = 'chia94700@gmail.com')
) s;


-- ▶ ÉTAPE 2 : course gratuite n°1 (le chauffeur accepte une demande)
-- ATTENDU : lifetime_accepted_bookings = 1 ; remaining_free_bookings = 1 ; can_accept_more_bookings = true.
-- Espace chauffeur : aucune alerte d'abonnement.
insert into public.bookings (client_id, driver_id, pickup_address, destination_address, distance_km, price_tnd, scheduled_time, status, notes)
values (
  (select id from public.clients where lower(email) = lower('CLIENT_TEST_EMAIL')),
  (select id from public.drivers where lower(email) = 'chia94700@gmail.com'),
  'SIMULATION départ 1', 'SIMULATION arrivée 1', 10, 20, now() + interval '3 days', 'pending',
  '[SIMULATION ABONNEMENT] course 1'
);
update public.bookings set status = 'accepted' where notes = '[SIMULATION ABONNEMENT] course 1';
select d.lifetime_accepted_bookings, d.has_used_free_trial, s.remaining_free_bookings, s.can_accept_more_bookings
from public.drivers d, public.get_driver_subscription_status(d.id) s
where lower(d.email) = 'chia94700@gmail.com';


-- ▶ ÉTAPE 3 : course gratuite n°2 (la dernière)
-- ATTENDU : lifetime_accepted_bookings = 2 ; has_used_free_trial = true ; remaining_free_bookings = 0 ;
--           can_accept_more_bookings = false.
-- Espace chauffeur : bandeau « Courses gratuites épuisées » + bouton « Voir l'abonnement Premium ».
insert into public.bookings (client_id, driver_id, pickup_address, destination_address, distance_km, price_tnd, scheduled_time, status, notes)
values (
  (select id from public.clients where lower(email) = lower('CLIENT_TEST_EMAIL')),
  (select id from public.drivers where lower(email) = 'chia94700@gmail.com'),
  'SIMULATION départ 2', 'SIMULATION arrivée 2', 10, 20, now() + interval '3 days', 'pending',
  '[SIMULATION ABONNEMENT] course 2'
);
update public.bookings set status = 'accepted' where notes = '[SIMULATION ABONNEMENT] course 2';
select d.lifetime_accepted_bookings, d.has_used_free_trial, s.remaining_free_bookings, s.can_accept_more_bookings
from public.drivers d, public.get_driver_subscription_status(d.id) s
where lower(d.email) = 'chia94700@gmail.com';


-- ▶ ÉTAPE 4a : une 3e demande de course arrive (en attente)
insert into public.bookings (client_id, driver_id, pickup_address, destination_address, distance_km, price_tnd, scheduled_time, status, notes)
values (
  (select id from public.clients where lower(email) = lower('CLIENT_TEST_EMAIL')),
  (select id from public.drivers where lower(email) = 'chia94700@gmail.com'),
  'SIMULATION départ 3', 'SIMULATION arrivée 3', 10, 20, now() + interval '3 days', 'pending',
  '[SIMULATION ABONNEMENT] course 3'
)
returning id, status, notes;


-- ▶ ÉTAPE 4b : le chauffeur tente d'accepter la 3e course sans abonnement
-- ERREUR ATTENDUE : « subscription_required: Le chauffeur a épuisé ses 2 courses gratuites et doit souscrire
-- un abonnement Premium. » La réservation reste « pending ». C'est le comportement voulu.
update public.bookings set status = 'accepted' where notes = '[SIMULATION ABONNEMENT] course 3';


-- ▶ ÉTAPE 4c : contrôle après le refus
-- ATTENDU : status = pending ; lifetime_accepted_bookings = 2 ; driver_can_accept_new_booking = false.
select b.status as statut_course_3,
       d.lifetime_accepted_bookings,
       public.driver_can_accept_new_booking(d.id) as peut_accepter
from public.bookings b, public.drivers d
where b.notes = '[SIMULATION ABONNEMENT] course 3'
  and lower(d.email) = 'chia94700@gmail.com';


-- ▶ ÉTAPE 5 : le chauffeur demande un abonnement MENSUEL
-- (équivaut au clic sur « Souscrire » dans l'onglet « Mon abonnement » ; on simule sa session.)
-- ATTENDU : success = true ; billing_period = monthly ; price_tnd = 30 ; vat_percentage = 19 ;
--           total_price_tnd = 35.7 ; start_date = aujourd'hui ; end_date = aujourd'hui + 1 mois ;
--           is_early_renewal = false.
select set_config('request.jwt.claim.sub', d.id::text, false),
       set_config('request.jwt.claims', json_build_object('sub', d.id, 'role', 'authenticated')::text, false)
from public.drivers d where lower(d.email) = 'chia94700@gmail.com';
select public.request_driver_subscription('monthly') as resultat;


-- ▶ ÉTAPE 6 : une seconde demande est refusée tant que la première est en attente
-- ATTENDU : success = false ; reason = already_pending ; une seule ligne « pending » ci-dessous.
select set_config('request.jwt.claim.sub', d.id::text, false),
       set_config('request.jwt.claims', json_build_object('sub', d.id, 'role', 'authenticated')::text, false)
from public.drivers d where lower(d.email) = 'chia94700@gmail.com';
select public.request_driver_subscription('yearly') as resultat;


-- ▶ ÉTAPE 6 bis : état de la demande
-- ATTENDU : 1 ligne ; payment_status = pending ; status = active ; total_price_tnd = 35.70.
-- Espace chauffeur, onglet « Mon abonnement » : demande en attente avec les instructions de virement et la
-- référence ABONNEMENT-<8 premiers caractères de l'id>.
select ds.id, ds.billing_period, ds.payment_status, ds.status, ds.price_tnd, ds.total_price_tnd,
       ds.start_date, ds.end_date, ds.payment_reference
from public.driver_subscriptions ds
join public.drivers d on d.id = ds.driver_id
where lower(d.email) = 'chia94700@gmail.com'
order by ds.created_at;


-- ▶ ÉTAPE 7 : notifications qui partiront pour cette demande
-- ATTENDU : 1 ligne (le chauffeur). À la prochaine exécution du cron horaire, l'Edge Function enverra
-- (a) un accusé de réception au chauffeur et (b) une alerte aux administrateurs.
-- Pour les voir tout de suite sans rien envoyer : appeler la fonction avec { "dry_run": true, "force": true }
-- (voir supabase/functions/process-subscription-expirations/README.md).
select r.subscription_id, r.driver_email, r.billing_period, r.total_price_tnd, r.created_at
from public.get_subscription_requests_to_notify() r
where lower(r.driver_email) = 'chia94700@gmail.com';


-- ▶ ÉTAPE 8 : l'administrateur valide le virement reçu
-- (équivaut au bouton « Valider le paiement » du dashboard admin ; on simule la session d'un admin.)
-- ATTENDU : success = true ; start_date = aujourd'hui ; end_date = aujourd'hui + 1 mois.
select set_config('request.jwt.claim.sub', (select id::text from public.admin_users order by id limit 1), false),
       set_config('request.jwt.claims', json_build_object('sub', (select id from public.admin_users order by id limit 1), 'role', 'authenticated')::text, false);
select public.validate_driver_subscription_payment(
  (select ds.id from public.driver_subscriptions ds join public.drivers d on d.id = ds.driver_id
    where lower(d.email) = 'chia94700@gmail.com' and ds.payment_status = 'pending' and ds.status = 'active'),
  'bank_transfer',
  'TEST-REF-001'
) as resultat;


-- ▶ ÉTAPE 9 : statut après activation
-- ATTENDU : has_active_subscription = true ; subscription_type = premium ; can_accept_more_bookings = true ;
--           remaining_free_bookings = 999 ; subscription_end_date = aujourd'hui + 1 mois.
-- Espace chauffeur : le bandeau « Courses gratuites épuisées » disparaît ; l'onglet « Mon abonnement » affiche
-- « Abonnement Premium » et « Valable jusqu'au … ».
select s.*
from public.get_driver_subscription_status(
  (select id from public.drivers where lower(email) = 'chia94700@gmail.com')
) s;


-- ▶ ÉTAPE 10 : la 3e course peut maintenant être acceptée
-- ATTENDU : aucune erreur ; statut_course_3 = accepted ; lifetime_accepted_bookings = 3.
update public.bookings set status = 'accepted' where notes = '[SIMULATION ABONNEMENT] course 3';
select b.status as statut_course_3, d.lifetime_accepted_bookings
from public.bookings b, public.drivers d
where b.notes = '[SIMULATION ABONNEMENT] course 3'
  and lower(d.email) = 'chia94700@gmail.com';


-- ▶ ÉTAPE 11 : on avance le temps de 25 jours (l'abonnement finit dans 5 jours) → rappel J-7
-- ATTENDU : 1 ligne ; notification_type = expiring_soon_7d ; days_remaining = 5.
-- Espace chauffeur : bandeau orange « Votre abonnement expire dans 5 jours » avec le bouton « Renouveler ».
-- ⚠ Cette requête liste TOUS les chauffeurs concernés : le filtre ne garde que le compte de test.
update public.driver_subscriptions ds
set start_date = current_date - 25, end_date = current_date + 5
from public.drivers d
where d.id = ds.driver_id and lower(d.email) = 'chia94700@gmail.com' and ds.payment_reference = 'TEST-REF-001';
select c.driver_email, c.notification_type, c.notification_key, c.end_date, c.days_remaining
from public.get_subscription_notification_candidates() c
where lower(c.driver_email) = 'chia94700@gmail.com';


-- ▶ ÉTAPE 11 bis : l'abonnement finit demain → rappel J-1
-- ATTENDU : 1 ligne ; notification_type = expiring_soon_1d ; days_remaining = 1.
update public.driver_subscriptions ds
set start_date = current_date - 29, end_date = current_date + 1
from public.drivers d
where d.id = ds.driver_id and lower(d.email) = 'chia94700@gmail.com' and ds.payment_reference = 'TEST-REF-001';
select c.driver_email, c.notification_type, c.notification_key, c.end_date, c.days_remaining
from public.get_subscription_notification_candidates() c
where lower(c.driver_email) = 'chia94700@gmail.com';


-- ▶ ÉTAPE 11 ter : retour à « finit dans 5 jours » pour l'étape suivante
update public.driver_subscriptions ds
set start_date = current_date - 25, end_date = current_date + 5
from public.drivers d
where d.id = ds.driver_id and lower(d.email) = 'chia94700@gmail.com' and ds.payment_reference = 'TEST-REF-001'
returning ds.id, ds.start_date, ds.end_date;


-- ▶ ÉTAPE 12a : renouvellement ANTICIPÉ (le chauffeur renouvelle alors qu'il lui reste 5 jours)
-- ATTENDU : success = true ; is_early_renewal = true ; start_date = (fin actuelle + 1 jour), soit
--           aujourd'hui + 6 jours : il ne perd aucun jour ; end_date = start_date + 1 mois.
select set_config('request.jwt.claim.sub', d.id::text, false),
       set_config('request.jwt.claims', json_build_object('sub', d.id, 'role', 'authenticated')::text, false)
from public.drivers d where lower(d.email) = 'chia94700@gmail.com';
select public.request_driver_subscription('monthly') as resultat;


-- ▶ ÉTAPE 12b : l'admin valide ce renouvellement
-- ATTENDU : success = true ; start_date = aujourd'hui + 6 jours (la période garde bien le début prévu).
select set_config('request.jwt.claim.sub', (select id::text from public.admin_users order by id limit 1), false),
       set_config('request.jwt.claims', json_build_object('sub', (select id from public.admin_users order by id limit 1), 'role', 'authenticated')::text, false);
select public.validate_driver_subscription_payment(
  (select ds.id from public.driver_subscriptions ds join public.drivers d on d.id = ds.driver_id
    where lower(d.email) = 'chia94700@gmail.com' and ds.payment_status = 'pending' and ds.status = 'active'),
  'bank_transfer',
  'TEST-REF-002'
) as resultat;


-- ▶ ÉTAPE 12c : plus de rappel puisqu'il a renouvelé
-- ATTENDU : 0 ligne (abonnement renouvelé : aucun rappel J-7 ni J-1).
select c.driver_email, c.notification_type, c.days_remaining
from public.get_subscription_notification_candidates() c
where lower(c.driver_email) = 'chia94700@gmail.com';


-- ▶ ÉTAPE 12d : les deux périodes se suivent sans trou ni chevauchement
-- ATTENDU : 2 lignes ; l'ancien abonnement (TEST-REF-001) finit à J+5, le nouveau (TEST-REF-002) commence à J+6.
select ds.payment_reference, ds.start_date, ds.end_date, ds.status, ds.payment_status
from public.driver_subscriptions ds join public.drivers d on d.id = ds.driver_id
where lower(d.email) = 'chia94700@gmail.com'
order by ds.start_date;


-- ▶ ÉTAPE 13 : on simule l'expiration (sans renouvellement) : on retire le renouvellement et on recule la date
-- ATTENDU : has_active_subscription = false ; can_accept_more_bookings = false ; subscription_type = free.
-- Espace chauffeur : modal « Abonnement expiré » ; bandeau d'abonnement épuisé de nouveau visible.
delete from public.driver_subscriptions ds
using public.drivers d
where d.id = ds.driver_id and lower(d.email) = 'chia94700@gmail.com' and ds.payment_reference = 'TEST-REF-002';
update public.driver_subscriptions ds
set start_date = current_date - 31, end_date = current_date - 1
from public.drivers d
where d.id = ds.driver_id and lower(d.email) = 'chia94700@gmail.com' and ds.payment_reference = 'TEST-REF-001';
select s.has_active_subscription, s.subscription_type, s.can_accept_more_bookings, s.remaining_free_bookings, s.lifetime_accepted_bookings
from public.get_driver_subscription_status(
  (select id from public.drivers where lower(email) = 'chia94700@gmail.com')
) s;


-- ▶ ÉTAPE 13 bis : rappel « expiré »
-- ATTENDU : 1 ligne ; notification_type = expired ; days_remaining = -1.
select c.driver_email, c.notification_type, c.notification_key, c.end_date, c.days_remaining
from public.get_subscription_notification_candidates() c
where lower(c.driver_email) = 'chia94700@gmail.com';


-- ▶ ÉTAPE 14 : marquage « expired » (ce que fait l'Edge Function à chaque passage, pour tous les chauffeurs ;
-- ici ciblé sur le compte de test pour ne toucher personne d'autre)
-- ATTENDU : 1 ligne ; status = expired.
update public.driver_subscriptions ds
set status = 'expired', updated_at = now()
from public.drivers d
where d.id = ds.driver_id and lower(d.email) = 'chia94700@gmail.com'
  and ds.status = 'active' and ds.payment_status = 'paid' and ds.end_date < current_date
returning ds.id, ds.payment_reference, ds.end_date, ds.status;


-- ▶ ÉTAPE 15a : une 4e demande de course arrive
insert into public.bookings (client_id, driver_id, pickup_address, destination_address, distance_km, price_tnd, scheduled_time, status, notes)
values (
  (select id from public.clients where lower(email) = lower('CLIENT_TEST_EMAIL')),
  (select id from public.drivers where lower(email) = 'chia94700@gmail.com'),
  'SIMULATION départ 4', 'SIMULATION arrivée 4', 10, 20, now() + interval '3 days', 'pending',
  '[SIMULATION ABONNEMENT] course 4'
)
returning id, status, notes;


-- ▶ ÉTAPE 15b : après expiration, l'acceptation est de nouveau bloquée
-- ERREUR ATTENDUE : « subscription_required: ... ». Les courses déjà acceptées (1 à 3) ne sont pas affectées.
update public.bookings set status = 'accepted' where notes = '[SIMULATION ABONNEMENT] course 4';


-- ▶ ÉTAPE 16 : savoir qui d'autre recevrait un rappel (à lire AVANT de laisser tourner le cron en réel)
-- Liste tous les chauffeurs concernés aujourd'hui, pas seulement le compte de test.
select c.driver_email, c.notification_type, c.end_date, c.days_remaining
from public.get_subscription_notification_candidates() c
order by c.end_date;


-- ▶ ÉTAPE 17 : NETTOYAGE (à exécuter dans tous les cas)
-- Supprime les réservations de test, les abonnements et le journal de notifications du compte de test et
-- remet ses compteurs à zéro.
delete from public.subscription_expiration_notifications n
using public.drivers d
where d.id = n.driver_id and lower(d.email) = 'chia94700@gmail.com';
delete from public.driver_subscriptions ds
using public.drivers d
where d.id = ds.driver_id and lower(d.email) = 'chia94700@gmail.com';
delete from public.bookings where notes like '[SIMULATION ABONNEMENT]%';
update public.drivers
set lifetime_accepted_bookings = 0,
    has_used_free_trial = false,
    subscription_type = 'free',
    monthly_accepted_bookings = 0
where lower(email) = 'chia94700@gmail.com'
returning id, email, lifetime_accepted_bookings, has_used_free_trial, subscription_type;


-- ▶ ÉTAPE 18 : vérification finale du nettoyage
-- ATTENDU : reservations_test = 0 ; abonnements = 0 ; journal = 0 ; remaining_free_bookings = 2 ; can_accept = true.
select
  (select count(*) from public.bookings where notes like '[SIMULATION ABONNEMENT]%') as reservations_test,
  (select count(*) from public.driver_subscriptions ds join public.drivers d on d.id = ds.driver_id
     where lower(d.email) = 'chia94700@gmail.com') as abonnements,
  (select count(*) from public.subscription_expiration_notifications n join public.drivers d on d.id = n.driver_id
     where lower(d.email) = 'chia94700@gmail.com') as journal,
  s.remaining_free_bookings, s.can_accept_more_bookings
from public.get_driver_subscription_status(
  (select id from public.drivers where lower(email) = 'chia94700@gmail.com')
) s;

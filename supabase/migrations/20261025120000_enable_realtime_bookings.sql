-- Active Supabase Realtime sur public.bookings.
--
-- Les tableaux de bord client et chauffeur s'abonnent aux changements de cette table
-- (nouvelle réservation, course acceptée, annulée...). Sans publication, aucun événement n'est
-- émis et les écrans ne se mettent à jour qu'au rechargement ou au prochain rafraîchissement
-- périodique.
--
-- Script idempotent : sans effet si la table est déjà dans la publication
-- (vérifiable dans Database > Replication du dashboard Supabase).
-- Les politiques RLS restent appliquées : chaque utilisateur ne reçoit que les événements
-- des lignes qu'il a le droit de lire.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'bookings'
     )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END
$$;

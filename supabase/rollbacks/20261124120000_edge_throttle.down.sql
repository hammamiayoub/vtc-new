-- Retour arrière de 20261124120000_edge_throttle.sql
DROP FUNCTION IF EXISTS public.edge_throttle_purge();
DROP FUNCTION IF EXISTS public.edge_throttle_hit(text, integer);
DROP TABLE IF EXISTS public.edge_throttle;

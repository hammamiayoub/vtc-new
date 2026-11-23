/*
  # Limitation de fréquence pour les fonctions Edge appelables sans connexion

  Certaines fonctions d'envoi d'e-mails sont appelées avant toute connexion (inscription, mot de passe oublié) :
  elles ne peuvent pas exiger de jeton utilisateur. Cette table permet de limiter à une fois par fenêtre
  d'abord par destinataire, pour qu'un tiers ne puisse pas inonder une boîte mail ou le support.

  Accessible uniquement avec la clé service_role (Edge Functions).
  Retour arrière : supabase/rollbacks/20261124120000_edge_throttle.down.sql
*/

CREATE TABLE IF NOT EXISTS public.edge_throttle (
  key      text PRIMARY KEY,
  last_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.edge_throttle ENABLE ROW LEVEL SECURITY;
-- Aucune politique : ni anon ni authenticated n'y accèdent via l'API
REVOKE ALL ON public.edge_throttle FROM PUBLIC, anon, authenticated;

-- Renvoie true si l'action est autorisée (et enregistre l'instant), false si elle a déjà eu lieu dans la fenêtre.
CREATE OR REPLACE FUNCTION public.edge_throttle_hit(p_key text, p_window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed boolean;
BEGIN
  INSERT INTO public.edge_throttle AS t (key, last_at)
  VALUES (p_key, now())
  ON CONFLICT (key) DO UPDATE
    SET last_at = now()
    WHERE t.last_at < now() - make_interval(secs => p_window_seconds)
  RETURNING true INTO v_allowed;

  RETURN COALESCE(v_allowed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.edge_throttle_hit(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edge_throttle_hit(text, integer) TO service_role;

-- Nettoyage des anciennes entrées (à appeler depuis un cron si la table grossit)
CREATE OR REPLACE FUNCTION public.edge_throttle_purge()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.edge_throttle WHERE last_at < now() - interval '1 day';
$$;
REVOKE ALL ON FUNCTION public.edge_throttle_purge() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edge_throttle_purge() TO service_role;

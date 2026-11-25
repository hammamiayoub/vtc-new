/*
  # Double authentification (TOTP) obligatoire pour le compte administrateur

  Principe : le niveau d'assurance de la session est inscrit dans le JWT (claim « aal » : aal1 = mot de passe,
  aal2 = mot de passe + code TOTP). Quand l'exigence est activée, un administrateur en aal1 n'est plus reconnu
  comme administrateur par la base de données.

  Points d'application :
    1. Politique RLS de admin_users : elle exige aal2. Les ~28 politiques et les déclencheurs qui testent
       « EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()) » s'exécutent avec les droits de l'appelant,
       donc voient une table vide en aal1 : ils ne le considèrent plus comme administrateur.
    2. Fonctions SECURITY DEFINER (qui contournent la RLS) : le test est complété par admin_mfa_satisfied().
    3. Fonctions Edge : _shared/auth.ts lit le claim « aal » (voir le code).

  Interrupteur : admin_security_settings.mfa_required (false par défaut = aucun changement de comportement).
  Retour arrière immédiat : update admin_security_settings set mfa_required = false;
  Les comptes non administrateurs (chauffeurs, clients) ne sont jamais concernés.
*/

CREATE TABLE IF NOT EXISTS public.admin_security_settings (
  id          boolean PRIMARY KEY DEFAULT true CHECK (id),
  mfa_required boolean NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.admin_security_settings (id, mfa_required)
VALUES (true, false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.admin_security_settings ENABLE ROW LEVEL SECURITY;
-- Aucune politique : lecture/écriture réservées au service_role, à l'éditeur SQL et aux fonctions SECURITY DEFINER.

-- Vrai si l'exigence MFA est désactivée, ou si la session courante est en aal2.
CREATE OR REPLACE FUNCTION public.admin_mfa_satisfied()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NOT COALESCE((SELECT mfa_required FROM public.admin_security_settings WHERE id), false)
         OR COALESCE(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

REVOKE ALL ON FUNCTION public.admin_mfa_satisfied() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_mfa_satisfied() TO authenticated, anon, service_role;

-- Statut du compte connecté, lisible AVANT la validation du code (la RLS de admin_users masque la ligne en aal1).
CREATE OR REPLACE FUNCTION public.admin_account_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'is_admin', EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()),
    'mfa_required', COALESCE((SELECT mfa_required FROM public.admin_security_settings WHERE id), false)
  );
$$;

REVOKE ALL ON FUNCTION public.admin_account_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_account_status() TO authenticated;

-- 1. Politique de la table admin_users
DROP POLICY IF EXISTS "superadmin access" ON public.admin_users;
CREATE POLICY "superadmin access" ON public.admin_users
  FOR ALL
  USING (auth.email() = 'superadmin@tunidrive.net' AND public.admin_mfa_satisfied())
  WITH CHECK (auth.email() = 'superadmin@tunidrive.net' AND public.admin_mfa_satisfied());

-- 2. Fonctions SECURITY DEFINER : on complète le test d'administrateur (recréation à partir de la définition en base)
DO $$
DECLARE
  r record;
  def text;
  patched text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND p.proname IN ('admin_review_commission_payment', 'admin_activate_pricing_grid', 'admin_save_pricing_grid',
                        'extend_driver_subscription', 'validate_driver_subscription_payment')
  LOOP
    def := pg_get_functiondef(r.oid);
    patched := replace(def, 'FROM public.admin_users a WHERE a.id = auth.uid()',
                            'FROM public.admin_users a WHERE a.id = auth.uid() AND public.admin_mfa_satisfied()');
    patched := replace(patched, 'FROM public.admin_users WHERE id = auth.uid()',
                                'FROM public.admin_users WHERE id = auth.uid() AND public.admin_mfa_satisfied()');
    IF patched = def THEN
      RAISE EXCEPTION 'Fonction % : motif du test administrateur introuvable', r.proname;
    END IF;
    EXECUTE patched;
  END LOOP;
END;
$$;

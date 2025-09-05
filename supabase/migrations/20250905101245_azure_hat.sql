/*
  # Activer la vérification par email

  1. Configuration
    - Active la confirmation par email pour tous les nouveaux comptes
    - Configure les paramètres de sécurité pour l'authentification
  
  2. Sécurité
    - Les utilisateurs doivent confirmer leur email avant de pouvoir se connecter
    - Empêche la création de comptes avec des emails invalides
*/

-- Activer la confirmation par email (cette configuration doit être faite dans le dashboard Supabase)
-- Cette migration sert de documentation pour les paramètres requis

-- Note: Les paramètres suivants doivent être configurés dans le dashboard Supabase :
-- Auth > Settings > Email Auth > Confirm email = ON
-- Auth > Settings > Email Auth > Secure email change = ON

-- Fonction pour vérifier si un utilisateur a confirmé son email
CREATE OR REPLACE FUNCTION is_email_confirmed(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT email_confirmed_at IS NOT NULL
    FROM auth.users
    WHERE id = user_id
  );
END;
$$;

-- Politique pour s'assurer que seuls les utilisateurs avec email confirmé peuvent accéder aux données
-- Cette politique sera appliquée aux tables sensibles si nécessaire
CREATE OR REPLACE FUNCTION require_email_confirmation()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Permettre l'accès si l'utilisateur n'est pas connecté (pour les pages publiques)
  IF auth.uid() IS NULL THEN
    RETURN true;
  END IF;
  
  -- Vérifier si l'email est confirmé
  RETURN is_email_confirmed(auth.uid());
END;
$$;
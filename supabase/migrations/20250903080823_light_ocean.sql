/*
  # Corriger les politiques RLS pour admin_users

  1. Politiques mises à jour
    - Politique INSERT pour permettre aux utilisateurs authentifiés d'insérer leur propre profil admin
    - Politique UPDATE pour permettre aux utilisateurs authentifiés de mettre à jour leur propre profil admin
    - Politique SELECT mise à jour pour une meilleure sécurité

  2. Sécurité
    - Les utilisateurs ne peuvent gérer que leurs propres données admin
    - Utilisation de auth.uid() pour vérifier l'identité
*/

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Admins peuvent lire leurs propres données" ON admin_users;
DROP POLICY IF EXISTS "Admins peuvent mettre à jour leurs propres données" ON admin_users;

-- Créer les nouvelles politiques avec les bonnes permissions
CREATE POLICY "Allow authenticated users to read their own admin profile"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Allow authenticated users to insert their own admin profile"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow authenticated users to update their own admin profile"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
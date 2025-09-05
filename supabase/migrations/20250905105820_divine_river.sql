/*
  # Corriger les politiques RLS pour l'inscription

  1. Corrections
    - Vérification de l'existence des politiques avant création
    - Suppression et recréation sécurisée des politiques
    - Politiques d'insertion corrigées pour permettre l'inscription

  2. Sécurité
    - RLS maintenu sur toutes les tables
    - Politiques d'accès appropriées pour chaque rôle
    - Isolation des données utilisateur
*/

-- Supprimer et recréer les politiques pour la table clients
DROP POLICY IF EXISTS "Administrateurs peuvent lire tous les clients" ON clients;
DROP POLICY IF EXISTS "Administrateurs peuvent mettre à jour les clients" ON clients;
DROP POLICY IF EXISTS "Clients peuvent lire leurs propres données" ON clients;
DROP POLICY IF EXISTS "Clients peuvent mettre à jour leurs propres données" ON clients;
DROP POLICY IF EXISTS "Permettre l'inscription lors de l'inscription client" ON clients;

-- Recréer les politiques pour la table clients
CREATE POLICY "Administrateurs peuvent lire tous les clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Administrateurs peuvent mettre à jour les clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Clients peuvent lire leurs propres données"
  ON clients
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Clients peuvent mettre à jour leurs propres données"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Permettre l'inscription lors de l'inscription client"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Supprimer et recréer les politiques pour la table drivers
DROP POLICY IF EXISTS "Administrateurs peuvent lire tous les chauffeurs" ON drivers;
DROP POLICY IF EXISTS "Administrateurs peuvent mettre à jour les chauffeurs" ON drivers;
DROP POLICY IF EXISTS "Chauffeurs peuvent lire leurs propres données" ON drivers;
DROP POLICY IF EXISTS "Chauffeurs peuvent mettre à jour leurs propres données" ON drivers;
DROP POLICY IF EXISTS "Clients peuvent voir les chauffeurs actifs" ON drivers;
DROP POLICY IF EXISTS "Permettre l'insertion lors de l'inscription" ON drivers;
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent voir les chauffeurs actifs" ON drivers;

-- Recréer les politiques pour la table drivers
CREATE POLICY "Administrateurs peuvent lire tous les chauffeurs"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Administrateurs peuvent mettre à jour les chauffeurs"
  ON drivers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Chauffeurs peuvent lire leurs propres données"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Chauffeurs peuvent mettre à jour leurs propres données"
  ON drivers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Clients peuvent voir les chauffeurs actifs"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Permettre l'insertion lors de l'inscription"
  ON drivers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Utilisateurs authentifiés peuvent voir les chauffeurs actifs"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (status = 'active');
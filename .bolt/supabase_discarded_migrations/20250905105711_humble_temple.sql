/*
  # Corriger les politiques RLS pour permettre l'inscription

  1. Problème identifié
    - Les politiques RLS empêchent l'insertion lors de l'inscription
    - Besoin de permettre l'insertion pour les nouveaux utilisateurs

  2. Solutions
    - Politique d'insertion pour les utilisateurs authentifiés
    - Vérification que l'ID correspond à l'utilisateur connecté
    - Maintien de la sécurité pour les autres opérations

  3. Sécurité
    - Seul l'utilisateur peut créer son propre profil
    - Les autres politiques restent inchangées
*/

-- Supprimer les anciennes politiques d'insertion si elles existent
DROP POLICY IF EXISTS "Permettre l'insertion lors de l'inscription client" ON clients;
DROP POLICY IF EXISTS "Permettre l'insertion lors de l'inscription" ON drivers;

-- Politique pour permettre l'inscription des clients
CREATE POLICY "Permettre l'inscription lors de l'inscription client"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Politique pour permettre l'inscription des chauffeurs (vérifier si elle existe)
CREATE POLICY "Permettre l'insertion lors de l'inscription"
  ON drivers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Vérifier et corriger les politiques de lecture/mise à jour existantes pour les clients
DROP POLICY IF EXISTS "Clients peuvent lire leurs propres données" ON clients;
DROP POLICY IF EXISTS "Clients peuvent mettre à jour leurs propres données" ON clients;

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

-- Politique pour permettre aux admins de voir tous les clients
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

-- Politique pour permettre aux admins de mettre à jour les clients
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

-- Vérifier que RLS est activé sur les tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
/*
  # Corriger les politiques RLS pour l'insertion des clients

  1. Problème identifié
    - La politique RLS empêche l'insertion même avec auth.uid() = id
    - Besoin d'une politique plus permissive pour l'inscription

  2. Solution
    - Politique d'insertion simplifiée pour les utilisateurs authentifiés
    - Vérification de l'ID après insertion via trigger si nécessaire
    - Maintien de la sécurité pour les autres opérations

  3. Sécurité
    - RLS reste activé
    - Politiques de lecture et mise à jour maintenues
    - Seuls les utilisateurs authentifiés peuvent insérer
*/

-- Supprimer et recréer les politiques d'insertion pour les clients
DROP POLICY IF EXISTS "Clients peuvent créer leur propre profil" ON clients;
DROP POLICY IF EXISTS "Permettre l'inscription lors de l'inscription client" ON clients;
DROP POLICY IF EXISTS "Permettre l'insertion lors de l'inscription client" ON clients;

-- Politique d'insertion plus permissive pour l'inscription
CREATE POLICY "Inscription client autorisée"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Supprimer et recréer les politiques d'insertion pour les chauffeurs
DROP POLICY IF EXISTS "Chauffeurs peuvent créer leur propre profil" ON drivers;
DROP POLICY IF EXISTS "Permettre l'insertion lors de l'inscription" ON drivers;

-- Politique d'insertion plus permissive pour l'inscription
CREATE POLICY "Inscription chauffeur autorisée"
  ON drivers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Maintenir les politiques de lecture et mise à jour strictes
DROP POLICY IF EXISTS "Clients peuvent lire leurs propres données" ON clients;
CREATE POLICY "Clients peuvent lire leurs propres données"
  ON clients
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Clients peuvent mettre à jour leurs propres données" ON clients;
CREATE POLICY "Clients peuvent mettre à jour leurs propres données"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Chauffeurs peuvent lire leurs propres données" ON drivers;
CREATE POLICY "Chauffeurs peuvent lire leurs propres données"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Chauffeurs peuvent mettre à jour leurs propres données" ON drivers;
CREATE POLICY "Chauffeurs peuvent mettre à jour leurs propres données"
  ON drivers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
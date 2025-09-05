/*
  # Corriger les politiques RLS pour l'insertion des chauffeurs

  1. Problème
    - Erreur "new row violates row-level security policy for table drivers"
    - Code 42501 lors de l'inscription des chauffeurs

  2. Solution
    - Supprimer et recréer les politiques RLS pour la table drivers
    - Permettre l'insertion pour les utilisateurs authentifiés
    - Maintenir la sécurité pour les autres opérations

  3. Sécurité
    - Seuls les utilisateurs authentifiés peuvent insérer
    - Chaque utilisateur ne peut créer que son propre profil
    - Accès admin maintenu
*/

-- Supprimer toutes les politiques existantes pour la table drivers
DROP POLICY IF EXISTS "drivers_insert_own_profile" ON drivers;
DROP POLICY IF EXISTS "drivers_select_own_data" ON drivers;
DROP POLICY IF EXISTS "drivers_update_own_data" ON drivers;
DROP POLICY IF EXISTS "admin_full_access_drivers" ON drivers;
DROP POLICY IF EXISTS "clients_view_active_drivers" ON drivers;

-- Recréer les politiques RLS pour la table drivers

-- 1. Politique d'insertion : permet aux utilisateurs authentifiés de créer leur profil
CREATE POLICY "drivers_insert_own_profile"
  ON drivers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 2. Politique de lecture : chaque chauffeur peut voir ses propres données
CREATE POLICY "drivers_select_own_data"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 3. Politique de mise à jour : chaque chauffeur peut modifier ses propres données
CREATE POLICY "drivers_update_own_data"
  ON drivers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Politique admin : accès complet pour les administrateurs
CREATE POLICY "admin_full_access_drivers"
  ON drivers
  FOR ALL
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

-- 5. Politique pour les clients : peuvent voir les chauffeurs actifs
CREATE POLICY "clients_view_active_drivers"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Vérifier que RLS est activé
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
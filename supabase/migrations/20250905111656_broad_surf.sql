/*
  # Correction définitive des politiques RLS pour la table drivers

  1. Problème identifié
    - Les politiques RLS empêchent l'insertion de nouveaux chauffeurs
    - Erreur: "new row violates row-level security policy for table drivers"

  2. Solution
    - Suppression de toutes les politiques existantes
    - Recréation avec des politiques correctes
    - Politique d'insertion permettant aux utilisateurs authentifiés de créer leur profil

  3. Sécurité
    - Chaque utilisateur ne peut créer que son propre profil (auth.uid() = id)
    - Les admins gardent un accès complet
    - Les clients peuvent voir les chauffeurs actifs
*/

-- Désactiver temporairement RLS pour nettoyer
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "drivers_insert_own_profile" ON drivers;
DROP POLICY IF EXISTS "drivers_select_own_data" ON drivers;
DROP POLICY IF EXISTS "drivers_update_own_data" ON drivers;
DROP POLICY IF EXISTS "admin_full_access_drivers" ON drivers;
DROP POLICY IF EXISTS "clients_view_active_drivers" ON drivers;

-- Réactiver RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Politique pour l'insertion - permettre aux utilisateurs authentifiés de créer leur profil
CREATE POLICY "drivers_can_insert_own_profile"
  ON drivers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Politique pour la lecture - utilisateurs peuvent voir leurs propres données
CREATE POLICY "drivers_can_read_own_data"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Politique pour la mise à jour - utilisateurs peuvent modifier leurs propres données
CREATE POLICY "drivers_can_update_own_data"
  ON drivers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Politique pour les admins - accès complet
CREATE POLICY "admins_full_access_drivers"
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

-- Politique pour les clients - peuvent voir les chauffeurs actifs
CREATE POLICY "clients_can_view_active_drivers"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (status = 'active');
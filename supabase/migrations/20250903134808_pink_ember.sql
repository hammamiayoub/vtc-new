/*
  # Corriger les politiques RLS pour permettre aux clients de voir les chauffeurs actifs

  1. Nouvelles politiques
    - Permettre aux clients authentifiés de voir les chauffeurs actifs
    - Maintenir la sécurité en ne montrant que les chauffeurs avec status 'active'

  2. Sécurité
    - Les clients ne peuvent voir que les chauffeurs actifs
    - Les chauffeurs peuvent toujours voir leurs propres données
    - Les admins gardent tous leurs droits
*/

-- Ajouter une politique pour permettre aux clients de voir les chauffeurs actifs
CREATE POLICY "Clients peuvent voir les chauffeurs actifs"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Ajouter une politique pour permettre aux utilisateurs authentifiés de voir les chauffeurs actifs (plus large)
CREATE POLICY "Utilisateurs authentifiés peuvent voir les chauffeurs actifs"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (status = 'active');
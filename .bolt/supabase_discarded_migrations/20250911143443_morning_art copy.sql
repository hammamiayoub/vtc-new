/*
  # Correction accès client aux disponibilités chauffeurs

  1. Problème identifié
    - Les clients ne peuvent pas voir les disponibilités des chauffeurs
    - La table driver_availability contient des données mais les politiques RLS bloquent l'accès

  2. Solution
    - Ajouter une politique permettant aux clients authentifiés de voir les disponibilités
    - Maintenir la sécurité en ne montrant que les disponibilités publiques
*/

-- Ajouter une politique pour permettre aux clients de voir les disponibilités des chauffeurs
CREATE POLICY "Clients peuvent voir les disponibilités publiques"
  ON driver_availability
  FOR SELECT
  TO authenticated
  USING (
    is_available = true 
    AND EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = auth.uid()
    )
  );
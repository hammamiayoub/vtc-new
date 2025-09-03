/*
  # Debug des politiques RLS pour les réservations

  1. Vérification des politiques existantes
  2. Ajout de politiques de debug temporaires
  3. Test des permissions
*/

-- Voir toutes les politiques actuelles sur la table bookings
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'bookings';

-- Politique temporaire pour permettre aux chauffeurs de voir TOUTES leurs réservations
CREATE POLICY "Debug - Chauffeurs peuvent voir toutes leurs réservations"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM drivers 
      WHERE drivers.id = auth.uid()
    )
  );

-- Politique pour permettre aux chauffeurs de mettre à jour leurs réservations
CREATE POLICY "Debug - Chauffeurs peuvent mettre à jour leurs réservations"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());
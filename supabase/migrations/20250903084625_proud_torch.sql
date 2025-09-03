/*
  # Ajouter politique RLS pour les administrateurs

  1. Nouvelles politiques
    - Permettre aux administrateurs de lire tous les chauffeurs
    - Permettre aux administrateurs de mettre à jour le statut des chauffeurs

  2. Sécurité
    - Vérification que l'utilisateur est dans la table admin_users
    - Accès complet en lecture et écriture pour les admins
*/

-- Politique pour permettre aux administrateurs de lire tous les chauffeurs
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

-- Politique pour permettre aux administrateurs de mettre à jour les chauffeurs
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
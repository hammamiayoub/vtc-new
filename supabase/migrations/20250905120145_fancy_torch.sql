/*
  # Correction définitive des politiques RLS pour la table clients

  1. Problème
    - Erreur "new row violates row-level security policy for table clients"
    - Les utilisateurs authentifiés ne peuvent pas insérer leur profil client

  2. Solution
    - Nettoyage complet des politiques existantes
    - Création de nouvelles politiques avec la bonne logique
    - Vérification que l'insertion fonctionne pour les utilisateurs authentifiés

  3. Sécurité
    - Chaque client ne peut gérer que ses propres données
    - Les admins gardent un accès complet
    - RLS reste activé pour la sécurité
*/

-- Désactiver temporairement RLS pour nettoyer
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "clients_can_insert_own_profile" ON clients;
DROP POLICY IF EXISTS "clients_can_read_own_data" ON clients;
DROP POLICY IF EXISTS "clients_can_update_own_data" ON clients;
DROP POLICY IF EXISTS "admins_full_access_clients" ON clients;

-- Réactiver RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre l'insertion du profil client
CREATE POLICY "clients_can_insert_own_profile"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Politique pour permettre la lecture des propres données
CREATE POLICY "clients_can_read_own_data"
  ON clients
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Politique pour permettre la mise à jour des propres données
CREATE POLICY "clients_can_update_own_data"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Politique pour donner accès complet aux admins
CREATE POLICY "admins_full_access_clients"
  ON clients
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

-- Vérifier que RLS est bien activé
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'clients';

-- Vérifier les politiques créées
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'clients';
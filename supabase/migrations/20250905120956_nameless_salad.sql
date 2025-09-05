/*
  # Corriger les politiques RLS pour permettre l'inscription

  1. Problème identifié
    - Les utilisateurs ne peuvent pas insérer leurs données car ils ne sont pas encore connectés
    - auth.uid() est null pendant l'inscription
    - Il faut permettre l'insertion pour les nouveaux comptes

  2. Solution
    - Politique d'insertion plus permissive pour l'inscription
    - Vérification que l'ID correspond à un utilisateur Supabase valide
    - Maintien de la sécurité pour les autres opérations

  3. Sécurité
    - L'insertion n'est possible que si l'ID existe dans auth.users
    - Les autres opérations restent protégées par auth.uid()
*/

-- Corriger les politiques pour la table drivers
DROP POLICY IF EXISTS "drivers_can_insert_own_profile" ON drivers;
DROP POLICY IF EXISTS "drivers_can_read_own_data" ON drivers;
DROP POLICY IF EXISTS "drivers_can_update_own_data" ON drivers;
DROP POLICY IF EXISTS "admins_full_access_drivers" ON drivers;
DROP POLICY IF EXISTS "clients_can_view_active_drivers" ON drivers;

-- Nouvelle politique d'insertion pour drivers (permet l'inscription)
CREATE POLICY "drivers_can_insert_during_signup" ON drivers
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    -- Vérifier que l'ID existe dans auth.users (utilisateur créé par Supabase Auth)
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = drivers.id
    )
  );

-- Politique de lecture pour drivers
CREATE POLICY "drivers_can_read_own_data" ON drivers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Politique de mise à jour pour drivers
CREATE POLICY "drivers_can_update_own_data" ON drivers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Politique admin pour drivers
CREATE POLICY "admins_full_access_drivers" ON drivers
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

-- Politique pour que les clients voient les chauffeurs actifs
CREATE POLICY "clients_can_view_active_drivers" ON drivers
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Corriger les politiques pour la table clients
DROP POLICY IF EXISTS "clients_can_insert_own_profile" ON clients;
DROP POLICY IF EXISTS "clients_can_read_own_data" ON clients;
DROP POLICY IF EXISTS "clients_can_update_own_data" ON clients;
DROP POLICY IF EXISTS "admins_full_access_clients" ON clients;

-- Nouvelle politique d'insertion pour clients (permet l'inscription)
CREATE POLICY "clients_can_insert_during_signup" ON clients
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    -- Vérifier que l'ID existe dans auth.users (utilisateur créé par Supabase Auth)
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = clients.id
    )
  );

-- Politique de lecture pour clients
CREATE POLICY "clients_can_read_own_data" ON clients
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Politique de mise à jour pour clients
CREATE POLICY "clients_can_update_own_data" ON clients
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Politique admin pour clients
CREATE POLICY "admins_full_access_clients" ON clients
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

-- Vérifier que RLS est activé
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'drivers') THEN
    ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS activé pour drivers';
  END IF;
  
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'clients') THEN
    ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS activé pour clients';
  END IF;
END $$;

-- Afficher les politiques créées pour vérification
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('drivers', 'clients')
ORDER BY tablename, policyname;
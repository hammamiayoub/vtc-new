/*
  # Corriger les politiques RLS pour permettre l'inscription

  1. Problème
    - La politique RLS empêche l'insertion dans la table clients
    - L'erreur "new row violates row-level security policy" se produit

  2. Solution
    - Créer une politique d'insertion spécifique pour l'inscription
    - Permettre aux utilisateurs authentifiés d'insérer leur propre profil
    - Maintenir la sécurité pour les autres opérations

  3. Sécurité
    - Seuls les utilisateurs authentifiés peuvent insérer
    - Ils ne peuvent insérer que leur propre profil (auth.uid() = id)
    - Les autres opérations restent sécurisées
*/

-- Supprimer toutes les politiques existantes pour les clients
DROP POLICY IF EXISTS "Administrateurs peuvent lire tous les clients" ON clients;
DROP POLICY IF EXISTS "Administrateurs peuvent mettre à jour les clients" ON clients;
DROP POLICY IF EXISTS "Clients peuvent lire leurs propres données" ON clients;
DROP POLICY IF EXISTS "Clients peuvent mettre à jour leurs propres données" ON clients;
DROP POLICY IF EXISTS "Inscription client autorisée" ON clients;

-- Supprimer toutes les politiques existantes pour les chauffeurs
DROP POLICY IF EXISTS "Administrateurs peuvent lire tous les chauffeurs" ON drivers;
DROP POLICY IF EXISTS "Administrateurs peuvent mettre à jour les chauffeurs" ON drivers;
DROP POLICY IF EXISTS "Chauffeurs peuvent lire leurs propres données" ON drivers;
DROP POLICY IF EXISTS "Chauffeurs peuvent mettre à jour leurs propres données" ON drivers;
DROP POLICY IF EXISTS "Clients peuvent voir les chauffeurs actifs" ON drivers;
DROP POLICY IF EXISTS "Inscription chauffeur autorisée" ON drivers;
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent voir les chauffeurs actifs" ON drivers;

-- Politiques pour la table clients
CREATE POLICY "clients_insert_own_profile" ON clients
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "clients_select_own_data" ON clients
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "clients_update_own_data" ON clients
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "admin_full_access_clients" ON clients
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

-- Politiques pour la table drivers
CREATE POLICY "drivers_insert_own_profile" ON drivers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "drivers_select_own_data" ON drivers
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "drivers_update_own_data" ON drivers
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "clients_view_active_drivers" ON drivers
  FOR SELECT TO authenticated
  USING (status = 'active');

CREATE POLICY "admin_full_access_drivers" ON drivers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

-- Vérifier que RLS est activé
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
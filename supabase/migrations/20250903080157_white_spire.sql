/*
  # Créer le compte superadmin

  1. Insertion du compte superadmin
    - Email: superadmin@chauffeur.net
    - Mot de passe: Ma1805la!
    - Rôle: admin
  
  2. Sécurité
    - Le compte est créé directement dans la table admin_users
    - L'authentification se fera via Supabase Auth
    
  Note: Le mot de passe sera géré par Supabase Auth lors de la première connexion
*/

-- Insérer le compte superadmin dans la table admin_users
INSERT INTO admin_users (email, role) 
VALUES ('superadmin@chauffeur.net', 'admin')
ON CONFLICT (email) DO NOTHING;
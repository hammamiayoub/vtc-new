/*
  # Correction des contraintes d'unicité pour email et téléphone

  1. Nettoyage sécurisé
    - Suppression conditionnelle des anciens triggers et fonctions
    - Suppression conditionnelle des anciennes contraintes

  2. Contraintes d'unicité
    - Email unique dans chaque table
    - Téléphone unique dans chaque table (avec gestion des NULL)
    - Vérification croisée entre tables

  3. Sécurité
    - Triggers pour empêcher les doublons entre clients et chauffeurs
    - Messages d'erreur explicites
*/

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS check_driver_email_uniqueness ON drivers;
DROP TRIGGER IF EXISTS check_driver_phone_uniqueness ON drivers;
DROP TRIGGER IF EXISTS check_client_email_uniqueness ON clients;
DROP TRIGGER IF EXISTS check_client_phone_uniqueness ON clients;
DROP TRIGGER IF EXISTS check_driver_global_email_uniqueness ON drivers;
DROP TRIGGER IF EXISTS check_driver_global_phone_uniqueness ON drivers;
DROP TRIGGER IF EXISTS check_client_global_email_uniqueness ON clients;
DROP TRIGGER IF EXISTS check_client_global_phone_uniqueness ON clients;

-- Supprimer les anciennes fonctions s'elles existent
DROP FUNCTION IF EXISTS check_email_uniqueness();
DROP FUNCTION IF EXISTS check_phone_uniqueness();
DROP FUNCTION IF EXISTS check_global_email_uniqueness();
DROP FUNCTION IF EXISTS check_global_phone_uniqueness();

-- Supprimer les anciennes contraintes personnalisées s'elles existent
ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_email_unique_global;
ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_phone_unique_global;
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_email_unique_global;
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_phone_unique_global;

-- Vérifier et créer les contraintes d'unicité seulement si elles n'existent pas
DO $$
BEGIN
  -- Contrainte email pour drivers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'drivers_email_key' 
    AND table_name = 'drivers'
  ) THEN
    ALTER TABLE drivers ADD CONSTRAINT drivers_email_key UNIQUE (email);
  END IF;

  -- Contrainte phone pour drivers (avec gestion des NULL)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'drivers_phone_key' 
    AND table_name = 'drivers'
  ) THEN
    -- Créer un index unique partiel pour les téléphones non-null
    CREATE UNIQUE INDEX IF NOT EXISTS drivers_phone_unique_idx ON drivers(phone) WHERE phone IS NOT NULL;
  END IF;

  -- Contrainte email pour clients
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'clients_email_key' 
    AND table_name = 'clients'
  ) THEN
    ALTER TABLE clients ADD CONSTRAINT clients_email_key UNIQUE (email);
  END IF;

  -- Contrainte phone pour clients
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'clients_phone_key' 
    AND table_name = 'clients'
  ) THEN
    ALTER TABLE clients ADD CONSTRAINT clients_phone_key UNIQUE (phone);
  END IF;
END $$;

-- Fonction pour vérifier l'unicité globale des emails
CREATE OR REPLACE FUNCTION check_global_email_uniqueness()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si l'email existe déjà dans l'autre table
  IF TG_TABLE_NAME = 'drivers' THEN
    IF EXISTS (SELECT 1 FROM clients WHERE email = NEW.email) THEN
      RAISE EXCEPTION 'Cette adresse email est déjà utilisée par un compte client';
    END IF;
  ELSIF TG_TABLE_NAME = 'clients' THEN
    IF EXISTS (SELECT 1 FROM drivers WHERE email = NEW.email) THEN
      RAISE EXCEPTION 'Cette adresse email est déjà utilisée par un compte chauffeur';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier l'unicité globale des téléphones
CREATE OR REPLACE FUNCTION check_global_phone_uniqueness()
RETURNS TRIGGER AS $$
BEGIN
  -- Ignorer si le téléphone est null
  IF NEW.phone IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Vérifier si le téléphone existe déjà dans l'autre table
  IF TG_TABLE_NAME = 'drivers' THEN
    IF EXISTS (SELECT 1 FROM clients WHERE phone = NEW.phone) THEN
      RAISE EXCEPTION 'Ce numéro de téléphone est déjà utilisé par un compte client';
    END IF;
  ELSIF TG_TABLE_NAME = 'clients' THEN
    IF EXISTS (SELECT 1 FROM drivers WHERE phone = NEW.phone) THEN
      RAISE EXCEPTION 'Ce numéro de téléphone est déjà utilisé par un compte chauffeur';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers pour la vérification globale
CREATE TRIGGER check_driver_global_email_uniqueness
  BEFORE INSERT OR UPDATE OF email ON drivers
  FOR EACH ROW EXECUTE FUNCTION check_global_email_uniqueness();

CREATE TRIGGER check_driver_global_phone_uniqueness
  BEFORE INSERT OR UPDATE OF phone ON drivers
  FOR EACH ROW EXECUTE FUNCTION check_global_phone_uniqueness();

CREATE TRIGGER check_client_global_email_uniqueness
  BEFORE INSERT OR UPDATE OF email ON clients
  FOR EACH ROW EXECUTE FUNCTION check_global_email_uniqueness();

CREATE TRIGGER check_client_global_phone_uniqueness
  BEFORE INSERT OR UPDATE OF phone ON clients
  FOR EACH ROW EXECUTE FUNCTION check_global_phone_uniqueness();

-- Créer les index pour les performances (seulement s'ils n'existent pas)
CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email);
CREATE INDEX IF NOT EXISTS idx_drivers_phone ON drivers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
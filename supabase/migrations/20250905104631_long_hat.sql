/*
  # Ajouter contraintes d'unicité pour email et téléphone

  1. Contraintes d'unicité
    - Email unique dans la table `drivers`
    - Email unique dans la table `clients`
    - Téléphone unique dans la table `drivers` (si renseigné)
    - Téléphone unique dans la table `clients`

  2. Index pour performance
    - Index sur email pour les deux tables
    - Index sur téléphone pour les deux tables

  3. Sécurité
    - Empêche les doublons d'email et téléphone
    - Garantit l'intégrité des données
*/

-- Ajouter contrainte d'unicité sur l'email pour la table drivers (si pas déjà présente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'drivers_email_key' 
    AND table_name = 'drivers'
  ) THEN
    ALTER TABLE drivers ADD CONSTRAINT drivers_email_key UNIQUE (email);
  END IF;
END $$;

-- Ajouter contrainte d'unicité sur l'email pour la table clients (si pas déjà présente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'clients_email_key' 
    AND table_name = 'clients'
  ) THEN
    ALTER TABLE clients ADD CONSTRAINT clients_email_key UNIQUE (email);
  END IF;
END $$;

-- Ajouter contrainte d'unicité sur le téléphone pour la table drivers (si renseigné)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'drivers_phone_key' 
    AND table_name = 'drivers'
  ) THEN
    -- Créer un index unique partiel (seulement pour les valeurs non nulles)
    CREATE UNIQUE INDEX IF NOT EXISTS drivers_phone_key ON drivers (phone) WHERE phone IS NOT NULL;
  END IF;
END $$;

-- Ajouter contrainte d'unicité sur le téléphone pour la table clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'clients_phone_key' 
    AND table_name = 'clients'
  ) THEN
    ALTER TABLE clients ADD CONSTRAINT clients_phone_key UNIQUE (phone);
  END IF;
END $$;

-- Ajouter des index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers (email);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients (email);
CREATE INDEX IF NOT EXISTS idx_drivers_phone ON drivers (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients (phone);

-- Fonction pour vérifier l'unicité globale de l'email (entre drivers et clients)
CREATE OR REPLACE FUNCTION check_email_uniqueness()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si l'email existe déjà dans l'autre table
  IF TG_TABLE_NAME = 'drivers' THEN
    IF EXISTS (SELECT 1 FROM clients WHERE email = NEW.email) THEN
      RAISE EXCEPTION 'Cet email est déjà utilisé par un compte client';
    END IF;
  ELSIF TG_TABLE_NAME = 'clients' THEN
    IF EXISTS (SELECT 1 FROM drivers WHERE email = NEW.email) THEN
      RAISE EXCEPTION 'Cet email est déjà utilisé par un compte chauffeur';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers pour vérifier l'unicité globale de l'email
DROP TRIGGER IF EXISTS check_driver_email_uniqueness ON drivers;
CREATE TRIGGER check_driver_email_uniqueness
  BEFORE INSERT OR UPDATE OF email ON drivers
  FOR EACH ROW EXECUTE FUNCTION check_email_uniqueness();

DROP TRIGGER IF EXISTS check_client_email_uniqueness ON clients;
CREATE TRIGGER check_client_email_uniqueness
  BEFORE INSERT OR UPDATE OF email ON clients
  FOR EACH ROW EXECUTE FUNCTION check_email_uniqueness();

-- Fonction pour vérifier l'unicité globale du téléphone (entre drivers et clients)
CREATE OR REPLACE FUNCTION check_phone_uniqueness()
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
    IF EXISTS (SELECT 1 FROM drivers WHERE phone = NEW.phone AND phone IS NOT NULL) THEN
      RAISE EXCEPTION 'Ce numéro de téléphone est déjà utilisé par un compte chauffeur';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers pour vérifier l'unicité globale du téléphone
DROP TRIGGER IF EXISTS check_driver_phone_uniqueness ON drivers;
CREATE TRIGGER check_driver_phone_uniqueness
  BEFORE INSERT OR UPDATE OF phone ON drivers
  FOR EACH ROW EXECUTE FUNCTION check_phone_uniqueness();

DROP TRIGGER IF EXISTS check_client_phone_uniqueness ON clients;
CREATE TRIGGER check_client_phone_uniqueness
  BEFORE INSERT OR UPDATE OF phone ON clients
  FOR EACH ROW EXECUTE FUNCTION check_phone_uniqueness();
/*
  # Corriger les problèmes d'inscription

  1. Corrections
    - Supprimer les contraintes problématiques
    - Recréer les contraintes d'unicité correctement
    - Corriger les triggers et fonctions
    - Simplifier la logique de vérification

  2. Sécurité
    - Maintenir l'unicité des emails et téléphones
    - Améliorer la gestion d'erreurs
*/

-- Supprimer les anciennes contraintes et triggers problématiques
DROP TRIGGER IF EXISTS check_driver_email_uniqueness ON drivers;
DROP TRIGGER IF EXISTS check_driver_phone_uniqueness ON drivers;
DROP TRIGGER IF EXISTS check_client_email_uniqueness ON clients;
DROP TRIGGER IF EXISTS check_client_phone_uniqueness ON clients;

DROP FUNCTION IF EXISTS check_email_uniqueness();
DROP FUNCTION IF EXISTS check_phone_uniqueness();

-- Supprimer les anciennes contraintes
ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_email_unique_global;
ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_phone_unique_global;
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_email_unique_global;
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_phone_unique_global;

-- Recréer les contraintes d'unicité simples (dans chaque table)
ALTER TABLE drivers ADD CONSTRAINT drivers_email_key UNIQUE (email);
ALTER TABLE drivers ADD CONSTRAINT drivers_phone_key UNIQUE (phone);
ALTER TABLE clients ADD CONSTRAINT clients_email_key UNIQUE (email);
ALTER TABLE clients ADD CONSTRAINT clients_phone_key UNIQUE (phone);

-- Fonction simplifiée pour vérifier l'unicité globale des emails
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

-- Fonction simplifiée pour vérifier l'unicité globale des téléphones
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

-- Recréer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email);
CREATE INDEX IF NOT EXISTS idx_drivers_phone ON drivers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
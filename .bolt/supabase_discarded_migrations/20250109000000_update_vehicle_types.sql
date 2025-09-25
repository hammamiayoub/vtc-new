-- Migration pour mettre à jour les types de véhicules
-- Ajouter les nouveaux types de véhicules supportés

-- Créer un type ENUM pour les types de véhicules si il n'existe pas déjà
DO $$ 
BEGIN
    -- Vérifier si le type existe déjà
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_type') THEN
        CREATE TYPE vehicle_type AS ENUM (
            'sedan', 
            'pickup', 
            'van', 
            'minibus', 
            'bus', 
            'truck', 
            'utility', 
            'limousine'
        );
    ELSE
        -- Ajouter les nouveaux types à l'enum existant
        ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'pickup';
        ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'minibus';
        ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'bus';
        ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'truck';
        ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'utility';
        ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'limousine';
    END IF;
END $$;

-- Mettre à jour la colonne vehicle_info dans la table drivers si elle existe
-- Note: Si vehicle_info est de type JSONB, cette migration n'est pas nécessaire
-- car les types sont stockés dans le JSON

-- Ajouter un commentaire pour documenter les changements
COMMENT ON TYPE vehicle_type IS 'Types de véhicules supportés par la plateforme TuniDrive';

-- Optionnel: Créer une vue pour faciliter les requêtes sur les types de véhicules
CREATE OR REPLACE VIEW vehicle_type_info AS
WITH vehicle_types AS (
    SELECT unnest(enum_range(NULL::vehicle_type)) as type_value
)
SELECT 
    vt.type_value,
    CASE vt.type_value
        WHEN 'sedan' THEN 'Berline'
        WHEN 'pickup' THEN 'Pickup'
        WHEN 'van' THEN 'Van'
        WHEN 'minibus' THEN 'Minibus'
        WHEN 'bus' THEN 'Bus'
        WHEN 'truck' THEN 'Camion'
        WHEN 'utility' THEN 'Utilitaire'
        WHEN 'limousine' THEN 'Limousine'
    END as type_label,
    CASE vt.type_value
        WHEN 'sedan' THEN 4
        WHEN 'pickup' THEN 4
        WHEN 'van' THEN 8
        WHEN 'minibus' THEN 12
        WHEN 'bus' THEN 30
        WHEN 'truck' THEN 2
        WHEN 'utility' THEN 2
        WHEN 'limousine' THEN 8
    END as default_seats
FROM vehicle_types vt;

-- Ajouter le champ is_return_trip à la table bookings
-- Ce champ indique si la réservation inclut un trajet retour

ALTER TABLE bookings 
ADD COLUMN is_return_trip boolean DEFAULT false;

-- Ajouter un commentaire pour documenter le champ
COMMENT ON COLUMN bookings.is_return_trip IS 'Indique si la réservation inclut un trajet retour (aller-retour)';

-- Mettre à jour les réservations existantes pour avoir is_return_trip = false par défaut
UPDATE bookings SET is_return_trip = false WHERE is_return_trip IS NULL;

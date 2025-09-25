-- Migration pour créer la table des notes des chauffeurs
-- Permet aux clients de noter les chauffeurs après chaque course

-- Créer la table ratings
CREATE TABLE IF NOT EXISTS ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contrainte d'unicité : un client ne peut noter qu'une fois par réservation
  UNIQUE(booking_id, client_id)
);

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ratings_driver_id ON ratings(driver_id);
CREATE INDEX IF NOT EXISTS idx_ratings_client_id ON ratings(client_id);
CREATE INDEX IF NOT EXISTS idx_ratings_booking_id ON ratings(booking_id);

-- Créer un trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ratings_updated_at
  BEFORE UPDATE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_ratings_updated_at();

-- Politiques RLS (Row Level Security)
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Les clients peuvent voir leurs propres notes
CREATE POLICY "Clients can view their own ratings" ON ratings
  FOR SELECT USING (auth.uid() = client_id);

-- Les clients peuvent créer des notes pour leurs propres réservations
CREATE POLICY "Clients can create ratings for their bookings" ON ratings
  FOR INSERT WITH CHECK (
    auth.uid() = client_id AND
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE id = booking_id 
      AND client_id = auth.uid()
    )
  );

-- Les clients peuvent modifier leurs propres notes
CREATE POLICY "Clients can update their own ratings" ON ratings
  FOR UPDATE USING (auth.uid() = client_id);

-- Les chauffeurs peuvent voir les notes qui leur sont données
CREATE POLICY "Drivers can view their ratings" ON ratings
  FOR SELECT USING (auth.uid() = driver_id);

-- Les admins peuvent voir toutes les notes
CREATE POLICY "Admins can view all ratings" ON ratings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid()
    )
  );

-- Fonction pour calculer la note moyenne d'un chauffeur
CREATE OR REPLACE FUNCTION get_driver_average_rating(driver_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
BEGIN
  RETURN (
    SELECT ROUND(AVG(rating)::DECIMAL, 2)
    FROM ratings
    WHERE driver_id = driver_uuid
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir le nombre total de notes d'un chauffeur
CREATE OR REPLACE FUNCTION get_driver_rating_count(driver_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM ratings
    WHERE driver_id = driver_uuid
  );
END;
$$ LANGUAGE plpgsql;

-- Vue pour les statistiques des chauffeurs
CREATE OR REPLACE VIEW driver_rating_stats AS
SELECT 
  d.id as driver_id,
  d.first_name,
  d.last_name,
  COALESCE(AVG(r.rating), 0) as average_rating,
  COUNT(r.id) as total_ratings,
  COUNT(CASE WHEN r.rating = 5 THEN 1 END) as five_star_count,
  COUNT(CASE WHEN r.rating = 4 THEN 1 END) as four_star_count,
  COUNT(CASE WHEN r.rating = 3 THEN 1 END) as three_star_count,
  COUNT(CASE WHEN r.rating = 2 THEN 1 END) as two_star_count,
  COUNT(CASE WHEN r.rating = 1 THEN 1 END) as one_star_count
FROM drivers d
LEFT JOIN ratings r ON d.id = r.driver_id
WHERE d.status != 'deleted'
GROUP BY d.id, d.first_name, d.last_name;

-- Commentaires pour la documentation
COMMENT ON TABLE ratings IS 'Notes données par les clients aux chauffeurs après chaque course';
COMMENT ON COLUMN ratings.rating IS 'Note de 1 à 5 étoiles';
COMMENT ON COLUMN ratings.comment IS 'Commentaire optionnel du client';
COMMENT ON FUNCTION get_driver_average_rating(UUID) IS 'Calcule la note moyenne d''un chauffeur';
COMMENT ON FUNCTION get_driver_rating_count(UUID) IS 'Compte le nombre total de notes d''un chauffeur';

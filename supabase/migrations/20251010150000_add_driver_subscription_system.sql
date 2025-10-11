-- Créer la table pour gérer les abonnements des chauffeurs
CREATE TABLE IF NOT EXISTS driver_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  
  -- Période d'abonnement
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Détails de l'abonnement
  subscription_type VARCHAR(50) NOT NULL DEFAULT 'premium', -- 'free' ou 'premium'
  price_tnd DECIMAL(10, 2) DEFAULT 40.00, -- Prix de base avant TVA
  vat_percentage DECIMAL(5, 2) DEFAULT 19.00, -- TVA
  total_price_tnd DECIMAL(10, 2) DEFAULT 47.60, -- Prix total avec TVA
  
  -- Statut de paiement
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  payment_method VARCHAR(100), -- 'bank_transfer', 'cash_order', etc.
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_reference VARCHAR(255), -- Numéro de référence du paiement
  
  -- Notes administratives
  admin_notes TEXT,
  
  -- Statut
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'expired', 'cancelled'
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index pour améliorer les performances
  CONSTRAINT unique_driver_subscription_period UNIQUE (driver_id, start_date, end_date)
);

-- Ajouter des colonnes à la table drivers pour tracker les courses du mois
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS monthly_accepted_bookings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_bookings_reset_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50) DEFAULT 'free'; -- 'free' ou 'premium'

-- Fonction pour réinitialiser le compteur mensuel
CREATE OR REPLACE FUNCTION reset_monthly_bookings()
RETURNS void AS $$
BEGIN
  UPDATE drivers
  SET 
    monthly_accepted_bookings = 0,
    monthly_bookings_reset_date = CURRENT_DATE
  WHERE 
    monthly_bookings_reset_date < DATE_TRUNC('month', CURRENT_DATE)
    OR monthly_bookings_reset_date IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour incrémenter le compteur de courses acceptées
CREATE OR REPLACE FUNCTION increment_driver_monthly_bookings()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si le statut passe de 'pending' à 'accepted'
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Réinitialiser le compteur si on est dans un nouveau mois
    UPDATE drivers
    SET 
      monthly_accepted_bookings = CASE
        WHEN monthly_bookings_reset_date < DATE_TRUNC('month', CURRENT_DATE) 
        THEN 1
        ELSE monthly_accepted_bookings + 1
      END,
      monthly_bookings_reset_date = CASE
        WHEN monthly_bookings_reset_date < DATE_TRUNC('month', CURRENT_DATE)
        THEN CURRENT_DATE
        ELSE monthly_bookings_reset_date
      END
    WHERE id = NEW.driver_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger sur la table bookings
DROP TRIGGER IF EXISTS trigger_increment_monthly_bookings ON bookings;
CREATE TRIGGER trigger_increment_monthly_bookings
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION increment_driver_monthly_bookings();

-- Fonction pour vérifier l'abonnement actif d'un chauffeur
CREATE OR REPLACE FUNCTION get_driver_subscription_status(p_driver_id UUID)
RETURNS TABLE (
  has_active_subscription BOOLEAN,
  subscription_type VARCHAR(50),
  monthly_accepted_bookings INTEGER,
  can_accept_more_bookings BOOLEAN,
  remaining_free_bookings INTEGER
) AS $$
DECLARE
  v_driver_record RECORD;
  v_has_active_sub BOOLEAN;
BEGIN
  -- Récupérer les informations du chauffeur
  SELECT 
    d.subscription_type,
    d.monthly_accepted_bookings,
    d.monthly_bookings_reset_date,
    EXISTS(
      SELECT 1 FROM driver_subscriptions ds
      WHERE ds.driver_id = p_driver_id
        AND ds.status = 'active'
        AND ds.payment_status = 'paid'
        AND ds.start_date <= CURRENT_DATE
        AND ds.end_date >= CURRENT_DATE
    ) as has_sub
  INTO v_driver_record
  FROM drivers d
  WHERE d.id = p_driver_id;
  
  -- Si le chauffeur n'existe pas
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'free'::VARCHAR(50), 0, FALSE, 0;
    RETURN;
  END IF;
  
  -- Réinitialiser si nouveau mois
  IF v_driver_record.monthly_bookings_reset_date < DATE_TRUNC('month', CURRENT_DATE) THEN
    UPDATE drivers
    SET 
      monthly_accepted_bookings = 0,
      monthly_bookings_reset_date = CURRENT_DATE
    WHERE id = p_driver_id;
    
    v_driver_record.monthly_accepted_bookings := 0;
  END IF;
  
  v_has_active_sub := v_driver_record.has_sub;
  
  -- Si abonnement actif, pas de limite
  IF v_has_active_sub OR v_driver_record.subscription_type = 'premium' THEN
    RETURN QUERY SELECT 
      TRUE,
      'premium'::VARCHAR(50),
      v_driver_record.monthly_accepted_bookings,
      TRUE,
      999;
  ELSE
    -- Compte gratuit : 2 courses max par mois
    RETURN QUERY SELECT 
      FALSE,
      'free'::VARCHAR(50),
      v_driver_record.monthly_accepted_bookings,
      v_driver_record.monthly_accepted_bookings < 2,
      GREATEST(0, 2 - v_driver_record.monthly_accepted_bookings);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_driver_subscriptions_driver_id ON driver_subscriptions(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_subscriptions_status ON driver_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_driver_subscriptions_dates ON driver_subscriptions(start_date, end_date);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_driver_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà, puis le recréer
DROP TRIGGER IF EXISTS trigger_update_driver_subscriptions_updated_at ON driver_subscriptions;
CREATE TRIGGER trigger_update_driver_subscriptions_updated_at
  BEFORE UPDATE ON driver_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_subscriptions_updated_at();

-- Permissions RLS (Row Level Security)
ALTER TABLE driver_subscriptions ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Drivers can view their own subscriptions" ON driver_subscriptions;
DROP POLICY IF EXISTS "Drivers can create subscription requests" ON driver_subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON driver_subscriptions;

-- Les chauffeurs peuvent voir leurs propres abonnements
CREATE POLICY "Drivers can view their own subscriptions"
  ON driver_subscriptions
  FOR SELECT
  USING (auth.uid() = driver_id);

-- Les chauffeurs peuvent créer des demandes d'abonnement
CREATE POLICY "Drivers can create subscription requests"
  ON driver_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

-- Les administrateurs peuvent tout voir et modifier
CREATE POLICY "Admins can manage all subscriptions"
  ON driver_subscriptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
    )
  );

-- Commentaires pour la documentation
COMMENT ON TABLE driver_subscriptions IS 'Gestion des abonnements mensuels des chauffeurs';
COMMENT ON COLUMN driver_subscriptions.subscription_type IS 'Type d''abonnement: free (2 courses/mois) ou premium (illimité)';
COMMENT ON COLUMN driver_subscriptions.price_tnd IS 'Prix de l''abonnement avant TVA (40 TND)';
COMMENT ON COLUMN driver_subscriptions.vat_percentage IS 'Pourcentage de TVA (19%)';
COMMENT ON COLUMN driver_subscriptions.total_price_tnd IS 'Prix total avec TVA (47.60 TND)';
COMMENT ON COLUMN driver_subscriptions.payment_status IS 'Statut du paiement: pending, paid, failed';
COMMENT ON COLUMN driver_subscriptions.payment_method IS 'Méthode de paiement: bank_transfer, cash_order, etc.';
COMMENT ON COLUMN drivers.monthly_accepted_bookings IS 'Nombre de courses acceptées ce mois';
COMMENT ON COLUMN drivers.monthly_bookings_reset_date IS 'Date de dernier reset du compteur mensuel';
COMMENT ON COLUMN drivers.subscription_type IS 'Type d''abonnement actuel du chauffeur';


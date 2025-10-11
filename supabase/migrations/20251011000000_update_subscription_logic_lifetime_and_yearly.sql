-- Migration pour passer aux 3 courses gratuites LIFETIME et ajouter l'abonnement annuel
-- Cette migration modifie complètement la logique de l'abonnement

-- 0. Nettoyage des anciennes fonctions et triggers (dans le bon ordre)
-- D'abord supprimer les triggers qui dépendent des fonctions
DROP TRIGGER IF EXISTS trigger_increment_monthly_bookings ON bookings;

-- Ensuite supprimer les fonctions
DROP FUNCTION IF EXISTS reset_monthly_bookings();
DROP FUNCTION IF EXISTS increment_driver_monthly_bookings();

-- 1. Ajouter les nouvelles colonnes pour tracker les courses lifetime
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS lifetime_accepted_bookings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_used_free_trial BOOLEAN DEFAULT FALSE;

-- 2. Migrer les données existantes : copier monthly_accepted_bookings vers lifetime_accepted_bookings
UPDATE drivers
SET 
  lifetime_accepted_bookings = COALESCE(monthly_accepted_bookings, 0),
  has_used_free_trial = CASE 
    WHEN COALESCE(monthly_accepted_bookings, 0) >= 3 THEN TRUE 
    ELSE FALSE 
  END
WHERE lifetime_accepted_bookings = 0;

-- 3. Ajouter la colonne billing_period dans driver_subscriptions
ALTER TABLE driver_subscriptions
ADD COLUMN IF NOT EXISTS billing_period VARCHAR(20) DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly'));

-- 4. Créer la nouvelle fonction pour incrémenter le compteur LIFETIME
CREATE OR REPLACE FUNCTION increment_driver_lifetime_bookings()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si le statut passe de 'pending' à 'accepted'
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Incrémenter le compteur lifetime
    UPDATE drivers
    SET 
      lifetime_accepted_bookings = lifetime_accepted_bookings + 1,
      has_used_free_trial = CASE 
        WHEN lifetime_accepted_bookings + 1 >= 3 THEN TRUE 
        ELSE has_used_free_trial 
      END
    WHERE id = NEW.driver_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Remplacer le trigger existant par le nouveau
DROP TRIGGER IF EXISTS trigger_increment_monthly_bookings ON bookings;
DROP TRIGGER IF EXISTS trigger_increment_lifetime_bookings ON bookings;

CREATE TRIGGER trigger_increment_lifetime_bookings
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION increment_driver_lifetime_bookings();

-- 6. Supprimer l'ancienne fonction puis recréer avec la nouvelle logique
DROP FUNCTION IF EXISTS get_driver_subscription_status(UUID);

CREATE OR REPLACE FUNCTION get_driver_subscription_status(p_driver_id UUID)
RETURNS TABLE (
  has_active_subscription BOOLEAN,
  subscription_type VARCHAR(50),
  monthly_accepted_bookings INTEGER, -- Gardé pour compatibilité mais non utilisé
  can_accept_more_bookings BOOLEAN,
  remaining_free_bookings INTEGER,
  lifetime_accepted_bookings INTEGER,
  has_used_free_trial BOOLEAN,
  subscription_end_date DATE
) AS $$
DECLARE
  v_driver_record RECORD;
  v_has_active_sub BOOLEAN;
  v_sub_end_date DATE;
BEGIN
  -- Récupérer les informations du chauffeur
  SELECT 
    d.subscription_type,
    d.lifetime_accepted_bookings,
    d.has_used_free_trial,
    EXISTS(
      SELECT 1 FROM driver_subscriptions ds
      WHERE ds.driver_id = p_driver_id
        AND ds.status = 'active'
        AND ds.payment_status = 'paid'
        AND ds.start_date <= CURRENT_DATE
        AND ds.end_date >= CURRENT_DATE
    ) as has_sub,
    (
      SELECT ds.end_date FROM driver_subscriptions ds
      WHERE ds.driver_id = p_driver_id
        AND ds.status = 'active'
        AND ds.payment_status = 'paid'
        AND ds.start_date <= CURRENT_DATE
        AND ds.end_date >= CURRENT_DATE
      ORDER BY ds.end_date DESC
      LIMIT 1
    ) as sub_end_date
  INTO v_driver_record
  FROM drivers d
  WHERE d.id = p_driver_id;
  
  -- Si le chauffeur n'existe pas
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'free'::VARCHAR(50), 0, FALSE, 0, 0, FALSE, NULL::DATE;
    RETURN;
  END IF;
  
  v_has_active_sub := v_driver_record.has_sub;
  v_sub_end_date := v_driver_record.sub_end_date;
  
  -- Si abonnement actif, pas de limite
  IF v_has_active_sub OR v_driver_record.subscription_type = 'premium' THEN
    RETURN QUERY SELECT 
      TRUE,
      'premium'::VARCHAR(50),
      0, -- monthly_accepted_bookings (non utilisé)
      TRUE, -- can_accept_more_bookings
      999, -- remaining_free_bookings (illimité)
      v_driver_record.lifetime_accepted_bookings,
      v_driver_record.has_used_free_trial,
      v_sub_end_date;
  ELSE
    -- Compte gratuit : 3 courses max LIFETIME (une seule fois)
    RETURN QUERY SELECT 
      FALSE,
      'free'::VARCHAR(50),
      0, -- monthly_accepted_bookings (non utilisé)
      v_driver_record.lifetime_accepted_bookings < 3, -- Peut accepter si < 3 courses lifetime
      GREATEST(0, 3 - v_driver_record.lifetime_accepted_bookings), -- Courses restantes
      v_driver_record.lifetime_accepted_bookings,
      v_driver_record.has_used_free_trial,
      NULL::DATE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Supprimer l'ancienne fonction puis créer la fonction pour calculer les prix selon le type d'abonnement
DROP FUNCTION IF EXISTS calculate_subscription_price(VARCHAR, DECIMAL, DECIMAL);

CREATE OR REPLACE FUNCTION calculate_subscription_price(
  p_billing_period VARCHAR(20),
  p_base_monthly_price DECIMAL DEFAULT 30.00,
  p_vat_percentage DECIMAL DEFAULT 19.00
)
RETURNS TABLE (
  base_price DECIMAL,
  vat_amount DECIMAL,
  total_price DECIMAL,
  monthly_equivalent DECIMAL
) AS $$
DECLARE
  v_base_price DECIMAL;
  v_yearly_discount DECIMAL := 0.10; -- 10% de réduction pour l'annuel
BEGIN
  IF p_billing_period = 'yearly' THEN
    -- Prix annuel = (prix mensuel * 12) - 10%
    v_base_price := (p_base_monthly_price * 12) * (1 - v_yearly_discount);
  ELSE
    -- Prix mensuel
    v_base_price := p_base_monthly_price;
  END IF;
  
  RETURN QUERY SELECT 
    v_base_price,
    v_base_price * p_vat_percentage / 100,
    v_base_price * (1 + p_vat_percentage / 100),
    CASE 
      WHEN p_billing_period = 'yearly' THEN v_base_price / 12 * (1 + p_vat_percentage / 100)
      ELSE v_base_price * (1 + p_vat_percentage / 100)
    END;
END;
$$ LANGUAGE plpgsql;

-- 8. Mettre à jour les commentaires
COMMENT ON COLUMN drivers.lifetime_accepted_bookings IS 'Nombre total de courses acceptées depuis la création du compte';
COMMENT ON COLUMN drivers.has_used_free_trial IS 'Indique si le chauffeur a utilisé ses 3 courses gratuites';
COMMENT ON COLUMN driver_subscriptions.billing_period IS 'Période de facturation: monthly (mensuel) ou yearly (annuel avec 10% de réduction)';
COMMENT ON COLUMN driver_subscriptions.subscription_type IS 'Type d''abonnement: free (3 courses lifetime) ou premium (illimité)';

-- 9. Supprimer l'ancienne vue puis créer une vue pour faciliter les requêtes sur les abonnements
DROP VIEW IF EXISTS driver_subscription_details;

CREATE OR REPLACE VIEW driver_subscription_details AS
SELECT 
  d.id as driver_id,
  d.first_name,
  d.last_name,
  d.email,
  d.lifetime_accepted_bookings,
  d.has_used_free_trial,
  d.subscription_type,
  ds.id as subscription_id,
  ds.billing_period,
  ds.start_date,
  ds.end_date,
  ds.price_tnd,
  ds.total_price_tnd,
  ds.payment_status,
  ds.status as subscription_status,
  CASE 
    WHEN ds.end_date >= CURRENT_DATE AND ds.payment_status = 'paid' THEN TRUE
    ELSE FALSE
  END as is_subscription_active
FROM drivers d
LEFT JOIN driver_subscriptions ds ON d.id = ds.driver_id 
  AND ds.status = 'active'
  AND ds.payment_status = 'paid'
  AND ds.end_date >= CURRENT_DATE;

-- 10. Note importante pour la migration
COMMENT ON TABLE driver_subscriptions IS 'Gestion des abonnements des chauffeurs. 3 courses gratuites LIFETIME puis abonnement premium requis (mensuel ou annuel avec 10% de réduction)';

-- Note de migration :
-- Les chauffeurs existants qui ont déjà accepté des courses verront leur compteur lifetime initialisé
-- avec leur compteur mensuel actuel. Si >= 3 courses, ils devront s'abonner pour continuer.


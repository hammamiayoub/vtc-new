-- Migration pour passer le quota gratuit de 3 à 2 courses par mois
-- Cette migration met à jour la fonction get_driver_subscription_status existante

-- Recréer la fonction avec le nouveau quota de 2 courses
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
    -- Compte gratuit : 2 courses max par mois (MODIFIÉ DE 3 À 2)
    RETURN QUERY SELECT 
      FALSE,
      'free'::VARCHAR(50),
      v_driver_record.monthly_accepted_bookings,
      v_driver_record.monthly_accepted_bookings < 2,
      GREATEST(0, 2 - v_driver_record.monthly_accepted_bookings);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mise à jour des commentaires
COMMENT ON COLUMN driver_subscriptions.subscription_type IS 'Type d''abonnement: free (2 courses/mois) ou premium (illimité)';

-- Note : Cette migration ne nécessite pas de modification des données existantes
-- Les chauffeurs qui ont déjà accepté 3 courses ce mois seront bloqués jusqu'au prochain reset mensuel
-- C'est normal et attendu car la nouvelle limite est de 2



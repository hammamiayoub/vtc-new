-- Migration pour gérer l'expiration automatique des abonnements
-- Cette migration ajoute des fonctions pour marquer les abonnements expirés
-- et envoyer des notifications avant expiration

-- 1. Fonction pour marquer les abonnements expirés
CREATE OR REPLACE FUNCTION mark_expired_subscriptions()
RETURNS TABLE (
  subscription_id UUID,
  driver_id UUID,
  driver_email TEXT,
  billing_period VARCHAR(20),
  expired_date DATE
) AS $$
BEGIN
  -- Marquer comme 'expired' tous les abonnements dont la date de fin est dépassée
  RETURN QUERY
  UPDATE driver_subscriptions ds
  SET status = 'expired', updated_at = NOW()
  FROM drivers d
  WHERE ds.driver_id = d.id
    AND ds.status = 'active'
    AND ds.payment_status = 'paid'
    AND ds.end_date < CURRENT_DATE
  RETURNING 
    ds.id as subscription_id,
    ds.driver_id,
    d.email as driver_email,
    ds.billing_period,
    ds.end_date as expired_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fonction pour obtenir les abonnements qui expirent bientôt
CREATE OR REPLACE FUNCTION get_expiring_soon_subscriptions(days_before INT DEFAULT 7)
RETURNS TABLE (
  subscription_id UUID,
  driver_id UUID,
  driver_first_name TEXT,
  driver_last_name TEXT,
  driver_email TEXT,
  driver_phone TEXT,
  billing_period VARCHAR(20),
  end_date DATE,
  days_remaining INT,
  total_price_tnd DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id as subscription_id,
    ds.driver_id,
    d.first_name as driver_first_name,
    d.last_name as driver_last_name,
    d.email as driver_email,
    d.phone as driver_phone,
    ds.billing_period,
    ds.end_date,
    (ds.end_date - CURRENT_DATE) as days_remaining,
    ds.total_price_tnd
  FROM driver_subscriptions ds
  JOIN drivers d ON ds.driver_id = d.id
  WHERE ds.status = 'active'
    AND ds.payment_status = 'paid'
    AND ds.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + (days_before || ' days')::INTERVAL
  ORDER BY ds.end_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fonction pour obtenir les statistiques d'expiration
CREATE OR REPLACE FUNCTION get_subscription_expiration_stats()
RETURNS TABLE (
  total_active INT,
  expiring_in_7_days INT,
  expiring_in_30_days INT,
  expired_this_month INT,
  monthly_active INT,
  yearly_active INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (
      WHERE status = 'active' 
      AND payment_status = 'paid' 
      AND end_date >= CURRENT_DATE
    )::INT as total_active,
    
    COUNT(*) FILTER (
      WHERE status = 'active' 
      AND payment_status = 'paid'
      AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    )::INT as expiring_in_7_days,
    
    COUNT(*) FILTER (
      WHERE status = 'active' 
      AND payment_status = 'paid'
      AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    )::INT as expiring_in_30_days,
    
    COUNT(*) FILTER (
      WHERE status = 'expired'
      AND end_date >= DATE_TRUNC('month', CURRENT_DATE)
    )::INT as expired_this_month,
    
    COUNT(*) FILTER (
      WHERE status = 'active' 
      AND payment_status = 'paid'
      AND billing_period = 'monthly'
      AND end_date >= CURRENT_DATE
    )::INT as monthly_active,
    
    COUNT(*) FILTER (
      WHERE status = 'active' 
      AND payment_status = 'paid'
      AND billing_period = 'yearly'
      AND end_date >= CURRENT_DATE
    )::INT as yearly_active
  FROM driver_subscriptions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Vue pour faciliter la surveillance des abonnements
DROP VIEW IF EXISTS subscription_monitoring;

CREATE OR REPLACE VIEW subscription_monitoring AS
SELECT 
  ds.id as subscription_id,
  d.id as driver_id,
  d.first_name || ' ' || d.last_name as driver_name,
  d.email as driver_email,
  d.phone as driver_phone,
  ds.billing_period,
  ds.start_date,
  ds.end_date,
  ds.end_date - CURRENT_DATE as days_remaining,
  CASE 
    WHEN ds.end_date < CURRENT_DATE THEN 'Expiré'
    WHEN ds.end_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'Expire bientôt (7j)'
    WHEN ds.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expire dans 30j'
    ELSE 'Actif'
  END as expiration_status,
  ds.total_price_tnd,
  ds.payment_status,
  ds.status,
  d.lifetime_accepted_bookings
FROM driver_subscriptions ds
JOIN drivers d ON ds.driver_id = d.id
WHERE ds.payment_status = 'paid'
ORDER BY ds.end_date ASC;

-- 5. Table pour logger les notifications d'expiration envoyées
CREATE TABLE IF NOT EXISTS subscription_expiration_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES driver_subscriptions(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'expiring_soon_7d', 'expiring_soon_1d', 'expired'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_via VARCHAR(50), -- 'email', 'sms', 'push', 'in_app'
  
  CONSTRAINT unique_notification UNIQUE (subscription_id, notification_type)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_expiration_notifications_driver 
  ON subscription_expiration_notifications(driver_id);
CREATE INDEX IF NOT EXISTS idx_expiration_notifications_type 
  ON subscription_expiration_notifications(notification_type);

-- 6. Fonction pour enregistrer qu'une notification a été envoyée
CREATE OR REPLACE FUNCTION log_expiration_notification(
  p_subscription_id UUID,
  p_driver_id UUID,
  p_notification_type VARCHAR(50),
  p_sent_via VARCHAR(50) DEFAULT 'in_app'
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO subscription_expiration_notifications (
    subscription_id,
    driver_id,
    notification_type,
    sent_via
  ) VALUES (
    p_subscription_id,
    p_driver_id,
    p_notification_type,
    p_sent_via
  )
  ON CONFLICT (subscription_id, notification_type) 
  DO UPDATE SET sent_at = NOW(), sent_via = p_sent_via;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Fonction pour vérifier si une notification a déjà été envoyée
CREATE OR REPLACE FUNCTION has_notification_been_sent(
  p_subscription_id UUID,
  p_notification_type VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
  notification_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM subscription_expiration_notifications
    WHERE subscription_id = p_subscription_id
      AND notification_type = p_notification_type
  ) INTO notification_exists;
  
  RETURN notification_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Fonction principale à exécuter quotidiennement (via cron ou edge function)
CREATE OR REPLACE FUNCTION process_subscription_expirations()
RETURNS JSON AS $$
DECLARE
  v_expired_count INT := 0;
  v_expiring_7d_count INT := 0;
  v_expiring_1d_count INT := 0;
  v_result JSON;
BEGIN
  -- Marquer les abonnements expirés
  SELECT COUNT(*) INTO v_expired_count
  FROM mark_expired_subscriptions();
  
  -- Compter les abonnements qui expirent dans 7 jours
  SELECT COUNT(*) INTO v_expiring_7d_count
  FROM get_expiring_soon_subscriptions(7);
  
  -- Compter les abonnements qui expirent dans 1 jour
  SELECT COUNT(*) INTO v_expiring_1d_count
  FROM get_expiring_soon_subscriptions(1);
  
  -- Retourner un résumé JSON
  v_result := json_build_object(
    'processed_at', NOW(),
    'expired_subscriptions_marked', v_expired_count,
    'expiring_in_7_days', v_expiring_7d_count,
    'expiring_in_1_day', v_expiring_1d_count,
    'status', 'success'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Commentaires pour la documentation
COMMENT ON FUNCTION mark_expired_subscriptions() IS 
  'Marque automatiquement tous les abonnements dont la date de fin est dépassée comme expired';
COMMENT ON FUNCTION get_expiring_soon_subscriptions(INT) IS 
  'Retourne la liste des abonnements qui expirent dans N jours (défaut: 7 jours)';
COMMENT ON FUNCTION get_subscription_expiration_stats() IS 
  'Retourne des statistiques sur les expirations d''abonnements';
COMMENT ON FUNCTION process_subscription_expirations() IS 
  'Fonction principale à exécuter quotidiennement pour gérer les expirations';
COMMENT ON TABLE subscription_expiration_notifications IS 
  'Log des notifications d''expiration envoyées aux chauffeurs';
COMMENT ON VIEW subscription_monitoring IS 
  'Vue facilitant la surveillance des abonnements et leurs dates d''expiration';

-- 10. Permissions RLS pour la table de notifications
ALTER TABLE subscription_expiration_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view their own expiration notifications"
  ON subscription_expiration_notifications
  FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "Admins can manage all expiration notifications"
  ON subscription_expiration_notifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
    )
  );

-- Note d'utilisation :
-- Pour automatiser l'exécution quotidienne, utiliser pg_cron ou une Edge Function Supabase
-- Exemple avec pg_cron :
-- SELECT cron.schedule('daily-subscription-check', '0 2 * * *', 'SELECT process_subscription_expirations()');


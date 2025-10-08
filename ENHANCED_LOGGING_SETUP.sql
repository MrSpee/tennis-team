-- =====================================================
-- ENHANCED LOGGING SETUP für Super-Admin Dashboard
-- =====================================================
-- Erweitert das Logging-System um alle App-Aktivitäten
-- Datum: 2025-01-08
-- Autor: AI Assistant

-- =====================================================
-- 1. Erweiterte Activity Logs Tabelle
-- =====================================================

-- Füge neue Spalten hinzu für bessere Kategorisierung
ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'app',
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Erstelle Index für bessere Performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_source ON activity_logs(source);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- =====================================================
-- 2. Erweiterte System Stats
-- =====================================================

-- Füge neue Statistik-Typen hinzu
INSERT INTO system_stats (stat_type, stat_value, description, created_at) VALUES
('training_sessions_created', 0, 'Anzahl erstellter Training-Sessions', NOW()),
('training_responses_total', 0, 'Gesamtanzahl Training-Zusagen/Absagen', NOW()),
('matchday_responses_total', 0, 'Gesamtanzahl Matchday-Zusagen/Absagen', NOW()),
('profile_edits_total', 0, 'Gesamtanzahl Profil-Bearbeitungen', NOW()),
('lk_changes_total', 0, 'Gesamtanzahl LK-Änderungen', NOW()),
('match_results_entered', 0, 'Anzahl eingegebener Match-Ergebnisse', NOW()),
('page_navigations_total', 0, 'Gesamtanzahl Seiten-Navigationen', NOW()),
('errors_total', 0, 'Gesamtanzahl aufgetretener Fehler', NOW()),
('daily_active_trainings', 0, 'Tägliche aktive Training-Sessions', NOW()),
('weekly_active_users', 0, 'Wöchentlich aktive Benutzer', NOW())
ON CONFLICT (stat_type) DO NOTHING;

-- =====================================================
-- 3. Erweiterte Logging-Funktionen
-- =====================================================

-- Funktion für erweiterte Aktivitäts-Logs
CREATE OR REPLACE FUNCTION log_enhanced_activity(
  p_action VARCHAR(100),
  p_entity_type VARCHAR(50),
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_source VARCHAR(50) DEFAULT 'app',
  p_priority VARCHAR(20) DEFAULT 'normal',
  p_session_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
  user_email TEXT;
BEGIN
  -- Hole User-Email aus dem aktuellen Auth-Context
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Erstelle Log-Eintrag
  INSERT INTO activity_logs (
    action,
    entity_type,
    entity_id,
    details,
    user_email,
    source,
    priority,
    session_id,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    p_action,
    p_entity_type,
    p_entity_id,
    p_details,
    user_email,
    p_source,
    p_priority,
    p_session_id,
    p_ip_address,
    p_user_agent,
    NOW()
  ) RETURNING id INTO log_id;
  
  -- Aktualisiere entsprechende Statistiken
  CASE p_action
    WHEN 'training_created' THEN
      UPDATE system_stats 
      SET stat_value = stat_value + 1 
      WHERE stat_type = 'training_sessions_created';
    WHEN 'training_confirm', 'training_decline' THEN
      UPDATE system_stats 
      SET stat_value = stat_value + 1 
      WHERE stat_type = 'training_responses_total';
    WHEN 'matchday_confirm', 'matchday_decline' THEN
      UPDATE system_stats 
      SET stat_value = stat_value + 1 
      WHERE stat_type = 'matchday_responses_total';
    WHEN 'profile_edited' THEN
      UPDATE system_stats 
      SET stat_value = stat_value + 1 
      WHERE stat_type = 'profile_edits_total';
    WHEN 'lk_changed' THEN
      UPDATE system_stats 
      SET stat_value = stat_value + 1 
      WHERE stat_type = 'lk_changes_total';
    WHEN 'match_result_entered' THEN
      UPDATE system_stats 
      SET stat_value = stat_value + 1 
      WHERE stat_type = 'match_results_entered';
    WHEN 'page_navigation' THEN
      UPDATE system_stats 
      SET stat_value = stat_value + 1 
      WHERE stat_type = 'page_navigations_total';
    WHEN 'error_occurred' THEN
      UPDATE system_stats 
      SET stat_value = stat_value + 1 
      WHERE stat_type = 'errors_total';
  END CASE;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Training-spezifische Logging-Funktionen
-- =====================================================

-- Funktion für Training-Erstellung
CREATE OR REPLACE FUNCTION log_training_creation(
  p_training_id UUID,
  p_training_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
BEGIN
  RETURN log_enhanced_activity(
    'training_created',
    'training',
    p_training_id,
    p_training_data,
    'training_page',
    'normal'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion für Training-Zusagen/Absagen
CREATE OR REPLACE FUNCTION log_training_response(
  p_training_id UUID,
  p_response VARCHAR(20),
  p_player_id UUID,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
BEGIN
  RETURN log_enhanced_activity(
    'training_' || p_response,
    'training',
    p_training_id,
    COALESCE(p_details, '{}'::jsonb) || jsonb_build_object('player_id', p_player_id),
    'training_page',
    'normal'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. Matchday-spezifische Logging-Funktionen
-- =====================================================

-- Funktion für Matchday-Zusagen/Absagen
CREATE OR REPLACE FUNCTION log_matchday_response(
  p_match_id UUID,
  p_response VARCHAR(20),
  p_player_id UUID,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
BEGIN
  RETURN log_enhanced_activity(
    'matchday_' || p_response,
    'match',
    p_match_id,
    COALESCE(p_details, '{}'::jsonb) || jsonb_build_object('player_id', p_player_id),
    'matches_page',
    'normal'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. Profil-spezifische Logging-Funktionen
-- =====================================================

-- Funktion für Profil-Bearbeitungen
CREATE OR REPLACE FUNCTION log_profile_edit(
  p_player_id UUID,
  p_updated_fields JSONB,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
BEGIN
  RETURN log_enhanced_activity(
    'profile_edited',
    'player',
    p_player_id,
    COALESCE(p_details, '{}'::jsonb) || jsonb_build_object('updated_fields', p_updated_fields),
    'profile_page',
    'normal'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion für LK-Änderungen
CREATE OR REPLACE FUNCTION log_lk_change(
  p_player_id UUID,
  p_old_lk VARCHAR(20),
  p_new_lk VARCHAR(20),
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
BEGIN
  RETURN log_enhanced_activity(
    'lk_changed',
    'player',
    p_player_id,
    COALESCE(p_details, '{}'::jsonb) || jsonb_build_object(
      'old_lk', p_old_lk,
      'new_lk', p_new_lk
    ),
    'profile_page',
    'high'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. System-spezifische Logging-Funktionen
-- =====================================================

-- Funktion für Seiten-Navigation
CREATE OR REPLACE FUNCTION log_page_navigation(
  p_current_page VARCHAR(100),
  p_previous_page VARCHAR(100) DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
BEGIN
  RETURN log_enhanced_activity(
    'page_navigation',
    'navigation',
    NULL,
    COALESCE(p_details, '{}'::jsonb) || jsonb_build_object(
      'current_page', p_current_page,
      'previous_page', p_previous_page
    ),
    'app_navigation',
    'low'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion für Fehler-Logging
CREATE OR REPLACE FUNCTION log_error(
  p_error_message TEXT,
  p_error_stack TEXT DEFAULT NULL,
  p_context VARCHAR(100) DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
BEGIN
  RETURN log_enhanced_activity(
    'error_occurred',
    'system',
    NULL,
    COALESCE(p_details, '{}'::jsonb) || jsonb_build_object(
      'error_message', p_error_message,
      'error_stack', p_error_stack,
      'context', p_context
    ),
    'error_handler',
    'high'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. RLS Policies für erweiterte Logs
-- =====================================================

-- Super-Admins können alle Logs sehen
DROP POLICY IF EXISTS "Super admins can view all activity logs" ON activity_logs;
CREATE POLICY "Super admins can view all activity logs" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = auth.uid() 
      AND players.is_super_admin = true
    )
  );

-- Benutzer können ihre eigenen Logs sehen
DROP POLICY IF EXISTS "Users can view their own activity logs" ON activity_logs;
CREATE POLICY "Users can view their own activity logs" ON activity_logs
  FOR SELECT USING (
    user_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Alle authentifizierten Benutzer können Logs erstellen
DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON activity_logs;
CREATE POLICY "Authenticated users can create activity logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 9. Demo-Daten für Testing
-- =====================================================

-- Erstelle Demo-Aktivitäten für verschiedene Aktionen
INSERT INTO activity_logs (action, entity_type, entity_id, details, user_email, source, priority, created_at) VALUES
('training_created', 'training', gen_random_uuid(), '{"training_type": "public", "is_public": true, "max_players": 8}', 'theo@tester.com', 'training_page', 'normal', NOW() - INTERVAL '2 hours'),
('training_confirm', 'training', gen_random_uuid(), '{"player_id": "123", "response": "confirm"}', 'chris@spee.com', 'training_page', 'normal', NOW() - INTERVAL '1 hour'),
('matchday_confirm', 'match', gen_random_uuid(), '{"player_id": "456", "response": "confirm"}', 'alex@grebe.com', 'matches_page', 'normal', NOW() - INTERVAL '30 minutes'),
('profile_edited', 'player', gen_random_uuid(), '{"updated_fields": ["name", "phone"]}', 'theo@tester.com', 'profile_page', 'normal', NOW() - INTERVAL '15 minutes'),
('lk_changed', 'player', gen_random_uuid(), '{"old_lk": "14.2", "new_lk": "14.5"}', 'chris@spee.com', 'profile_page', 'high', NOW() - INTERVAL '10 minutes'),
('page_navigation', 'navigation', NULL, '{"current_page": "/dashboard", "previous_page": "/matches"}', 'alex@grebe.com', 'app_navigation', 'low', NOW() - INTERVAL '5 minutes'),
('error_occurred', 'system', NULL, '{"error_message": "Network timeout", "context": "data_loading"}', 'theo@tester.com', 'error_handler', 'high', NOW() - INTERVAL '2 minutes')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 10. Cleanup und Optimierung
-- =====================================================

-- Erstelle View für häufige Admin-Abfragen
CREATE OR REPLACE VIEW admin_activity_summary AS
SELECT 
  action,
  entity_type,
  COUNT(*) as count,
  COUNT(DISTINCT user_email) as unique_users,
  MAX(created_at) as last_occurrence,
  MIN(created_at) as first_occurrence
FROM activity_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY action, entity_type
ORDER BY count DESC;

-- Erstelle View für tägliche Aktivitäten
CREATE OR REPLACE VIEW daily_activity_stats AS
SELECT 
  DATE(created_at) as activity_date,
  COUNT(*) as total_activities,
  COUNT(DISTINCT user_email) as active_users,
  COUNT(DISTINCT action) as unique_actions,
  COUNT(*) FILTER (WHERE action LIKE 'training_%') as training_activities,
  COUNT(*) FILTER (WHERE action LIKE 'matchday_%') as matchday_activities,
  COUNT(*) FILTER (WHERE action LIKE 'profile_%') as profile_activities,
  COUNT(*) FILTER (WHERE action = 'error_occurred') as errors
FROM activity_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY activity_date DESC;

-- =====================================================
-- 11. Abschluss-Meldung
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Enhanced Logging System erfolgreich eingerichtet!';
  RAISE NOTICE '📊 Neue Funktionen verfügbar:';
  RAISE NOTICE '   - Erweiterte Activity Logs mit Source und Priority';
  RAISE NOTICE '   - Training-spezifische Logging-Funktionen';
  RAISE NOTICE '   - Matchday-spezifische Logging-Funktionen';
  RAISE NOTICE '   - Profil-spezifische Logging-Funktionen';
  RAISE NOTICE '   - System-spezifische Logging-Funktionen';
  RAISE NOTICE '   - Admin-Views für bessere Übersicht';
  RAISE NOTICE '   - Demo-Daten für Testing';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Nächste Schritte:';
  RAISE NOTICE '   1. SuperAdminDashboard testen';
  RAISE NOTICE '   2. Logging in App-Komponenten integrieren';
  RAISE NOTICE '   3. Performance-Monitoring aktivieren';
END $$;

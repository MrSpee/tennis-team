-- =====================================================
-- SUPER-ADMIN SYSTEM SETUP
-- =====================================================
-- Erweitert das Club-System um:
-- 1. Aktivitäts-Logging für alle wichtigen Aktionen
-- 2. Super-Admin Benutzerrollen
-- 3. Vereinsverwaltung (Genehmigen/Ablehnen)
-- 4. System-Statistiken und Monitoring

BEGIN;

-- =====================================================
-- 1. Aktivitäts-Logging Tabelle
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  action TEXT NOT NULL, -- z.B. 'club_selected', 'team_created', 'profile_updated'
  entity_type TEXT, -- z.B. 'club', 'team', 'player', 'match'
  entity_id UUID,
  details JSONB, -- Zusätzliche Details als JSON
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- =====================================================
-- 2. Super-Admin Rollen
-- =====================================================

-- Erweitere players Tabelle um Admin-Rollen
ALTER TABLE players ADD COLUMN IF NOT EXISTS 
  is_super_admin BOOLEAN DEFAULT false;

ALTER TABLE players ADD COLUMN IF NOT EXISTS 
  admin_permissions JSONB DEFAULT '{}';

-- =====================================================
-- 3. Vereinsverwaltung erweitern
-- =====================================================

-- Erweitere club_info um Admin-Felder
ALTER TABLE club_info ADD COLUMN IF NOT EXISTS 
  admin_notes TEXT;

ALTER TABLE club_info ADD COLUMN IF NOT EXISTS 
  admin_reviewed_at TIMESTAMPTZ;

ALTER TABLE club_info ADD COLUMN IF NOT EXISTS 
  admin_reviewed_by UUID REFERENCES auth.users(id);

-- =====================================================
-- 4. System-Statistiken Tabelle
-- =====================================================

CREATE TABLE IF NOT EXISTS system_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE DEFAULT CURRENT_DATE,
  stat_type TEXT NOT NULL, -- z.B. 'daily_users', 'new_clubs', 'onboarding_completed'
  stat_value INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stat_date, stat_type)
);

-- =====================================================
-- 5. RLS Policies für Activity Logs
-- =====================================================

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Nur Super-Admins können Logs lesen
DROP POLICY IF EXISTS "Super admins can read activity logs" ON activity_logs;
CREATE POLICY "Super admins can read activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = auth.uid() 
      AND players.is_super_admin = true
    )
  );

-- Alle authentifizierten Nutzer können Logs erstellen
DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON activity_logs;
CREATE POLICY "Authenticated users can create activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 6. RLS Policies für System Stats
-- =====================================================

ALTER TABLE system_stats ENABLE ROW LEVEL SECURITY;

-- Nur Super-Admins können Stats lesen/schreiben
DROP POLICY IF EXISTS "Super admins can manage system stats" ON system_stats;
CREATE POLICY "Super admins can manage system stats"
  ON system_stats FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = auth.uid() 
      AND players.is_super_admin = true
    )
  );

-- =====================================================
-- 7. Logging-Funktionen
-- =====================================================

-- Funktion: Aktivität loggen
CREATE OR REPLACE FUNCTION log_activity(
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
  user_email TEXT;
BEGIN
  -- Hole User-Email
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Erstelle Log-Eintrag
  INSERT INTO activity_logs (
    user_id,
    user_email,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    auth.uid(),
    user_email,
    p_action,
    p_entity_type,
    p_entity_id,
    p_details
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion: System-Statistik aktualisieren
CREATE OR REPLACE FUNCTION update_system_stat(
  p_stat_type TEXT,
  p_increment INTEGER DEFAULT 1,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO system_stats (stat_type, stat_value, metadata)
  VALUES (p_stat_type, p_increment, p_metadata)
  ON CONFLICT (stat_date, stat_type)
  DO UPDATE SET 
    stat_value = system_stats.stat_value + p_increment,
    metadata = COALESCE(system_stats.metadata, '{}'::jsonb) || p_metadata;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. Trigger für automatisches Logging
-- =====================================================

-- Trigger: Club-Auswahl loggen
CREATE OR REPLACE FUNCTION log_club_selection()
RETURNS TRIGGER AS $$
BEGIN
  -- Log nur bei INSERT (neue Auswahl)
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      'club_selected',
      'club',
      NEW.id,
      jsonb_build_object(
        'club_name', NEW.name,
        'club_city', NEW.city,
        'is_verified', NEW.is_verified
      )
    );
    
    -- Statistik aktualisieren
    PERFORM update_system_stat('club_selections');
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger auf club_info (für neue Vereine)
DROP TRIGGER IF EXISTS trigger_log_club_selection ON club_info;
CREATE TRIGGER trigger_log_club_selection
  AFTER INSERT ON club_info
  FOR EACH ROW
  EXECUTE FUNCTION log_club_selection();

-- =====================================================
-- 9. Super-Admin für Theo Tester einrichten
-- =====================================================

-- Setze Theo Tester als Super-Admin
UPDATE players 
SET 
  is_super_admin = true,
  admin_permissions = '{
    "can_manage_clubs": true,
    "can_view_logs": true,
    "can_manage_users": true,
    "can_view_stats": true,
    "can_manage_system": true
  }'::jsonb
WHERE email = 'theo@tester.de' OR name ILIKE '%theo%tester%';

-- =====================================================
-- 10. Initiale Statistiken
-- =====================================================

-- Erstelle initiale Statistiken für heute
INSERT INTO system_stats (stat_type, stat_value, metadata)
VALUES 
  ('daily_active_users', 0, '{"description": "Users who logged in today"}'),
  ('total_clubs', 0, '{"description": "Total clubs in database"}'),
  ('pending_club_reviews', 0, '{"description": "Clubs waiting for admin review"}'),
  ('onboarding_completed', 0, '{"description": "Users who completed onboarding"}'),
  ('total_teams', 0, '{"description": "Total teams created"}')
ON CONFLICT (stat_date, stat_type) DO NOTHING;

COMMIT;

-- =====================================================
-- Erfolgsmeldung
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Super-Admin System erfolgreich eingerichtet!';
  RAISE NOTICE '📊 Activity Logging aktiviert';
  RAISE NOTICE '👑 Super-Admin für Theo Tester eingerichtet';
  RAISE NOTICE '📈 System-Statistiken initialisiert';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Nächster Schritt: SuperAdminDashboard.jsx erstellen';
END $$;

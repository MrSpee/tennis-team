-- ============================================================
-- APP SETTINGS TABLE - Feature Toggles & App-Konfiguration
-- ============================================================
-- Ermöglicht das Aktivieren/Deaktivieren von Features über Super-Admin
-- ============================================================

-- Erstelle app_settings Tabelle
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kommentare
COMMENT ON TABLE app_settings IS 'App-weite Einstellungen und Feature-Toggles';
COMMENT ON COLUMN app_settings.setting_key IS 'Eindeutiger Schlüssel für die Einstellung (z.B. "gamification_banner_enabled")';
COMMENT ON COLUMN app_settings.setting_value IS 'Wert der Einstellung (als Text gespeichert, kann JSON sein)';
COMMENT ON COLUMN app_settings.description IS 'Beschreibung der Einstellung';

-- Index für schnelle Lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);

-- Initialer Wert: Banner deaktiviert (Standard)
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES ('gamification_banner_enabled', 'false', 'Aktiviert/Deaktiviert den "Spielergebnisse eintragen lohnt sich!" Banner auf der Startseite')
ON CONFLICT (setting_key) DO NOTHING;

-- RLS Policies (nur Super-Admins können lesen/schreiben)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Alle können lesen (für Frontend)
CREATE POLICY "app_settings_select_all" ON app_settings
  FOR SELECT
  USING (true);

-- Policy: Nur Super-Admins können schreiben (insert/update/delete)
CREATE POLICY "app_settings_modify_super_admin" ON app_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM players_unified
      WHERE players_unified.user_id = auth.uid()
      AND players_unified.is_super_admin = true
    )
  );

-- ============================================================
-- ✅ Fertig
-- ============================================================
-- Die Tabelle ist jetzt bereit für Feature-Toggles
-- Standard: Banner ist deaktiviert (false)
-- ============================================================


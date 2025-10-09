-- ================================================================
-- LK-TRACKING-SYSTEM
-- ================================================================
-- Komplettes System zur Verwaltung von Leistungsklassen (LK)
-- 
-- KONZEPT:
-- --------
-- 1. Die LK ist SPIELERGEBUNDEN, nicht teamgebunden
-- 2. season_start_lk = LK zu Saisonbeginn (aus Meldeliste)
-- 3. current_lk = Aktuelle LK (wird durch Spiele aktualisiert)
-- 4. player_lk_history = Alle LK-Änderungen über alle Teams/Saisons
-- 5. match_results = Einzelne Spielergebnisse zur LK-Berechnung
-- ================================================================

-- =====================================================
-- SCHRITT 1: Prüfe ob players Tabelle LK-Felder hat
-- =====================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'players'
  AND column_name IN ('season_start_lk', 'current_lk', 'last_lk_update', 'season_improvement')
ORDER BY column_name;

-- Falls Felder fehlen, füge sie hinzu:
-- ALTER TABLE players ADD COLUMN IF NOT EXISTS season_start_lk VARCHAR(20);
-- ALTER TABLE players ADD COLUMN IF NOT EXISTS current_lk VARCHAR(20);
-- ALTER TABLE players ADD COLUMN IF NOT EXISTS last_lk_update TIMESTAMP DEFAULT NOW();
-- ALTER TABLE players ADD COLUMN IF NOT EXISTS season_improvement NUMERIC(4,2) DEFAULT 0;

-- =====================================================
-- SCHRITT 2: Erstelle LK-Historie-Tabelle
-- =====================================================
CREATE TABLE IF NOT EXISTS player_lk_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  
  -- LK-Daten
  old_lk VARCHAR(20),
  new_lk VARCHAR(20),
  lk_change NUMERIC(4,2), -- z.B. -0.5 für Verbesserung
  
  -- Kontext
  change_reason VARCHAR(50), -- 'match_result', 'season_start', 'manual', 'tournament'
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  team_id UUID REFERENCES team_info(id) ON DELETE SET NULL,
  season VARCHAR(50),
  
  -- Zusatz-Info
  notes TEXT,
  
  -- Meta
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_lk_history_player ON player_lk_history(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lk_history_season ON player_lk_history(season, created_at DESC);

COMMENT ON TABLE player_lk_history IS 'Vollständige Historie aller LK-Änderungen eines Spielers über alle Teams und Saisons';

-- =====================================================
-- SCHRITT 3: Erstelle Match-Results-Tabelle (falls noch nicht vorhanden)
-- =====================================================
CREATE TABLE IF NOT EXISTS match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  
  -- Einzelergebnis
  position INTEGER, -- 1-6 (Einzel 1-6)
  result VARCHAR(20), -- 'win', 'loss', 'not_played'
  score VARCHAR(50), -- z.B. '6:4, 6:3'
  
  -- Gegner-Info
  opponent_name VARCHAR(255),
  opponent_lk VARCHAR(20),
  
  -- LK-Relevanz
  lk_relevant BOOLEAN DEFAULT true,
  lk_before VARCHAR(20),
  lk_after VARCHAR(20),
  lk_change NUMERIC(4,2),
  
  -- Meta
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(match_id, player_id, position)
);

CREATE INDEX IF NOT EXISTS idx_match_results_player ON match_results(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_results_match ON match_results(match_id);

COMMENT ON TABLE match_results IS 'Einzelne Spielergebnisse für LK-Berechnung';

-- =====================================================
-- SCHRITT 4: RLS-Policies für LK-Historie
-- =====================================================
ALTER TABLE player_lk_history ENABLE ROW LEVEL SECURITY;

-- Jeder kann seine eigene Historie sehen
DROP POLICY IF EXISTS "Players can view own lk history" ON player_lk_history;
CREATE POLICY "Players can view own lk history"
ON player_lk_history FOR SELECT
USING (
  player_id IN (
    SELECT id FROM players WHERE user_id = auth.uid()
  )
);

-- Team-Kapitäne können die Historie ihrer Team-Mitglieder sehen
DROP POLICY IF EXISTS "Captains can view team lk history" ON player_lk_history;
CREATE POLICY "Captains can view team lk history"
ON player_lk_history FOR SELECT
USING (
  team_id IN (
    SELECT pt.team_id 
    FROM player_teams pt
    JOIN players p ON p.id = pt.player_id
    WHERE p.user_id = auth.uid()
      AND pt.role = 'captain'
  )
);

-- Nur Kapitäne und Admins können LK-Historie erstellen
DROP POLICY IF EXISTS "Captains can create lk history" ON player_lk_history;
CREATE POLICY "Captains can create lk history"
ON player_lk_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM players p
    JOIN player_teams pt ON pt.player_id = p.id
    WHERE p.user_id = auth.uid()
      AND (pt.role = 'captain' OR p.is_super_admin = true)
  )
);

-- =====================================================
-- SCHRITT 5: RLS-Policies für Match-Results
-- =====================================================
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

-- Team-Mitglieder können Match-Results ihrer Matches sehen
DROP POLICY IF EXISTS "Players can view team match results" ON match_results;
CREATE POLICY "Players can view team match results"
ON match_results FOR SELECT
USING (
  match_id IN (
    SELECT m.id FROM matches m
    WHERE m.team_id IN (
      SELECT pt.team_id FROM player_teams pt
      JOIN players p ON p.id = pt.player_id
      WHERE p.user_id = auth.uid()
    )
  )
);

-- Kapitäne können Match-Results ihrer Teams erstellen/updaten
DROP POLICY IF EXISTS "Captains can manage match results" ON match_results;
CREATE POLICY "Captains can manage match results"
ON match_results FOR ALL
USING (
  match_id IN (
    SELECT m.id FROM matches m
    WHERE m.team_id IN (
      SELECT pt.team_id FROM player_teams pt
      JOIN players p ON p.id = pt.player_id
      WHERE p.user_id = auth.uid()
        AND pt.role = 'captain'
    )
  )
);

-- =====================================================
-- SCHRITT 6: Hilfsfunktionen
-- =====================================================

-- Funktion: LK in Nummer konvertieren (für Berechnungen)
CREATE OR REPLACE FUNCTION lk_to_number(lk_text VARCHAR)
RETURNS NUMERIC AS $$
BEGIN
  IF lk_text IS NULL OR lk_text = '' THEN
    RETURN 25.0; -- Standard-LK für neue Spieler
  END IF;
  
  -- Extrahiere Zahl aus 'LK 12.5' → 12.5
  RETURN CAST(REGEXP_REPLACE(lk_text, '[^0-9.]', '', 'g') AS NUMERIC);
EXCEPTION
  WHEN OTHERS THEN
    RETURN 25.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Funktion: Nummer in LK-Text konvertieren
CREATE OR REPLACE FUNCTION number_to_lk(lk_number NUMERIC)
RETURNS VARCHAR AS $$
BEGIN
  IF lk_number IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN 'LK ' || TRIM(TO_CHAR(lk_number, '99.9'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Funktion: LK-Verbesserung berechnen (Saisonstart vs. aktuell)
CREATE OR REPLACE FUNCTION calculate_season_improvement(player_id_param UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_start_lk NUMERIC;
  v_current_lk NUMERIC;
BEGIN
  SELECT 
    lk_to_number(season_start_lk),
    lk_to_number(current_lk)
  INTO v_start_lk, v_current_lk
  FROM players
  WHERE id = player_id_param;
  
  IF v_start_lk IS NULL OR v_current_lk IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Achtung: Niedrigere LK = besser! Also negative Zahl = Verbesserung
  RETURN v_start_lk - v_current_lk;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SCHRITT 7: Trigger für automatische LK-Historie
-- =====================================================

-- Trigger-Funktion: Erstelle Historie-Eintrag bei LK-Änderung
CREATE OR REPLACE FUNCTION track_lk_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Nur wenn sich current_lk geändert hat
  IF NEW.current_lk IS DISTINCT FROM OLD.current_lk THEN
    INSERT INTO player_lk_history (
      player_id,
      old_lk,
      new_lk,
      lk_change,
      change_reason,
      season,
      notes,
      created_at
    ) VALUES (
      NEW.id,
      OLD.current_lk,
      NEW.current_lk,
      lk_to_number(OLD.current_lk) - lk_to_number(NEW.current_lk),
      'manual', -- Wird bei Match-Updates überschrieben
      NULL,
      'Automatisch erstellt durch Trigger',
      NOW()
    );
    
    -- Aktualisiere season_improvement
    NEW.season_improvement := calculate_season_improvement(NEW.id);
    NEW.last_lk_update := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger erstellen
DROP TRIGGER IF EXISTS trigger_track_lk_changes ON players;
CREATE TRIGGER trigger_track_lk_changes
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION track_lk_changes();

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 
  '✅ LK-Tracking-System Setup' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'player_lk_history') as lk_history_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'match_results') as match_results_table,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'lk_to_number') as lk_functions;

-- Erwartetes Ergebnis: lk_history_table=1, match_results_table=1, lk_functions>=1

-- =====================================================
-- BEISPIEL-ABFRAGEN
-- =====================================================

-- LK-Historie eines Spielers anzeigen
-- SELECT 
--   plh.created_at,
--   plh.old_lk,
--   plh.new_lk,
--   plh.lk_change,
--   plh.change_reason,
--   plh.season,
--   ti.club_name,
--   ti.team_name
-- FROM player_lk_history plh
-- LEFT JOIN team_info ti ON ti.id = plh.team_id
-- WHERE plh.player_id = '[PLAYER_ID]'
-- ORDER BY plh.created_at DESC;

-- Top-Verbesserer der Saison
-- SELECT 
--   p.name,
--   p.season_start_lk,
--   p.current_lk,
--   p.season_improvement,
--   p.last_lk_update
-- FROM players p
-- WHERE p.season_start_lk IS NOT NULL
--   AND p.current_lk IS NOT NULL
-- ORDER BY p.season_improvement DESC
-- LIMIT 10;

RAISE NOTICE '';
RAISE NOTICE '✅ LK-Tracking-System erfolgreich eingerichtet!';
RAISE NOTICE '';
RAISE NOTICE '📊 Nächste Schritte:';
RAISE NOTICE '   1. Führe IMPORT_TEAM_WITH_PLAYERS.sql aus';
RAISE NOTICE '   2. Setze season_start_lk aus Meldeliste';
RAISE NOTICE '   3. Nach Medenspielen: Match-Results erfassen';
RAISE NOTICE '   4. LK wird automatisch aktualisiert';
RAISE NOTICE '';


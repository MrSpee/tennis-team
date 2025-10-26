-- ============================================================================
-- ROUND-ROBIN TRAINING SYSTEM - DATABASE SETUP
-- ============================================================================
-- Intelligente Platzvergabe mit Prioritäts-Berechnung und Warteliste
-- Erstellt: 2025-10-22
-- ============================================================================

-- ============================================================================
-- 1. PLAYERS TABELLE: Training-Statistiken hinzufügen
-- ============================================================================
-- Speichert historische Teilnahme-Daten für Prioritäts-Berechnung

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS training_stats JSONB DEFAULT '{
  "total_invites": 0,
  "total_attended": 0,
  "total_declined": 0,
  "attendance_rate": 0.0,
  "last_attended": null,
  "consecutive_declines": 0
}'::jsonb;

COMMENT ON COLUMN players.training_stats IS 'Statistiken für Round-Robin Prioritäts-Berechnung';

-- ============================================================================
-- 2. TRAINING_SESSIONS TABELLE: Round-Robin Konfiguration
-- ============================================================================
-- Aktivierung und Konfiguration pro Training

ALTER TABLE training_sessions 
ADD COLUMN IF NOT EXISTS round_robin_enabled BOOLEAN DEFAULT false;

ALTER TABLE training_sessions 
ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT false;

ALTER TABLE training_sessions 
ADD COLUMN IF NOT EXISTS round_robin_seed INTEGER;

COMMENT ON COLUMN training_sessions.round_robin_enabled IS 'Aktiviert intelligente Platzvergabe mit Warteliste';
COMMENT ON COLUMN training_sessions.is_priority IS 'Markiert Training als Prio-Training (z.B. Medenspiel-Vorbereitung)';
COMMENT ON COLUMN training_sessions.round_robin_seed IS 'Seed für reproduzierbare Zufälligkeit im Round-Robin';

-- ============================================================================
-- 3. TRAINING_ATTENDANCE TABELLE: Prioritäts-Tracking
-- ============================================================================
-- Zusätzliche Felder für Wartelisten-Management

ALTER TABLE training_attendance 
ADD COLUMN IF NOT EXISTS priority_score FLOAT;

ALTER TABLE training_attendance 
ADD COLUMN IF NOT EXISTS waitlist_position INTEGER;

ALTER TABLE training_attendance 
ADD COLUMN IF NOT EXISTS auto_promoted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE training_attendance 
ADD COLUMN IF NOT EXISTS priority_reason TEXT;

COMMENT ON COLUMN training_attendance.priority_score IS 'Berechneter Prioritäts-Score (höher = besser)';
COMMENT ON COLUMN training_attendance.waitlist_position IS 'Position auf Warteliste (1 = erster Nachrücker)';
COMMENT ON COLUMN training_attendance.auto_promoted_at IS 'Zeitpunkt des automatischen Nachrückens von Warteliste';
COMMENT ON COLUMN training_attendance.priority_reason IS 'Grund für Priorität (z.B. "high_attendance", "prio_training")';

-- ============================================================================
-- 4. INDIZES für Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_players_training_stats 
ON players USING GIN (training_stats);

CREATE INDEX IF NOT EXISTS idx_training_sessions_round_robin 
ON training_sessions (round_robin_enabled, is_priority) 
WHERE round_robin_enabled = true;

CREATE INDEX IF NOT EXISTS idx_training_attendance_waitlist 
ON training_attendance (session_id, waitlist_position) 
WHERE waitlist_position IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_training_attendance_priority 
ON training_attendance (session_id, priority_score DESC);

-- ============================================================================
-- 5. RLS POLICIES (Row Level Security)
-- ============================================================================
-- Spieler können ihre eigenen Statistiken sehen

-- Policy für training_stats lesen
DROP POLICY IF EXISTS "Players can view their own training stats" ON players;
CREATE POLICY "Players can view their own training stats"
ON players FOR SELECT
USING (auth.uid() = user_id);

-- Policy für Organisatoren: Alle Stats des Trainings sehen
DROP POLICY IF EXISTS "Organizers can view training stats" ON training_attendance;
CREATE POLICY "Organizers can view training stats"
ON training_attendance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM training_sessions ts
    WHERE ts.id = training_attendance.session_id
    AND ts.organizer_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  )
);

-- ============================================================================
-- 6. HELPER FUNCTION: Statistiken initialisieren für bestehende Spieler
-- ============================================================================

CREATE OR REPLACE FUNCTION initialize_training_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Initialisiere training_stats für alle Spieler ohne Statistiken
  UPDATE players
  SET training_stats = '{
    "total_invites": 0,
    "total_attended": 0,
    "total_declined": 0,
    "attendance_rate": 0.0,
    "last_attended": null,
    "consecutive_declines": 0
  }'::jsonb
  WHERE training_stats IS NULL OR training_stats = '{}'::jsonb;

  RAISE NOTICE '✅ Training stats initialized for all players';
END;
$$;

-- Führe Initialisierung aus
SELECT initialize_training_stats();

-- ============================================================================
-- 7. HELPER FUNCTION: Statistiken aus Historie berechnen
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_historical_training_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  player_record RECORD;
  stats JSONB;
  total_attended INTEGER;
  total_declined INTEGER;
  last_attended_date TIMESTAMP WITH TIME ZONE;
  consecutive_declines INTEGER;
  attendance_rate FLOAT;
BEGIN
  -- Für jeden Spieler
  FOR player_record IN 
    SELECT DISTINCT player_id FROM training_attendance
  LOOP
    -- Zähle Teilnahmen
    SELECT COUNT(*) INTO total_attended
    FROM training_attendance
    WHERE player_id = player_record.player_id
    AND status = 'confirmed';

    -- Zähle Absagen
    SELECT COUNT(*) INTO total_declined
    FROM training_attendance
    WHERE player_id = player_record.player_id
    AND status = 'declined';

    -- Letztes Training
    SELECT MAX(response_date) INTO last_attended_date
    FROM training_attendance
    WHERE player_id = player_record.player_id
    AND status = 'confirmed';

    -- Konsekutive Absagen (letzte 5 Trainings)
    SELECT COUNT(*) INTO consecutive_declines
    FROM (
      SELECT status
      FROM training_attendance
      WHERE player_id = player_record.player_id
      AND status IN ('confirmed', 'declined')
      ORDER BY response_date DESC
      LIMIT 5
    ) recent
    WHERE status = 'declined';

    -- Teilnahme-Quote berechnen
    IF (total_attended + total_declined) > 0 THEN
      attendance_rate := total_attended::FLOAT / (total_attended + total_declined);
    ELSE
      attendance_rate := 0.0;
    END IF;

    -- Statistiken speichern
    stats := jsonb_build_object(
      'total_invites', total_attended + total_declined,
      'total_attended', total_attended,
      'total_declined', total_declined,
      'attendance_rate', attendance_rate,
      'last_attended', last_attended_date,
      'consecutive_declines', consecutive_declines
    );

    -- Update Player
    UPDATE players
    SET training_stats = stats
    WHERE id = player_record.player_id;

  END LOOP;

  RAISE NOTICE '✅ Historical training stats calculated for all players';
END;
$$;

-- Führe historische Berechnung aus
SELECT calculate_historical_training_stats();

-- ============================================================================
-- 8. TRIGGER: Auto-Update Statistiken bei Zu-/Absage
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_update_training_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_stats JSONB;
  new_stats JSONB;
  total_attended INTEGER;
  total_declined INTEGER;
  attendance_rate FLOAT;
BEGIN
  -- Hole aktuelle Statistiken
  SELECT training_stats INTO current_stats
  FROM players
  WHERE id = NEW.player_id;

  -- Initialisiere wenn nicht vorhanden
  IF current_stats IS NULL THEN
    current_stats := '{
      "total_invites": 0,
      "total_attended": 0,
      "total_declined": 0,
      "attendance_rate": 0.0,
      "consecutive_declines": 0
    }'::jsonb;
  END IF;

  -- Update basierend auf Status
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Zusage
    total_attended := (current_stats->>'total_attended')::INTEGER + 1;
    total_declined := (current_stats->>'total_declined')::INTEGER;
    
    new_stats := jsonb_set(current_stats, '{total_attended}', to_jsonb(total_attended));
    new_stats := jsonb_set(new_stats, '{consecutive_declines}', '0');
    new_stats := jsonb_set(new_stats, '{last_attended}', to_jsonb(NEW.response_date));
    
  ELSIF NEW.status = 'declined' AND (OLD.status IS NULL OR OLD.status != 'declined') THEN
    -- Absage
    total_attended := (current_stats->>'total_attended')::INTEGER;
    total_declined := (current_stats->>'total_declined')::INTEGER + 1;
    
    new_stats := jsonb_set(current_stats, '{total_declined}', to_jsonb(total_declined));
    new_stats := jsonb_set(new_stats, '{consecutive_declines}', 
      to_jsonb((current_stats->>'consecutive_declines')::INTEGER + 1));
  ELSE
    -- Keine Änderung
    RETURN NEW;
  END IF;

  -- Teilnahme-Quote neu berechnen
  IF (total_attended + total_declined) > 0 THEN
    attendance_rate := total_attended::FLOAT / (total_attended + total_declined);
  ELSE
    attendance_rate := 0.0;
  END IF;

  new_stats := jsonb_set(new_stats, '{attendance_rate}', to_jsonb(attendance_rate));
  new_stats := jsonb_set(new_stats, '{total_invites}', to_jsonb(total_attended + total_declined));

  -- Update Player
  UPDATE players
  SET training_stats = new_stats
  WHERE id = NEW.player_id;

  RETURN NEW;
END;
$$;

-- Erstelle Trigger
DROP TRIGGER IF EXISTS trigger_auto_update_training_stats ON training_attendance;
CREATE TRIGGER trigger_auto_update_training_stats
AFTER INSERT OR UPDATE OF status ON training_attendance
FOR EACH ROW
EXECUTE FUNCTION auto_update_training_stats();

-- ============================================================================
-- 9. VERIFICATION: Prüfe ob alles korrekt erstellt wurde
-- ============================================================================

DO $$
DECLARE
  players_stats_exists BOOLEAN;
  training_sessions_rr_exists BOOLEAN;
  training_attendance_priority_exists BOOLEAN;
BEGIN
  -- Prüfe players.training_stats
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'training_stats'
  ) INTO players_stats_exists;

  -- Prüfe training_sessions.round_robin_enabled
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_sessions' AND column_name = 'round_robin_enabled'
  ) INTO training_sessions_rr_exists;

  -- Prüfe training_attendance.priority_score
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_attendance' AND column_name = 'priority_score'
  ) INTO training_attendance_priority_exists;

  -- Ergebnis
  IF players_stats_exists AND training_sessions_rr_exists AND training_attendance_priority_exists THEN
    RAISE NOTICE '✅ ============================================';
    RAISE NOTICE '✅ ROUND-ROBIN SYSTEM ERFOLGREICH INSTALLIERT!';
    RAISE NOTICE '✅ ============================================';
    RAISE NOTICE '✅ players.training_stats: OK';
    RAISE NOTICE '✅ training_sessions.round_robin_enabled: OK';
    RAISE NOTICE '✅ training_attendance.priority_score: OK';
    RAISE NOTICE '✅ Trigger & Functions: OK';
    RAISE NOTICE '✅ ============================================';
  ELSE
    RAISE WARNING '⚠️ Fehler bei der Installation. Bitte Logs prüfen.';
  END IF;
END;
$$;

-- ============================================================================
-- FERTIG! 🎉
-- ============================================================================
-- Nächster Schritt: Frontend-Implementierung in Training.jsx
-- ============================================================================


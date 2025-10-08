-- ================================================================
-- TRAINING SYSTEM - PRIVACY UPDATE
-- ================================================================
-- Erweitert das Training-System um:
-- 1. invited_players (Array) für private Gruppen
-- 2. external_players (JSONB) für Spieler außerhalb der App
-- 3. Verbesserte Sichtbarkeits-Logik
-- ================================================================

-- 1. Erweitere training_sessions um Privacy-Felder
-- ================================================================

ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS invited_players UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS external_players JSONB DEFAULT '[]';

-- Kommentar zu den Feldern
COMMENT ON COLUMN training_sessions.invited_players IS 'Array von Player-IDs, die zu diesem privaten Training eingeladen sind';
COMMENT ON COLUMN training_sessions.external_players IS 'Array von externen Spielern: [{"name": "Max Extern", "lk": "LK 15.0", "club": "TC Köln"}]';

-- 2. Update RLS Policy für Sichtbarkeit
-- ================================================================

-- Lösche alte Policy
DROP POLICY IF EXISTS "Allow all authenticated users to read training sessions" ON training_sessions;

-- Neue Policy: Sichtbarkeit basierend auf Privacy-Regeln
CREATE POLICY "Allow users to see visible training sessions"
  ON training_sessions FOR SELECT
  TO authenticated
  USING (
    -- Öffentliche Trainings: Alle sehen
    type = 'public'
    OR
    -- Private Trainings mit "Spieler gesucht": Alle sehen
    (type = 'private' AND is_public = true AND needs_substitute = true)
    OR
    -- Private Trainings: Nur wenn ich eingeladen bin
    (type = 'private' AND auth.uid() IN (
      SELECT user_id FROM players WHERE id = ANY(invited_players)
    ))
    OR
    -- Private Trainings: Nur wenn ich Organisator bin
    (organizer_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    ))
  );

-- 3. Policy für Training erstellen (alle Spieler dürfen erstellen)
-- ================================================================

CREATE POLICY "Allow all players to create trainings"
  ON training_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Organisator muss der aktuelle User sein
    organizer_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- 4. Policy für Training bearbeiten (nur Organisator)
-- ================================================================

CREATE POLICY "Allow organizer to update their trainings"
  ON training_sessions FOR UPDATE
  TO authenticated
  USING (
    organizer_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow organizer to delete their trainings"
  ON training_sessions FOR DELETE
  TO authenticated
  USING (
    organizer_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- ================================================================
-- DEMO: Aktualisiere bestehende Trainings
-- ================================================================

DO $$
DECLARE
  v_session_id UUID;
  v_chris_id UUID;
  v_robert_id UUID;
BEGIN
  -- Finde Spieler-IDs
  SELECT id INTO v_chris_id FROM players WHERE name LIKE '%Chris%Spee%' LIMIT 1;
  SELECT id INTO v_robert_id FROM players WHERE name LIKE '%Robert%Ellrich%' LIMIT 1;
  
  -- Finde das private Freitags-Training
  SELECT id INTO v_session_id 
  FROM training_sessions 
  WHERE type = 'private' 
  AND EXTRACT(DOW FROM date) = 5 -- Freitag
  LIMIT 1;
  
  IF v_session_id IS NOT NULL AND v_chris_id IS NOT NULL AND v_robert_id IS NOT NULL THEN
    -- Update: Chris und Robert sind eingeladen
    UPDATE training_sessions
    SET 
      invited_players = ARRAY[v_chris_id, v_robert_id],
      external_players = '[
        {
          "name": "Max Mustermann",
          "lk": "LK 15.5",
          "club": "TC Köln"
        }
      ]'::JSONB
    WHERE id = v_session_id;
    
    RAISE NOTICE '✅ Private Gruppe aktualisiert: Chris & Robert + 1 externer Spieler';
  ELSE
    RAISE NOTICE '⚠️ Konnte Spieler oder Training nicht finden';
  END IF;
END $$;

-- ================================================================
-- PRÜFUNG: Zeige aktualisierte Trainings
-- ================================================================

SELECT 
  ts.id,
  ts.title,
  ts.type,
  ts.is_public,
  ts.needs_substitute,
  ts.invited_players,
  ts.external_players,
  array_length(ts.invited_players, 1) as invited_count,
  jsonb_array_length(ts.external_players) as external_count
FROM training_sessions ts
ORDER BY ts.date;

-- ================================================================
-- FERTIG! 🎾
-- ================================================================
-- Nächste Schritte:
-- 1. Training.jsx um Privacy-Filter erweitern
-- 2. "Training erstellen" Formular implementieren
-- 3. Spieler-Auswahl (intern + extern) implementieren
-- ================================================================


-- ================================================================
-- ADD TRAINING COLUMNS: target_players & max_players
-- ================================================================
-- Ziel: Füge fehlende Spalten für Teilnehmerzahlen hinzu
-- ================================================================

-- Zeige aktuelle training_sessions Spalten
SELECT 
  '📋 Aktuelle training_sessions Spalten:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'training_sessions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- SCHRITT 1: Füge target_players hinzu
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'training_sessions' 
      AND column_name = 'target_players'
  ) THEN
    ALTER TABLE training_sessions
    ADD COLUMN target_players INTEGER DEFAULT 4;
    
    RAISE NOTICE '✅ target_players Spalte hinzugefügt (Default: 4)';
  ELSE
    RAISE NOTICE '⚠️ target_players Spalte existiert bereits';
  END IF;
END $$;

-- =====================================================
-- SCHRITT 2: Füge max_players hinzu
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'training_sessions' 
      AND column_name = 'max_players'
  ) THEN
    ALTER TABLE training_sessions
    ADD COLUMN max_players INTEGER DEFAULT 8;
    
    RAISE NOTICE '✅ max_players Spalte hinzugefügt (Default: 8)';
  ELSE
    RAISE NOTICE '⚠️ max_players Spalte existiert bereits';
  END IF;
END $$;

-- =====================================================
-- SCHRITT 3: Update bestehende Trainings mit Default-Werten
-- =====================================================

-- Update target_players für bestehende Trainings
UPDATE training_sessions 
SET target_players = 4 
WHERE target_players IS NULL;

-- Update max_players für bestehende Trainings  
UPDATE training_sessions 
SET max_players = 8 
WHERE max_players IS NULL;

-- Zeige Update-Ergebnis
SELECT 
  '📊 Update-Ergebnis:' as info,
  COUNT(*) as total_trainings,
  COUNT(CASE WHEN target_players IS NOT NULL THEN 1 END) as with_target_players,
  COUNT(CASE WHEN max_players IS NOT NULL THEN 1 END) as with_max_players
FROM training_sessions;

-- =====================================================
-- SCHRITT 4: Zeige finale Struktur
-- =====================================================

SELECT 
  '📋 Finale training_sessions Spalten:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'training_sessions'
  AND table_schema = 'public'
  AND column_name IN ('target_players', 'max_players', 'team_id', 'type')
ORDER BY ordinal_position;

-- =====================================================
-- SCHRITT 5: Test-Daten zeigen
-- =====================================================

SELECT 
  '🧪 Test-Daten (erste 5 Trainings):' as info,
  id,
  title,
  type,
  target_players,
  max_players,
  team_id
FROM training_sessions
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- ERFOLG
-- =====================================================

SELECT '✅ Training Columns Setup abgeschlossen!' as status;

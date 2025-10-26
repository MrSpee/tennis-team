-- ============================================================
-- 🚀 QUICK FIX: Training Visibility Problem
-- ============================================================
-- Problem: Spieler sehen ihre privaten Trainings nicht
-- Häufigste Ursache: training_attendance Einträge fehlen
-- ============================================================

DO $$
DECLARE
  v_training_record RECORD;
  v_player_id UUID;
  v_created_count INT := 0;
BEGIN
  RAISE NOTICE '🔧 STARTING QUICK FIX...';
  RAISE NOTICE '';
  
  -- ============================================================
  -- FIX 1: Erstelle fehlende training_attendance Einträge
  -- ============================================================
  
  RAISE NOTICE '📋 Creating missing training_attendance entries...';
  
  FOR v_training_record IN 
    SELECT 
      id, 
      title, 
      invited_players
    FROM training_sessions
    WHERE invited_players IS NOT NULL
      AND array_length(invited_players, 1) > 0
      AND date >= CURRENT_DATE
  LOOP
    -- Für jeden eingeladenen Spieler
    FOREACH v_player_id IN ARRAY v_training_record.invited_players
    LOOP
      -- Prüfe ob Eintrag bereits existiert
      IF NOT EXISTS (
        SELECT 1 FROM training_attendance 
        WHERE session_id = v_training_record.id 
        AND player_id = v_player_id
      ) THEN
        -- Erstelle fehlenden Eintrag
        INSERT INTO training_attendance (
          session_id, 
          player_id, 
          status, 
          response_date
        ) VALUES (
          v_training_record.id, 
          v_player_id, 
          'pending', 
          NULL
        );
        
        v_created_count := v_created_count + 1;
        RAISE NOTICE '  ✅ Created attendance for player % in training "%"', 
          v_player_id, v_training_record.title;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Created % missing attendance entries', v_created_count;
  RAISE NOTICE '';
  
  -- ============================================================
  -- FIX 2: Prüfe und repariere NULL invited_players Arrays
  -- ============================================================
  
  RAISE NOTICE '📋 Checking for trainings with NULL invited_players...';
  
  FOR v_training_record IN 
    SELECT 
      id, 
      title, 
      type,
      organizer_id
    FROM training_sessions
    WHERE type = 'private'
      AND date >= CURRENT_DATE
      AND (invited_players IS NULL OR array_length(invited_players, 1) IS NULL)
      AND (external_players IS NULL OR jsonb_array_length(external_players) = 0)
  LOOP
    RAISE NOTICE '  ⚠️  Training "%" (ID: %) has NO invited players!', 
      v_training_record.title, v_training_record.id;
    RAISE NOTICE '      Organizer: %', v_training_record.organizer_id;
  END LOOP;
  
  RAISE NOTICE '';
  
END $$;

-- ============================================================
-- VERIFICATION: Zeige aktuellen Status
-- ============================================================

SELECT 
  '✅ VERIFICATION' as section,
  ts.id::text,
  ts.title,
  ts.type,
  ts.organizer_id::text as organizer,
  COALESCE(array_length(ts.invited_players, 1), 0)::text as invited_count,
  COUNT(ta.id)::text as attendance_count,
  NULL::text as status
FROM training_sessions ts
LEFT JOIN training_attendance ta ON ta.session_id = ts.id
WHERE ts.date >= CURRENT_DATE
GROUP BY ts.id, ts.title, ts.type, ts.organizer_id, ts.invited_players

UNION ALL

-- ============================================================
-- SUMMARY
-- ============================================================

SELECT 
  '📊 SUMMARY' as section,
  NULL as id,
  'Total Trainings' as title,
  COUNT(DISTINCT ts.id)::text as type,
  NULL as organizer,
  NULL as invited_count,
  NULL as attendance_count,
  '✅ FIXED' as status
FROM training_sessions ts
WHERE ts.date >= CURRENT_DATE

ORDER BY section DESC, id;

-- ============================================================
-- 💡 NEXT STEPS:
-- ============================================================
-- 
-- 1. Führe dieses Script aus
-- 2. Prüfe die VERIFICATION-Ausgabe:
--    - Stimmen invited_count und attendance_count überein?
--    - Gibt es Trainings OHNE Einladungen?
-- 3. Teste im Browser:
--    - Logge dich als eingeladener Spieler ein
--    - Navigiere zu "Training"
--    - Siehst du dein Training?
-- 4. Wenn Problem weiterhin besteht:
--    - Führe DEBUG_TRAINING_VISIBILITY.sql aus
--    - Sende mir Console-Logs + User-Email
-- 
-- ============================================================


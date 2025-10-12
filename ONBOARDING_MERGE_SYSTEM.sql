-- ================================================================
-- ONBOARDING MERGE SYSTEM - Auto-Transfer Training Invites
-- ================================================================
-- Ziel: Nach Onboarding-Merge automatisch externe Spieler zu
--       training_attendance übertragen
-- ================================================================

-- ============================================================
-- FUNKTION: merge_training_invites_after_onboarding
-- ============================================================
-- Diese Funktion wird nach einem erfolgreichen Merge aufgerufen
-- und überträgt alle Training-Einladungen von external_players
-- zu training_attendance
-- ============================================================

CREATE OR REPLACE FUNCTION merge_training_invites_after_onboarding(
  p_imported_player_id UUID,
  p_new_player_id UUID
)
RETURNS void AS $$
DECLARE
  v_training_record RECORD;
  v_external_players JSONB;
  v_new_external_players JSONB := '[]'::jsonb;
  v_matched BOOLEAN;
BEGIN
  RAISE NOTICE '🔗 Starting training invite merge for imported_player_id: %, new_player_id: %', 
    p_imported_player_id, p_new_player_id;
  
  -- Durchsuche alle Trainings nach external_players mit dieser imported_player_id
  FOR v_training_record IN 
    SELECT id, external_players
    FROM training_sessions
    WHERE external_players IS NOT NULL
      AND external_players::text LIKE '%' || p_imported_player_id::text || '%'
  LOOP
    RAISE NOTICE '📋 Processing training: %', v_training_record.id;
    
    v_external_players := v_training_record.external_players;
    v_new_external_players := '[]'::jsonb;
    v_matched := FALSE;
    
    -- Durchlaufe alle external_players
    FOR i IN 0 .. jsonb_array_length(v_external_players) - 1 LOOP
      IF (v_external_players->i->>'imported_player_id')::uuid = p_imported_player_id THEN
        -- Dieser Spieler wurde gemerged!
        v_matched := TRUE;
        
        RAISE NOTICE '✅ Found match in external_players, creating training_attendance entry';
        
        -- Erstelle training_attendance Eintrag
        INSERT INTO training_attendance (session_id, player_id, status, response_date, created_at)
        VALUES (
          v_training_record.id,
          p_new_player_id,
          'pending',
          NULL,
          NOW()
        )
        ON CONFLICT (session_id, player_id) DO NOTHING; -- Falls schon vorhanden
        
        -- Füge NICHT zu new_external_players hinzu (wurde zu attendance übertragen)
      ELSE
        -- Andere externe Spieler behalten
        v_new_external_players := v_new_external_players || jsonb_build_array(v_external_players->i);
      END IF;
    END LOOP;
    
    -- Update training_sessions: Entferne gemergten Spieler aus external_players
    IF v_matched THEN
      IF jsonb_array_length(v_new_external_players) = 0 THEN
        -- Keine externen Spieler mehr
        UPDATE training_sessions
        SET external_players = NULL
        WHERE id = v_training_record.id;
        
        RAISE NOTICE '🗑️ Removed all external_players from training %', v_training_record.id;
      ELSE
        -- Noch andere externe Spieler vorhanden
        UPDATE training_sessions
        SET external_players = v_new_external_players
        WHERE id = v_training_record.id;
        
        RAISE NOTICE '✏️ Updated external_players for training %', v_training_record.id;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Training invite merge completed!';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- BEISPIEL-AUFRUF
-- ============================================================
-- Nach einem erfolgreichen Merge im OnboardingFlow.jsx
-- wird diese Funktion automatisch aufgerufen:
--
-- SELECT merge_training_invites_after_onboarding(
--   'imported_player_id_here'::uuid,
--   'new_player_id_here'::uuid
-- );
-- ============================================================

-- ============================================================
-- TEST: Simuliere Merge für einen Spieler
-- ============================================================
-- BEISPIEL (nicht ausführen, nur zur Dokumentation):
-- 
-- DO $$
-- DECLARE
--   v_imported_player_id UUID := 'a18c5c2a-2d6b-4e09-89f1-3802238c215e'; -- Marc Stoppenbach
--   v_new_player_id UUID := 'new-player-id-after-registration';
-- BEGIN
--   PERFORM merge_training_invites_after_onboarding(v_imported_player_id, v_new_player_id);
-- END $$;

SELECT '✅ ONBOARDING_MERGE_SYSTEM.sql Funktion erstellt!' as status;

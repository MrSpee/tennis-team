-- ============================================================
-- 🎯 ROUND-ROBIN TRAINING SYSTEM SETUP
-- ============================================================
-- Implementiert intelligentes Überbuchungs-Management
-- ============================================================

-- ============================================================
-- STEP 1: Erweitere players Tabelle
-- ============================================================

-- Round-Robin System
ALTER TABLE players ADD COLUMN IF NOT EXISTS round_robin_position INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS round_robin_season TEXT DEFAULT 'winter';

-- Teilnahme-Statistiken (JSONB für Flexibilität)
ALTER TABLE players ADD COLUMN IF NOT EXISTS attendance_stats JSONB DEFAULT '{
  "total_invites": 0,
  "confirmed": 0,
  "declined": 0,
  "no_show": 0,
  "last_updated": null
}'::jsonb;

-- Prio-Training Status
ALTER TABLE players ADD COLUMN IF NOT EXISTS needs_prio_training BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS prio_reason TEXT;

-- ============================================================
-- STEP 2: Erweitere training_sessions Tabelle
-- ============================================================

-- Prio-Training Features
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS is_prio_training BOOLEAN DEFAULT FALSE;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS prio_reason TEXT;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS captain_choice UUID[];

-- Warteliste-Management
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS auto_manage_overbooking BOOLEAN DEFAULT TRUE;

-- ============================================================
-- STEP 3: Erweitere training_attendance Tabelle
-- ============================================================

-- Warteliste-System
ALTER TABLE training_attendance ADD COLUMN IF NOT EXISTS waitlist_position INTEGER;
ALTER TABLE training_attendance ADD COLUMN IF NOT EXISTS auto_declined BOOLEAN DEFAULT FALSE;
ALTER TABLE training_attendance ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 0;
ALTER TABLE training_attendance ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- Erweiterte Status
ALTER TABLE training_attendance ADD COLUMN IF NOT EXISTS status_detail TEXT DEFAULT 'manual';
-- Mögliche Werte: 'manual', 'auto_confirmed', 'auto_declined', 'waitlist_promoted'

-- ============================================================
-- STEP 4: Erstelle Round-Robin Management Funktionen
-- ============================================================

-- Funktion: Generiere Round-Robin für eine Saison
CREATE OR REPLACE FUNCTION generate_round_robin(target_season TEXT DEFAULT 'winter')
RETURNS TABLE(player_id UUID, player_name TEXT, new_position INTEGER) AS $$
DECLARE
  v_player RECORD;
  v_position INTEGER := 1;
BEGIN
  RAISE NOTICE '🎲 Generating Round-Robin for season: %', target_season;
  
  -- Hole alle aktiven Spieler
  FOR v_player IN 
    SELECT id, name 
    FROM players 
    WHERE is_active = true 
    ORDER BY RANDOM() -- Zufällige Reihenfolge
  LOOP
    -- Update Round-Robin Position
    UPDATE players 
    SET 
      round_robin_position = v_position,
      round_robin_season = target_season
    WHERE id = v_player.id;
    
    -- Return für Logging
    player_id := v_player.id;
    player_name := v_player.name;
    new_position := v_position;
    RETURN NEXT;
    
    v_position := v_position + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Round-Robin generated for % players', v_position - 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STEP 5: Erstelle Priority Calculator Funktion
-- ============================================================

-- Funktion: Berechne Smart Priority Score für einen Spieler
CREATE OR REPLACE FUNCTION calculate_player_priority(
  p_player_id UUID,
  p_training_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_player RECORD;
  v_training RECORD;
  v_round_robin_score INTEGER := 0;
  v_attendance_score INTEGER := 0;
  v_prio_bonus INTEGER := 0;
  v_captain_bonus INTEGER := 0;
  v_random_factor INTEGER := 0;
  v_total_score INTEGER := 0;
BEGIN
  -- Hole Spieler-Daten
  SELECT 
    round_robin_position,
    attendance_stats,
    needs_prio_training,
    prio_reason
  INTO v_player
  FROM players
  WHERE id = p_player_id;
  
  -- Hole Training-Daten
  SELECT 
    is_prio_training,
    prio_reason,
    captain_choice
  INTO v_training
  FROM training_sessions
  WHERE id = p_training_id;
  
  -- 1. Round-Robin Score (0-100)
  v_round_robin_score := COALESCE(v_player.round_robin_position, 0) * 2;
  IF v_round_robin_score > 100 THEN v_round_robin_score := 100; END IF;
  
  -- 2. Attendance Score (0-100)
  DECLARE
    v_total_invites INTEGER := COALESCE((v_player.attendance_stats->>'total_invites')::INTEGER, 1);
    v_confirmed INTEGER := COALESCE((v_player.attendance_stats->>'confirmed')::INTEGER, 0);
  BEGIN
    v_attendance_score := ROUND((v_confirmed::DECIMAL / v_total_invites::DECIMAL) * 100);
  END;
  
  -- 3. Prio-Training Bonus (0-50)
  IF v_training.is_prio_training AND v_player.needs_prio_training THEN
    v_prio_bonus := 50;
  END IF;
  
  -- 4. Captain's Choice Bonus (0-30)
  IF v_training.captain_choice IS NOT NULL AND p_player_id = ANY(v_training.captain_choice) THEN
    v_captain_bonus := 30;
  END IF;
  
  -- 5. Random Factor (0-20) für Fairness
  v_random_factor := FLOOR(RANDOM() * 21);
  
  -- Gesamt-Score berechnen
  v_total_score := v_round_robin_score + v_attendance_score + v_prio_bonus + v_captain_bonus + v_random_factor;
  
  RAISE NOTICE 'Priority calculation for player %: RR=%, ATT=%, PRIO=%, CAP=%, RND=%, TOTAL=%', 
    p_player_id, v_round_robin_score, v_attendance_score, v_prio_bonus, v_captain_bonus, v_random_factor, v_total_score;
  
  RETURN v_total_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STEP 6: Erstelle Auto-Management Funktion
-- ============================================================

-- Funktion: Automatisches Überbuchungs-Management
CREATE OR REPLACE FUNCTION auto_manage_training_overbooking(p_training_id UUID)
RETURNS TABLE(action TEXT, player_id UUID, player_name TEXT, priority_score INTEGER, new_status TEXT) AS $$
DECLARE
  v_training RECORD;
  v_attendee RECORD;
  v_priority_scores TABLE(player_id UUID, player_name TEXT, priority_score INTEGER);
  v_confirmed_count INTEGER := 0;
  v_waitlist_position INTEGER := 1;
BEGIN
  RAISE NOTICE '🤖 Starting auto-management for training: %', p_training_id;
  
  -- Hole Training-Daten
  SELECT 
    id, title, max_players, auto_manage_overbooking, waitlist_enabled
  INTO v_training
  FROM training_sessions
  WHERE id = p_training_id;
  
  -- Prüfe ob Auto-Management aktiviert ist
  IF NOT v_training.auto_manage_overbooking THEN
    RAISE NOTICE '⚠️ Auto-management disabled for training: %', v_training.title;
    RETURN;
  END IF;
  
  -- Berechne Prioritäten für alle Teilnehmer
  FOR v_attendee IN 
    SELECT 
      ta.player_id,
      p.name as player_name,
      ta.status,
      calculate_player_priority(ta.player_id, p_training_id) as priority_score
    FROM training_attendance ta
    JOIN players p ON p.id = ta.player_id
    WHERE ta.session_id = p_training_id
      AND ta.status IN ('confirmed', 'pending')
    ORDER BY priority_score DESC -- Höchste Priorität zuerst
  LOOP
    -- Zähle bestätigte Teilnehmer
    IF v_attendee.status = 'confirmed' THEN
      v_confirmed_count := v_confirmed_count + 1;
    END IF;
    
    -- Prüfe Überbuchung
    IF v_confirmed_count > v_training.max_players THEN
      -- Spieler auf Warteliste setzen
      UPDATE training_attendance
      SET 
        status = CASE 
          WHEN v_training.waitlist_enabled THEN 'waitlist'
          ELSE 'declined'
        END,
        waitlist_position = CASE 
          WHEN v_training.waitlist_enabled THEN v_waitlist_position
          ELSE NULL
        END,
        auto_declined = true,
        priority_score = v_attendee.priority_score,
        decline_reason = CASE 
          WHEN v_training.waitlist_enabled THEN 'Überbuchung - Warteliste'
          ELSE 'Überbuchung - niedrige Priorität'
        END,
        status_detail = CASE 
          WHEN v_training.waitlist_enabled THEN 'waitlist_promoted'
          ELSE 'auto_declined'
        END
      WHERE session_id = p_training_id AND player_id = v_attendee.player_id;
      
      -- Return für Logging
      action := CASE 
        WHEN v_training.waitlist_enabled THEN 'WAITLIST'
        ELSE 'DECLINED'
      END;
      player_id := v_attendee.player_id;
      player_name := v_attendee.player_name;
      priority_score := v_attendee.priority_score;
      new_status := CASE 
        WHEN v_training.waitlist_enabled THEN 'waitlist'
        ELSE 'declined'
      END;
      RETURN NEXT;
      
      v_waitlist_position := v_waitlist_position + 1;
    ELSE
      -- Spieler bestätigen
      UPDATE training_attendance
      SET 
        status = 'confirmed',
        priority_score = v_attendee.priority_score,
        status_detail = 'auto_confirmed'
      WHERE session_id = p_training_id AND player_id = v_attendee.player_id;
      
      -- Return für Logging
      action := 'CONFIRMED';
      player_id := v_attendee.player_id;
      player_name := v_attendee.player_name;
      priority_score := v_attendee.priority_score;
      new_status := 'confirmed';
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Auto-management completed for training: %', v_training.title;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STEP 7: Erstelle Trigger für automatisches Management
-- ============================================================

-- Trigger: Automatisches Management bei Status-Änderungen
CREATE OR REPLACE FUNCTION trigger_auto_manage_training()
RETURNS TRIGGER AS $$
BEGIN
  -- Nur bei Status-Änderungen zu 'confirmed' oder 'pending'
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') 
     AND (NEW.status = 'confirmed' OR NEW.status = 'pending') THEN
    
    -- Führe Auto-Management aus
    PERFORM auto_manage_training_overbooking(NEW.session_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Erstelle Trigger
DROP TRIGGER IF EXISTS auto_manage_training_trigger ON training_attendance;
CREATE TRIGGER auto_manage_training_trigger
  AFTER INSERT OR UPDATE ON training_attendance
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_manage_training();

-- ============================================================
-- STEP 8: Initialisiere Round-Robin für aktuelle Saison
-- ============================================================

-- Generiere Round-Robin für Winter-Saison
SELECT * FROM generate_round_robin('winter');

-- ============================================================
-- VERIFICATION: Zeige Setup-Status
-- ============================================================

SELECT 
  '✅ SETUP COMPLETED' as status,
  'Round-Robin Training System' as system,
  COUNT(*) as active_players,
  'Ready for use!' as message
FROM players 
WHERE is_active = true;

-- Zeige Round-Robin Positionen
SELECT 
  '🎲 ROUND-ROBIN POSITIONS' as section,
  round_robin_position as position,
  name as player_name,
  email,
  round_robin_season as season
FROM players 
WHERE is_active = true
ORDER BY round_robin_position;

-- ============================================================
-- 💡 NEXT STEPS:
-- ============================================================
-- 
-- 1. ✅ Datenbank-Setup abgeschlossen
-- 2. 🔄 Frontend-Integration (Training.jsx erweitern)
-- 3. 🔄 UI-Komponenten für Round-Robin
-- 4. 🔄 Prio-Training Features
-- 5. 🔄 Warteliste-Management
-- 6. 🔄 Benachrichtigungen
-- 
-- ============================================================


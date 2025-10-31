-- Merge Duplizierte Teams: TV Ensen Westhoven
-- ============================================================
-- Team 1: 6decfef3-1d82-4bc4-b5de-f24d5a70fa0c (team_name="Herren 40") → LÖSCHEN
-- Team 2: 19095c7a-4af4-45ab-b75c-6b82be78975a (team_name="1") → BEHALTEN
-- ============================================================

-- SCHRITT 1: Prüfe Verknüpfungen beider Teams
-- ============================================================

SELECT '=== TEAM 1 (Herren 40) - Verknüpfungen ===' as info;

SELECT 'team_memberships' as tabelle, COUNT(*) as anzahl
FROM team_memberships WHERE team_id = '6decfef3-1d82-4bc4-b5de-f24d5a70fa0c'
UNION ALL
SELECT 'matches' as tabelle, COUNT(*) as anzahl
FROM matches WHERE team_id = '6decfef3-1d82-4bc4-b5de-f24d5a70fa0c';

SELECT '=== TEAM 2 (1) - Verknüpfungen ===' as info;

SELECT 'team_memberships' as tabelle, COUNT(*) as anzahl
FROM team_memberships WHERE team_id = '19095c7a-4af4-45ab-b75c-6b82be78975a'
UNION ALL
SELECT 'matches' as tabelle, COUNT(*) as anzahl
FROM matches WHERE team_id = '19095c7a-4af4-45ab-b75c-6b82be78975a';

-- SCHRITT 2: Zeige Spieler beider Teams
-- ============================================================

-- Team 1 Spieler
SELECT 
  'TEAM 1 (Herren 40) Spieler:' as info,
  p.name,
  p.current_lk,
  tm.role
FROM team_memberships tm
JOIN players_unified p ON tm.player_id = p.id
WHERE tm.team_id = '6decfef3-1d82-4bc4-b5de-f24d5a70fa0c';

-- Team 2 Spieler
SELECT 
  'TEAM 2 (1) Spieler:' as info,
  p.name,
  p.current_lk,
  tm.role
FROM team_memberships tm
JOIN players_unified p ON tm.player_id = p.id
WHERE tm.team_id = '19095c7a-4af4-45ab-b75c-6b82be78975a';

-- SCHRITT 3: MERGE LOGIK
-- ============================================================
-- Ziel: Alle Verknüpfungen von Team 1 → Team 2 verschieben
-- Dann: Team 1 löschen

DO $$
DECLARE
  v_team1_id UUID := '6decfef3-1d82-4bc4-b5de-f24d5a70fa0c'; -- Herren 40
  v_team2_id UUID := '19095c7a-4af4-45ab-b75c-6b82be78975a'; -- 1 (BEHALTEN)
  v_moved_count INTEGER;
BEGIN
  
  RAISE NOTICE '🔄 Starte Merge: Team "Herren 40" → Team "1"';
  
  -- 3a. Verschiebe team_memberships
  UPDATE team_memberships
  SET team_id = v_team2_id
  WHERE team_id = v_team1_id;
  GET DIAGNOSTICS v_moved_count = ROW_COUNT;
  RAISE NOTICE '✅ % Memberships verschoben', v_moved_count;
  
  -- 3b. Verschiebe matches (falls updated_at existiert)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'updated_at') THEN
    UPDATE matches
    SET team_id = v_team2_id,
        updated_at = NOW()
    WHERE team_id = v_team1_id;
  ELSE
    UPDATE matches
    SET team_id = v_team2_id
    WHERE team_id = v_team1_id;
  END IF;
  GET DIAGNOSTICS v_moved_count = ROW_COUNT;
  RAISE NOTICE '✅ % Matches verschoben', v_moved_count;
  
  -- 3c. Verschiebe training_sessions (falls vorhanden)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_sessions') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_sessions' AND column_name = 'updated_at') THEN
      UPDATE training_sessions
      SET team_id = v_team2_id,
          updated_at = NOW()
      WHERE team_id = v_team1_id;
    ELSE
      UPDATE training_sessions
      SET team_id = v_team2_id
      WHERE team_id = v_team1_id;
    END IF;
    GET DIAGNOSTICS v_moved_count = ROW_COUNT;
    RAISE NOTICE '✅ % Training-Sessions verschoben', v_moved_count;
  END IF;
  
  -- 3d. Verschiebe matchdays (home_team_id)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matchdays') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matchdays' AND column_name = 'updated_at') THEN
      UPDATE matchdays
      SET home_team_id = v_team2_id,
          updated_at = NOW()
      WHERE home_team_id = v_team1_id;
    ELSE
      UPDATE matchdays
      SET home_team_id = v_team2_id
      WHERE home_team_id = v_team1_id;
    END IF;
    GET DIAGNOSTICS v_moved_count = ROW_COUNT;
    RAISE NOTICE '✅ % Matchdays (home) verschoben', v_moved_count;
    
    -- matchdays (away_team_id)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matchdays' AND column_name = 'updated_at') THEN
      UPDATE matchdays
      SET away_team_id = v_team2_id,
          updated_at = NOW()
      WHERE away_team_id = v_team1_id;
    ELSE
      UPDATE matchdays
      SET away_team_id = v_team2_id
      WHERE away_team_id = v_team1_id;
    END IF;
    GET DIAGNOSTICS v_moved_count = ROW_COUNT;
    RAISE NOTICE '✅ % Matchdays (away) verschoben', v_moved_count;
  END IF;
  
  -- 3e. Lösche Team 1 (das alte "Herren 40")
  DELETE FROM team_info WHERE id = v_team1_id;
  RAISE NOTICE '✅ Team 1 (Herren 40) gelöscht';
  
  RAISE NOTICE '✅✅✅ MERGE ERFOLGREICH ABGESCHLOSSEN ✅✅✅';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Fehler beim Merge: %', SQLERRM;
    RAISE;
END $$;

-- SCHRITT 4: Verifikation
-- ============================================================

SELECT '=== VERIFIKATION ===' as info;

-- Zeige verbleibendes Team
SELECT 
  id,
  team_name,
  club_name,
  category,
  (SELECT COUNT(*) FROM team_memberships WHERE team_id = '19095c7a-4af4-45ab-b75c-6b82be78975a') as spieler_anzahl
FROM team_info
WHERE id = '19095c7a-4af4-45ab-b75c-6b82be78975a';

-- Prüfe ob Team 1 noch existiert (sollte 0 sein)
SELECT 
  'Anzahl Team 1 Einträge:' as info,
  COUNT(*) as anzahl
FROM team_info
WHERE id = '6decfef3-1d82-4bc4-b5de-f24d5a70fa0c';

-- Zeige alle finalen Spieler des Teams
SELECT 
  'Alle Spieler im finalen Team:' as info,
  p.name,
  p.current_lk,
  tm.role
FROM team_memberships tm
JOIN players_unified p ON tm.player_id = p.id
WHERE tm.team_id = '19095c7a-4af4-45ab-b75c-6b82be78975a';


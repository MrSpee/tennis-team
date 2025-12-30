-- ============================================================
-- 🔧 MERGE GEORG ROLSHOVEN DUPLIKAT
-- ============================================================
-- Migriert alle Daten von der inaktiven Player-ID zur aktiven ID
-- und löscht anschließend den Duplikat-Eintrag
-- ============================================================

-- IDs
-- Aktive ID (behalten): 3bacc047-a692-4d94-8659-6bbcb629d83c
-- Inaktive ID (löschen): 9df79240-7c31-4a98-b2f6-fe1f0495207b

-- ============================================================
-- 📊 SCHRITT 1: VALIDIERUNG - Prüfe vorherige Daten
-- ============================================================

DO $$
DECLARE
  active_id UUID := '3bacc047-a692-4d94-8659-6bbcb629d83c';
  inactive_id UUID := '9df79240-7c31-4a98-b2f6-fe1f0495207b';
  inactive_results_count INTEGER;
  inactive_teams_count INTEGER;
BEGIN
  -- Zähle Ergebnisse für inaktive ID
  SELECT COUNT(*) INTO inactive_results_count
  FROM match_results
  WHERE home_player_id = inactive_id
     OR home_player1_id = inactive_id
     OR home_player2_id = inactive_id
     OR guest_player_id = inactive_id
     OR guest_player1_id = inactive_id
     OR guest_player2_id = inactive_id;
  
  -- Zähle Team-Memberships für inaktive ID
  SELECT COUNT(*) INTO inactive_teams_count
  FROM team_memberships
  WHERE player_id = inactive_id;
  
  RAISE NOTICE '📊 Vor Migration:';
  RAISE NOTICE '   Ergebnisse für inaktive ID: %', inactive_results_count;
  RAISE NOTICE '   Team-Memberships für inaktive ID: %', inactive_teams_count;
END $$;

-- ============================================================
-- 🔄 SCHRITT 2: MIGRATION - Match-Ergebnisse (Einzel)
-- ============================================================

-- Migriere home_player_id (Einzel)
UPDATE match_results
SET home_player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
WHERE home_player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';

-- Migriere guest_player_id (Einzel)
UPDATE match_results
SET guest_player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
WHERE guest_player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';

-- ============================================================
-- 🔄 SCHRITT 3: MIGRATION - Match-Ergebnisse (Doppel)
-- ============================================================

-- Migriere home_player1_id (Doppel)
UPDATE match_results
SET home_player1_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
WHERE home_player1_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';

-- Migriere home_player2_id (Doppel)
UPDATE match_results
SET home_player2_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
WHERE home_player2_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';

-- Migriere guest_player1_id (Doppel)
UPDATE match_results
SET guest_player1_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
WHERE guest_player1_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';

-- Migriere guest_player2_id (Doppel)
UPDATE match_results
SET guest_player2_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
WHERE guest_player2_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';

-- ============================================================
-- 🔄 SCHRITT 4: MIGRATION - Team-Memberships
-- ============================================================

-- Prüfe ob es bereits eine Team-Membership für diese Kombination gibt
-- Falls ja, lösche die Duplikat-Membership
DELETE FROM team_memberships
WHERE player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
  AND EXISTS (
    SELECT 1
    FROM team_memberships tm2
    WHERE tm2.player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
      AND tm2.team_id = team_memberships.team_id
      AND tm2.season = team_memberships.season
  );

-- Migriere verbleibende Team-Memberships
UPDATE team_memberships
SET player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
WHERE player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';

-- ============================================================
-- ✅ SCHRITT 5: VALIDIERUNG - Prüfe nach Migration
-- ============================================================

DO $$
DECLARE
  active_id UUID := '3bacc047-a692-4d94-8659-6bbcb629d83c';
  inactive_id UUID := '9df79240-7c31-4a98-b2f6-fe1f0495207b';
  remaining_results_count INTEGER;
  remaining_teams_count INTEGER;
  active_results_count INTEGER;
BEGIN
  -- Prüfe ob noch Ergebnisse für inaktive ID existieren
  SELECT COUNT(*) INTO remaining_results_count
  FROM match_results
  WHERE home_player_id = inactive_id
     OR home_player1_id = inactive_id
     OR home_player2_id = inactive_id
     OR guest_player_id = inactive_id
     OR guest_player1_id = inactive_id
     OR guest_player2_id = inactive_id;
  
  -- Prüfe ob noch Team-Memberships für inaktive ID existieren
  SELECT COUNT(*) INTO remaining_teams_count
  FROM team_memberships
  WHERE player_id = inactive_id;
  
  -- Zähle Ergebnisse für aktive ID (sollte jetzt mehr sein)
  SELECT COUNT(*) INTO active_results_count
  FROM match_results
  WHERE home_player_id = active_id
     OR home_player1_id = active_id
     OR home_player2_id = active_id
     OR guest_player_id = active_id
     OR guest_player1_id = active_id
     OR guest_player2_id = active_id;
  
  RAISE NOTICE '✅ Nach Migration:';
  RAISE NOTICE '   Verbleibende Ergebnisse für inaktive ID: % (sollte 0 sein)', remaining_results_count;
  RAISE NOTICE '   Verbleibende Team-Memberships für inaktive ID: % (sollte 0 sein)', remaining_teams_count;
  RAISE NOTICE '   Gesamte Ergebnisse für aktive ID: %', active_results_count;
  
  IF remaining_results_count > 0 OR remaining_teams_count > 0 THEN
    RAISE WARNING '⚠️ Es gibt noch verbleibende Verknüpfungen! Löschvorgang wird abgebrochen.';
    RAISE EXCEPTION 'Migration unvollständig - bitte prüfen!';
  END IF;
END $$;

-- ============================================================
-- 🗑️ SCHRITT 6: LÖSCHEN - Inaktiver Spieler-Eintrag
-- ============================================================

DELETE FROM players_unified
WHERE id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';

-- ============================================================
-- ✅ ABSCHLUSS
-- ============================================================

SELECT 
  '✅ Migration abgeschlossen!' as status,
  '3bacc047-a692-4d94-8659-6bbcb629d83c' as active_player_id,
  'Georg Rolshoven' as player_name,
  (
    SELECT COUNT(*)
    FROM match_results
    WHERE home_player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
       OR home_player1_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
       OR home_player2_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
       OR guest_player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
       OR guest_player1_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
       OR guest_player2_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
  ) as total_results_after_merge;


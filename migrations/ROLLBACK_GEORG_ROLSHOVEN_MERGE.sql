-- ============================================================
-- ⚠️ ROLLBACK: GEORG ROLSHOVEN MERGE
-- ============================================================
-- Stellt beide Georg Rolshoven Spieler wieder her
-- und verteilt die Ergebnisse wieder auf die ursprünglichen IDs
-- ============================================================

-- WICHTIG: Basierend auf den ursprünglichen Daten:
-- Aktiver Spieler (mit Login): 3bacc047-a692-4d94-8659-6bbcb629d83c
-- Inaktiver Spieler (ohne Login): 9df79240-7c31-4a98-b2f6-fe1f0495207b

-- ============================================================
-- SCHRITT 1: Stelle den gelöschten Spieler wieder her
-- ============================================================

INSERT INTO players_unified (
  id,
  name,
  email,
  user_id,
  current_lk,
  season_start_lk,
  player_type,
  is_active,
  created_at,
  updated_at
)
VALUES (
  '9df79240-7c31-4a98-b2f6-fe1f0495207b',
  'Georg Rolshoven',
  NULL,
  NULL,
  '13.6',
  NULL,
  'app_user',
  false,
  '2025-12-14 07:54:49.403648+00',
  '2025-12-14 07:54:49.403648+00'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  user_id = EXCLUDED.user_id,
  current_lk = EXCLUDED.current_lk,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================================
-- SCHRITT 2: Identifiziere welche Ergebnisse zu welchem Georg gehören
-- ============================================================
-- Basierend auf den Matchdays und Teams müssen wir die Ergebnisse
-- wieder auf die ursprünglichen IDs verteilen
-- 
-- ACHTUNG: Diese Zuordnung muss manuell geprüft werden!
-- Die ursprünglichen Daten zeigen:
-- - Aktiver Georg hatte 3 Ergebnisse (2 Matchdays)
-- - Inaktiver Georg hatte 2 Ergebnisse (1 Matchday)
-- ============================================================

-- ============================================================
-- SCHRITT 3: Migriere Ergebnisse zurück zur inaktiven ID
-- ============================================================
-- WICHTIG: Diese Zuordnung basiert auf den ursprünglichen Daten
-- Die Ergebnisse vom 06.12.2025 (Herren 30) gehörten ursprünglich 
-- zur inaktiven ID (9df79240...)

-- Migriere Einzel-Match vom 06.12.2025 zurück
UPDATE match_results
SET home_player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
WHERE id = 'b789b135-84d7-4540-8ea8-5292fddb94eb'
  AND matchday_id = '4fbb7440-97b5-4c33-91a7-1cb33c930dd8'
  AND home_player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c';

-- Migriere Doppel-Match vom 06.12.2025 zurück
UPDATE match_results
SET home_player1_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
WHERE id = '7afd38a8-a6ea-4720-a9dc-cf9819f8d738'
  AND matchday_id = '4fbb7440-97b5-4c33-91a7-1cb33c930dd8'
  AND home_player1_id = '3bacc047-a692-4d94-8659-6bbcb629d83c';

-- ============================================================
-- SCHRITT 4: Stelle Team-Membership wieder her
-- ============================================================

-- Stelle Team-Membership für Herren 30 wieder her
INSERT INTO team_memberships (
  id,
  player_id,
  team_id,
  role,
  is_primary,
  is_active,
  season,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  '9df79240-7c31-4a98-b2f6-fe1f0495207b',
  '946ae45b-5cd5-4207-981a-c7cfe05927cb',
  'player',
  true,
  true,
  'Winter 2025/26',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM team_memberships
  WHERE player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
    AND team_id = '946ae45b-5cd5-4207-981a-c7cfe05927cb'
    AND season = 'Winter 2025/26'
);

-- ============================================================
-- SCHRITT 5: Validierung
-- ============================================================

DO $$
DECLARE
  active_results_count INTEGER;
  inactive_results_count INTEGER;
  active_teams_count INTEGER;
  inactive_teams_count INTEGER;
BEGIN
  -- Zähle Ergebnisse für aktive ID
  SELECT COUNT(*) INTO active_results_count
  FROM match_results
  WHERE home_player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
     OR home_player1_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
     OR home_player2_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
     OR guest_player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
     OR guest_player1_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
     OR guest_player2_id = '3bacc047-a692-4d94-8659-6bbcb629d83c';
  
  -- Zähle Ergebnisse für inaktive ID
  SELECT COUNT(*) INTO inactive_results_count
  FROM match_results
  WHERE home_player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
     OR home_player1_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
     OR home_player2_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
     OR guest_player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
     OR guest_player1_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
     OR guest_player2_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';
  
  -- Zähle Team-Memberships
  SELECT COUNT(*) INTO active_teams_count
  FROM team_memberships
  WHERE player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c';
  
  SELECT COUNT(*) INTO inactive_teams_count
  FROM team_memberships
  WHERE player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';
  
  RAISE NOTICE '✅ Rollback abgeschlossen:';
  RAISE NOTICE '   Aktiver Georg: % Ergebnisse, % Teams', active_results_count, active_teams_count;
  RAISE NOTICE '   Inaktiver Georg: % Ergebnisse, % Teams', inactive_results_count, inactive_teams_count;
END $$;

SELECT 
  '⚠️ WICHTIG: Rollback durchgeführt, aber Zuordnung muss manuell geprüft werden!' as warning,
  'Bitte prüfe welche Spiele zu welchem Georg gehören basierend auf den Teams' as note;


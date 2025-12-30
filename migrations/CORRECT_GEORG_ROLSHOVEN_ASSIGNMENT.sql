-- ============================================================
-- ✅ KORREKTE ZUORDNUNG: GEORG ROLSHOVEN (19108160)
-- ============================================================
-- Georg Rolshoven (1991) - TVM-ID: 19108160
-- Verein: Rodenkirchener TC (2100)
-- Teams: Herren + Herren 30
-- Saison: Winter 2025/2026
-- ============================================================

-- Basierend auf den Informationen:
-- Dieser Georg spielt für:
-- - Rodenkirchener TC - Herren
-- - Rodenkirchener TC - Herren 30

-- Aktiver Georg (3bacc047...) hat bereits beide Teams!
-- Inaktiver Georg (9df79240...) sollte nur Herren 30 haben

-- ============================================================
-- SCHRITT 1: Stelle sicher, dass aktiver Georg beide Teams hat
-- ============================================================

-- Prüfe ob aktiver Georg Team-Membership für Herren hat
INSERT INTO team_memberships (
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
  '3bacc047-a692-4d94-8659-6bbcb629d83c',
  'f4f0810e-933a-468f-a6f9-d93a35cf5e86', -- Rodenkirchener TC - Herren
  'player',
  true,
  true,
  'Winter 2025/26',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM team_memberships
  WHERE player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
    AND team_id = 'f4f0810e-933a-468f-a6f9-d93a35cf5e86'
    AND season = 'Winter 2025/26'
);

-- Prüfe ob aktiver Georg Team-Membership für Herren 30 hat
INSERT INTO team_memberships (
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
  '3bacc047-a692-4d94-8659-6bbcb629d83c',
  '946ae45b-5cd5-4207-981a-c7cfe05927cb', -- Rodenkirchener TC - Herren 30
  'player',
  true,
  true,
  'Winter 2025/26',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM team_memberships
  WHERE player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
    AND team_id = '946ae45b-5cd5-4207-981a-c7cfe05927cb'
    AND season = 'Winter 2025/26'
);

-- ============================================================
-- SCHRITT 2: Alle Spiele bleiben beim aktiven Georg
-- ============================================================
-- Da der aktive Georg beide Teams hat und alle Spiele für
-- Rodenkirchener TC sind, bleiben alle Spiele bei ihm

-- Die Spiele sind bereits korrekt zugeordnet:
-- - 06.12.2025 - Herren 30 ✅
-- - 01.11.2025 - Herren 30 ✅
-- - 04.10.2025 - Herren ✅

-- ============================================================
-- SCHRITT 3: Inaktiver Georg sollte nur Herren 30 haben
-- ============================================================
-- Der inaktive Georg (9df79240...) sollte nur für Herren 30 sein
-- Falls er andere Teams hat, müssen diese entfernt werden

-- Entferne Team-Memberships für inaktiven Georg außer Herren 30
DELETE FROM team_memberships
WHERE player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
  AND team_id != '946ae45b-5cd5-4207-981a-c7cfe05927cb'; -- Nur Herren 30 behalten

-- ============================================================
-- SCHRITT 4: Validierung
-- ============================================================

DO $$
DECLARE
  active_teams_count INTEGER;
  inactive_teams_count INTEGER;
  active_results_count INTEGER;
  inactive_results_count INTEGER;
BEGIN
  -- Zähle Teams für aktiven Georg
  SELECT COUNT(*) INTO active_teams_count
  FROM team_memberships
  WHERE player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
    AND season = 'Winter 2025/26'
    AND is_active = true;
  
  -- Zähle Teams für inaktiven Georg
  SELECT COUNT(*) INTO inactive_teams_count
  FROM team_memberships
  WHERE player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
    AND season = 'Winter 2025/26'
    AND is_active = true;
  
  -- Zähle Ergebnisse für aktiven Georg
  SELECT COUNT(*) INTO active_results_count
  FROM match_results mr
  LEFT JOIN matchdays md ON mr.matchday_id = md.id
  WHERE md.season = 'Winter 2025/26'
    AND (mr.home_player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
     OR mr.home_player1_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
     OR mr.home_player2_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
     OR mr.guest_player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
     OR mr.guest_player1_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
     OR mr.guest_player2_id = '3bacc047-a692-4d94-8659-6bbcb629d83c');
  
  -- Zähle Ergebnisse für inaktiven Georg
  SELECT COUNT(*) INTO inactive_results_count
  FROM match_results mr
  LEFT JOIN matchdays md ON mr.matchday_id = md.id
  WHERE md.season = 'Winter 2025/26'
    AND (mr.home_player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
     OR mr.home_player1_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
     OR mr.home_player2_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
     OR mr.guest_player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
     OR mr.guest_player1_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
     OR mr.guest_player2_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b');
  
  RAISE NOTICE '✅ Zuordnung abgeschlossen:';
  RAISE NOTICE '   Aktiver Georg: % Teams, % Ergebnisse', active_teams_count, active_results_count;
  RAISE NOTICE '   Inaktiver Georg: % Teams, % Ergebnisse', inactive_teams_count, inactive_results_count;
END $$;

SELECT 
  '✅ Zuordnung korrigiert!' as status,
  'Aktiver Georg hat beide Teams (Herren + Herren 30)' as note,
  'Alle Spiele bleiben beim aktiven Georg' as results;


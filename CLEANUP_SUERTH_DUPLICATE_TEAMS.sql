-- CLEANUP_SUERTH_DUPLICATE_TEAMS.sql
-- Lösche doppelte SV Rot-Gelb Sürth Herren 40 Teams
-- ==========================================

-- SCHRITT 1: Zeige alle 3 Teams
-- ==========================================
SELECT 
  '🔍 Alle SV Rot-Gelb Sürth Herren 40 Teams' as info,
  id as team_id,
  club_name,
  team_name,
  category,
  (
    SELECT COUNT(*)
    FROM team_memberships tm
    WHERE tm.team_id = ti.id AND tm.is_active = true
  ) as active_player_count,
  (
    SELECT COUNT(*)
    FROM matchdays m
    WHERE m.home_team_id = ti.id OR m.away_team_id = ti.id
  ) as matchday_count,
  created_at
FROM team_info ti
WHERE (club_name = 'SV Rot-Gelb Sürth' OR club_name = 'SV RG Sürth')
  AND category = 'Herren 40'
ORDER BY active_player_count DESC;

-- SCHRITT 2: Prüfe Team-Seasons für alle 3 Teams
-- ==========================================
SELECT 
  '🔍 Team-Seasons für die 3 Teams' as info,
  ts.team_id,
  ti.club_name,
  ti.team_name,
  ts.season,
  ts.league,
  ts.group_name,
  ts.team_size
FROM team_seasons ts
JOIN team_info ti ON ts.team_id = ti.id
WHERE ts.team_id IN (
  '2fde7487-27dd-4942-ac07-2ee1cde8c2f6',
  'ff090c47-ff26-4df1-82fd-3e4358320d7f',
  '4fd8e7c2-2290-458e-b810-fe0bb11e0094'
)
ORDER BY ts.team_id, ts.season;

-- SCHRITT 3: Prüfe Matchdays für die zu löschenden Teams
-- ==========================================
SELECT 
  '⚠️ Matchdays für Teams die gelöscht werden sollen' as info,
  m.id as matchday_id,
  m.match_date,
  m.home_team_id,
  m.away_team_id,
  ti_home.club_name as home_club,
  ti_home.team_name as home_team,
  ti_away.club_name as away_club,
  ti_away.team_name as away_team
FROM matchdays m
LEFT JOIN team_info ti_home ON m.home_team_id = ti_home.id
LEFT JOIN team_info ti_away ON m.away_team_id = ti_away.id
WHERE m.home_team_id IN (
  '2fde7487-27dd-4942-ac07-2ee1cde8c2f6',
  '4fd8e7c2-2290-458e-b810-fe0bb11e0094'
)
OR m.away_team_id IN (
  '2fde7487-27dd-4942-ac07-2ee1cde8c2f6',
  '4fd8e7c2-2290-458e-b810-fe0bb11e0094'
);

-- SCHRITT 4: CLEANUP - Lösche die 2 falschen Teams
-- ==========================================
-- Team zu behalten: ff090c47-ff26-4df1-82fd-3e4358320d7f (9 Spieler)
-- Teams zu löschen: 
--   - 2fde7487-27dd-4942-ac07-2ee1cde8c2f6 (0 Spieler, " 1")
--   - 4fd8e7c2-2290-458e-b810-fe0bb11e0094 (0 Spieler, "SV RG Sürth")

BEGIN;

-- 4.1: Lösche team_seasons für die falschen Teams
DELETE FROM team_seasons
WHERE team_id IN (
  '2fde7487-27dd-4942-ac07-2ee1cde8c2f6',
  '4fd8e7c2-2290-458e-b810-fe0bb11e0094'
);

-- 4.2: Update Matchdays (falls vorhanden) zum korrekten Team
UPDATE matchdays
SET home_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f'::uuid
WHERE home_team_id IN (
  '2fde7487-27dd-4942-ac07-2ee1cde8c2f6',
  '4fd8e7c2-2290-458e-b810-fe0bb11e0094'
);

UPDATE matchdays
SET away_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f'::uuid
WHERE away_team_id IN (
  '2fde7487-27dd-4942-ac07-2ee1cde8c2f6',
  '4fd8e7c2-2290-458e-b810-fe0bb11e0094'
);

-- 4.3: Lösche die falschen Teams
DELETE FROM team_info
WHERE id IN (
  '2fde7487-27dd-4942-ac07-2ee1cde8c2f6',
  '4fd8e7c2-2290-458e-b810-fe0bb11e0094'
);

-- Zähle gelöschte Teams
SELECT 
  '✅ Duplikate gelöscht' as info,
  2 as deleted_teams;

COMMIT;

-- SCHRITT 5: Update team_name für korrektes Team
-- ==========================================
-- Korrigiere team_name von "1" zu " 1" (mit Leerzeichen, für Konsistenz)

BEGIN;

UPDATE team_info
SET team_name = ' 1'
WHERE id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f'
  AND team_name = '1';

COMMIT;

-- SCHRITT 6: VERIFICATION - Zeige finales Ergebnis
-- ==========================================
SELECT 
  '✅ Finale Sürth Herren 40 Teams' as info,
  id as team_id,
  club_name,
  team_name,
  category,
  (
    SELECT COUNT(*)
    FROM team_memberships tm
    WHERE tm.team_id = ti.id AND tm.is_active = true
  ) as active_player_count,
  (
    SELECT COUNT(*)
    FROM matchdays m
    WHERE m.home_team_id = ti.id OR m.away_team_id = ti.id
  ) as matchday_count
FROM team_info ti
WHERE (club_name = 'SV Rot-Gelb Sürth' OR club_name = 'SV RG Sürth')
  AND category = 'Herren 40'
ORDER BY active_player_count DESC;

-- SCHRITT 7: Zeige alle Spieler des korrekten Teams
-- ==========================================
SELECT 
  '📋 Alle Spieler von SV Rot-Gelb Sürth Herren 40' as info,
  pu.name,
  pu.email,
  pu.current_lk,
  tm.is_primary,
  tm.role
FROM players_unified pu
JOIN team_memberships tm ON pu.id = tm.player_id AND tm.is_active = true
WHERE tm.team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f'
ORDER BY 
  CASE 
    WHEN pu.current_lk ~ '^LK [0-9]+\.?[0-9]*$' THEN
      CAST(SUBSTRING(pu.current_lk FROM 'LK ([0-9]+\.?[0-9]*)') AS numeric)
    ELSE 999
  END ASC;

-- HINWEISE:
-- ==========================================
-- 1. Behalte Team ff090c47-ff26-4df1-82fd-3e4358320d7f (9 Spieler)
-- 2. Lösche Teams 2fde7487-27dd-4942-ac07-2ee1cde8c2f6 und 4fd8e7c2-2290-458e-b810-fe0bb11e0094
-- 3. Update Matchdays zum korrekten Team
-- 4. Lösche zugehörige team_seasons
-- 5. Korrigiere team_name für Konsistenz



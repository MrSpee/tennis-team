-- CHECK_RTHC_BAYER_DATA.sql
-- ============================================================
-- Prüft alle Daten, die an "RTHC Bayer" hängen
-- Vor dem Löschen von "RTHC Bayer" (Duplikat von "RTHC Bayer Leverkusen")
-- ============================================================

-- SCHRITT 1: Zeige beide Clubs
-- ============================================================
SELECT 
  '=== CLUB VERGLEICH ===' as info,
  ci.id,
  ci.name,
  ci.city,
  ci.region,
  ci.data_source,
  ci.created_at,
  ci.updated_at
FROM club_info ci
WHERE ci.name IN ('RTHC Bayer', 'RTHC Bayer Leverkusen')
ORDER BY ci.name;

-- SCHRITT 2: Teams von "RTHC Bayer"
-- ============================================================
SELECT 
  '=== TEAMS VON RTHC BAYER ===' as info,
  ti.id,
  ti.club_name,
  ti.team_name,
  ti.category,
  ti.created_at,
  (SELECT COUNT(*) FROM team_memberships WHERE team_id = ti.id) as memberships_count,
  (SELECT COUNT(*) FROM matchdays WHERE home_team_id = ti.id OR away_team_id = ti.id) as matchdays_count,
  (SELECT COUNT(*) FROM team_seasons WHERE team_id = ti.id) as seasons_count
FROM team_info ti
WHERE ti.club_name = 'RTHC Bayer'
ORDER BY ti.category, ti.team_name;

-- SCHRITT 3: Teams von "RTHC Bayer Leverkusen" (zum Vergleich)
-- ============================================================
SELECT 
  '=== TEAMS VON RTHC BAYER LEVERKUSEN (KORREKT) ===' as info,
  ti.id,
  ti.club_name,
  ti.team_name,
  ti.category,
  ti.created_at,
  (SELECT COUNT(*) FROM team_memberships WHERE team_id = ti.id) as memberships_count,
  (SELECT COUNT(*) FROM matchdays WHERE home_team_id = ti.id OR away_team_id = ti.id) as matchdays_count,
  (SELECT COUNT(*) FROM team_seasons WHERE team_id = ti.id) as seasons_count
FROM team_info ti
WHERE ti.club_name = 'RTHC Bayer Leverkusen'
ORDER BY ti.category, ti.team_name;

-- SCHRITT 4: Team Memberships von "RTHC Bayer" Teams
-- ============================================================
SELECT 
  '=== TEAM MEMBERSHIPS VON RTHC BAYER ===' as info,
  tm.id,
  tm.team_id,
  ti.team_name,
  ti.category,
  p.name as player_name,
  tm.role,
  tm.is_active,
  tm.season
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
JOIN players_unified p ON tm.player_id = p.id
WHERE ti.club_name = 'RTHC Bayer'
ORDER BY ti.category, p.name;

-- SCHRITT 5: Matchdays mit "RTHC Bayer" Teams
-- ============================================================
SELECT 
  '=== MATCHDAYS MIT RTHC BAYER ===' as info,
  m.id,
  m.match_date,
  m.season,
  m.league,
  m.group_name,
  m.status,
  m.home_score,
  m.away_score,
  hti.club_name as home_club,
  hti.team_name as home_team,
  ati.club_name as away_club,
  ati.team_name as away_team,
  (SELECT COUNT(*) FROM match_results WHERE matchday_id = m.id) as match_results_count
FROM matchdays m
JOIN team_info hti ON m.home_team_id = hti.id
JOIN team_info ati ON m.away_team_id = ati.id
WHERE hti.club_name = 'RTHC Bayer' OR ati.club_name = 'RTHC Bayer'
ORDER BY m.match_date DESC;

-- SCHRITT 6: Match Results von "RTHC Bayer" Matchdays
-- ============================================================
SELECT 
  '=== MATCH RESULTS VON RTHC BAYER MATCHDAYS ===' as info,
  mr.id,
  mr.matchday_id,
  m.match_date,
  mr.match_type,
  mr.match_number,
  mr.winner,
  mr.set1_home,
  mr.set1_guest,
  mr.set2_home,
  mr.set2_guest,
  mr.set3_home,
  mr.set3_guest
FROM match_results mr
JOIN matchdays m ON mr.matchday_id = m.id
JOIN team_info hti ON m.home_team_id = hti.id
JOIN team_info ati ON m.away_team_id = ati.id
WHERE hti.club_name = 'RTHC Bayer' OR ati.club_name = 'RTHC Bayer'
ORDER BY m.match_date DESC, mr.match_number;

-- SCHRITT 7: Team Seasons von "RTHC Bayer" Teams
-- ============================================================
SELECT 
  '=== TEAM SEASONS VON RTHC BAYER ===' as info,
  ts.id,
  ts.team_id,
  ti.team_name,
  ti.category,
  ts.season,
  ts.league,
  ts.group_name,
  ts.team_size,
  ts.is_active,
  ts.created_at
FROM team_seasons ts
JOIN team_info ti ON ts.team_id = ti.id
WHERE ti.club_name = 'RTHC Bayer'
ORDER BY ts.season, ts.league, ti.category;

-- SCHRITT 8: Zusammenfassung
-- ============================================================
SELECT 
  '=== ZUSAMMENFASSUNG RTHC BAYER ===' as info,
  (SELECT COUNT(*) FROM team_info WHERE club_name = 'RTHC Bayer') as teams_count,
  (SELECT COUNT(*) FROM team_memberships tm JOIN team_info ti ON tm.team_id = ti.id WHERE ti.club_name = 'RTHC Bayer') as memberships_count,
  (SELECT COUNT(*) FROM matchdays m JOIN team_info ti ON m.home_team_id = ti.id OR m.away_team_id = ti.id WHERE ti.club_name = 'RTHC Bayer') as matchdays_count,
  (SELECT COUNT(*) FROM match_results mr JOIN matchdays m ON mr.matchday_id = m.id JOIN team_info ti ON m.home_team_id = ti.id OR m.away_team_id = ti.id WHERE ti.club_name = 'RTHC Bayer') as match_results_count,
  (SELECT COUNT(*) FROM team_seasons ts JOIN team_info ti ON ts.team_id = ti.id WHERE ti.club_name = 'RTHC Bayer') as team_seasons_count;


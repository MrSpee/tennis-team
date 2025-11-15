-- ==============================================================================
-- DIAGNOSE: Matches ohne match_number
-- ==============================================================================
-- Finde alle Matches, die keine match_number haben und dadurch
-- keine Meeting-Reports laden können
-- ==============================================================================

-- Schritt 1: Übersicht - Wie viele Matches sind betroffen?
SELECT 
  '=== ÜBERSICHT ===' as info,
  COUNT(*) as total_matchdays,
  COUNT(match_number) as with_match_number,
  COUNT(*) - COUNT(match_number) as missing_match_number,
  ROUND(100.0 * COUNT(match_number) / COUNT(*), 1) as percent_complete
FROM matchdays;

-- Schritt 2: Betroffene Matches nach Gruppe
SELECT 
  '=== NACH GRUPPE ===' as info,
  COALESCE(group_name, 'Keine Gruppe') as group_name,
  season,
  COUNT(*) as total_matches,
  COUNT(match_number) as with_number,
  COUNT(*) - COUNT(match_number) as missing_number
FROM matchdays
GROUP BY group_name, season
HAVING COUNT(*) - COUNT(match_number) > 0
ORDER BY missing_number DESC, group_name;

-- Schritt 3: Details der betroffenen Matches
SELECT 
  '=== DETAILS BETROFFENER MATCHES ===' as info,
  m.id,
  m.match_date::date as date,
  m.match_date::time as time,
  m.group_name,
  m.season,
  m.league,
  m.status,
  ht.club_name || ' ' || COALESCE(ht.team_name, '') as home_team,
  at.club_name || ' ' || COALESCE(at.team_name, '') as away_team,
  m.venue,
  (SELECT COUNT(*) FROM match_results WHERE matchday_id = m.id) as results_count
FROM matchdays m
LEFT JOIN team_info ht ON m.home_team_id = ht.id
LEFT JOIN team_info at ON m.away_team_id = at.id
WHERE m.match_number IS NULL
  AND m.group_name IS NOT NULL
ORDER BY m.match_date DESC, m.group_name
LIMIT 50;

-- Schritt 4: Prüfe welche davon bereits Ergebnisse haben
SELECT 
  '=== MATCHES MIT ERGEBNISSEN ABER OHNE MATCH_NUMBER ===' as info,
  m.id,
  m.match_date::date,
  m.group_name,
  ht.club_name || ' ' || COALESCE(ht.team_name, '') as home_team,
  at.club_name || ' ' || COALESCE(at.team_name, '') as away_team,
  m.home_score,
  m.away_score,
  COUNT(mr.id) as detail_results
FROM matchdays m
LEFT JOIN team_info ht ON m.home_team_id = ht.id
LEFT JOIN team_info at ON m.away_team_id = at.id
LEFT JOIN match_results mr ON mr.matchday_id = m.id
WHERE m.match_number IS NULL
  AND (m.home_score IS NOT NULL OR m.away_score IS NOT NULL OR mr.id IS NOT NULL)
GROUP BY m.id, m.match_date, m.group_name, ht.club_name, ht.team_name, at.club_name, at.team_name, m.home_score, m.away_score
ORDER BY m.match_date DESC
LIMIT 30;

-- Schritt 5: Zukünftige Matches ohne match_number (am wichtigsten)
SELECT 
  '=== ZUKÜNFTIGE MATCHES OHNE MATCH_NUMBER ===' as info,
  m.id,
  m.match_date,
  m.group_name,
  m.season,
  ht.club_name || ' ' || COALESCE(ht.team_name, '') as home_team,
  at.club_name || ' ' || COALESCE(at.team_name, '') as away_team,
  m.venue
FROM matchdays m
LEFT JOIN team_info ht ON m.home_team_id = ht.id
LEFT JOIN team_info at ON m.away_team_id = at.id
WHERE m.match_number IS NULL
  AND m.match_date >= NOW()
  AND m.group_name IS NOT NULL
ORDER BY m.match_date
LIMIT 20;

-- ==============================================================================
-- EMPFEHLUNG
-- ==============================================================================
-- Wenn viele Matches betroffen sind:
-- 1. Führe einen Re-Import über den Scraper durch (alle betroffenen Gruppen)
-- 2. Der Scraper wird automatisch die match_numbers ergänzen
-- 3. Keine Duplikate, da der Scraper per Datum+Teams prüft
--
-- Wenn nur einzelne Matches betroffen sind:
-- 1. Nutze QUICKFIX_MATCH_536.sql als Vorlage
-- 2. Passe Team-Namen und Datum an
-- 3. Führe für jedes Match einzeln aus
-- ==============================================================================


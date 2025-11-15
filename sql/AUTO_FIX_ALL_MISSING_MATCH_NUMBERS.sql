-- ==============================================================================
-- AUTO-FIX: Alle fehlenden Match-Numbers über Scraper-Re-Import
-- ==============================================================================
-- Strategie: Dokumentiere alle betroffenen Matches für Scraper-Re-Import
-- ==============================================================================

-- Schritt 1: Zeige betroffene Gruppen mit Details
SELECT 
  '=== BETROFFENE GRUPPEN ===' as info,
  group_name,
  COUNT(*) as missing_count,
  MIN(match_date::date) as first_match,
  MAX(match_date::date) as last_match,
  COUNT(CASE WHEN match_date >= NOW() THEN 1 END) as future_matches,
  COUNT(CASE WHEN match_date < NOW() THEN 1 END) as past_matches
FROM matchdays
WHERE match_number IS NULL
  AND group_name IS NOT NULL
GROUP BY group_name
ORDER BY group_name;

-- Schritt 2: Details für Gruppe 042
SELECT 
  '=== GRUPPE 042 DETAILS ===' as info,
  m.id,
  m.match_date::date as date,
  ht.club_name || ' ' || COALESCE(ht.team_name, '') as home_team,
  at.club_name || ' ' || COALESCE(at.team_name, '') as away_team,
  m.status,
  m.venue
FROM matchdays m
LEFT JOIN team_info ht ON m.home_team_id = ht.id
LEFT JOIN team_info at ON m.away_team_id = at.id
WHERE m.match_number IS NULL
  AND m.group_name = 'Gr. 042'
ORDER BY m.match_date;

-- Schritt 3: Details für Gruppe 043
SELECT 
  '=== GRUPPE 043 DETAILS ===' as info,
  m.id,
  m.match_date::date as date,
  ht.club_name || ' ' || COALESCE(ht.team_name, '') as home_team,
  at.club_name || ' ' || COALESCE(at.team_name, '') as away_team,
  m.status,
  m.venue
FROM matchdays m
LEFT JOIN team_info ht ON m.home_team_id = ht.id
LEFT JOIN team_info at ON m.away_team_id = at.id
WHERE m.match_number IS NULL
  AND m.group_name = 'Gr. 043'
ORDER BY m.match_date;

-- Schritt 4: Details für Gruppe 044
SELECT 
  '=== GRUPPE 044 DETAILS ===' as info,
  m.id,
  m.match_date::date as date,
  ht.club_name || ' ' || COALESCE(ht.team_name, '') as home_team,
  at.club_name || ' ' || COALESCE(at.team_name, '') as away_team,
  m.status,
  m.venue
FROM matchdays m
LEFT JOIN team_info ht ON m.home_team_id = ht.id
LEFT JOIN team_info at ON m.away_team_id = at.id
WHERE m.match_number IS NULL
  AND m.group_name = 'Gr. 044'
ORDER BY m.match_date;

-- Schritt 5: Details für Gruppe 046
SELECT 
  '=== GRUPPE 046 DETAILS ===' as info,
  m.id,
  m.match_date::date as date,
  ht.club_name || ' ' || COALESCE(ht.team_name, '') as home_team,
  at.club_name || ' ' || COALESCE(at.team_name, '') as away_team,
  m.status,
  m.venue
FROM matchdays m
LEFT JOIN team_info ht ON m.home_team_id = ht.id
LEFT JOIN team_info at ON m.away_team_id = at.id
WHERE m.match_number IS NULL
  AND m.group_name = 'Gr. 046'
ORDER BY m.match_date;

-- ==============================================================================
-- NÄCHSTE SCHRITTE (ANLEITUNG)
-- ==============================================================================
-- 
-- Um alle 36 Matches zu fixen:
-- 
-- 1. Gehe zu: Super Admin Dashboard → Scraper Tab
-- 
-- 2. Gib Gruppen ein: "42,43,44,46"
-- 
-- 3. Klicke "Daten laden"
-- 
-- 4. Klicke "Matches importieren"
-- 
-- Was passiert dann?
-- - Scraper lädt alle Matches von nuLiga
-- - Findet bestehende Matches per Datum + Teams
-- - Ergänzt fehlende match_numbers
-- - Erstellt KEINE Duplikate (dank unique constraints)
-- - Aktualisiert 36 Matches automatisch
-- 
-- Dauer: ca. 10-15 Sekunden
-- 
-- ==============================================================================


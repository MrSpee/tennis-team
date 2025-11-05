-- ============================================
-- DEBUG: UNBEKANNTE VENUES
-- ============================================
-- Zeigt alle Venues aus matchdays, die NICHT in venues-Tabelle sind
-- ============================================

-- ====================================
-- 1. ALLE UNIQUE VENUES AUS MATCHDAYS
-- ====================================

SELECT 
  '📍 ALLE VENUES IN MATCHDAYS' as info,
  COUNT(DISTINCT venue) as unique_venues,
  COUNT(*) as total_matchdays
FROM matchdays
WHERE venue IS NOT NULL;

-- ====================================
-- 2. VENUES MIT HÄUFIGKEIT
-- ====================================

SELECT 
  '📊 VENUE HÄUFIGKEIT' as info,
  venue as venue_name,
  COUNT(*) as match_count,
  MIN(match_date) as first_match,
  MAX(match_date) as last_match,
  STRING_AGG(DISTINCT league, ', ') as leagues
FROM matchdays
WHERE venue IS NOT NULL
GROUP BY venue
ORDER BY match_count DESC;

-- ====================================
-- 3. VENUES DIE IN DB EXISTIEREN
-- ====================================

WITH matchday_venues AS (
  SELECT DISTINCT TRIM(venue) as venue_name
  FROM matchdays
  WHERE venue IS NOT NULL
)
SELECT 
  '✅ VENUES DIE GEMAPPT WERDEN KÖNNEN' as info,
  mv.venue_name as matchday_venue,
  v.name as db_venue_name,
  v.vnr,
  v.city,
  v.court_count,
  COUNT(m.id) as match_count
FROM matchday_venues mv
LEFT JOIN venues v ON (
  v.name ILIKE '%' || mv.venue_name || '%' OR
  mv.venue_name ILIKE '%' || v.name || '%' OR
  v.club_name ILIKE '%' || mv.venue_name || '%'
)
LEFT JOIN matchdays m ON TRIM(m.venue) = mv.venue_name
WHERE v.id IS NOT NULL
GROUP BY mv.venue_name, v.id, v.name, v.vnr, v.city, v.court_count
ORDER BY match_count DESC;

-- ====================================
-- 4. VENUES DIE NICHT IN DB SIND ⚠️
-- ====================================

WITH matchday_venues AS (
  SELECT DISTINCT TRIM(venue) as venue_name
  FROM matchdays
  WHERE venue IS NOT NULL
),
matched_venues AS (
  SELECT DISTINCT mv.venue_name
  FROM matchday_venues mv
  LEFT JOIN venues v ON (
    v.name ILIKE '%' || mv.venue_name || '%' OR
    mv.venue_name ILIKE '%' || v.name || '%' OR
    v.club_name ILIKE '%' || mv.venue_name || '%'
  )
  WHERE v.id IS NOT NULL
)
SELECT 
  '⚠️ VENUES OHNE DB-MATCH' as info,
  mv.venue_name,
  COUNT(m.id) as match_count,
  STRING_AGG(DISTINCT t.category, ', ') as categories
FROM matchday_venues mv
LEFT JOIN matched_venues matched ON matched.venue_name = mv.venue_name
LEFT JOIN matchdays m ON TRIM(m.venue) = mv.venue_name
LEFT JOIN team_info t ON t.id = m.home_team_id
WHERE matched.venue_name IS NULL
GROUP BY mv.venue_name
ORDER BY match_count DESC;

-- ====================================
-- 5. BEISPIEL MATCHES FÜR UNBEKANNTE VENUES
-- ====================================

WITH unknown_venues AS (
  SELECT DISTINCT TRIM(venue) as venue_name
  FROM matchdays
  WHERE venue IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM venues v 
      WHERE v.name ILIKE '%' || TRIM(matchdays.venue) || '%' 
         OR TRIM(matchdays.venue) ILIKE '%' || v.name || '%'
         OR v.club_name ILIKE '%' || TRIM(matchdays.venue) || '%'
    )
)
SELECT 
  '🔍 BEISPIEL MATCHES FÜR UNBEKANNTE VENUES' as info,
  m.venue,
  m.match_date,
  t_home.club_name || ' ' || t_home.team_name as home_team,
  t_away.club_name || ' ' || t_away.team_name as away_team,
  m.league,
  m.group_name
FROM unknown_venues uv
JOIN matchdays m ON TRIM(m.venue) = uv.venue_name
LEFT JOIN team_info t_home ON t_home.id = m.home_team_id
LEFT JOIN team_info t_away ON t_away.id = m.away_team_id
ORDER BY m.venue, m.match_date
LIMIT 50;

-- ====================================
-- 6. VENUE NAME VARIATIONS
-- ====================================

SELECT 
  '🔤 VENUE NAME VARIATIONEN (für Fuzzy Matching)' as info,
  venue,
  LENGTH(venue) as length,
  venue SIMILAR TO '%[0-9]%' as has_number,
  venue ILIKE '%halle%' as is_indoor,
  venue ILIKE '%TC %' OR venue ILIKE '%TG %' OR venue ILIKE '%THC%' as has_club_prefix
FROM (
  SELECT DISTINCT venue 
  FROM matchdays 
  WHERE venue IS NOT NULL
) v
ORDER BY LENGTH(venue), venue;





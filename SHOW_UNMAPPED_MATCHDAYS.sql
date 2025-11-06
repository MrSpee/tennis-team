-- ============================================
-- ZEIGE NOCH NICHT GEMAPPTE MATCHDAYS
-- ============================================
-- Alle Venues existieren in DB, aber venue_id noch nicht gesetzt
-- ============================================

-- ====================================
-- 1. STATUS OVERVIEW
-- ====================================

SELECT 
  '📊 MAPPING STATUS' as info,
  COUNT(*) as total_matchdays,
  COUNT(*) FILTER (WHERE venue IS NOT NULL) as has_venue_text,
  COUNT(*) FILTER (WHERE venue_id IS NOT NULL) as already_mapped,
  COUNT(*) FILTER (WHERE venue IS NOT NULL AND venue_id IS NULL) as needs_mapping,
  ROUND(100.0 * COUNT(*) FILTER (WHERE venue_id IS NOT NULL) / NULLIF(COUNT(*) FILTER (WHERE venue IS NOT NULL), 0), 1) as percent_mapped
FROM matchdays;

-- ====================================
-- 2. VENUES DIE NOCH GEMAPPT WERDEN MÜSSEN
-- ====================================

SELECT 
  '⚠️ VENUES OHNE venue_id' as info,
  TRIM(m.venue) as venue_text,
  COUNT(*) as match_count,
  MIN(m.match_date) as first_match,
  MAX(m.match_date) as last_match,
  STRING_AGG(DISTINCT m.league, ', ') as leagues
FROM matchdays m
WHERE m.venue IS NOT NULL 
  AND m.venue_id IS NULL
GROUP BY TRIM(m.venue)
ORDER BY match_count DESC;

-- ====================================
-- 3. MAPPING-VORSCHLÄGE MIT VENUE_ID
-- ====================================

WITH unmapped_venues AS (
  SELECT DISTINCT TRIM(venue) as venue_text
  FROM matchdays
  WHERE venue IS NOT NULL AND venue_id IS NULL
)
SELECT 
  '💡 MAPPING-VORSCHLÄGE' as info,
  uv.venue_text as matchday_venue,
  v.id as suggested_venue_id,
  v.name as db_venue_name,
  v.vnr,
  v.city,
  v.court_count,
  CASE 
    WHEN v.name ILIKE uv.venue_text OR uv.venue_text ILIKE v.name THEN '✅ Exakt'
    WHEN v.name ILIKE '%' || uv.venue_text || '%' THEN '⚠️ Partial (DB enthält Text)'
    WHEN uv.venue_text ILIKE '%' || v.name || '%' THEN '⚠️ Partial (Text enthält DB)'
    WHEN v.club_name ILIKE '%' || uv.venue_text || '%' THEN '🔍 Via Club-Name'
    ELSE '❓ Unsicher'
  END as match_quality,
  COUNT(m.id) as affected_matches
FROM unmapped_venues uv
LEFT JOIN venues v ON (
  v.name ILIKE '%' || uv.venue_text || '%' OR
  uv.venue_text ILIKE '%' || v.name || '%' OR
  v.club_name ILIKE '%' || uv.venue_text || '%'
)
LEFT JOIN matchdays m ON TRIM(m.venue) = uv.venue_text
GROUP BY uv.venue_text, v.id, v.name, v.vnr, v.city, v.court_count
ORDER BY affected_matches DESC, match_quality;

-- ====================================
-- 4. MEHRDEUTIGE MAPPINGS (Mehrere Treffer)
-- ====================================

WITH unmapped_venues AS (
  SELECT DISTINCT TRIM(venue) as venue_text
  FROM matchdays
  WHERE venue IS NOT NULL AND venue_id IS NULL
),
mapping_counts AS (
  SELECT 
    uv.venue_text,
    COUNT(DISTINCT v.id) as possible_venues
  FROM unmapped_venues uv
  LEFT JOIN venues v ON (
    v.name ILIKE '%' || uv.venue_text || '%' OR
    uv.venue_text ILIKE '%' || v.name || '%' OR
    v.club_name ILIKE '%' || uv.venue_text || '%'
  )
  GROUP BY uv.venue_text
  HAVING COUNT(DISTINCT v.id) > 1
)
SELECT 
  '⚠️ MEHRDEUTIGE MAPPINGS' as info,
  mc.venue_text,
  mc.possible_venues,
  STRING_AGG(v.name || ' (VNR: ' || COALESCE(v.vnr, 'keine') || ', ' || v.city || ')', ' | ') as all_matches
FROM mapping_counts mc
LEFT JOIN venues v ON (
  v.name ILIKE '%' || mc.venue_text || '%' OR
  mc.venue_text ILIKE '%' || v.name || '%' OR
  v.club_name ILIKE '%' || mc.venue_text || '%'
)
GROUP BY mc.venue_text, mc.possible_venues
ORDER BY mc.possible_venues DESC;

-- ====================================
-- 5. BEISPIEL: TOP 10 UNMAPPED MATCHES
-- ====================================

SELECT 
  '🔍 BEISPIEL UNMAPPED MATCHES' as info,
  m.match_date,
  m.venue as venue_text,
  t_home.club_name || ' ' || t_home.team_name as home_team,
  t_away.club_name || ' ' || t_away.team_name as away_team,
  m.league,
  m.group_name
FROM matchdays m
LEFT JOIN team_info t_home ON t_home.id = m.home_team_id
LEFT JOIN team_info t_away ON t_away.id = m.away_team_id
WHERE m.venue IS NOT NULL 
  AND m.venue_id IS NULL
ORDER BY m.match_date DESC
LIMIT 10;

-- ====================================
-- 6. BEREITS GEMAPPTE VENUES (zur Kontrolle)
-- ====================================

SELECT 
  '✅ BEREITS GEMAPPT (Beispiele)' as info,
  m.venue as original_text,
  v.name as mapped_venue,
  v.vnr,
  m.court_number,
  COUNT(*) as match_count
FROM matchdays m
JOIN venues v ON v.id = m.venue_id
GROUP BY m.venue, v.name, v.vnr, m.court_number
ORDER BY match_count DESC
LIMIT 10;

-- ====================================
-- 7. SQL CODE ZUM KOPIEREN
-- ====================================

WITH unmapped_venues AS (
  SELECT DISTINCT TRIM(venue) as venue_text
  FROM matchdays
  WHERE venue IS NOT NULL AND venue_id IS NULL
),
best_match AS (
  SELECT DISTINCT ON (uv.venue_text)
    uv.venue_text,
    v.id as venue_id,
    v.name as venue_name,
    v.vnr,
    CASE 
      WHEN v.name ILIKE uv.venue_text OR uv.venue_text ILIKE v.name THEN 1
      WHEN v.name ILIKE '%' || uv.venue_text || '%' THEN 2
      WHEN uv.venue_text ILIKE '%' || v.name || '%' THEN 3
      WHEN v.club_name ILIKE '%' || uv.venue_text || '%' THEN 4
      ELSE 5
    END as match_priority
  FROM unmapped_venues uv
  LEFT JOIN venues v ON (
    v.name ILIKE '%' || uv.venue_text || '%' OR
    uv.venue_text ILIKE '%' || v.name || '%' OR
    v.club_name ILIKE '%' || uv.venue_text || '%'
  )
  WHERE v.id IS NOT NULL
  ORDER BY uv.venue_text, match_priority, v.name
)
SELECT 
  '📝 SQL CODE FÜR UPDATE' as info,
  '-- ' || venue_text as comment,
  'UPDATE matchdays SET venue_id = ''' || venue_id || '''::uuid, court_number = 1 WHERE venue ILIKE ''%' || venue_text || '%'' AND venue_id IS NULL;' as sql_code,
  match_priority,
  venue_name as db_name
FROM best_match
ORDER BY match_priority, venue_text;






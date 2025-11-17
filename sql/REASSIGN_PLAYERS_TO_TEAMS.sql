-- ============================================================================
-- REASSIGN PLAYERS TO TEAMS: Ordnet aktive App-Nutzer nach nuLiga-Import wieder Teams zu
-- ============================================================================
-- 
-- ZWECK: Nach dem nuLiga-Import werden neue Teams angelegt. Dieses Script
--        versucht, aktive App-Nutzer basierend auf Team-Namen wieder zuzuordnen.
--
-- VORAUSSETZUNG: 
--   - Cleanup wurde durchgeführt
--   - nuLiga-Import wurde durchgeführt (Teams sind vorhanden)
--   - Spieler haben noch ihre primary_team_id oder Team-Name in den Daten
--
-- ============================================================================

-- ============================================================================
-- PHASE 1: ANALYSE - Zeige aktuelle Situation
-- ============================================================================

-- 1.1 Aktive App-Nutzer ohne Team-Memberships
SELECT 
  'App-Nutzer ohne Team-Memberships' as info,
  COUNT(*) as anzahl,
  STRING_AGG(name || ' (' || email || ')', ', ' ORDER BY name LIMIT 20) as beispiel_namen
FROM players_unified
WHERE user_id IS NOT NULL
  AND (is_active = true OR is_active IS NULL)
  AND player_type = 'app_user'
  AND NOT EXISTS (
    SELECT 1 FROM team_memberships tm 
    WHERE tm.player_id = players_unified.id
  );

-- 1.2 Verfügbare Teams (nach nuLiga-Import)
SELECT 
  'Verfügbare Teams' as info,
  COUNT(*) as anzahl,
  COUNT(DISTINCT club_id) as unique_clubs,
  STRING_AGG(
    club_name || ' ' || COALESCE(team_name, '') || ' (' || COALESCE(category, 'keine Kategorie') || ')',
    ', ' 
    ORDER BY club_name 
    LIMIT 20
  ) as beispiel_teams
FROM team_info;

-- 1.3 App-Nutzer mit primary_team_id (könnte hilfreich sein)
SELECT 
  'App-Nutzer mit primary_team_id' as info,
  COUNT(*) as anzahl,
  COUNT(CASE WHEN primary_team_id IN (SELECT id FROM team_info) THEN 1 END) as gueltige_team_ids,
  COUNT(CASE WHEN primary_team_id NOT IN (SELECT id FROM team_info) THEN 1 END) as ungueltige_team_ids
FROM players_unified
WHERE user_id IS NOT NULL
  AND (is_active = true OR is_active IS NULL)
  AND player_type = 'app_user'
  AND primary_team_id IS NOT NULL;

-- ============================================================================
-- PHASE 2: REASSIGNMENT - Versuche automatische Zuordnung
-- ============================================================================
-- 
-- HINWEIS: Dieses Script versucht eine intelligente Zuordnung, aber du solltest
--          die Ergebnisse prüfen und ggf. manuell korrigieren!
--

BEGIN;

-- 2.1 Erstelle temporäre Tabelle für Team-Zuordnungen
CREATE TEMP TABLE IF NOT EXISTS player_team_suggestions AS
SELECT 
  p.id as player_id,
  p.name as player_name,
  p.email,
  p.primary_team_id as old_team_id,
  ti.id as suggested_team_id,
  ti.club_name || ' ' || COALESCE(ti.team_name, '') as suggested_team_name,
  ti.category as suggested_category,
  -- Similarity-Score (einfach: basierend auf Club-Name)
  CASE 
    WHEN p.primary_team_id IS NOT NULL THEN 1.0
    WHEN LOWER(p.email) LIKE '%' || LOWER(REPLACE(ti.club_name, ' ', '')) || '%' THEN 0.8
    ELSE 0.5
  END as similarity_score
FROM players_unified p
CROSS JOIN team_info ti
WHERE p.user_id IS NOT NULL
  AND (p.is_active = true OR p.is_active IS NULL)
  AND p.player_type = 'app_user'
  AND NOT EXISTS (
    SELECT 1 FROM team_memberships tm 
    WHERE tm.player_id = p.id AND tm.team_id = ti.id
  );

-- 2.2 Zeige Vorschläge (DRY-RUN)
SELECT 
  'VORSCHLÄGE FÜR TEAM-ZUORDNUNG' as info,
  player_name,
  email,
  suggested_team_name,
  suggested_category,
  similarity_score,
  CASE 
    WHEN similarity_score >= 0.8 THEN '✅ HOCH'
    WHEN similarity_score >= 0.5 THEN '⚠️ MITTEL'
    ELSE '❌ NIEDRIG'
  END as empfehlung
FROM player_team_suggestions
ORDER BY similarity_score DESC, player_name
LIMIT 50;

-- 2.3 OPTIONAL: Automatische Zuordnung (nur für hohe Scores)
-- UNKOMMENTIERE NUR wenn du mit den Vorschlägen zufrieden bist!

-- INSERT INTO team_memberships (player_id, team_id, role, is_primary, is_active)
-- SELECT DISTINCT
--   player_id,
--   suggested_team_id,
--   'player' as role,
--   true as is_primary,
--   true as is_active
-- FROM (
--   SELECT 
--     player_id,
--     suggested_team_id,
--     ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY similarity_score DESC) as rn
--   FROM player_team_suggestions
--   WHERE similarity_score >= 0.8  -- Nur hohe Scores
-- ) ranked
-- WHERE rn = 1  -- Nur das beste Match pro Spieler
-- ON CONFLICT (player_id, team_id, season) DO NOTHING;

-- 2.4 Setze primary_team_id für Spieler mit Team-Memberships
UPDATE players_unified p
SET primary_team_id = (
  SELECT tm.team_id 
  FROM team_memberships tm 
  WHERE tm.player_id = p.id 
    AND tm.is_primary = true 
  LIMIT 1
)
WHERE p.user_id IS NOT NULL
  AND (p.is_active = true OR p.is_active IS NULL)
  AND p.player_type = 'app_user'
  AND EXISTS (
    SELECT 1 FROM team_memberships tm 
    WHERE tm.player_id = p.id AND tm.is_primary = true
  )
  AND (p.primary_team_id IS NULL OR p.primary_team_id NOT IN (SELECT id FROM team_info));

COMMIT;

-- ============================================================================
-- PHASE 3: VERIFIKATION
-- ============================================================================

-- 3.1 App-Nutzer mit Team-Memberships (nach Reassignment)
SELECT 
  'App-Nutzer mit Team-Memberships (nach Reassignment)' as info,
  COUNT(DISTINCT p.id) as anzahl_spieler,
  COUNT(DISTINCT tm.team_id) as anzahl_teams,
  STRING_AGG(
    DISTINCT p.name || ' → ' || ti.club_name || ' ' || COALESCE(ti.team_name, ''),
    ', ' 
    ORDER BY p.name 
    LIMIT 20
  ) as beispiel_zuordnungen
FROM players_unified p
JOIN team_memberships tm ON p.id = tm.player_id
JOIN team_info ti ON tm.team_id = ti.id
WHERE p.user_id IS NOT NULL
  AND (p.is_active = true OR p.is_active IS NULL)
  AND p.player_type = 'app_user';

-- 3.2 App-Nutzer OHNE Team-Memberships (müssen manuell zugeordnet werden)
SELECT 
  '⚠️ App-Nutzer OHNE Team-Memberships (manuelle Zuordnung nötig)' as warnung,
  p.id,
  p.name,
  p.email,
  p.primary_team_id as alte_team_id
FROM players_unified p
WHERE p.user_id IS NOT NULL
  AND (p.is_active = true OR p.is_active IS NULL)
  AND p.player_type = 'app_user'
  AND NOT EXISTS (
    SELECT 1 FROM team_memberships tm 
    WHERE tm.player_id = p.id
  )
ORDER BY p.name;

-- ============================================================================
-- HINWEISE
-- ============================================================================
-- 
-- 1. Prüfe die Vorschläge in Phase 2.2
-- 2. Wenn du mit den Vorschlägen zufrieden bist, unkommentiere Phase 2.3
-- 3. Oder ordne Spieler manuell im SuperAdmin-Dashboard zu
-- 4. Prüfe die Verifikation in Phase 3
--
-- ============================================================================



-- ============================================================================
-- ANALYSE SCRIPT: Detaillierte Analyse vor Cleanup
-- ============================================================================
-- 
-- Führe dieses Script AUS, bevor du CLEANUP_FOR_NULIGA_IMPORT.sql ausführst!
-- Es zeigt dir genau, was gelöscht wird und was erhalten bleibt.
--
-- ============================================================================

-- ============================================================================
-- 1. SPIELER-ANALYSE
-- ============================================================================

-- 1.1 Aktive App-Nutzer (werden BEHALTEN)
SELECT 
  '✅ BEHALTEN: Aktive App-Nutzer' as status,
  COUNT(*) as anzahl,
  STRING_AGG(name || ' (' || email || ')', ', ' ORDER BY name LIMIT 20) as beispiel_namen
FROM players_unified
WHERE user_id IS NOT NULL 
  AND (is_active = true OR is_active IS NULL)
  AND player_type = 'app_user';

-- 1.2 Spieler die gelöscht werden (nach Typ)
SELECT 
  CASE 
    WHEN user_id IS NULL AND player_type = 'app_user' THEN 'App-User ohne user_id'
    WHEN is_active = false THEN 'Inaktive Spieler'
    WHEN player_type = 'external' THEN 'Externe Spieler'
    WHEN player_type = 'opponent' THEN 'Gegner-Spieler'
    ELSE 'Sonstige'
  END as typ,
  COUNT(*) as anzahl,
  STRING_AGG(name, ', ' ORDER BY name LIMIT 10) as beispiel_namen
FROM players_unified
WHERE user_id IS NULL 
   OR is_active = false
   OR player_type IN ('external', 'opponent')
GROUP BY 
  CASE 
    WHEN user_id IS NULL AND player_type = 'app_user' THEN 'App-User ohne user_id'
    WHEN is_active = false THEN 'Inaktive Spieler'
    WHEN player_type = 'external' THEN 'Externe Spieler'
    WHEN player_type = 'opponent' THEN 'Gegner-Spieler'
    ELSE 'Sonstige'
  END
ORDER BY anzahl DESC;

-- 1.3 Team-Memberships Analyse
SELECT 
  'Team-Memberships' as info,
  COUNT(*) as gesamt,
  COUNT(DISTINCT player_id) as unique_players,
  COUNT(DISTINCT team_id) as unique_teams,
  COUNT(CASE WHEN player_id IN (
    SELECT id FROM players_unified 
    WHERE user_id IS NOT NULL 
      AND (is_active = true OR is_active IS NULL)
      AND player_type = 'app_user'
  ) THEN 1 END) as memberships_fuer_aktive_nutzer,
  COUNT(CASE WHEN player_id NOT IN (
    SELECT id FROM players_unified 
    WHERE user_id IS NOT NULL 
      AND (is_active = true OR is_active IS NULL)
      AND player_type = 'app_user'
  ) THEN 1 END) as memberships_wird_geloescht
FROM team_memberships;

-- ============================================================================
-- 2. TEAM-ANALYSE
-- ============================================================================

-- 2.1 Alle Teams (werden ALLE gelöscht)
SELECT 
  '❌ LÖSCHEN: Alle Teams' as status,
  COUNT(*) as anzahl,
  COUNT(DISTINCT club_id) as unique_clubs,
  STRING_AGG(
    club_name || ' ' || COALESCE(team_name, '') || ' (' || COALESCE(category, 'keine Kategorie') || ')',
    ', ' 
    ORDER BY club_name 
    LIMIT 20
  ) as beispiel_teams
FROM team_info;

-- 2.2 Teams mit aktiven Memberships
SELECT 
  'Teams mit aktiven App-Nutzer Memberships' as info,
  COUNT(DISTINCT tm.team_id) as anzahl_teams,
  STRING_AGG(
    DISTINCT ti.club_name || ' ' || COALESCE(ti.team_name, ''),
    ', ' 
    ORDER BY ti.club_name 
    LIMIT 10
  ) as beispiel_teams
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.player_id IN (
  SELECT id FROM players_unified 
  WHERE user_id IS NOT NULL 
    AND (is_active = true OR is_active IS NULL)
    AND player_type = 'app_user'
);

-- ============================================================================
-- 3. MATCH-ANALYSE
-- ============================================================================

-- 3.1 Alle Matches (werden ALLE gelöscht)
SELECT 
  '❌ LÖSCHEN: Alle Matches' as status,
  COUNT(*) as gesamt,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
  COUNT(CASE WHEN home_score IS NOT NULL AND away_score IS NOT NULL THEN 1 END) as mit_ergebnissen,
  MIN(match_date) as aeltestes_match,
  MAX(match_date) as neuestes_match
FROM matchdays;

-- 3.2 Matches mit Match-Results
SELECT 
  'Matches mit Match-Results' as info,
  COUNT(DISTINCT mr.matchday_id) as matches_mit_results,
  COUNT(*) as gesamt_match_results
FROM match_results mr
JOIN matchdays md ON mr.matchday_id = md.id;

-- ============================================================================
-- 4. VEREINS-ANALYSE
-- ============================================================================

-- 4.1 Alle Vereine (werden BEHALTEN - können neu gemappt werden)
SELECT 
  '⚠️ BEHALTEN (aber neu mappen): Vereine' as status,
  COUNT(*) as anzahl,
  COUNT(CASE WHEN is_verified = true THEN 1 END) as verified,
  COUNT(CASE WHEN is_verified = false THEN 1 END) as unverified,
  STRING_AGG(name, ', ' ORDER BY name LIMIT 20) as beispiel_vereine
FROM club_info;

-- 4.2 Vereine mit Teams (die gelöscht werden)
SELECT 
  'Vereine mit Teams (Teams werden gelöscht)' as info,
  ci.name as verein,
  COUNT(ti.id) as anzahl_teams,
  STRING_AGG(ti.team_name || ' (' || COALESCE(ti.category, 'keine Kategorie') || ')', ', ') as teams
FROM club_info ci
LEFT JOIN team_info ti ON ci.id = ti.club_id
GROUP BY ci.id, ci.name
HAVING COUNT(ti.id) > 0
ORDER BY anzahl_teams DESC
LIMIT 20;

-- ============================================================================
-- 5. ZUSAMMENFASSUNG
-- ============================================================================

SELECT 
  '📊 ZUSAMMENFASSUNG' as info,
  (SELECT COUNT(*) FROM players_unified WHERE user_id IS NOT NULL AND (is_active = true OR is_active IS NULL) AND player_type = 'app_user') as spieler_behalten,
  (SELECT COUNT(*) FROM players_unified WHERE user_id IS NULL OR is_active = false OR player_type IN ('external', 'opponent')) as spieler_loeschen,
  (SELECT COUNT(*) FROM team_info) as teams_loeschen,
  (SELECT COUNT(*) FROM matchdays) as matches_loeschen,
  (SELECT COUNT(*) FROM match_results) as match_results_loeschen,
  (SELECT COUNT(*) FROM club_info) as vereine_behalten;

-- ============================================================================
-- 6. WARNUNGEN
-- ============================================================================

-- 6.1 Warnung: Spieler mit user_id aber ohne aktive Memberships
SELECT 
  '⚠️ WARNUNG: App-Nutzer ohne Team-Memberships' as warnung,
  p.id,
  p.name,
  p.email,
  p.user_id
FROM players_unified p
WHERE p.user_id IS NOT NULL
  AND (p.is_active = true OR p.is_active IS NULL)
  AND p.player_type = 'app_user'
  AND NOT EXISTS (
    SELECT 1 FROM team_memberships tm 
    WHERE tm.player_id = p.id
  );

-- 6.2 Warnung: Teams mit vielen aktiven Memberships (werden trotzdem gelöscht!)
SELECT 
  '⚠️ WARNUNG: Teams mit aktiven Memberships (werden trotzdem gelöscht!)' as warnung,
  ti.club_name || ' ' || COALESCE(ti.team_name, '') as team,
  COUNT(tm.id) as aktive_memberships
FROM team_info ti
JOIN team_memberships tm ON ti.id = tm.team_id
WHERE tm.player_id IN (
  SELECT id FROM players_unified 
  WHERE user_id IS NOT NULL 
    AND (is_active = true OR is_active IS NULL)
    AND player_type = 'app_user'
)
GROUP BY ti.id, ti.club_name, ti.team_name
ORDER BY aktive_memberships DESC
LIMIT 10;

-- ============================================================================
-- ENDE DER ANALYSE
-- ============================================================================
-- 
-- Wenn du mit den Ergebnissen zufrieden bist, führe CLEANUP_FOR_NULIGA_IMPORT.sql aus
--
-- ============================================================================



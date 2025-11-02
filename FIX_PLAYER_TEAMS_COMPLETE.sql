-- FIX_PLAYER_TEAMS_COMPLETE.sql
-- Vollständiger Fix für fehlende Team-Zuordnungen

-- Spieler-IDs:
-- Raoul van Herwijnen: 319d0946-bbc8-4746-a300-372a99ddcc44
-- Alexander Elwert: 71d0bcd9-1da4-406d-88c2-f3ccc25938df
-- Markus Wilwerscheid: a869f4e3-6424-423f-9c92-a2895f3f0464
-- Marc Stoppenbach: a18c5c2a-2d6b-4e09-89f1-3802238c215e

-- ==========================================
-- SCHRITT 1: ANALYSE - Aktuelle Situation prüfen
-- ==========================================

-- 1.1 Zeige aktuelle Team-Mitgliedschaften
SELECT 
  '1.1 Aktuelle Team-Mitgliedschaften' as step,
  pu.name as player_name,
  tm.id as membership_id,
  tm.team_id,
  tm.is_primary,
  tm.is_active,
  tm.season,
  ti.club_name,
  ti.team_name,
  ti.category
FROM players_unified pu
LEFT JOIN team_memberships tm ON pu.id = tm.player_id
LEFT JOIN team_info ti ON tm.team_id = ti.id
WHERE pu.id IN (
  '319d0946-bbc8-4746-a300-372a99ddcc44',
  '71d0bcd9-1da4-406d-88c2-f3ccc25938df',
  'a869f4e3-6424-423f-9c92-a2895f3f0464',
  'a18c5c2a-2d6b-4e09-89f1-3802238c215e'
)
ORDER BY pu.name, tm.is_active DESC NULLS LAST, tm.is_primary DESC NULLS LAST;

-- 1.2 Zeige alle verfügbaren Teams (nach Spieler-Anzahl sortiert)
SELECT 
  '1.2 Verfuegbare Teams' as step,
  ti.id as team_id,
  ti.club_name,
  ti.team_name,
  ti.category,
  COUNT(DISTINCT CASE WHEN tm.is_active = true THEN tm.player_id END) as active_players,
  COUNT(DISTINCT tm.player_id) as total_players
FROM team_info ti
LEFT JOIN team_memberships tm ON ti.id = tm.team_id
WHERE ti.is_active = true
GROUP BY ti.id, ti.club_name, ti.team_name, ti.category
ORDER BY active_players DESC, ti.club_name, ti.team_name;

-- 1.3 Finde Spieler OHNE aktive Team-Mitgliedschaft
SELECT 
  '1.3 Spieler OHNE Team' as step,
  pu.id,
  pu.name,
  pu.email,
  pu.player_type,
  pu.primary_team_id,
  CASE WHEN tm.player_id IS NULL THEN '❌ KEIN TEAM' ELSE '✅ HAT TEAM' END as status
FROM players_unified pu
LEFT JOIN team_memberships tm ON pu.id = tm.player_id AND tm.is_active = true
WHERE pu.id IN (
  '319d0946-bbc8-4746-a300-372a99ddcc44',
  '71d0bcd9-1da4-406d-88c2-f3ccc25938df',
  'a869f4e3-6424-423f-9c92-a2895f3f0464',
  'a18c5c2a-2d6b-4e09-89f1-3802238c215e'
)
AND tm.player_id IS NULL
ORDER BY pu.name;

-- ==========================================
-- SCHRITT 2: BESTIMME DEFAULT-TEAM
-- ==========================================

-- 2.1 Finde das Team mit den meisten Spielern (als Default)
WITH team_stats AS (
  SELECT 
    ti.id as team_id,
    ti.club_name,
    ti.team_name,
    ti.category,
    COUNT(DISTINCT CASE WHEN tm.is_active = true THEN tm.player_id END) as active_players
  FROM team_info ti
  LEFT JOIN team_memberships tm ON ti.id = tm.team_id
  WHERE ti.is_active = true
  GROUP BY ti.id, ti.club_name, ti.team_name, ti.category
)
SELECT 
  '2.1 Default-Team (meiste Spieler)' as step,
  team_id,
  club_name,
  team_name,
  category,
  active_players
FROM team_stats
ORDER BY active_players DESC, club_name, team_name
LIMIT 5;

-- 2.2 ODER: Suche speziell nach VKC Köln Teams
SELECT 
  '2.2 VKC Köln Teams' as step,
  ti.id as team_id,
  ti.club_name,
  ti.team_name,
  ti.category,
  COUNT(DISTINCT CASE WHEN tm.is_active = true THEN tm.player_id END) as active_players
FROM team_info ti
LEFT JOIN team_memberships tm ON ti.id = tm.team_id
WHERE ti.club_name ILIKE '%VKC%' OR ti.club_name ILIKE '%Köln%' OR ti.club_name ILIKE '%Koenig%'
GROUP BY ti.id, ti.club_name, ti.team_name, ti.category
ORDER BY ti.club_name, ti.team_name;

-- ==========================================
-- SCHRITT 3: MANUELLE ZUORDNUNG
-- ==========================================
-- WICHTIG: Die Team-IDs müssen basierend auf den Ergebnissen aus Schritt 2 manuell angepasst werden!

-- Beispiel-Syntax für die Zuordnung (NICHT AUSFÜHREN bis Team-IDs bekannt sind):

/*
-- OPTION A: Ordne alle Spieler dem häufigsten Team zu
-- Ersetze 'TEAM_ID_HIER' mit der tatsächlichen Team-ID aus Schritt 2.1
INSERT INTO team_memberships (
  player_id,
  team_id,
  season,
  is_active,
  is_primary,
  role,
  created_at
)
SELECT 
  pu.id,
  'TEAM_ID_HIER'::uuid, -- HIER: Team-ID aus Schritt 2 einsetzen!
  'winter_25_26',
  true,
  true, -- Primär-Team
  'player',
  NOW()
FROM players_unified pu
WHERE pu.id IN (
  '319d0946-bbc8-4746-a300-372a99ddcc44',
  '71d0bcd9-1da4-406d-88c2-f3ccc25938df',
  'a869f4e3-6424-423f-9c92-a2895f3f0464',
  'a18c5c2a-2d6b-4e09-89f1-3802238c215e'
)
AND NOT EXISTS (
  -- Prüfe ob bereits Mitgliedschaft existiert
  SELECT 1 FROM team_memberships tm 
  WHERE tm.player_id = pu.id 
  AND tm.is_active = true
);

-- OPTION B: Ordne Spieler spezifischen Teams zu (wenn bekannt)
-- Beispiel:
-- Raoul → VKC Herren 30: '6c38c710-28dd-41fe-b991-b7180ef23ca1'
-- Alexander → VKC Herren 40: '235fade5-0974-4f5b-a758-536f771a5e80'
-- etc.
*/

-- ==========================================
-- SCHRITT 4: primary_team_id AKTUALISIEREN
-- ==========================================

-- 4.1 Aktualisiere primary_team_id in players_unified basierend auf is_primary in team_memberships
UPDATE players_unified pu
SET primary_team_id = tm.team_id,
    updated_at = NOW()
FROM team_memberships tm
WHERE tm.player_id = pu.id
  AND tm.is_primary = true
  AND tm.is_active = true
  AND pu.id IN (
    '319d0946-bbc8-4746-a300-372a99ddcc44',
    '71d0bcd9-1da4-406d-88c2-f3ccc25938df',
    'a869f4e3-6424-423f-9c92-a2895f3f0464',
    'a18c5c2a-2d6b-4e09-89f1-3802238c215e'
  )
  AND (pu.primary_team_id IS NULL OR pu.primary_team_id != tm.team_id);

-- ==========================================
-- SCHRITT 5: VERIFIKATION
-- ==========================================

-- 5.1 Zeige finale Team-Zuordnungen
SELECT 
  '5.1 FINALE TEAM-ZUORDNUNGEN' as step,
  pu.id,
  pu.name as player_name,
  tm.team_id,
  tm.is_primary,
  tm.is_active,
  ti.club_name,
  ti.team_name,
  ti.category,
  pu.primary_team_id,
  CASE WHEN pu.primary_team_id IS NOT NULL THEN '✅' ELSE '❌' END as primary_set
FROM players_unified pu
LEFT JOIN team_memberships tm ON pu.id = tm.player_id AND tm.is_active = true
LEFT JOIN team_info ti ON tm.team_id = ti.id
WHERE pu.id IN (
  '319d0946-bbc8-4746-a300-372a99ddcc44',
  '71d0bcd9-1da4-406d-88c2-f3ccc25938df',
  'a869f4e3-6424-423f-9c92-a2895f3f0464',
  'a18c5c2a-2d6b-4e09-89f1-3802238c215e'
)
ORDER BY pu.name;

-- 5.2 Finale Zusammenfassung
SELECT 
  '5.2 ZUSAMMENFASSUNG' as step,
  COUNT(DISTINCT pu.id) as total_players,
  COUNT(DISTINCT tm.team_id) as total_teams,
  COUNT(DISTINCT CASE WHEN tm.is_active = true THEN tm.team_id END) as active_teams,
  COUNT(DISTINCT CASE WHEN pu.primary_team_id IS NOT NULL THEN pu.id END) as players_with_primary
FROM players_unified pu
LEFT JOIN team_memberships tm ON pu.id = tm.player_id
WHERE pu.id IN (
  '319d0946-bbc8-4746-a300-372a99ddcc44',
  '71d0bcd9-1da4-406d-88c2-f3ccc25938df',
  'a869f4e3-6424-423f-9c92-a2895f3f0464',
  'a18c5c2a-2d6b-4e09-89f1-3802238c215e'
);

-- ==========================================
-- WICHTIGE HINWEISE:
-- ==========================================
-- 1. Führe ZUERST Schritt 1 aus (Analyse)
-- 2. Bestimme das Default-Team mit Schritt 2
-- 3. Führe Schritt 3 AUS (Zuordnung) - HIER DIE TEAM-ID EINSETZEN!
-- 4. Führe Schritt 4 aus (primary_team_id aktualisieren)
-- 5. Prüfe mit Schritt 5 (Verifikation)



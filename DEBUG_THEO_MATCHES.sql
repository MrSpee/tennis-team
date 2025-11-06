-- =====================================================
-- DEBUG: Warum sieht Theo keine Herren 55 Matches?
-- Description: Überprüft alle relevanten Daten
-- Date: 2025-11-02
-- =====================================================

-- ========================================
-- SCHRITT 1: Prüfe Theo's Team-Mitgliedschaften
-- ========================================

SELECT 
  '1️⃣ Theo Team-Mitgliedschaften' as step,
  tm.id as membership_id,
  tm.player_id,
  tm.team_id,
  tm.is_active,
  tm.is_primary,
  tm.role,
  t.club_name,
  t.team_name,
  t.category
FROM team_memberships tm
JOIN team_info t ON t.id = tm.team_id
JOIN players_unified p ON p.id = tm.player_id
WHERE LOWER(p.name) LIKE '%theo%tester%'
ORDER BY tm.is_primary DESC, t.category;

-- ========================================
-- SCHRITT 2: Finde VKC Herren 55 Team ID
-- ========================================

SELECT 
  '2️⃣ VKC Herren 55 Team' as step,
  id as team_id,
  club_name,
  team_name,
  category
FROM team_info
WHERE club_name ILIKE '%VKC%'
AND category ILIKE '%Herren 55%';

-- ========================================
-- SCHRITT 3: Gibt es Matches für Herren 55?
-- ========================================

-- Variante A: Neue Struktur (matchdays)
SELECT 
  '3️⃣ A) Matchdays für Herren 55' as step,
  m.id as matchday_id,
  m.match_date,
  m.home_team_id,
  m.away_team_id,
  ht.club_name || ' ' || COALESCE(ht.team_name, '') as home_team,
  at.club_name || ' ' || COALESCE(at.team_name, '') as away_team,
  m.season,
  m.status,
  m.home_score,
  m.away_score
FROM matchdays m
LEFT JOIN team_info ht ON ht.id = m.home_team_id
LEFT JOIN team_info at ON at.id = m.away_team_id
WHERE m.home_team_id IN (
    SELECT id FROM team_info 
    WHERE club_name ILIKE '%VKC%' 
    AND category ILIKE '%Herren 55%'
  )
  OR m.away_team_id IN (
    SELECT id FROM team_info 
    WHERE club_name ILIKE '%VKC%' 
    AND category ILIKE '%Herren 55%'
  )
ORDER BY m.match_date DESC;

-- Variante B: Alte Struktur (matches)
SELECT 
  '3️⃣ B) Matches für Herren 55' as step,
  m.id as match_id,
  m.match_date,
  m.opponent,
  m.location,
  m.venue,
  m.season,
  t.club_name,
  t.team_name,
  t.category
FROM matches m
JOIN team_info t ON t.id = m.team_id
WHERE m.team_id IN (
    SELECT id FROM team_info 
    WHERE club_name ILIKE '%VKC%' 
    AND category ILIKE '%Herren 55%'
  )
ORDER BY m.match_date DESC;

-- ========================================
-- SCHRITT 4: Prüfe DataContext Filterung
-- ========================================

-- Welche Team-IDs sollte Theo sehen?
WITH theo_teams AS (
  SELECT tm.team_id
  FROM team_memberships tm
  JOIN players_unified p ON p.id = tm.player_id
  WHERE LOWER(p.name) LIKE '%theo%tester%'
  AND tm.is_active = true
)
SELECT 
  '4️⃣ Teams die Theo hat (für Match-Filter)' as step,
  t.id as team_id,
  t.club_name,
  t.team_name,
  t.category,
  -- Wie viele Matches gibt es?
  (SELECT COUNT(*) FROM matchdays m 
   WHERE m.home_team_id = t.id OR m.away_team_id = t.id) as matchday_count,
  (SELECT COUNT(*) FROM matches m 
   WHERE m.team_id = t.id) as matches_count
FROM theo_teams tt
JOIN team_info t ON t.id = tt.team_id
ORDER BY t.category;

-- ========================================
-- SCHRITT 5: Prüfe ob Theo's user_id gesetzt ist
-- ========================================

SELECT 
  '5️⃣ Theo User & Auth Status' as step,
  p.id as player_id,
  p.user_id,
  p.name,
  p.email,
  p.status,
  p.onboarding_status,
  -- Kann dieser User sich einloggen?
  CASE 
    WHEN p.user_id IS NULL THEN '❌ Kein user_id - kann sich nicht einloggen'
    WHEN p.status != 'active' THEN '⚠️ Status nicht active'
    ELSE '✅ Sollte funktionieren'
  END as auth_status
FROM players_unified p
WHERE LOWER(p.name) LIKE '%theo%tester%';

-- ========================================
-- SCHRITT 6: Simulation - Was würde DataContext laden?
-- ========================================

-- Simuliere loadMatches() Funktion
WITH theo_player AS (
  SELECT id, user_id 
  FROM players_unified 
  WHERE LOWER(name) LIKE '%theo%tester%'
  LIMIT 1
),
theo_team_ids AS (
  SELECT tm.team_id
  FROM team_memberships tm
  WHERE tm.player_id = (SELECT id FROM theo_player)
  AND tm.is_active = true
)
SELECT 
  '6️⃣ Matches die Theo sehen sollte (DataContext Simulation)' as step,
  m.id as matchday_id,
  m.match_date,
  CASE 
    WHEN m.home_team_id IN (SELECT team_id FROM theo_team_ids) THEN 'HOME'
    WHEN m.away_team_id IN (SELECT team_id FROM theo_team_ids) THEN 'AWAY'
    ELSE 'ERROR'
  END as perspective,
  ht.club_name || ' ' || COALESCE(ht.team_name, '') as home_team,
  at.club_name || ' ' || COALESCE(at.team_name, '') as away_team,
  m.season,
  m.status,
  m.home_score || ':' || m.away_score as score
FROM matchdays m
LEFT JOIN team_info ht ON ht.id = m.home_team_id
LEFT JOIN team_info at ON at.id = m.away_team_id
WHERE m.home_team_id IN (SELECT team_id FROM theo_team_ids)
   OR m.away_team_id IN (SELECT team_id FROM theo_team_ids)
ORDER BY m.match_date DESC
LIMIT 20;

-- ========================================
-- DIAGNOSE
-- ========================================

DO $$
DECLARE
  v_theo_id UUID;
  v_team_count INTEGER;
  v_herren55_team_id UUID;
  v_herren55_matches INTEGER;
  v_theo_has_user_id BOOLEAN;
BEGIN
  -- Hole Theo
  SELECT id, user_id IS NOT NULL INTO v_theo_id, v_theo_has_user_id
  FROM players_unified
  WHERE LOWER(name) LIKE '%theo%tester%'
  LIMIT 1;
  
  IF v_theo_id IS NULL THEN
    RAISE NOTICE '❌ PROBLEM: Theo Tester nicht gefunden!';
    RETURN;
  END IF;
  
  -- Zähle Teams
  SELECT COUNT(*) INTO v_team_count
  FROM team_memberships
  WHERE player_id = v_theo_id
  AND is_active = true;
  
  -- Hole Herren 55 Team
  SELECT id INTO v_herren55_team_id
  FROM team_info
  WHERE club_name ILIKE '%VKC%'
  AND category ILIKE '%Herren 55%'
  LIMIT 1;
  
  -- Zähle Matches für Herren 55
  SELECT COUNT(*) INTO v_herren55_matches
  FROM matchdays
  WHERE home_team_id = v_herren55_team_id
     OR away_team_id = v_herren55_team_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '📊 DIAGNOSE - Theo Dashboard Matches';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Theo Player ID: %', v_theo_id;
  RAISE NOTICE 'Hat user_id: %', CASE WHEN v_theo_has_user_id THEN '✅ JA' ELSE '❌ NEIN - kann sich nicht einloggen!' END;
  RAISE NOTICE 'Anzahl aktive Teams: %', v_team_count;
  RAISE NOTICE '';
  
  IF v_herren55_team_id IS NULL THEN
    RAISE NOTICE '❌ PROBLEM: VKC Herren 55 Team nicht gefunden!';
  ELSE
    RAISE NOTICE 'VKC Herren 55 Team ID: %', v_herren55_team_id;
    RAISE NOTICE 'Anzahl Matches für Herren 55: %', v_herren55_matches;
    
    IF v_herren55_matches = 0 THEN
      RAISE NOTICE '';
      RAISE NOTICE '⚠️  URSACHE: Keine Matches für Herren 55 Team vorhanden!';
      RAISE NOTICE '💡 LÖSUNG: Importiere zuerst Matches für dieses Team';
    END IF;
  END IF;
  
  -- Prüfe ob Theo im Herren 55 Team ist
  IF EXISTS (
    SELECT 1 FROM team_memberships
    WHERE player_id = v_theo_id
    AND team_id = v_herren55_team_id
    AND is_active = true
  ) THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Theo IST im Herren 55 Team';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '❌ PROBLEM: Theo ist NICHT im Herren 55 Team!';
    RAISE NOTICE '💡 LÖSUNG: Führe ADD_THEO_TO_HERREN_55.sql aus';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  
END $$;






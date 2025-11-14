-- CLEANUP_DUPLICATE_CLUBS_AND_TEAMS.sql
-- ============================================================
-- Bereinigt Duplikate in club_info und team_info
-- ============================================================

-- WICHTIG: Dieses Script sollte Schritt für Schritt ausgeführt werden!
-- Prüfe nach jedem Schritt die Ergebnisse, bevor du fortfährst.

-- ============================================================
-- SCHRITT 1: Finde Duplikate (nur anzeigen, keine Änderungen)
-- ============================================================

-- 1.1: Clubs mit identischen normalized_names
SELECT 
  '=== CLUBS MIT IDENTISCHEN NORMALIZED_NAMES ===' as info,
  ci.normalized_name,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(ci.id ORDER BY ci.created_at) as club_ids,
  ARRAY_AGG(ci.name ORDER BY ci.created_at) as club_names,
  ARRAY_AGG(ci.created_at ORDER BY ci.created_at) as created_dates,
  ARRAY_AGG(
    (SELECT COUNT(*) FROM team_info WHERE club_id = ci.id) 
    ORDER BY ci.created_at
  ) as teams_count
FROM club_info ci
WHERE ci.normalized_name IS NOT NULL
GROUP BY ci.normalized_name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, ci.normalized_name;

-- 1.2: Clubs mit identischen Namen (case-insensitive)
SELECT 
  '=== CLUBS MIT IDENTISCHEN NAMEN ===' as info,
  LOWER(ci.name) as normalized_name_lower,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(ci.id ORDER BY ci.created_at) as club_ids,
  ARRAY_AGG(ci.name ORDER BY ci.created_at) as club_names,
  ARRAY_AGG(ci.created_at ORDER BY ci.created_at) as created_dates,
  ARRAY_AGG(
    (SELECT COUNT(*) FROM team_info WHERE club_id = ci.id) 
    ORDER BY ci.created_at
  ) as teams_count
FROM club_info ci
GROUP BY LOWER(ci.name)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, normalized_name_lower;

-- 1.3: Teams mit identischen Namen und Club
SELECT 
  '=== TEAMS MIT IDENTISCHEN NAMEN UND CLUB ===' as info,
  ti.club_id,
  ti.club_name,
  ti.team_name,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(ti.id ORDER BY ti.created_at) as team_ids,
  ARRAY_AGG(ti.created_at ORDER BY ti.created_at) as created_dates
FROM team_info ti
WHERE ti.team_name IS NOT NULL
GROUP BY ti.club_id, ti.club_name, ti.team_name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, ti.club_name, ti.team_name;

-- ============================================================
-- SCHRITT 2: Bereinige Club-Duplikate
-- ============================================================
-- WICHTIG: Behält den ältesten Club (nach created_at) und migriert alle Teams

DO $$
DECLARE
  duplicate_record RECORD;
  keep_club_id UUID;
  delete_club_ids UUID[];
  team_record RECORD;
BEGIN
  -- Iteriere über alle Duplikate (nach normalized_name)
  FOR duplicate_record IN
    SELECT 
      ci.normalized_name,
      ARRAY_AGG(ci.id ORDER BY ci.created_at) as club_ids,
      ARRAY_AGG(ci.name ORDER BY ci.created_at) as club_names
    FROM club_info ci
    WHERE ci.normalized_name IS NOT NULL
    GROUP BY ci.normalized_name
    HAVING COUNT(*) > 1
  LOOP
    -- Behalte den ersten (ältesten) Club
    keep_club_id := duplicate_record.club_ids[1];
    delete_club_ids := duplicate_record.club_ids[2:array_length(duplicate_record.club_ids, 1)];
    
    RAISE NOTICE 'Bereinige Duplikate für: % (Behalte: %, Lösche: %)', 
      duplicate_record.normalized_name, keep_club_id, delete_club_ids;
    
    -- Migriere Teams von gelöschten Clubs zum behaltenen Club
    FOR team_record IN
      SELECT id, club_id, club_name, team_name
      FROM team_info
      WHERE club_id = ANY(delete_club_ids)
    LOOP
      -- Update Team: Setze club_id und club_name auf behaltenen Club
      UPDATE team_info
      SET 
        club_id = keep_club_id,
        club_name = (SELECT name FROM club_info WHERE id = keep_club_id)
      WHERE id = team_record.id;
      
      RAISE NOTICE '  Team migriert: % (ID: %)', team_record.team_name, team_record.id;
    END LOOP;
    
    -- Lösche Duplikat-Clubs
    DELETE FROM club_info
    WHERE id = ANY(delete_club_ids);
    
    RAISE NOTICE '  % Clubs gelöscht', array_length(delete_club_ids, 1);
  END LOOP;
  
  RAISE NOTICE '✅ Club-Duplikate bereinigt';
END $$;

-- ============================================================
-- SCHRITT 3: Bereinige Team-Duplikate
-- ============================================================
-- WICHTIG: Behält das älteste Team und migriert alle Verknüpfungen

DO $$
DECLARE
  duplicate_record RECORD;
  keep_team_id UUID;
  delete_team_ids UUID[];
BEGIN
  -- Iteriere über alle Team-Duplikate
  FOR duplicate_record IN
    SELECT 
      ti.club_id,
      ti.club_name,
      ti.team_name,
      ARRAY_AGG(ti.id ORDER BY ti.created_at) as team_ids
    FROM team_info ti
    WHERE ti.team_name IS NOT NULL
    GROUP BY ti.club_id, ti.club_name, ti.team_name
    HAVING COUNT(*) > 1
  LOOP
    -- Behalte das erste (älteste) Team
    keep_team_id := duplicate_record.team_ids[1];
    delete_team_ids := duplicate_record.team_ids[2:array_length(duplicate_record.team_ids, 1)];
    
    RAISE NOTICE 'Bereinige Team-Duplikate: % % (Behalte: %, Lösche: %)', 
      duplicate_record.club_name, duplicate_record.team_name, keep_team_id, delete_team_ids;
    
    -- Migriere matchdays (nur wenn keine Duplikate entstehen)
    -- Zuerst: Lösche match_results für Matchdays, die gelöscht werden
    DELETE FROM match_results
    WHERE matchday_id IN (
      SELECT id FROM matchdays
      WHERE home_team_id = ANY(delete_team_ids)
        AND EXISTS (
          SELECT 1
          FROM matchdays existing
          WHERE existing.home_team_id = keep_team_id
            AND existing.away_team_id = matchdays.away_team_id
            AND DATE(existing.match_date) = DATE(matchdays.match_date)
        )
    );
    
    DELETE FROM match_results
    WHERE matchday_id IN (
      SELECT id FROM matchdays
      WHERE away_team_id = ANY(delete_team_ids)
        AND EXISTS (
          SELECT 1
          FROM matchdays existing
          WHERE existing.away_team_id = keep_team_id
            AND existing.home_team_id = matchdays.home_team_id
            AND DATE(existing.match_date) = DATE(matchdays.match_date)
        )
    );
    
    -- Lösche Matchdays, die zu Duplikaten führen würden (behaltene Matchdays haben Priorität)
    DELETE FROM matchdays
    WHERE home_team_id = ANY(delete_team_ids)
      AND EXISTS (
        SELECT 1
        FROM matchdays existing
        WHERE existing.home_team_id = keep_team_id
          AND existing.away_team_id = matchdays.away_team_id
          AND DATE(existing.match_date) = DATE(matchdays.match_date)
      );
    
    DELETE FROM matchdays
    WHERE away_team_id = ANY(delete_team_ids)
      AND EXISTS (
        SELECT 1
        FROM matchdays existing
        WHERE existing.away_team_id = keep_team_id
          AND existing.home_team_id = matchdays.home_team_id
          AND DATE(existing.match_date) = DATE(matchdays.match_date)
      );
    
    -- Migriere verbleibende Matchdays (home_team_id)
    UPDATE matchdays
    SET home_team_id = keep_team_id
    WHERE home_team_id = ANY(delete_team_ids);
    
    -- Migriere verbleibende Matchdays (away_team_id)
    UPDATE matchdays
    SET away_team_id = keep_team_id
    WHERE away_team_id = ANY(delete_team_ids);
    
    -- Migriere team_seasons (nur wenn keine Duplikate entstehen)
    -- Lösche zuerst Season-Einträge, die zu Duplikaten führen würden
    DELETE FROM team_seasons
    WHERE team_id = ANY(delete_team_ids)
      AND EXISTS (
        SELECT 1
        FROM team_seasons existing
        WHERE existing.team_id = keep_team_id
          AND existing.season = team_seasons.season
          AND existing.league = team_seasons.league
          AND existing.group_name = team_seasons.group_name
      );
    
    -- Migriere verbleibende Season-Einträge
    UPDATE team_seasons
    SET team_id = keep_team_id
    WHERE team_id = ANY(delete_team_ids);
    
    -- Migriere team_memberships (nur wenn keine Duplikate entstehen)
    -- Lösche zuerst Mitgliedschaften, die zu Duplikaten führen würden
    DELETE FROM team_memberships
    WHERE team_id = ANY(delete_team_ids)
      AND EXISTS (
        SELECT 1
        FROM team_memberships existing
        WHERE existing.player_id = team_memberships.player_id
          AND existing.team_id = keep_team_id
          AND existing.season = team_memberships.season
      );
    
    -- Migriere verbleibende Mitgliedschaften
    UPDATE team_memberships
    SET team_id = keep_team_id
    WHERE team_id = ANY(delete_team_ids);
    
    -- Migriere primary_team_id in players_unified
    -- Wenn ein Spieler primary_team_id auf ein gelöschtes Team hat, setze es auf das behaltene Team
    UPDATE players_unified
    SET primary_team_id = keep_team_id
    WHERE primary_team_id = ANY(delete_team_ids);
    
    -- Migriere match_results (falls team_id vorhanden)
    -- Note: match_results hat normalerweise keine team_id, aber für Vollständigkeit
    -- UPDATE match_results SET team_id = keep_team_id WHERE team_id = ANY(delete_team_ids);
    
    -- Lösche Duplikat-Teams
    DELETE FROM team_info
    WHERE id = ANY(delete_team_ids);
    
    RAISE NOTICE '  % Teams gelöscht', array_length(delete_team_ids, 1);
  END LOOP;
  
  RAISE NOTICE '✅ Team-Duplikate bereinigt';
END $$;

-- ============================================================
-- SCHRITT 4: Finale Prüfung
-- ============================================================

-- Prüfe ob noch Duplikate vorhanden sind
SELECT 
  '=== VERBLEIBENDE CLUB-DUPLIKATE ===' as info,
  COUNT(*) as remaining_duplicates
FROM (
  SELECT normalized_name
  FROM club_info
  WHERE normalized_name IS NOT NULL
  GROUP BY normalized_name
  HAVING COUNT(*) > 1
) duplicates;

SELECT 
  '=== VERBLEIBENDE TEAM-DUPLIKATE ===' as info,
  COUNT(*) as remaining_duplicates
FROM (
  SELECT club_id, club_name, team_name
  FROM team_info
  WHERE team_name IS NOT NULL
  GROUP BY club_id, club_name, team_name
  HAVING COUNT(*) > 1
) duplicates;

-- Zusammenfassung
SELECT 
  '=== ZUSAMMENFASSUNG ===' as info,
  (SELECT COUNT(*) FROM club_info) as total_clubs,
  (SELECT COUNT(*) FROM team_info) as total_teams,
  (SELECT COUNT(*) FROM matchdays) as total_matchdays,
  (SELECT COUNT(*) FROM team_seasons) as total_team_seasons,
  (SELECT COUNT(*) FROM team_memberships) as total_team_memberships;


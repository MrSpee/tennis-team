-- ============================================
-- Cleanup-Script: Entfernen von doppelten team_memberships
-- ============================================
-- Dieses Script entfernt Duplikat-memberships, bei denen ein Spieler
-- für dasselbe Team sowohl mit season = null als auch mit season = "Winter 2025/26" gelistet ist.
-- Die Version mit season wird behalten, die mit season = null wird gelöscht.

DO $$
DECLARE
  duplicate_record RECORD;
  deleted_count INTEGER;
  total_deleted INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Bereinige doppelte team_memberships...';
  RAISE NOTICE '========================================';
  
  -- Finde alle Duplikate: Spieler mit mehreren memberships für dasselbe Team
  FOR duplicate_record IN 
    SELECT 
      tm1.player_id,
      pu.name as player_name,
      tm1.team_id,
      ti.team_name,
      ti.category,
      tm1.id as membership_with_season_id,
      tm1.season as membership_with_season,
      tm2.id as membership_without_season_id
    FROM team_memberships tm1
    JOIN team_memberships tm2 ON (
      tm1.player_id = tm2.player_id
      AND tm1.team_id = tm2.team_id
      AND tm1.id != tm2.id
      AND tm1.season IS NOT NULL
      AND tm2.season IS NULL
      AND tm1.is_active = true
      AND tm2.is_active = true
    )
    JOIN players_unified pu ON tm1.player_id = pu.id
    JOIN team_info ti ON tm1.team_id = ti.id
    ORDER BY pu.name, ti.team_name
  LOOP
    -- Lösche die membership mit season = null
    DELETE FROM team_memberships
    WHERE id = duplicate_record.membership_without_season_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    
    IF deleted_count > 0 THEN
      RAISE NOTICE 'Gelöscht: % - Team: % % (season: null)', 
        duplicate_record.player_name, 
        duplicate_record.category, 
        duplicate_record.team_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Cleanup abgeschlossen!';
  RAISE NOTICE 'Gesamt gelöscht: % Duplikat-memberships', total_deleted;
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- VERIFIKATION: Prüfe ob noch Duplikate existieren
-- ============================================
SELECT 
  COUNT(*) as remaining_duplicate_memberships
FROM team_memberships tm1
JOIN team_memberships tm2 ON (
  tm1.player_id = tm2.player_id
  AND tm1.team_id = tm2.team_id
  AND tm1.id != tm2.id
  AND tm1.season IS NOT NULL
  AND tm2.season IS NULL
  AND tm1.is_active = true
  AND tm2.is_active = true
);


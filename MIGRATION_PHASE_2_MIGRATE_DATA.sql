-- ============================================
-- MIGRATION_PHASE_2_MIGRATE_DATA.sql
-- Phase 2: Daten von club_name zu club_id migrieren
-- ============================================

DO $$
DECLARE
  team_record RECORD;
  matching_club_id UUID;
  teams_migrated INTEGER := 0;
  clubs_created INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🚀 MIGRATION PHASE 2: Daten-Migration';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  
  -- Iteriere über alle Teams ohne club_id
  FOR team_record IN 
    SELECT * FROM team_info WHERE club_id IS NULL 
  LOOP
    RAISE NOTICE '🔍 Verarbeite: % - %', team_record.club_name, team_record.team_name;
    
    -- Suche passenden Club in club_info (zuerst normalized_name, dann name)
    SELECT id INTO matching_club_id 
    FROM club_info 
    WHERE 
      normalized_name = LOWER(REPLACE(REPLACE(REPLACE(team_record.club_name, ' ', ''), '.', ''), '-', ''))
      OR LOWER(name) = LOWER(team_record.club_name)
    LIMIT 1;
    
    -- Falls Club nicht gefunden, erstelle ihn
    IF matching_club_id IS NULL THEN
      RAISE NOTICE '   ➕ Erstelle neuen Club: %', team_record.club_name;
      
      -- Erstelle Club mit allen verfügbaren Feldern
      INSERT INTO club_info (
        name,
        normalized_name,
        region,
        city,
        website,
        is_verified,
        verification_date,
        federation,
        state,
        data_source
      ) VALUES (
        team_record.club_name,
        -- Normalisierter Name (lowercase, keine Leerzeichen)
        LOWER(REPLACE(REPLACE(REPLACE(team_record.club_name, ' ', ''), '.', ''), '-', '')),
        team_record.region,
        -- Extrahiere Stadt aus Region falls möglich
        CASE 
          WHEN team_record.region LIKE '%Köln%' THEN 'Köln'
          WHEN team_record.region LIKE '%Bonn%' THEN 'Bonn'
          WHEN team_record.region LIKE '%Düsseldorf%' THEN 'Düsseldorf'
          WHEN team_record.region LIKE '%Aachen%' THEN 'Aachen'
          ELSE NULL
        END,
        team_record.tvm_link,
        true,  -- Auto-verifiziert (bestehende Daten)
        NOW(),
        'TVM',  -- Federation
        'NRW',  -- State (Default für Mittelrhein)
        'migration'  -- Data source
      )
      RETURNING id INTO matching_club_id;
      
      clubs_created := clubs_created + 1;
      RAISE NOTICE '   ✅ Club erstellt mit ID: %', matching_club_id;
    ELSE
      RAISE NOTICE '   ✓ Club gefunden: %', matching_club_id;
    END IF;
    
    -- Setze club_id für das Team
    UPDATE team_info 
    SET club_id = matching_club_id,
        updated_at = NOW()
    WHERE id = team_record.id;
    
    teams_migrated := teams_migrated + 1;
    RAISE NOTICE '   ✅ Team migriert';
    RAISE NOTICE '';
  END LOOP;
  
  -- Zusammenfassung
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 MIGRATIONS-ZUSAMMENFASSUNG:';
  RAISE NOTICE '   Neue Clubs erstellt: %', clubs_created;
  RAISE NOTICE '   Teams migriert: %', teams_migrated;
  RAISE NOTICE '';
  
  -- Verifizierung
  DECLARE
    teams_without_club_id INTEGER;
  BEGIN
    SELECT COUNT(*) INTO teams_without_club_id FROM team_info WHERE club_id IS NULL;
    
    IF teams_without_club_id = 0 THEN
      RAISE NOTICE '✅ Alle Teams erfolgreich migriert!';
      RAISE NOTICE '➡️  Nächster Schritt: MIGRATION_PHASE_3_CREATE_VIEWS.sql';
    ELSE
      RAISE NOTICE '⚠️  ACHTUNG: % Teams noch ohne club_id!', teams_without_club_id;
      RAISE NOTICE '   Bitte manuell überprüfen.';
    END IF;
  END;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- Überprüfung: Zeige alle Teams mit ihren Clubs
SELECT 
  t.id as team_id,
  t.team_name,
  t.club_name as old_club_name,
  c.id as club_id,
  c.name as new_club_name,
  c.website,
  CASE 
    WHEN t.club_id IS NULL THEN '❌ FEHLT'
    WHEN LOWER(t.club_name) = LOWER(c.name) THEN '✅ MATCH'
    ELSE '⚠️ UNTERSCHIED'
  END as status
FROM team_info t
LEFT JOIN club_info c ON t.club_id = c.id
ORDER BY status DESC, c.name, t.team_name;

-- Zeige Clubs mit Anzahl Teams
SELECT 
  c.name as club_name,
  c.normalized_name,
  c.city,
  c.region,
  COUNT(t.id) as team_count,
  c.is_verified,
  c.data_source
FROM club_info c
LEFT JOIN team_info t ON t.club_id = c.id
GROUP BY c.id, c.name, c.normalized_name, c.city, c.region, c.is_verified, c.data_source
ORDER BY team_count DESC, c.name;


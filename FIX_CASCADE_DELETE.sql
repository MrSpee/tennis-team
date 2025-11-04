-- Fix: Cascade Delete für Foreign Keys
-- =====================================
-- Ermöglicht das Löschen von Teams und Clubs, auch wenn sie von anderen Tabellen referenziert werden

-- WICHTIG: Vor dem Ausführen prüfen, welche Zeilen gelöscht werden sollen!

DO $$
DECLARE
  v_constraint_exists BOOLEAN;
BEGIN
  -- 1. Finde alle Foreign Key Constraints für team_memberships
  RAISE NOTICE '🔍 Prüfe Foreign Key Constraints...';
  
  -- 2. Entferne alte Constraints (falls existierend)
  RAISE NOTICE '🗑️ Entferne alte Constraints...';
  
  ALTER TABLE IF EXISTS team_memberships 
    DROP CONSTRAINT IF EXISTS team_memberships_team_id_fkey CASCADE;
  
  -- 3. Erstelle neue Constraints mit CASCADE DELETE
  RAISE NOTICE '✅ Erstelle neue Constraints mit CASCADE DELETE...';
  
  ALTER TABLE team_memberships
    ADD CONSTRAINT team_memberships_team_id_fkey
    FOREIGN KEY (team_id)
    REFERENCES team_info(id)
    ON DELETE CASCADE; -- Wenn Team gelöscht wird, werden alle Memberships gelöscht
  
  RAISE NOTICE '✅ CASCADE DELETE für team_memberships_team_id_fkey erfolgreich konfiguriert';
  
  -- 4. Optional: Auch für andere relevante Foreign Keys
  -- Prüfe ob team_info.club_id existiert
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'team_info' AND column_name = 'club_id'
  ) THEN
    ALTER TABLE IF EXISTS team_info
      DROP CONSTRAINT IF EXISTS team_info_club_id_fkey CASCADE;
    
    ALTER TABLE team_info
      ADD CONSTRAINT team_info_club_id_fkey
      FOREIGN KEY (club_id)
      REFERENCES club_info(id)
      ON DELETE CASCADE; -- Wenn Club gelöscht wird, werden alle Teams gelöscht
    
    RAISE NOTICE '✅ CASCADE DELETE für team_info_club_id_fkey erfolgreich konfiguriert';
  END IF;
  
  -- 5. Prüfe ob matches existiert
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matches') THEN
    ALTER TABLE IF EXISTS matches
      DROP CONSTRAINT IF EXISTS matches_team_id_fkey CASCADE;
    
    ALTER TABLE matches
      ADD CONSTRAINT matches_team_id_fkey
      FOREIGN KEY (team_id)
      REFERENCES team_info(id)
      ON DELETE CASCADE; -- Wenn Team gelöscht wird, werden alle Matches gelöscht
    
    RAISE NOTICE '✅ CASCADE DELETE für matches_team_id_fkey erfolgreich konfiguriert';
  END IF;
  
  RAISE NOTICE '✅ Alle CASCADE DELETE Constraints erfolgreich konfiguriert!';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Fehler: %', SQLERRM;
END $$;

-- 6. Zeige alle relevanten Foreign Keys
SELECT 
  tc.table_name,
  tc.constraint_name,
  rc.delete_rule,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
  AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('team_memberships', 'team_info', 'matches')
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;






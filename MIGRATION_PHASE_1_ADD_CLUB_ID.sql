-- ============================================
-- MIGRATION_PHASE_1_ADD_CLUB_ID.sql
-- Phase 1: Schema erweitern (Rückwärts-kompatibel)
-- ============================================

-- 🔍 Überprüfe aktuellen Zustand
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🚀 MIGRATION PHASE 1: Schema-Erweiterung';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  
  -- Prüfe ob club_id bereits existiert
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'team_info' AND column_name = 'club_id'
  ) THEN
    RAISE NOTICE '⚠️  club_id Spalte existiert bereits - überspringe Erstellung';
  ELSE
    RAISE NOTICE '✅ club_id Spalte wird erstellt';
  END IF;
END $$;

-- 1️⃣ Füge club_id Spalte zu team_info hinzu (nullable für Migration)
ALTER TABLE team_info 
ADD COLUMN IF NOT EXISTS club_id UUID;

-- 2️⃣ Erstelle Index für bessere Performance
CREATE INDEX IF NOT EXISTS idx_team_info_club_id 
ON team_info(club_id);

-- 3️⃣ Füge Foreign Key Constraint hinzu (DEFERRABLE für Migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_team_club'
  ) THEN
    ALTER TABLE team_info 
    ADD CONSTRAINT fk_team_club 
      FOREIGN KEY (club_id) 
      REFERENCES club_info(id) 
      ON DELETE CASCADE 
      ON UPDATE CASCADE
      DEFERRABLE INITIALLY DEFERRED;
    
    RAISE NOTICE '✅ Foreign Key Constraint erstellt';
  ELSE
    RAISE NOTICE '⚠️  Foreign Key Constraint existiert bereits';
  END IF;
END $$;

-- 4️⃣ Füge UNIQUE Constraint zu club_info.name hinzu
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'club_info_name_unique'
  ) THEN
    ALTER TABLE club_info 
    ADD CONSTRAINT club_info_name_unique UNIQUE (name);
    
    RAISE NOTICE '✅ UNIQUE Constraint auf club_info.name erstellt';
  ELSE
    RAISE NOTICE '⚠️  UNIQUE Constraint auf club_info.name existiert bereits';
  END IF;
END $$;

-- 5️⃣ Zeige aktuellen Status
DO $$
DECLARE
  total_teams INTEGER;
  teams_with_club_id INTEGER;
  teams_without_club_id INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_teams FROM team_info;
  SELECT COUNT(*) INTO teams_with_club_id FROM team_info WHERE club_id IS NOT NULL;
  SELECT COUNT(*) INTO teams_without_club_id FROM team_info WHERE club_id IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 AKTUELLER STATUS:';
  RAISE NOTICE '   Teams gesamt: %', total_teams;
  RAISE NOTICE '   Teams mit club_id: %', teams_with_club_id;
  RAISE NOTICE '   Teams ohne club_id: % ← Diese werden migriert', teams_without_club_id;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Phase 1 abgeschlossen!';
  RAISE NOTICE '➡️  Nächster Schritt: MIGRATION_PHASE_2_MIGRATE_DATA.sql';
  RAISE NOTICE '';
END $$;

-- Zeige alle Teams ohne club_id
SELECT 
  id,
  club_name,
  team_name,
  category,
  region
FROM team_info
WHERE club_id IS NULL
ORDER BY club_name, team_name;


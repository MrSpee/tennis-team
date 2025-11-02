-- =====================================================
-- Add Theo Tester to VKC Köln Herren 55
-- Description: Fügt Theo Tester zum Team Herren 55 hinzu
-- Date: 2025-11-02
-- =====================================================

-- ========================================
-- SCHRITT 1: Finde Theo Tester
-- ========================================

SELECT 
  id,
  name,
  email,
  current_lk
FROM players_unified
WHERE LOWER(name) LIKE '%theo%tester%'
OR email LIKE '%theo%';

-- ========================================
-- SCHRITT 2: Finde VKC Köln Herren 55 Team
-- ========================================

SELECT 
  id,
  club_name,
  team_name,
  category
FROM team_info
WHERE club_name ILIKE '%VKC%'
AND category ILIKE '%Herren 55%';

-- ========================================
-- SCHRITT 3: Füge Theo zum Team hinzu
-- ========================================

-- Variables
DO $$
DECLARE
  v_theo_id UUID;
  v_team_id UUID;
  v_existing_membership UUID;
  rec RECORD;  -- ✅ FIX: Variable für FOR-Loop deklarieren
BEGIN
  -- Hole Theo's ID
  SELECT id INTO v_theo_id
  FROM players_unified
  WHERE LOWER(name) LIKE '%theo%tester%'
  LIMIT 1;
  
  IF v_theo_id IS NULL THEN
    RAISE EXCEPTION 'Theo Tester nicht gefunden! Bitte zuerst Spieler erstellen.';
  END IF;
  
  -- Hole Team ID
  SELECT id INTO v_team_id
  FROM team_info
  WHERE club_name ILIKE '%VKC%'
  AND category ILIKE '%Herren 55%'
  LIMIT 1;
  
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'VKC Herren 55 Team nicht gefunden! Bitte zuerst Team erstellen.';
  END IF;
  
  -- Prüfe ob bereits Member
  SELECT id INTO v_existing_membership
  FROM team_memberships
  WHERE player_id = v_theo_id
  AND team_id = v_team_id
  AND is_active = true;
  
  IF v_existing_membership IS NOT NULL THEN
    RAISE NOTICE 'Theo Tester ist bereits im Team Herren 55!';
  ELSE
    -- Füge hinzu
    INSERT INTO team_memberships (
      player_id,
      team_id,
      role,
      is_primary,
      is_active
    )
    VALUES (
      v_theo_id,
      v_team_id,
      'player',  -- Rolle: Spieler (nicht Captain)
      false,     -- Nicht Primary Team
      true       -- Aktiv
    );
    
    RAISE NOTICE '✅ Theo Tester wurde zum Team Herren 55 hinzugefügt!';
  END IF;
  
  -- Zeige finale Mitgliedschaft
  RAISE NOTICE '';
  RAISE NOTICE '📋 Team-Mitglieder:';
  FOR rec IN (
    SELECT 
      p.name,
      p.current_lk,
      tm.role,
      tm.is_primary
    FROM team_memberships tm
    JOIN players_unified p ON p.id = tm.player_id
    WHERE tm.team_id = v_team_id
    AND tm.is_active = true
    ORDER BY 
      CASE WHEN tm.role = 'captain' THEN 0 ELSE 1 END,
      p.name
  ) LOOP
    RAISE NOTICE '  % % (LK: %) - %', 
      CASE WHEN rec.role = 'captain' THEN '👑' ELSE '🎾' END,
      rec.name,
      COALESCE(rec.current_lk, '-'),
      CASE WHEN rec.is_primary THEN 'Hauptteam' ELSE 'Nebenteam' END;
  END LOOP;
  
END $$;

-- ========================================
-- ALTERNATIVE: Direktes INSERT (wenn IDs bekannt)
-- ========================================

/*
INSERT INTO team_memberships (
  player_id,
  team_id,
  role,
  is_primary,
  is_active
)
VALUES (
  'THEO_PLAYER_ID_HIER',   -- Ersetze mit echter ID
  'TEAM_ID_HIER',          -- Ersetze mit echter ID
  'player',
  false,
  true
)
ON CONFLICT (player_id, team_id) 
DO UPDATE SET 
  is_active = true,
  updated_at = NOW();
*/

-- ========================================
-- VERIFICATION
-- ========================================

-- Zeige alle Mitglieder von VKC Herren 55
SELECT 
  p.name,
  p.email,
  p.current_lk,
  tm.role,
  tm.is_primary,
  tm.is_active,
  tm.created_at
FROM team_memberships tm
JOIN players_unified p ON p.id = tm.player_id
JOIN team_info t ON t.id = tm.team_id
WHERE t.club_name ILIKE '%VKC%'
AND t.category ILIKE '%Herren 55%'
AND tm.is_active = true
ORDER BY 
  CASE WHEN tm.role = 'captain' THEN 0 ELSE 1 END,
  p.name;


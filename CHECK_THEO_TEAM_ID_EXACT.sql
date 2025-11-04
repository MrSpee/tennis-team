-- =====================================================
-- CHECK: Theo's exakte Team-IDs vs Match Team-IDs
-- =====================================================

-- VKC Herren 55 Team ID (aus Matches):
-- '235fade5-0974-4f5b-a758-536f771a5e80'

-- ========================================
-- SCHRITT 1: Welche Team-IDs hat Theo?
-- ========================================

SELECT 
  '1️⃣ Theo Team IDs' as step,
  tm.team_id,
  t.club_name,
  t.category,
  tm.is_active,
  -- Prüfe ob es die VKC Herren 55 ID ist
  CASE 
    WHEN tm.team_id = '235fade5-0974-4f5b-a758-536f771a5e80' 
    THEN '✅ DIES IST VKC HERREN 55!'
    ELSE 'Anderes Team'
  END as is_herren_55
FROM team_memberships tm
JOIN team_info t ON t.id = tm.team_id
JOIN players_unified p ON p.id = tm.player_id
WHERE LOWER(p.name) LIKE '%theo%tester%'
AND tm.is_active = true
ORDER BY t.category;

-- ========================================
-- SCHRITT 2: Welches Team ist 235fade5...?
-- ========================================

SELECT 
  '2️⃣ Team 235fade5... Details' as step,
  id,
  club_name,
  team_name,
  category
FROM team_info
WHERE id = '235fade5-0974-4f5b-a758-536f771a5e80';

-- ========================================
-- SCHRITT 3: Ist Theo in diesem Team?
-- ========================================

SELECT 
  '3️⃣ Team-Membership Check' as step,
  EXISTS (
    SELECT 1 
    FROM team_memberships tm
    JOIN players_unified p ON p.id = tm.player_id
    WHERE LOWER(p.name) LIKE '%theo%tester%'
    AND tm.team_id = '235fade5-0974-4f5b-a758-536f771a5e80'
    AND tm.is_active = true
  ) as theo_is_in_team;

-- ========================================
-- SCHRITT 4: Alle VKC Teams mit IDs
-- ========================================

SELECT 
  '4️⃣ Alle VKC Teams' as step,
  id,
  club_name,
  team_name,
  category,
  -- Matches für dieses Team
  (SELECT COUNT(*) FROM matchdays m 
   WHERE m.home_team_id = team_info.id 
      OR m.away_team_id = team_info.id) as match_count
FROM team_info
WHERE club_name ILIKE '%VKC%'
ORDER BY category;

-- ========================================
-- DIAGNOSE & FIX
-- ========================================

DO $$
DECLARE
  v_theo_id UUID;
  v_target_team_id UUID := '235fade5-0974-4f5b-a758-536f771a5e80';
  v_is_member BOOLEAN;
  v_team_name TEXT;
BEGIN
  -- Hole Theo ID
  SELECT id INTO v_theo_id
  FROM players_unified
  WHERE LOWER(name) LIKE '%theo%tester%'
  LIMIT 1;
  
  -- Hole Team Info
  SELECT club_name || ' ' || category INTO v_team_name
  FROM team_info
  WHERE id = v_target_team_id;
  
  -- Prüfe Membership
  SELECT EXISTS (
    SELECT 1 FROM team_memberships
    WHERE player_id = v_theo_id
    AND team_id = v_target_team_id
    AND is_active = true
  ) INTO v_is_member;
  
  RAISE NOTICE '===========================================';
  RAISE NOTICE '🎯 EXAKTE TEAM-ID PRÜFUNG';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Target Team: %', v_team_name;
  RAISE NOTICE 'Target Team ID: %', v_target_team_id;
  RAISE NOTICE 'Theo Player ID: %', v_theo_id;
  RAISE NOTICE '';
  
  IF v_is_member THEN
    RAISE NOTICE '✅ Theo IST in diesem Team';
    RAISE NOTICE '';
    RAISE NOTICE '💡 PROBLEM liegt woanders:';
    RAISE NOTICE '   - Frontend Cache?';
    RAISE NOTICE '   - DataContext lädt nicht neu?';
    RAISE NOTICE '   - Browser Refresh gemacht?';
  ELSE
    RAISE NOTICE '❌ Theo ist NICHT in diesem Team!';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Füge Theo hinzu...';
    
    -- Füge hinzu
    INSERT INTO team_memberships (
      player_id,
      team_id,
      is_active,
      is_primary,
      role
    )
    VALUES (
      v_theo_id,
      v_target_team_id,
      true,
      false,  -- Nicht Primary
      'player'
    )
    ON CONFLICT (player_id, team_id) 
    DO UPDATE SET 
      is_active = true,
      updated_at = NOW();
    
    RAISE NOTICE '✅ Theo wurde zum Team hinzugefügt!';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 NÄCHSTER SCHRITT:';
    RAISE NOTICE '   1. Browser Refresh (F5)';
    RAISE NOTICE '   2. Oder neu einloggen';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  
END $$;



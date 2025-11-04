-- ============================================
-- DEBUG: ROBERTS TEAM-ZUORDNUNGEN
-- ============================================
-- Prüfe welchen Teams Robert zugeordnet ist
-- ============================================

-- ====================================
-- 1️⃣ FINDE ROBERT (Chris Spee)
-- ====================================

SELECT 
  '1️⃣ ROBERT/CHRIS' as step,
  id,
  user_id,
  name,
  email,
  current_lk,
  status
FROM players_unified
WHERE name ILIKE '%Chris%Spee%'
   OR email ILIKE '%christianspee%'
   OR name ILIKE '%Robert%'
ORDER BY created_at;

-- ====================================
-- 2️⃣ ALLE TEAM MEMBERSHIPS VON CHRIS
-- ====================================

SELECT 
  '2️⃣ TEAM MEMBERSHIPS' as step,
  tm.id as membership_id,
  tm.player_id,
  tm.team_id,
  tm.is_active,
  tm.is_primary,
  tm.season,
  ti.team_name,
  ti.club_name,
  ti.category,
  ti.region,
  tm.created_at
FROM team_memberships tm
LEFT JOIN team_info ti ON ti.id = tm.team_id
WHERE tm.player_id IN (
  SELECT id FROM players_unified 
  WHERE name ILIKE '%Chris%Spee%' 
     OR email ILIKE '%christianspee%'
)
ORDER BY tm.is_primary DESC, tm.created_at DESC;

-- ====================================
-- 3️⃣ TEAM INFO DETAILS
-- ====================================

SELECT 
  '3️⃣ TEAM INFO DETAILS' as step,
  ti.id,
  ti.team_name,
  ti.club_name,
  ti.category,
  ti.region,
  ti.tvm_link,
  ti.created_at,
  (SELECT COUNT(*) FROM team_memberships tm WHERE tm.team_id = ti.id AND tm.is_active = true) as active_members
FROM team_info ti
WHERE ti.id IN (
  SELECT tm.team_id 
  FROM team_memberships tm
  WHERE tm.player_id IN (
    SELECT id FROM players_unified 
    WHERE name ILIKE '%Chris%Spee%' 
       OR email ILIKE '%christianspee%'
  )
  AND tm.is_active = true
)
ORDER BY ti.club_name, ti.category;

-- ====================================
-- 4️⃣ TEAM SEASONS FÜR CHRIS' TEAMS
-- ====================================

SELECT 
  '4️⃣ TEAM SEASONS' as step,
  ts.id,
  ts.team_id,
  ts.season,
  ts.league,
  ts.group_name,
  ts.team_size,
  ts.is_active,
  ti.team_name,
  ti.club_name,
  ti.category
FROM team_seasons ts
JOIN team_info ti ON ti.id = ts.team_id
WHERE ts.team_id IN (
  SELECT tm.team_id 
  FROM team_memberships tm
  WHERE tm.player_id IN (
    SELECT id FROM players_unified 
    WHERE name ILIKE '%Chris%Spee%' 
       OR email ILIKE '%christianspee%'
  )
  AND tm.is_active = true
)
  AND ts.is_active = true
ORDER BY ti.club_name, ti.category;

-- ====================================
-- 5️⃣ PROBLEM-DIAGNOSE: Teams ohne Namen?
-- ====================================

SELECT 
  '5️⃣ PROBLEM: TEAMS OHNE CLUB_NAME' as step,
  ti.id,
  ti.team_name,
  ti.club_name,
  ti.category,
  CASE 
    WHEN ti.club_name IS NULL OR ti.club_name = '' THEN '❌ KEIN CLUB NAME!'
    WHEN ti.team_name IS NULL OR ti.team_name = '' THEN '⚠️ KEIN TEAM NAME'
    ELSE '✅ OK'
  END as status
FROM team_info ti
WHERE ti.id IN (
  SELECT tm.team_id 
  FROM team_memberships tm
  WHERE tm.player_id IN (
    SELECT id FROM players_unified 
    WHERE name ILIKE '%Chris%Spee%' 
       OR email ILIKE '%christianspee%'
  )
  AND tm.is_active = true
);

-- ====================================
-- 6️⃣ ALLE VEREINE IN DER DB
-- ====================================

SELECT 
  '6️⃣ ALLE VEREINE (unique club_names)' as step,
  club_name,
  COUNT(*) as team_count
FROM team_info
WHERE club_name IS NOT NULL AND club_name != ''
GROUP BY club_name
ORDER BY club_name;


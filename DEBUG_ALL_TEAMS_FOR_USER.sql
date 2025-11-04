-- ============================================
-- DEBUG: ALLE TEAMS FÜR EINGELOGGTEN USER
-- ============================================
-- Findet das "Unbekannt" Team
-- ============================================

-- ====================================
-- 1️⃣ ALLE TEAM_MEMBERSHIPS FÜR USER
-- ====================================

-- Nutze die user_id aus dem Login
SELECT 
  '1️⃣ ALLE MEMBERSHIPS FÜR USER bb04dcc9...' as step,
  tm.id as membership_id,
  tm.player_id,
  tm.team_id,
  tm.is_active,
  tm.is_primary,
  tm.season,
  ti.id as team_info_id,
  ti.team_name,
  ti.club_name,
  ti.category,
  ti.region,
  p.name as player_name,
  p.email as player_email
FROM team_memberships tm
JOIN players_unified p ON p.id = tm.player_id
LEFT JOIN team_info ti ON ti.id = tm.team_id
WHERE p.user_id = 'bb04dcc9-1e1d-4e3a-9f1b-ca324f643784'  -- Chris Spee user_id
ORDER BY tm.is_primary DESC, tm.created_at DESC;

-- ====================================
-- 2️⃣ TEAMS OHNE CATEGORY
-- ====================================

SELECT 
  '2️⃣ TEAMS OHNE CATEGORY' as step,
  ti.id,
  ti.team_name,
  ti.club_name,
  ti.category,
  ti.region,
  CASE 
    WHEN ti.category IS NULL OR ti.category = '' THEN '❌ KEIN CATEGORY!'
    ELSE '✅ OK'
  END as category_status,
  CASE 
    WHEN ti.club_name IS NULL OR ti.club_name = '' THEN '❌ KEIN CLUB NAME!'
    ELSE '✅ OK'
  END as club_status
FROM team_info ti
WHERE ti.id IN (
  SELECT tm.team_id 
  FROM team_memberships tm
  JOIN players_unified p ON p.id = tm.player_id
  WHERE p.user_id = 'bb04dcc9-1e1d-4e3a-9f1b-ca324f643784'
    AND tm.is_active = true
)
ORDER BY ti.created_at;

-- ====================================
-- 3️⃣ TEAM_INFO DIREKT ABFRAGEN
-- ====================================

SELECT 
  '3️⃣ TEAM_INFO VOLLSTÄNDIG' as step,
  ti.*
FROM team_info ti
WHERE ti.id IN (
  SELECT tm.team_id 
  FROM team_memberships tm
  JOIN players_unified p ON p.id = tm.player_id
  WHERE p.user_id = 'bb04dcc9-1e1d-4e3a-9f1b-ca324f643784'
    AND tm.is_active = true
);



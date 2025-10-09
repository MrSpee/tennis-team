-- DEBUG_ROLAND_MATCHES.sql
-- Prüfe warum Roland keine Matches sieht
-- ============================================

-- 1. Finde Roland in der Datenbank
SELECT 
  'STEP 1: Roland finden' as debug_step,
  p.id as player_id,
  p.user_id,
  p.name,
  p.email,
  p.is_active
FROM players p
WHERE p.name ILIKE '%roland%' OR p.email ILIKE '%roland%'
ORDER BY p.created_at DESC;

-- 2. Zeige Rolands Teams
SELECT 
  'STEP 2: Rolands Teams' as debug_step,
  p.name as player_name,
  pt.team_id,
  pt.is_primary,
  pt.role,
  t.team_name,
  t.club_name,
  t.category,
  t.club_id,
  c.name as club_info_name
FROM players p
INNER JOIN player_teams pt ON p.id = pt.player_id
INNER JOIN team_info t ON pt.team_id = t.id
LEFT JOIN club_info c ON t.club_id = c.id
WHERE p.name ILIKE '%roland%' OR p.email ILIKE '%roland%'
ORDER BY pt.is_primary DESC;

-- 3. Zeige ALLE Matches für Rolands Teams
SELECT 
  'STEP 3: Matches für Rolands Teams' as debug_step,
  m.id as match_id,
  m.opponent,
  m.match_date,
  m.location,
  m.venue,
  m.season,
  m.team_id,
  t.team_name,
  t.club_name as team_club_name,
  c.name as club_info_name
FROM matches m
LEFT JOIN team_info t ON m.team_id = t.id
LEFT JOIN club_info c ON t.club_id = c.id
WHERE m.team_id IN (
  SELECT pt.team_id 
  FROM player_teams pt
  INNER JOIN players p ON pt.player_id = p.id
  WHERE p.name ILIKE '%roland%' OR p.email ILIKE '%roland%'
)
ORDER BY m.match_date DESC;

-- 4. Zeige ALLE Matches im System (zum Vergleich)
SELECT 
  'STEP 4: ALLE Matches im System' as debug_step,
  m.id as match_id,
  m.opponent,
  m.match_date,
  m.team_id,
  t.team_name,
  t.club_name as team_club_name,
  c.name as club_info_name,
  CASE 
    WHEN m.team_id IN (
      SELECT pt.team_id 
      FROM player_teams pt
      INNER JOIN players p ON pt.player_id = p.id
      WHERE p.name ILIKE '%roland%' OR p.email ILIKE '%roland%'
    ) THEN '✅ SICHTBAR für Roland'
    ELSE '❌ NICHT SICHTBAR für Roland'
  END as sichtbarkeit
FROM matches m
LEFT JOIN team_info t ON m.team_id = t.id
LEFT JOIN club_info c ON t.club_id = c.id
ORDER BY m.match_date DESC;

-- 5. Prüfe ob team_id korrekt gesetzt ist
SELECT 
  'STEP 5: Matches nach team_id gruppiert' as debug_step,
  COALESCE(t.team_name, 'NULL/Unbekannt') as team_name,
  COALESCE(t.club_name, 'NULL/Unbekannt') as club_name,
  m.team_id,
  COUNT(*) as anzahl_matches,
  STRING_AGG(m.opponent, ', ' ORDER BY m.match_date) as gegner
FROM matches m
LEFT JOIN team_info t ON m.team_id = t.id
GROUP BY t.team_name, t.club_name, m.team_id
ORDER BY COUNT(*) DESC;

-- 6. Prüfe Rodenkirchener TC spezifisch
SELECT 
  'STEP 6: Rodenkirchener TC Matches' as debug_step,
  m.id,
  m.opponent,
  m.match_date,
  m.team_id,
  t.team_name,
  t.club_name,
  t.club_id,
  c.name as club_info_name
FROM matches m
INNER JOIN team_info t ON m.team_id = t.id
LEFT JOIN club_info c ON t.club_id = c.id
WHERE t.club_name ILIKE '%rodenkirchen%' 
   OR c.name ILIKE '%rodenkirchen%'
ORDER BY m.match_date DESC;

-- 7. Vergleiche player_teams.team_id mit matches.team_id
SELECT 
  'STEP 7: Team-ID Vergleich' as debug_step,
  p.name as player_name,
  pt.team_id as player_team_id,
  t.team_name as player_team_name,
  COUNT(DISTINCT m.id) as anzahl_matches_mit_dieser_team_id
FROM players p
INNER JOIN player_teams pt ON p.id = pt.player_id
INNER JOIN team_info t ON pt.team_id = t.id
LEFT JOIN matches m ON m.team_id = pt.team_id
WHERE p.name ILIKE '%roland%' OR p.email ILIKE '%roland%'
GROUP BY p.name, pt.team_id, t.team_name;

-- 8. Finde Roland's genaue User-ID und Player-ID
SELECT 
  'STEP 8: Roland IDs' as debug_step,
  p.id as player_id,
  p.user_id,
  p.name,
  p.email,
  au.email as auth_email,
  au.created_at as auth_created_at
FROM players p
LEFT JOIN auth.users au ON p.user_id = au.id
WHERE p.name ILIKE '%roland%' OR p.email ILIKE '%roland%';


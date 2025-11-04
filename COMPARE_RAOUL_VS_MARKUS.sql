-- COMPARE_RAOUL_VS_MARKUS.sql
-- Vergleicht Raoul (konsti60313@gmail.com) und Markus (markus@domrauschen.com)
-- Raoul sieht Spiele ✅, Markus nicht ❌
-- ==========================================

-- ==========================================
-- SCHRITT 1: SPIELER-GRUNDDATEN VERGLEICH
-- ==========================================
SELECT 
  '1️⃣ SPIELER-GRUNDDATEN' as check_category,
  p.name,
  p.email,
  p.user_id,
  p.id as player_id,
  p.primary_team_id,
  p.is_active,
  p.player_type,
  p.status,
  p.onboarding_status,
  CASE 
    WHEN p.email = 'konsti60313@gmail.com' THEN '✅ RAOUL (funktioniert)'
    WHEN p.email = 'markus@domrauschen.com' THEN '❌ MARKUS (funktioniert NICHT)'
    ELSE 'Anderer Spieler'
  END as player_label
FROM players_unified p
WHERE p.email IN ('konsti60313@gmail.com', 'markus@domrauschen.com')
ORDER BY p.email;

-- ==========================================
-- SCHRITT 2: TEAM MEMBERSHIPS VERGLEICH
-- ==========================================
SELECT 
  '2️⃣ TEAM MEMBERSHIPS' as check_category,
  p.name,
  p.email,
  tm.id as membership_id,
  tm.team_id,
  ti.club_name,
  ti.team_name,
  ti.category,
  tm.is_active,
  tm.is_primary,
  tm.role,
  tm.season,
  tm.created_at,
  CASE 
    WHEN p.email = 'konsti60313@gmail.com' THEN '✅ RAOUL'
    WHEN p.email = 'markus@domrauschen.com' THEN '❌ MARKUS'
    ELSE 'Anderer'
  END as player_label,
  CASE 
    WHEN tm.is_active = true AND tm.is_primary = true THEN '✅ AKTIV + PRIMARY'
    WHEN tm.is_active = true THEN '✅ AKTIV'
    WHEN tm.is_active = false THEN '⚠️ INAKTIV'
    ELSE '❌ FEHLER'
  END as membership_status
FROM players_unified p
JOIN team_memberships tm ON p.id = tm.player_id
JOIN team_info ti ON tm.team_id = ti.id
WHERE p.email IN ('konsti60313@gmail.com', 'markus@domrauschen.com')
ORDER BY p.email, tm.is_active DESC, tm.is_primary DESC;

-- ==========================================
-- SCHRITT 3: PRIMARY TEAM CHECK
-- ==========================================
SELECT 
  '3️⃣ PRIMARY TEAM CHECK' as check_category,
  p.name,
  p.email,
  p.primary_team_id,
  ti.club_name,
  ti.team_name,
  ti.category,
  CASE 
    WHEN p.email = 'konsti60313@gmail.com' THEN '✅ RAOUL'
    WHEN p.email = 'markus@domrauschen.com' THEN '❌ MARKUS'
    ELSE 'Anderer'
  END as player_label,
  CASE 
    WHEN p.primary_team_id IS NULL THEN '❌ NULL'
    WHEN ti.id IS NOT NULL THEN '✅ KORREKT'
    ELSE '⚠️ primary_team_id zeigt auf nicht-existentes Team'
  END as primary_team_status
FROM players_unified p
LEFT JOIN team_info ti ON p.primary_team_id = ti.id
WHERE p.email IN ('konsti60313@gmail.com', 'markus@domrauschen.com')
ORDER BY p.email;

-- ==========================================
-- SCHRITT 4: KONSISTENZ PRIMARY TEAM vs IS_PRIMARY MEMBERSHIP
-- ==========================================
SELECT 
  '4️⃣ KONSISTENZ CHECK' as check_category,
  p.name,
  p.email,
  p.primary_team_id as "primary_team_id (players_unified)",
  tm.team_id as "team_id (is_primary membership)",
  CASE 
    WHEN p.email = 'konsti60313@gmail.com' THEN '✅ RAOUL'
    WHEN p.email = 'markus@domrauschen.com' THEN '❌ MARKUS'
    ELSE 'Anderer'
  END as player_label,
  CASE 
    WHEN p.primary_team_id = tm.team_id THEN '✅ KONSISTENT'
    WHEN p.primary_team_id IS NULL THEN '❌ primary_team_id ist NULL'
    WHEN tm.team_id IS NULL THEN '❌ Kein is_primary Membership gefunden'
    ELSE '⚠️ INKONSISTENT: primary_team_id zeigt auf anderes Team als is_primary membership'
  END as consistency_status
FROM players_unified p
LEFT JOIN team_memberships tm ON p.id = tm.player_id AND tm.is_primary = true AND tm.is_active = true
WHERE p.email IN ('konsti60313@gmail.com', 'markus@domrauschen.com')
ORDER BY p.email;

-- ==========================================
-- SCHRITT 5: MATCHES FÜR IHRE TEAMS
-- ==========================================
WITH player_teams AS (
  SELECT 
    p.name,
    p.email,
    p.primary_team_id,
    tm.team_id,
    ti.club_name,
    ti.team_name
  FROM players_unified p
  LEFT JOIN team_memberships tm ON p.id = tm.player_id AND tm.is_active = true
  LEFT JOIN team_info ti ON tm.team_id = ti.id
  WHERE p.email IN ('konsti60313@gmail.com', 'markus@domrauschen.com')
)
SELECT 
  '5️⃣ MATCHES FÜR TEAMS' as check_category,
  pt.name,
  pt.email,
  pt.club_name,
  pt.team_name,
  m.id as match_id,
  m.match_date,
  home.club_name || ' ' || COALESCE(home.team_name, '') as home_team,
  away.club_name || ' ' || COALESCE(away.team_name, '') as away_team,
  CASE 
    WHEN m.home_team_id = pt.team_id THEN '🏠 Heimspiel'
    WHEN m.away_team_id = pt.team_id THEN '✈️ Auswärtsspiel'
    ELSE '❓ Unbekannt'
  END as location,
  CASE 
    WHEN pt.email = 'konsti60313@gmail.com' THEN '✅ RAOUL'
    WHEN pt.email = 'markus@domrauschen.com' THEN '❌ MARKUS'
    ELSE 'Anderer'
  END as player_label
FROM player_teams pt
LEFT JOIN matchdays m ON (m.home_team_id = pt.team_id OR m.away_team_id = pt.team_id)
LEFT JOIN team_info home ON m.home_team_id = home.id
LEFT JOIN team_info away ON m.away_team_id = away.id
ORDER BY pt.email, m.match_date DESC NULLS LAST
LIMIT 20;

-- ==========================================
-- SCHRITT 6: DATACONTEXT SIMULATION (WIE FRONTEND LÄDT)
-- ==========================================
-- Simuliert wie DataContext.jsx die Teams lädt
WITH player_data AS (
  SELECT 
    p.id,
    p.name,
    p.email,
    p.primary_team_id
  FROM players_unified p
  WHERE p.email IN ('konsti60313@gmail.com', 'markus@domrauschen.com')
),
team_memberships_data AS (
  SELECT 
    pd.name,
    pd.email,
    tm.team_id,
    tm.is_primary,
    tm.is_active,
    ti.club_name,
    ti.team_name,
    ti.category
  FROM player_data pd
  LEFT JOIN team_memberships tm ON pd.id = tm.player_id AND tm.is_active = true
  LEFT JOIN team_info ti ON tm.team_id = ti.id
)
SELECT 
  '6️⃣ DATACONTEXT SIMULATION' as check_category,
  tmd.name,
  tmd.email,
  tmd.team_id,
  tmd.club_name,
  tmd.team_name,
  tmd.is_primary,
  tmd.is_active,
  CASE 
    WHEN tmd.email = 'konsti60313@gmail.com' THEN '✅ RAOUL'
    WHEN tmd.email = 'markus@domrauschen.com' THEN '❌ MARKUS'
    ELSE 'Anderer'
  END as player_label,
  CASE 
    WHEN tmd.team_id IS NULL THEN '❌ KEIN TEAM GEFUNDEN!'
    WHEN tmd.is_active = false THEN '⚠️ Team existiert, aber is_active=false'
    WHEN tmd.is_primary = false THEN '⚠️ Team existiert, aber is_primary=false'
    ELSE '✅ Team gefunden und aktiv'
  END as datacontext_status
FROM team_memberships_data tmd
ORDER BY tmd.email;

-- ==========================================
-- SCHRITT 7: FINALE DIAGNOSE
-- ==========================================
WITH player_summary AS (
  SELECT 
    p.name,
    p.email,
    p.primary_team_id,
    (SELECT COUNT(*) FROM team_memberships WHERE player_id = p.id AND is_active = true) as active_memberships,
    (SELECT COUNT(*) FROM team_memberships WHERE player_id = p.id AND is_active = true AND is_primary = true) as primary_memberships,
    (SELECT team_id FROM team_memberships WHERE player_id = p.id AND is_active = true AND is_primary = true LIMIT 1) as primary_membership_team_id,
    (SELECT COUNT(*) 
     FROM matchdays m 
     WHERE m.home_team_id IN (SELECT team_id FROM team_memberships WHERE player_id = p.id AND is_active = true)
        OR m.away_team_id IN (SELECT team_id FROM team_memberships WHERE player_id = p.id AND is_active = true)
    ) as total_matches
  FROM players_unified p
  WHERE p.email IN ('konsti60313@gmail.com', 'markus@domrauschen.com')
)
SELECT 
  '7️⃣ ✅ FINALE DIAGNOSE' as check_category,
  ps.name,
  ps.email,
  ps.primary_team_id as "primary_team_id in DB",
  ps.active_memberships as "Aktive Memberships",
  ps.primary_memberships as "Primary Memberships",
  ps.primary_membership_team_id as "is_primary Membership Team ID",
  ps.total_matches as "Matches für seine Teams",
  CASE 
    WHEN ps.email = 'konsti60313@gmail.com' THEN '✅ RAOUL (funktioniert)'
    WHEN ps.email = 'markus@domrauschen.com' THEN '❌ MARKUS (funktioniert NICHT)'
    ELSE 'Anderer'
  END as player_label,
  CASE 
    WHEN ps.primary_team_id IS NULL THEN '❌ FEHLER: primary_team_id ist NULL'
    WHEN ps.active_memberships = 0 THEN '❌ FEHLER: Keine aktiven Memberships'
    WHEN ps.primary_memberships = 0 THEN '⚠️ WARNUNG: Kein primary Membership (aber aktive Memberships vorhanden)'
    WHEN ps.primary_team_id != ps.primary_membership_team_id THEN '⚠️ INKONSISTENT: primary_team_id ≠ is_primary membership'
    WHEN ps.total_matches = 0 THEN '⚠️ WARNUNG: Team hat keine Matches'
    ELSE '✅ ALLES OK'
  END as "PROBLEM DIAGNOSE"
FROM player_summary ps
ORDER BY ps.email;

-- ==========================================
-- ERWARTETES ERGEBNIS:
-- 
-- RAOUL (✅ funktioniert):
-- - primary_team_id: gesetzt
-- - active_memberships: > 0
-- - primary_memberships: 1
-- - Konsistenz: ✅
-- - Matches: > 0
-- - DIAGNOSE: ✅ ALLES OK
-- 
-- MARKUS (❌ funktioniert NICHT):
-- - Zeigt eines der Probleme:
--   ❌ primary_team_id ist NULL
--   ❌ Keine aktiven Memberships
--   ⚠️ Kein primary Membership
--   ⚠️ Inkonsistenz zwischen primary_team_id und is_primary
--   ⚠️ Team hat keine Matches
-- 
-- LÖSUNG BASIERT AUF DIAGNOSE:
-- → Wenn primary_team_id NULL: FIX_MARKUS_PRIMARY_TEAM.sql
-- → Wenn Membership fehlt: FIX_MARKUS_MEMBERSHIP.sql
-- → Wenn Inkonsistent: FIX_MARKUS_CONSISTENCY.sql
-- ==========================================




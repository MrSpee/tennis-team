-- VERIFY_ROBERT_COMPLETE.sql
-- Umfassende Verifikation aller relevanten Daten für Robert Ellrich
-- Alle Schritte in EINEM Run ausführbar!
-- ==========================================

-- ==========================================
-- SCHRITT 1: SPIELER-GRUNDDATEN
-- ==========================================
SELECT 
  '1️⃣ SPIELER-GRUNDDATEN' as check_category,
  'Robert Ellrich' as expected_name,
  p.id,
  p.user_id,
  p.name,
  p.email,
  p.current_lk,
  p.player_type,
  p.is_active,
  p.onboarding_status,
  CASE 
    WHEN p.name = 'Robert Ellrich' THEN '✅'
    ELSE '❌'
  END as name_check,
  CASE 
    WHEN p.is_active = true THEN '✅'
    ELSE '❌'
  END as active_check
FROM players_unified p
WHERE p.email = 'robert.ellrich@icloud.com';

-- ==========================================
-- SCHRITT 2: PRIMARY TEAM
-- ==========================================
SELECT 
  '2️⃣ PRIMARY TEAM' as check_category,
  'SV Rot-Gelb Sürth' as expected_club,
  'Herren 40' as expected_category,
  p.id as player_id,
  p.name,
  p.primary_team_id,
  ti.club_name,
  ti.team_name,
  ti.category,
  CASE 
    WHEN p.primary_team_id IS NULL THEN '❌ NULL'
    WHEN ti.club_name = 'SV Rot-Gelb Sürth' AND ti.category = 'Herren 40' THEN '✅ KORREKT'
    ELSE '⚠️ FALSCH: ' || COALESCE(ti.club_name, 'NULL') || ' ' || COALESCE(ti.category, 'NULL')
  END as primary_team_check
FROM players_unified p
LEFT JOIN team_info ti ON p.primary_team_id = ti.id
WHERE p.email = 'robert.ellrich@icloud.com';

-- ==========================================
-- SCHRITT 3: TEAM MEMBERSHIPS (ALLE)
-- ==========================================
SELECT 
  '3️⃣ TEAM MEMBERSHIPS (Alle)' as check_category,
  tm.id as membership_id,
  ti.club_name,
  ti.team_name,
  ti.category,
  tm.is_active,
  tm.is_primary,
  tm.role,
  tm.season,
  CASE 
    WHEN tm.is_active = true AND tm.is_primary = true AND ti.club_name = 'SV Rot-Gelb Sürth' THEN '✅ PERFECT'
    WHEN tm.is_active = true THEN '✅ AKTIV'
    WHEN tm.is_active = false THEN '⚠️ INAKTIV'
    ELSE '❌ FEHLER'
  END as status_check,
  tm.created_at
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.player_id = (SELECT id FROM players_unified WHERE email = 'robert.ellrich@icloud.com')
ORDER BY tm.is_active DESC, tm.is_primary DESC, tm.created_at DESC;

-- ==========================================
-- SCHRITT 4: KONSISTENZ-CHECK
-- ==========================================
SELECT 
  '4️⃣ KONSISTENZ-CHECK' as check_category,
  'Prüft ob primary_team_id mit is_primary Membership übereinstimmt' as description,
  p.primary_team_id,
  tm.team_id as primary_membership_team_id,
  CASE 
    WHEN p.primary_team_id = tm.team_id THEN '✅ KONSISTENT'
    WHEN p.primary_team_id IS NULL THEN '❌ primary_team_id ist NULL'
    WHEN tm.team_id IS NULL THEN '❌ Kein is_primary Membership gefunden'
    ELSE '⚠️ INKONSISTENT: primary_team_id zeigt auf anderes Team'
  END as consistency_check
FROM players_unified p
LEFT JOIN team_memberships tm ON p.id = tm.player_id AND tm.is_primary = true AND tm.is_active = true
WHERE p.email = 'robert.ellrich@icloud.com';

-- ==========================================
-- SCHRITT 5: ERWARTETE ANZEIGE IM DASHBOARD
-- ==========================================
SELECT 
  '5️⃣ DASHBOARD-ANZEIGE (Erwartung)' as check_category,
  ti.club_name as "Dashboard sollte zeigen: Verein",
  ti.category as "Dashboard sollte zeigen: Kategorie",
  ti.team_name as "Dashboard sollte zeigen: Team",
  ts.league as "Dashboard sollte zeigen: Liga",
  ts.group_name as "Dashboard sollte zeigen: Gruppe",
  ts.season as "Dashboard sollte zeigen: Saison",
  COUNT(tm_count.id) as "Dashboard sollte zeigen: Anzahl Spieler im Team"
FROM players_unified p
JOIN team_info ti ON p.primary_team_id = ti.id
LEFT JOIN team_seasons ts ON ti.id = ts.team_id AND ts.is_active = true AND ts.season LIKE 'Winter 2025%'
LEFT JOIN team_memberships tm_count ON ti.id = tm_count.team_id AND tm_count.is_active = true
WHERE p.email = 'robert.ellrich@icloud.com'
GROUP BY ti.club_name, ti.category, ti.team_name, ts.league, ts.group_name, ts.season;

-- ==========================================
-- SCHRITT 6: TEAM-MITGLIEDER (wer spielt mit Robert?)
-- ==========================================
SELECT 
  '6️⃣ TEAM-MITGLIEDER (Rot-Gelb Sürth Herren 40)' as check_category,
  p.name,
  p.email,
  p.current_lk,
  tm.is_primary,
  CASE 
    WHEN p.email = 'robert.ellrich@icloud.com' THEN '👉 ROBERT'
    ELSE ''
  END as is_robert
FROM team_memberships tm
JOIN players_unified p ON tm.player_id = p.id
WHERE tm.team_id = (
    SELECT primary_team_id FROM players_unified WHERE email = 'robert.ellrich@icloud.com'
  )
  AND tm.is_active = true
ORDER BY p.name;

-- ==========================================
-- SCHRITT 7: MATCHES FÜR ROBERT'S TEAM
-- ==========================================
SELECT 
  '7️⃣ MATCHES (Rot-Gelb Sürth)' as check_category,
  m.id,
  m.match_date,
  CASE 
    WHEN m.home_team_id = (SELECT primary_team_id FROM players_unified WHERE email = 'robert.ellrich@icloud.com') 
    THEN 'Heimspiel'
    ELSE 'Auswärtsspiel'
  END as location_from_robert_perspective,
  home.club_name || ' ' || COALESCE(home.team_name, '') as home_team,
  away.club_name || ' ' || COALESCE(away.team_name, '') as away_team,
  m.venue,
  m.season
FROM matchdays m
JOIN team_info home ON m.home_team_id = home.id
JOIN team_info away ON m.away_team_id = away.id
WHERE m.home_team_id = (SELECT primary_team_id FROM players_unified WHERE email = 'robert.ellrich@icloud.com')
   OR m.away_team_id = (SELECT primary_team_id FROM players_unified WHERE email = 'robert.ellrich@icloud.com')
ORDER BY m.match_date DESC
LIMIT 5;

-- ==========================================
-- SCHRITT 8: FINALE ZUSAMMENFASSUNG
-- ==========================================
WITH robert_data AS (
  SELECT 
    p.id,
    p.name,
    p.email,
    p.primary_team_id,
    ti.club_name,
    ti.category,
    (SELECT COUNT(*) FROM team_memberships WHERE player_id = p.id AND is_active = true) as active_memberships,
    (SELECT COUNT(*) FROM matchdays WHERE home_team_id = p.primary_team_id OR away_team_id = p.primary_team_id) as total_matches
  FROM players_unified p
  LEFT JOIN team_info ti ON p.primary_team_id = ti.id
  WHERE p.email = 'robert.ellrich@icloud.com'
)
SELECT 
  '8️⃣ ✅ FINALE ZUSAMMENFASSUNG' as check_category,
  rd.name,
  rd.club_name as "Primary Team Club",
  rd.category as "Primary Team Kategorie",
  rd.active_memberships as "Aktive Team-Zuordnungen",
  rd.total_matches as "Matches für sein Team",
  CASE 
    WHEN rd.primary_team_id IS NOT NULL 
     AND rd.club_name = 'SV Rot-Gelb Sürth' 
     AND rd.category = 'Herren 40'
     AND rd.active_memberships > 0
    THEN '🎉 ALLES PERFEKT!'
    WHEN rd.primary_team_id IS NULL THEN '❌ primary_team_id ist NULL'
    WHEN rd.active_memberships = 0 THEN '❌ Keine aktiven Memberships'
    ELSE '⚠️ Prüfe Details in vorherigen Schritten'
  END as "GESAMTSTATUS"
FROM robert_data rd;

-- ==========================================
-- ERWARTETES ERGEBNIS:
-- 
-- 1️⃣ SPIELER-GRUNDDATEN: ✅ ✅
-- 2️⃣ PRIMARY TEAM: ✅ KORREKT (SV Rot-Gelb Sürth Herren 40)
-- 3️⃣ TEAM MEMBERSHIPS: ✅ PERFECT (1 Eintrag, aktiv, primary)
-- 4️⃣ KONSISTENZ: ✅ KONSISTENT
-- 5️⃣ DASHBOARD: SV Rot-Gelb Sürth, Herren 40, etc.
-- 6️⃣ TEAM-MITGLIEDER: 9 Spieler (inkl. Robert)
-- 7️⃣ MATCHES: Liste der Spiele
-- 8️⃣ ZUSAMMENFASSUNG: 🎉 ALLES PERFEKT!
-- 
-- WENN 8️⃣ = "🎉 ALLES PERFEKT!":
-- → Robert ist korrekt konfiguriert! ✅
-- → Nach Code-Deployment + Logout/Login sollte alles funktionieren!
-- 
-- WENN NICHT:
-- → Zeig mir welcher Schritt ❌ zeigt
-- → Ich erstelle einen spezifischen Fix
-- ==========================================





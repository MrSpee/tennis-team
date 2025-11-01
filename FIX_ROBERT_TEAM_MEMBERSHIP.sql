-- FIX_ROBERT_TEAM_MEMBERSHIP.sql
-- Reaktiviert Robert's Team-Membership falls is_active=false
-- ==========================================

BEGIN;

-- SCHRITT 1: Zeige Roberts aktuelle Memberships (alle, auch inactive)
-- ==========================================
SELECT 
  '🔍 VORHER: Alle Memberships' as info,
  tm.id,
  tm.player_id,
  tm.team_id,
  tm.is_active,
  tm.is_primary,
  tm.season,
  ti.club_name,
  ti.category
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.player_id = (SELECT id FROM players_unified WHERE email = 'robert.ellrich@icloud.com')
ORDER BY tm.is_active DESC, tm.created_at DESC;

-- SCHRITT 2: Reaktiviere Rot-Gelb Sürth Membership (falls inactive)
-- ==========================================
UPDATE team_memberships
SET 
  is_active = true,
  is_primary = true,  -- Als Hauptmannschaft setzen
  updated_at = NOW()
WHERE player_id = (SELECT id FROM players_unified WHERE email = 'robert.ellrich@icloud.com')
  AND team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f'  -- Rot-Gelb Sürth Herren 40
  AND (is_active = false OR is_primary = false);  -- Nur updaten wenn nötig

-- SCHRITT 3: Zeige Ergebnis (NACHHER)
-- ==========================================
SELECT 
  '✅ NACHHER: Aktive Memberships' as info,
  tm.id,
  tm.player_id,
  tm.team_id,
  tm.is_active,
  tm.is_primary,
  tm.season,
  ti.club_name,
  ti.category
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.player_id = (SELECT id FROM players_unified WHERE email = 'robert.ellrich@icloud.com')
  AND tm.is_active = true
ORDER BY tm.is_primary DESC;

-- SCHRITT 4: Prüfe primary_team_id Konsistenz
-- ==========================================
SELECT 
  '🔍 primary_team_id Check' as info,
  p.primary_team_id,
  ti.club_name,
  CASE 
    WHEN p.primary_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f' THEN '✅ KORREKT'
    WHEN p.primary_team_id IS NULL THEN '⚠️ NULL (wurde schon gefixt?)'
    ELSE '❌ FALSCH'
  END as status
FROM players_unified p
LEFT JOIN team_info ti ON p.primary_team_id = ti.id
WHERE p.email = 'robert.ellrich@icloud.com';

COMMIT;

-- ==========================================
-- ERWARTETES ERGEBNIS:
-- 
-- ✅ Robert hat 1 aktives Membership: Rot-Gelb Sürth Herren 40
-- ✅ is_active = true
-- ✅ is_primary = true
-- ✅ primary_team_id = ff090c47-ff26-4df1-82fd-3e4358320d7f
-- 
-- DANACH:
-- Robert sollte in der App "Meine Teams (1)" sehen
-- und kann sich ohne Fehler einloggen!
-- ==========================================


-- EMERGENCY_FIX_ROBERT.sql
-- Notfall-Fix wenn Auto-Fix nicht funktioniert
-- Setzt Robert's Daten komplett zurück und neu
-- ==========================================

BEGIN;

-- SCHRITT 1: Zeige aktuelle Situation
-- ==========================================
SELECT 
  '🔍 VORHER' as info,
  p.id,
  p.name,
  p.email,
  p.primary_team_id,
  (SELECT club_name FROM team_info WHERE id = p.primary_team_id) as current_primary
FROM players_unified p
WHERE p.email = 'robert.ellrich@icloud.com';

-- SCHRITT 2: Setze primary_team_id auf Rot-Gelb Sürth
-- ==========================================
UPDATE players_unified
SET 
  primary_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f',  -- Rot-Gelb Sürth Herren 40
  updated_at = NOW()
WHERE email = 'robert.ellrich@icloud.com';

-- SCHRITT 3: Stelle sicher, dass team_membership korrekt ist
-- ==========================================
-- Deaktiviere ALLE anderen Memberships (falls vorhanden)
UPDATE team_memberships
SET is_active = false
WHERE player_id = (SELECT id FROM players_unified WHERE email = 'robert.ellrich@icloud.com')
  AND team_id != 'ff090c47-ff26-4df1-82fd-3e4358320d7f';

-- Stelle sicher, dass Rot-Gelb Sürth Membership aktiv und primary ist
UPDATE team_memberships
SET 
  is_active = true,
  is_primary = true,
  updated_at = NOW()
WHERE player_id = (SELECT id FROM players_unified WHERE email = 'robert.ellrich@icloud.com')
  AND team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f';

-- Falls Membership nicht existiert, erstelle sie neu
INSERT INTO team_memberships (player_id, team_id, is_active, is_primary, role, season, created_at)
SELECT 
  p.id,
  'ff090c47-ff26-4df1-82fd-3e4358320d7f',
  true,
  true,
  'player',
  'Winter 2025/26',
  NOW()
FROM players_unified p
WHERE p.email = 'robert.ellrich@icloud.com'
  AND NOT EXISTS (
    SELECT 1 FROM team_memberships 
    WHERE player_id = p.id 
      AND team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f'
  );

-- SCHRITT 4: Verifizierung (NACHHER)
-- ==========================================
SELECT 
  '✅ NACHHER: Robert''s Daten' as info,
  p.id,
  p.name,
  p.email,
  p.primary_team_id,
  ti.club_name as primary_club,
  ti.category as primary_category
FROM players_unified p
LEFT JOIN team_info ti ON p.primary_team_id = ti.id
WHERE p.email = 'robert.ellrich@icloud.com';

-- SCHRITT 5: Alle aktiven Memberships
-- ==========================================
SELECT 
  '🏆 AKTIVE TEAMS' as info,
  tm.team_id,
  ti.club_name,
  ti.category,
  tm.is_primary,
  tm.is_active
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.player_id = (SELECT id FROM players_unified WHERE email = 'robert.ellrich@icloud.com')
ORDER BY tm.is_primary DESC;

COMMIT;

-- ==========================================
-- ERWARTETES ERGEBNIS:
-- 
-- ✅ primary_team_id: ff090c47-ff26-4df1-82fd-3e4358320d7f
-- ✅ primary_club: SV Rot-Gelb Sürth
-- ✅ primary_category: Herren 40
-- 
-- ✅ Nur 1 aktives Team: Rot-Gelb Sürth Herren 40
-- 
-- DANACH: Robert muss sich neu einloggen!
-- ==========================================




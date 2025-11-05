-- FIX_ROBERT_PRIMARY_TEAM.sql
-- Setzt Robert Ellrich's primary_team_id auf Rot-Gelb Sürth Herren 40
-- ==========================================

BEGIN;

-- SCHRITT 1: Zeige aktuelle Situation (VORHER)
-- ==========================================
SELECT 
  '🔍 VORHER: Robert''s Daten' as info,
  id,
  name,
  email,
  primary_team_id,
  (SELECT club_name FROM team_info WHERE id = primary_team_id) as current_club
FROM players_unified
WHERE email = 'robert.ellrich@icloud.com';

-- SCHRITT 2: Update primary_team_id
-- ==========================================
UPDATE players_unified
SET 
  primary_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f',  -- Rot-Gelb Sürth Herren 40
  updated_at = NOW()
WHERE email = 'robert.ellrich@icloud.com';

-- SCHRITT 3: Verifizierung (NACHHER)
-- ==========================================
SELECT 
  '✅ NACHHER: Robert''s Daten' as info,
  p.id,
  p.name,
  p.email,
  p.primary_team_id,
  ti.club_name,
  ti.team_name,
  ti.category
FROM players_unified p
LEFT JOIN team_info ti ON p.primary_team_id = ti.id
WHERE p.email = 'robert.ellrich@icloud.com';

-- SCHRITT 4: Prüfe team_memberships Konsistenz
-- ==========================================
SELECT 
  '🔍 Team-Memberships Check' as info,
  tm.is_primary,
  tm.team_id,
  ti.club_name,
  ti.category,
  CASE 
    WHEN tm.team_id = p.primary_team_id THEN '✅ KONSISTENT'
    WHEN p.primary_team_id IS NULL THEN '⚠️ primary_team_id war NULL'
    ELSE '❌ INKONSISTENT'
  END as status
FROM players_unified p
JOIN team_memberships tm ON p.id = tm.player_id
JOIN team_info ti ON tm.team_id = ti.id
WHERE p.email = 'robert.ellrich@icloud.com'
  AND tm.is_active = true
ORDER BY tm.is_primary DESC;

COMMIT;

-- ==========================================
-- ERGEBNIS:
-- Robert Ellrich sollte jetzt korrekt "SV Rot-Gelb Sürth Herren 40" 
-- als Primary Team haben und in der App angezeigt bekommen!
-- ==========================================

-- HINWEIS: Falls Robert sich neu einloggen muss:
-- Der AuthContext lädt den Player bei Login und cached das primary_team
-- → Robert sollte sich ausloggen und neu einloggen nach dem Fix!





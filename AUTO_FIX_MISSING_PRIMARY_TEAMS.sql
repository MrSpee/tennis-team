-- AUTO_FIX_MISSING_PRIMARY_TEAMS.sql
-- Setzt automatisch primary_team_id für alle Spieler, die:
-- 1. primary_team_id = NULL haben
-- 2. Aber aktive team_memberships besitzen
-- 3. Verwendet das Team mit is_primary=true (falls vorhanden)
-- ==========================================

BEGIN;

-- SCHRITT 1: Zeige betroffene Spieler (VORHER)
-- ==========================================
SELECT 
  '🔍 VORHER: Spieler ohne primary_team_id' as info,
  p.id,
  p.name,
  p.email,
  p.primary_team_id,
  COUNT(tm.id) as active_memberships
FROM players_unified p
LEFT JOIN team_memberships tm ON p.id = tm.player_id AND tm.is_active = true
WHERE p.primary_team_id IS NULL
  AND p.player_type = 'app_user'
  AND p.is_active = true
GROUP BY p.id, p.name, p.email, p.primary_team_id
HAVING COUNT(tm.id) > 0
ORDER BY p.name;

-- SCHRITT 2: Update primary_team_id basierend auf is_primary Membership
-- ==========================================
-- Für jeden Spieler mit NULL primary_team_id:
-- Setze primary_team_id auf das Team mit is_primary=true
-- Falls kein is_primary=true existiert, nimm das erste aktive Membership

WITH priority_teams AS (
  SELECT 
    tm.player_id,
    tm.team_id,
    ti.club_name,
    ti.category,
    ROW_NUMBER() OVER (
      PARTITION BY tm.player_id 
      ORDER BY tm.is_primary DESC, tm.created_at ASC
    ) as priority
  FROM team_memberships tm
  JOIN team_info ti ON tm.team_id = ti.id
  WHERE tm.is_active = true
    AND tm.player_id IN (
      SELECT id FROM players_unified 
      WHERE primary_team_id IS NULL 
        AND player_type = 'app_user' 
        AND is_active = true
    )
)
UPDATE players_unified p
SET 
  primary_team_id = pt.team_id,
  updated_at = NOW()
FROM priority_teams pt
WHERE p.id = pt.player_id
  AND pt.priority = 1
  AND p.primary_team_id IS NULL;

-- SCHRITT 3: Verifizierung (NACHHER)
-- ==========================================
SELECT 
  '✅ NACHHER: primary_team_id gesetzt' as info,
  p.id,
  p.name,
  p.email,
  p.primary_team_id,
  ti.club_name,
  ti.team_name,
  ti.category,
  (
    SELECT tm.is_primary 
    FROM team_memberships tm 
    WHERE tm.player_id = p.id 
      AND tm.team_id = p.primary_team_id
      AND tm.is_active = true
  ) as was_is_primary_in_membership
FROM players_unified p
LEFT JOIN team_info ti ON p.primary_team_id = ti.id
WHERE p.id IN (
  SELECT DISTINCT player_id
  FROM team_memberships
  WHERE is_active = true
    AND player_id IN (
      SELECT id FROM players_unified 
      WHERE player_type = 'app_user' 
        AND is_active = true
    )
)
  AND p.player_type = 'app_user'
  AND p.is_active = true
ORDER BY p.name;

-- SCHRITT 4: Prüfe ob noch Probleme existieren
-- ==========================================
SELECT 
  '⚠️ VERBLEIBENDE PROBLEME (sollte leer sein)' as info,
  p.id,
  p.name,
  p.email,
  p.primary_team_id,
  COUNT(tm.id) as active_memberships
FROM players_unified p
LEFT JOIN team_memberships tm ON p.id = tm.player_id AND tm.is_active = true
WHERE p.primary_team_id IS NULL
  AND p.player_type = 'app_user'
  AND p.is_active = true
GROUP BY p.id, p.name, p.email, p.primary_team_id
HAVING COUNT(tm.id) > 0
ORDER BY p.name;

COMMIT;

-- ==========================================
-- RESULTAT:
-- Alle Spieler mit aktiven Memberships sollten jetzt
-- ein korrektes primary_team_id haben!
-- 
-- WICHTIG: Betroffene Spieler müssen sich neu einloggen,
-- damit der AuthContext das neue primary_team lädt!
-- ==========================================




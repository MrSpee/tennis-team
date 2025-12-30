-- ============================================================
-- ✅ KORREKTE ZUORDNUNG: BEIDE GEORG ROLSHOVEN
-- ============================================================
-- 
-- Georg Rolshoven (1991) - TVM-ID: 19108160
-- Verein: Rodenkirchener TC (2100)
-- Teams: Herren + Herren 30
-- Player-ID: 3bacc047-a692-4d94-8659-6bbcb629d83c (aktiver Spieler)
--
-- Georg Rolshoven (1976) - TVM-ID: 17651822
-- Verein: TC Grün-Weiß Brüser Berg (3386)
-- Player-ID: 9df79240-7c31-4a98-b2f6-fe1f0495207b (inaktiver Spieler)
-- ============================================================

-- ============================================================
-- SCHRITT 1: Aktualisiere inaktiven Georg mit korrekten Daten
-- ============================================================

UPDATE players_unified
SET 
  current_lk = '13.6', -- Behalte aktuelle LK falls vorhanden
  is_active = false, -- Bleibt inaktiv (kein Login)
  updated_at = NOW()
WHERE id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';

-- ============================================================
-- SCHRITT 2: Entferne falsche Team-Memberships für inaktiven Georg
-- ============================================================
-- Der inaktive Georg sollte NICHT für Rodenkirchener TC spielen

DELETE FROM team_memberships
WHERE player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
  AND team_id IN (
    SELECT id FROM team_info 
    WHERE club_name ILIKE '%Rodenkirchener%'
  );

-- ============================================================
-- SCHRITT 3: Füge Team-Membership für TC Grün-Weiß Brüser Berg hinzu
-- ============================================================
-- Falls das Team existiert, füge es hinzu

-- Zuerst prüfe ob das Team existiert
DO $$
DECLARE
  brueser_team_id UUID;
BEGIN
  -- Suche nach TC Grün-Weiß Brüser Berg Team
  SELECT id INTO brueser_team_id
  FROM team_info
  WHERE club_name ILIKE '%Grün-Weiß%' 
     OR club_name ILIKE '%Brüser%'
     OR club_name ILIKE '%Brueser%'
  LIMIT 1;
  
  IF brueser_team_id IS NOT NULL THEN
    -- Füge Team-Membership hinzu
    INSERT INTO team_memberships (
      player_id,
      team_id,
      role,
      is_primary,
      is_active,
      season,
      created_at,
      updated_at
    )
    SELECT 
      '9df79240-7c31-4a98-b2f6-fe1f0495207b',
      brueser_team_id,
      'player',
      true,
      true,
      'Winter 2025/26',
      NOW(),
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM team_memberships
      WHERE player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
        AND team_id = brueser_team_id
        AND season = 'Winter 2025/26'
    );
    
    RAISE NOTICE '✅ Team-Membership für TC Grün-Weiß Brüser Berg hinzugefügt';
  ELSE
    RAISE NOTICE '⚠️ TC Grün-Weiß Brüser Berg Team nicht gefunden - muss manuell erstellt werden';
  END IF;
END $$;

-- ============================================================
-- SCHRITT 4: Prüfe ob Ergebnisse für TC Grün-Weiß Brüser Berg existieren
-- ============================================================
-- Falls ja, müssen diese dem inaktiven Georg zugeordnet werden

-- Diese Zuordnung muss manuell geprüft werden, da wir nicht wissen,
-- welche Ergebnisse zu welchem Georg gehören

-- ============================================================
-- SCHRITT 5: Validierung
-- ============================================================

DO $$
DECLARE
  active_georg_teams INTEGER;
  inactive_georg_teams INTEGER;
  active_georg_results INTEGER;
  inactive_georg_results INTEGER;
BEGIN
  -- Zähle Teams für aktiven Georg
  SELECT COUNT(*) INTO active_georg_teams
  FROM team_memberships
  WHERE player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
    AND season = 'Winter 2025/26'
    AND is_active = true;
  
  -- Zähle Teams für inaktiven Georg
  SELECT COUNT(*) INTO inactive_georg_teams
  FROM team_memberships
  WHERE player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
    AND season = 'Winter 2025/26'
    AND is_active = true;
  
  -- Zähle Ergebnisse für aktiven Georg
  SELECT COUNT(*) INTO active_georg_results
  FROM match_results mr
  LEFT JOIN matchdays md ON mr.matchday_id = md.id
  WHERE md.season = 'Winter 2025/26'
    AND (mr.home_player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
     OR mr.home_player1_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
     OR mr.home_player2_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
     OR mr.guest_player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
     OR mr.guest_player1_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
     OR mr.guest_player2_id = '3bacc047-a692-4d94-8659-6bbcb629d83c');
  
  -- Zähle Ergebnisse für inaktiven Georg
  SELECT COUNT(*) INTO inactive_georg_results
  FROM match_results mr
  LEFT JOIN matchdays md ON mr.matchday_id = md.id
  WHERE md.season = 'Winter 2025/26'
    AND (mr.home_player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
     OR mr.home_player1_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
     OR mr.home_player2_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
     OR mr.guest_player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
     OR mr.guest_player1_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b'
     OR mr.guest_player2_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b');
  
  RAISE NOTICE '✅ Finale Zuordnung:';
  RAISE NOTICE '   Georg (1991) - Rodenkirchener TC: % Teams, % Ergebnisse', active_georg_teams, active_georg_results;
  RAISE NOTICE '   Georg (1976) - TC Grün-Weiß Brüser Berg: % Teams, % Ergebnisse', inactive_georg_teams, inactive_georg_results;
END $$;

SELECT 
  '✅ Zuordnung korrigiert!' as status,
  'Georg (1991) spielt für Rodenkirchener TC' as georg1,
  'Georg (1976) spielt für TC Grün-Weiß Brüser Berg' as georg2;


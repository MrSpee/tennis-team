-- Fix: Spieler von TV Ensen Westhoven zu Team zuordnen

-- SCHRITT 1: Finde Verein und Team
DO $$
DECLARE
  v_club_id UUID;
  v_club_name TEXT;
  v_team_id UUID;
  v_player_count INTEGER;
BEGIN
  -- Finde Verein (verschiedene Schreibweisen möglich)
  SELECT id, name INTO v_club_id, v_club_name
  FROM club_info
  WHERE name ILIKE '%Ensen%' 
     OR name ILIKE '%Westhoven%'
     OR name ILIKE '%TV Ensen%'
  LIMIT 1;
  
  IF v_club_id IS NULL THEN
    INSERT INTO club_info (id, name, city, region)
    VALUES (gen_random_uuid(), 'TV Ensen Westhoven', 'Köln', 'Mittelrhein')
    RETURNING id, name INTO v_club_id, v_club_name;
    RAISE NOTICE '✅ Verein erstellt: TV Ensen Westhoven (ID: %)', v_club_id;
  ELSE
    RAISE NOTICE '✅ Verein gefunden: % (ID: %)', v_club_name, v_club_id;
  END IF;
  
  -- Finde oder erstelle Team (verschiedene Schreibweisen)
  SELECT id INTO v_team_id
  FROM team_info
  WHERE (club_name ILIKE '%Ensen%' OR club_name ILIKE '%Westhoven%')
    AND team_name = '1'
  LIMIT 1;
  
  IF v_team_id IS NULL THEN
    INSERT INTO team_info (club_name, team_name, category, region, club_id)
    VALUES ('TV Ensen Westhoven', '1', 'Herren 40', 'Mittelrhein', v_club_id)
    RETURNING id INTO v_team_id;
    RAISE NOTICE '✅ Team erstellt: TV Ensen Westhoven 1 (ID: %)', v_team_id;
  ELSE
    RAISE NOTICE '✅ Team gefunden: TV Ensen Westhoven 1 (ID: %)', v_team_id;
  END IF;
  
  -- SCHRITT 2: Finde importierte Spieler OHNE Team-Zuordnung
  SELECT COUNT(*) INTO v_player_count
  FROM players_unified p
  LEFT JOIN team_memberships tm ON tm.player_id = p.id AND tm.is_active = true
  WHERE p.import_source = 'tvm_import'
    AND p.status = 'pending'
    AND tm.id IS NULL;
  
  RAISE NOTICE '🔍 Gefundene Spieler ohne Team-Membership: %', v_player_count;
  
  -- SCHRITT 3: Erstelle Team-Memberships für ALLE importierten Spieler ohne Zuordnung
  -- (Auch wenn sie nicht direkt von TV Ensen Westhoven sind, werden sie zugeordnet wenn sie keinen Team haben)
  INSERT INTO team_memberships (player_id, team_id, role, is_primary, season, is_active)
  SELECT 
    p.id,
    v_team_id,
    CASE WHEN p.is_captain THEN 'captain' ELSE 'player' END,
    false,
    'Winter 2025/26',
    true
  FROM players_unified p
  LEFT JOIN team_memberships tm ON tm.player_id = p.id AND tm.is_active = true
  WHERE p.import_source = 'tvm_import'
    AND p.status = 'pending'
    AND tm.id IS NULL
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS v_player_count = ROW_COUNT;
  RAISE NOTICE '✅ % Team-Memberships erstellt', v_player_count;
  
END $$;

-- SCHRITT 4: Prüfe Ergebnis
SELECT 
  '=== ERGEBNIS ===' as info,
  COUNT(*) FILTER (WHERE tm.id IS NOT NULL) as spieler_mit_team,
  COUNT(*) FILTER (WHERE tm.id IS NULL) as spieler_ohne_team
FROM players_unified p
LEFT JOIN team_memberships tm ON tm.player_id = p.id AND tm.is_active = true
WHERE p.import_source = 'tvm_import'
  AND p.status = 'pending';

-- SCHRITT 5: Zeige alle zugeordneten Spieler
SELECT 
  p.name,
  p.current_lk,
  ti.club_name,
  ti.team_name,
  tm.is_active
FROM players_unified p
JOIN team_memberships tm ON tm.player_id = p.id
JOIN team_info ti ON ti.id = tm.team_id
WHERE p.import_source = 'tvm_import'
  AND (ti.club_name ILIKE '%Ensen%' OR ti.club_name ILIKE '%Westhoven%')
ORDER BY p.name;


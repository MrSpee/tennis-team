-- ================================================================
-- TEAM-IMPORT MIT SPIELER-MELDELISTE
-- ================================================================
-- Importiert ein komplettes Team MIT Spielern aus der Meldeliste
-- WICHTIG: Die LK aus der Meldeliste ist der STARTPUNKT für die App-Berechnung
-- ================================================================

DO $$
DECLARE
  v_club_id UUID;
  v_team_id UUID;
  v_season_id UUID;
  v_player_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🏢 TEAM-IMPORT MIT SPIELERN';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';

  -- =====================================================
  -- SCHRITT 1: Club finden/erstellen
  -- =====================================================
  SELECT id INTO v_club_id
  FROM club_info
  WHERE club_name = '[CLUB_NAME]'  -- z.B. 'TC Sürth'
  LIMIT 1;

  IF v_club_id IS NULL THEN
    INSERT INTO club_info (
      id,
      club_name,
      region,
      created_at
    ) VALUES (
      gen_random_uuid(),
      '[CLUB_NAME]',
      '[REGION]',  -- z.B. 'Mittelrhein'
      NOW()
    )
    RETURNING id INTO v_club_id;
    
    RAISE NOTICE '✅ Club erstellt: [CLUB_NAME] (%)', v_club_id;
  ELSE
    RAISE NOTICE '✅ Club gefunden: [CLUB_NAME] (%)', v_club_id;
  END IF;

  -- =====================================================
  -- SCHRITT 2: Team erstellen
  -- =====================================================
  INSERT INTO team_info (
    id,
    team_name,
    club_name,
    category,
    region,
    club_id,
    tvm_link,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    '[TEAM_NAME]',      -- z.B. 'Herren 40 1' oder NULL
    '[CLUB_NAME]',
    '[CATEGORY]',       -- z.B. 'Herren 40', 'Herren 30', 'Damen'
    '[REGION]',
    v_club_id,
    '[TVM_LINK]',       -- Optional: Link zur TVM-Meldeliste
    NOW(),
    NOW()
  )
  RETURNING id INTO v_team_id;

  RAISE NOTICE '✅ Team erstellt: [TEAM_NAME] (%) in %', v_team_id, '[CATEGORY]';

  -- =====================================================
  -- SCHRITT 3: Saison erstellen
  -- =====================================================
  INSERT INTO team_seasons (
    id,
    team_id,
    season,
    league,
    group_name,
    team_size,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_team_id,
    '[SEASON]',         -- z.B. 'Winter 2025/26'
    '[LEAGUE]',         -- z.B. '1. Bezirksliga'
    '[GROUP]',          -- z.B. 'Gr. 043'
    [TEAM_SIZE],        -- z.B. 4, 6, 8
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_season_id;

  RAISE NOTICE '✅ Saison erstellt: [SEASON] - [LEAGUE] [GROUP]';

  -- =====================================================
  -- SCHRITT 4: SPIELER IMPORTIEREN (aus Meldeliste)
  -- =====================================================
  RAISE NOTICE '';
  RAISE NOTICE '👥 Importiere Spieler aus Meldeliste...';
  RAISE NOTICE '';

  -- WICHTIG: Spieler existieren bereits in der DB (haben sich registriert)
  -- Wir verknüpfen sie NUR mit dem Team und setzen die Meldelisten-LK
  
  -- Spieler 1
  INSERT INTO player_teams (
    player_id,
    team_id,
    is_primary,
    role,
    created_at
  )
  SELECT 
    p.id,
    v_team_id,
    [IS_PRIMARY],  -- true für Haupt-Team, false sonst
    '[ROLE]',      -- 'player' oder 'captain'
    NOW()
  FROM players p
  WHERE p.email = '[PLAYER_1_EMAIL]'  -- z.B. 'spieler1@example.com'
  ON CONFLICT (player_id, team_id) DO NOTHING;
  
  -- Aktualisiere LK falls in Meldeliste angegeben
  UPDATE players
  SET 
    season_start_lk = '[PLAYER_1_LK]',  -- z.B. 'LK 12.5'
    current_lk = '[PLAYER_1_LK]',
    last_lk_update = NOW()
  WHERE email = '[PLAYER_1_EMAIL]'
    AND (season_start_lk IS NULL OR season_start_lk = '');  -- Nur wenn noch nicht gesetzt
  
  v_player_count := v_player_count + 1;
  RAISE NOTICE '  ✅ Spieler 1: [PLAYER_1_EMAIL] → [PLAYER_1_LK]';

  -- Spieler 2
  INSERT INTO player_teams (player_id, team_id, is_primary, role, created_at)
  SELECT p.id, v_team_id, [IS_PRIMARY], '[ROLE]', NOW()
  FROM players p WHERE p.email = '[PLAYER_2_EMAIL]'
  ON CONFLICT (player_id, team_id) DO NOTHING;
  
  UPDATE players
  SET season_start_lk = '[PLAYER_2_LK]', current_lk = '[PLAYER_2_LK]', last_lk_update = NOW()
  WHERE email = '[PLAYER_2_EMAIL]' AND (season_start_lk IS NULL OR season_start_lk = '');
  
  v_player_count := v_player_count + 1;
  RAISE NOTICE '  ✅ Spieler 2: [PLAYER_2_EMAIL] → [PLAYER_2_LK]';

  -- Spieler 3
  INSERT INTO player_teams (player_id, team_id, is_primary, role, created_at)
  SELECT p.id, v_team_id, [IS_PRIMARY], '[ROLE]', NOW()
  FROM players p WHERE p.email = '[PLAYER_3_EMAIL]'
  ON CONFLICT (player_id, team_id) DO NOTHING;
  
  UPDATE players
  SET season_start_lk = '[PLAYER_3_LK]', current_lk = '[PLAYER_3_LK]', last_lk_update = NOW()
  WHERE email = '[PLAYER_3_EMAIL]' AND (season_start_lk IS NULL OR season_start_lk = '');
  
  v_player_count := v_player_count + 1;
  RAISE NOTICE '  ✅ Spieler 3: [PLAYER_3_EMAIL] → [PLAYER_3_LK]';

  -- Füge weitere Spieler nach diesem Muster hinzu...

  -- =====================================================
  -- SCHRITT 5: Matches importieren (optional)
  -- =====================================================
  -- Siehe TEMPLATE_TEAM_IMPORT.sql für Match-Import

  -- =====================================================
  -- ZUSAMMENFASSUNG
  -- =====================================================
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ IMPORT ABGESCHLOSSEN!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Importierte Daten:';
  RAISE NOTICE '   🏢 Club: [CLUB_NAME]';
  RAISE NOTICE '   👥 Team: [TEAM_NAME] ([CATEGORY])';
  RAISE NOTICE '   🏆 Liga: [LEAGUE] [GROUP]';
  RAISE NOTICE '   📅 Saison: [SEASON]';
  RAISE NOTICE '   👤 Spieler: %', v_player_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔗 Team-ID: %', v_team_id;
  RAISE NOTICE '';

END $$;

-- =====================================================
-- VERIFY: Zeige importierte Daten
-- =====================================================

-- Team
SELECT 
  '🏢 Team' as info,
  ti.id,
  ti.club_name,
  ti.team_name,
  ti.category,
  ts.league,
  ts.group_name,
  ts.team_size
FROM team_info ti
LEFT JOIN team_seasons ts ON ti.id = ts.team_id AND ts.is_active = true
WHERE ti.club_name = '[CLUB_NAME]'
  AND ti.category = '[CATEGORY]'
ORDER BY ti.created_at DESC
LIMIT 1;

-- Spieler des Teams
SELECT 
  '👥 Spieler' as info,
  p.name,
  p.email,
  p.season_start_lk as start_lk,
  p.current_lk,
  pt.role,
  pt.is_primary
FROM player_teams pt
JOIN players p ON p.id = pt.player_id
JOIN team_info ti ON ti.id = pt.team_id
WHERE ti.club_name = '[CLUB_NAME]'
  AND ti.category = '[CATEGORY]'
ORDER BY p.current_lk ASC NULLS LAST;

-- =====================================================
-- PLATZHALTER ZUM ERSETZEN:
-- =====================================================
-- [CLUB_NAME]          - 'TC Sürth', 'VKC Köln', etc.
-- [REGION]             - 'Mittelrhein', 'Niederrhein', etc.
-- [TEAM_NAME]          - 'Herren 40 1' oder NULL
-- [CATEGORY]           - 'Herren 40', 'Herren 30', 'Damen', etc.
-- [TVM_LINK]           - Link zur TVM-Meldeliste oder NULL
-- [SEASON]             - 'Winter 2025/26', 'Sommer 2025'
-- [LEAGUE]             - '1. Bezirksliga', '2. Kreisliga', etc.
-- [GROUP]              - 'Gr. 043', 'Gr. A', etc.
-- [TEAM_SIZE]          - 4, 6, 8
-- [PLAYER_X_EMAIL]     - Email des Spielers (muss registriert sein!)
-- [PLAYER_X_LK]        - 'LK 12.5', 'LK 18.0', etc. aus Meldeliste
-- [IS_PRIMARY]         - true/false (Haupt-Team?)
-- [ROLE]               - 'player' oder 'captain'
--
-- =====================================================


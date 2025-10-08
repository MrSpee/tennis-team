-- ============================================
-- ADD_RODENKIRCHENER_TC_AUTO.sql
-- Fügt Rodenkirchener TC mit Herren 30 Mannschaft automatisch hinzu
-- ============================================

DO $$
DECLARE
  new_team_id UUID;
  new_club_id UUID;
  club_exists BOOLEAN;
BEGIN
  RAISE NOTICE '🏢 Erstelle Rodenkirchener TC...';

  -- 1️⃣ Prüfe ob Verein bereits existiert
  SELECT id INTO new_club_id
  FROM club_info
  WHERE normalized_name = 'rodenkirchenertc'
     OR LOWER(name) = 'rodenkirchener tc';

  IF new_club_id IS NOT NULL THEN
    RAISE NOTICE '⚠️  Verein existiert bereits mit ID: %', new_club_id;
    RAISE NOTICE '   Aktualisiere Vereinsdaten...';
    
    -- Update existierender Club mit vollständigen Daten
    UPDATE club_info
    SET 
      name = 'Rodenkirchener TC',
      normalized_name = 'rodenkirchenertc',
      city = 'Köln',
      postal_code = '50997',
      address = 'Berzdorfer Str. 29, 50997 Köln-Immendorf',
      region = 'Mittelrhein',
      state = 'NRW',
      website = 'http://www.tc-rodenkirchen.de',
      federation = 'TVM',
      is_verified = true,
      verification_date = COALESCE(verification_date, NOW()),
      data_source = CASE 
        WHEN data_source = 'migration' THEN 'migration_updated'
        ELSE data_source
      END,
      updated_at = NOW()
    WHERE id = new_club_id;
    
    RAISE NOTICE '✅ Verein aktualisiert';
  ELSE
    -- Erstelle neuen Club
    INSERT INTO club_info (
      name,
      normalized_name,
      city,
      postal_code,
      address,
      region,
      state,
      website,
      federation,
      is_verified,
      verification_date,
      data_source
    ) VALUES (
      'Rodenkirchener TC',
      'rodenkirchenertc',
      'Köln',
      '50997',
      'Berzdorfer Str. 29, 50997 Köln-Immendorf',
      'Mittelrhein',
      'NRW',
      'http://www.tc-rodenkirchen.de',
      'TVM',
      true,
      NOW(),
      'manual'
    )
    RETURNING id INTO new_club_id;

    RAISE NOTICE '✅ Verein erstellt mit ID: %', new_club_id;
  END IF;

  -- 2️⃣ Füge die Mannschaft zur team_info Tabelle hinzu
  INSERT INTO team_info (
    club_name,
    team_name,
    category,
    region,
    tvm_link
  ) VALUES (
    'Rodenkirchener TC',
    'Herren 30 1',
    'Herren 30',
    'Mittelrhein',
    'http://www.tc-rodenkirchen.de'
  )
  RETURNING id INTO new_team_id;

  RAISE NOTICE '✅ Team erstellt mit ID: %', new_team_id;

  -- 2️⃣ Füge die Season-Daten zur team_seasons Tabelle hinzu
  INSERT INTO team_seasons (
    team_id,
    season,
    league,
    group_name,
    team_size,
    is_active
  ) VALUES (
    new_team_id,
    'Winter 2025/26',
    '2. Kreisliga',
    'Gr. 040',
    4,
    true
  );

  RAISE NOTICE '✅ Season-Daten erstellt';

  -- 3️⃣ Füge die Matches zur matches Tabelle hinzu (nur wenn nicht vorhanden)
  
  -- Match 1: 01.11.2025 - TC RW Porz 2 vs Rodenkirchener TC 1 (Auswärts)
  INSERT INTO matches (
    team_id,
    match_date,
    opponent,
    location,
    venue,
    season,
    players_needed
  )
  SELECT 
    new_team_id,
    '2025-11-01 17:00:00+01',
    'TC RW Porz 2',
    'auswärts',
    'Tennishalle Haus Rott',
    'winter',
    4
  WHERE NOT EXISTS (
    SELECT 1 FROM matches 
    WHERE team_id = new_team_id 
      AND match_date = '2025-11-01 17:00:00+01'
      AND opponent = 'TC RW Porz 2'
  );

  -- Match 2: 06.12.2025 - Rodenkirchener TC 1 vs TC RS Neubrück 1 (Heim)
  INSERT INTO matches (
    team_id,
    match_date,
    opponent,
    location,
    venue,
    season,
    players_needed
  )
  SELECT 
    new_team_id,
    '2025-12-06 15:00:00+01',
    'TC RS Neubrück 1',
    'heim',
    'Tennis-Centrum Immendorf',
    'winter',
    4
  WHERE NOT EXISTS (
    SELECT 1 FROM matches 
    WHERE team_id = new_team_id 
      AND match_date = '2025-12-06 15:00:00+01'
      AND opponent = 'TC RS Neubrück 1'
  );

  -- Match 3: 28.02.2026 - Kölner KHT SW 3 vs Rodenkirchener TC 1 (Auswärts)
  INSERT INTO matches (
    team_id,
    match_date,
    opponent,
    location,
    venue,
    season,
    players_needed
  )
  SELECT 
    new_team_id,
    '2026-02-28 18:00:00+01',
    'Kölner KHT SW 3',
    'auswärts',
    'Marienburger SC',
    'winter',
    4
  WHERE NOT EXISTS (
    SELECT 1 FROM matches 
    WHERE team_id = new_team_id 
      AND match_date = '2026-02-28 18:00:00+01'
      AND opponent = 'Kölner KHT SW 3'
  );

  -- Match 4: 21.03.2026 - Rodenkirchener TC 1 vs TC Arnoldshöhe 1986 3 (Heim)
  INSERT INTO matches (
    team_id,
    match_date,
    opponent,
    location,
    venue,
    season,
    players_needed
  )
  SELECT 
    new_team_id,
    '2026-03-21 15:00:00+01',
    'TC Arnoldshöhe 1986 3',
    'heim',
    'Tennis-Centrum Immendorf',
    'winter',
    4
  WHERE NOT EXISTS (
    SELECT 1 FROM matches 
    WHERE team_id = new_team_id 
      AND match_date = '2026-03-21 15:00:00+01'
      AND opponent = 'TC Arnoldshöhe 1986 3'
  );

  -- Zähle erstellte Matches
  DECLARE
    match_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO match_count
    FROM matches
    WHERE team_id = new_team_id;
    
    RAISE NOTICE '✅ % Matches für Rodenkirchener TC vorhanden', match_count;
  END;
  RAISE NOTICE '';
  RAISE NOTICE '🎾 Rodenkirchener TC erfolgreich hinzugefügt!';
  RAISE NOTICE 'Verein-ID: %', new_club_id;
  RAISE NOTICE 'Team-ID: %', new_team_id;

END $$;

-- Überprüfe die Ergebnisse
SELECT 
  ti.id as team_id,
  ti.club_name,
  ti.team_name,
  ti.category,
  ti.region,
  ts.season,
  ts.league,
  ts.group_name,
  ts.team_size,
  COUNT(m.id) as match_count
FROM team_info ti
LEFT JOIN team_seasons ts ON ti.id = ts.team_id
LEFT JOIN matches m ON ti.id = m.team_id
WHERE ti.club_name = 'Rodenkirchener TC'
GROUP BY ti.id, ti.club_name, ti.team_name, ti.category, ti.region, ts.season, ts.league, ts.group_name, ts.team_size;

-- Zeige alle Matches
SELECT 
  TO_CHAR(m.match_date, 'DD.MM.YYYY, HH24:MI') as datum,
  m.location as spielort,
  CASE 
    WHEN m.location = 'heim' THEN ti.team_name
    ELSE m.opponent
  END as heim_verein,
  CASE 
    WHEN m.location = 'heim' THEN m.opponent
    ELSE ti.team_name
  END as gastverein,
  m.venue as spielstätte
FROM matches m
INNER JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'Rodenkirchener TC'
ORDER BY m.match_date;


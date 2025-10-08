-- ============================================
-- DELETE_DUPLICATE_RODENKIRCHEN_MATCHES.sql
-- Löscht doppelte Matches für Rodenkirchener TC
-- ============================================

DO $$
DECLARE
  team_uuid UUID;
  deleted_count INTEGER := 0;
  match_record RECORD;
BEGIN
  RAISE NOTICE '🧹 Lösche doppelte Matches für Rodenkirchener TC...';
  
  -- Finde Team-ID
  SELECT t.id INTO team_uuid
  FROM team_info t
  INNER JOIN club_info c ON t.club_id = c.id
  WHERE c.normalized_name = 'rodenkirchenertc'
    AND t.team_name = 'Herren 30 1';
  
  IF team_uuid IS NULL THEN
    RAISE NOTICE '⚠️  Team nicht gefunden!';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Team gefunden: %', team_uuid;
  
  -- Lösche Duplikate, behalte nur das älteste Match pro Datum/Gegner
  WITH duplicates AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY team_id, match_date, opponent 
        ORDER BY created_at ASC  -- Behalte das älteste
      ) as rn
    FROM matches
    WHERE team_id = team_uuid
  )
  DELETE FROM matches
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE '✅ % doppelte Matches gelöscht', deleted_count;
  
  -- Zeige verbleibende Matches
  RAISE NOTICE '';
  RAISE NOTICE '📋 Verbleibende Matches:';
  
  FOR match_record IN
    SELECT 
      TO_CHAR(match_date, 'DD.MM.YYYY, HH24:MI') as datum,
      opponent,
      location,
      venue
    FROM matches
    WHERE team_id = team_uuid
    ORDER BY match_date
  LOOP
    RAISE NOTICE '   % - % (%) @ %', 
      match_record.datum,
      match_record.opponent,
      match_record.location,
      match_record.venue;
  END LOOP;
  
END $$;

-- Zeige finale Match-Liste
SELECT 
  TO_CHAR(m.match_date, 'DD.MM.YYYY, HH24:MI') as datum,
  m.location as spielort,
  CASE 
    WHEN m.location = 'heim' THEN t.team_name
    ELSE m.opponent
  END as heim_verein,
  CASE 
    WHEN m.location = 'heim' THEN m.opponent
    ELSE t.team_name
  END as gastverein,
  m.venue as spielstätte
FROM matches m
INNER JOIN team_info t ON m.team_id = t.id
INNER JOIN club_info c ON t.club_id = c.id
WHERE c.normalized_name = 'rodenkirchenertc'
  AND t.team_name = 'Herren 30 1'
ORDER BY m.match_date;


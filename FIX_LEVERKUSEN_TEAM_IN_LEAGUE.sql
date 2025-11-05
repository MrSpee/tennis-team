-- ==========================================
-- FIX: Ersetze Bayer 04 Leverkusen durch TG Leverkusen
-- ==========================================

-- 1. Zeige beide Teams
SELECT 
  id,
  club_name,
  team_name,
  category
FROM team_info
WHERE club_name ILIKE '%leverkusen%'
  AND category ILIKE '%herren%40%';

-- 2. Lösche falschen Eintrag (Bayer 04 Leverkusen)
DELETE FROM team_seasons
WHERE team_id = '71dbb138-cf75-4da2-883b-6a771d6ebc35'
  AND league = '1. Kreisliga'
  AND group_name = 'Gr. 046';

-- 3. Füge richtigen Eintrag hinzu (TG Leverkusen)
DO $$
BEGIN
  -- Prüfe ob schon vorhanden
  IF EXISTS (
    SELECT 1 FROM team_seasons 
    WHERE team_id = '06ee529a-18cf-4a30-bbe0-f7096314721e'
      AND season = 'Winter 2025/26'
  ) THEN
    -- Update
    UPDATE team_seasons
    SET 
      league = '1. Kreisliga',
      group_name = 'Gr. 046',
      is_active = true,
      updated_at = NOW()
    WHERE team_id = '06ee529a-18cf-4a30-bbe0-f7096314721e'
      AND season = 'Winter 2025/26';
    
    RAISE NOTICE '✅ TG Leverkusen aktualisiert';
  ELSE
    -- Insert
    INSERT INTO team_seasons (team_id, season, league, group_name, team_size, is_active)
    VALUES (
      '06ee529a-18cf-4a30-bbe0-f7096314721e',
      'Winter 2025/26',
      '1. Kreisliga',
      'Gr. 046',
      6,
      true
    );
    
    RAISE NOTICE '✨ TG Leverkusen hinzugefügt';
  END IF;
END $$;

-- 4. Verifiziere
SELECT 
  ti.club_name,
  ti.team_name,
  ts.league,
  ts.group_name,
  ts.season
FROM team_seasons ts
JOIN team_info ti ON ts.team_id = ti.id
WHERE ts.league = '1. Kreisliga'
  AND ts.group_name = 'Gr. 046'
  AND ts.is_active = true
ORDER BY ti.club_name;


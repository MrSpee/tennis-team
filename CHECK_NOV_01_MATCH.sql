-- =====================================================
-- CHECK: 01. Nov Match Details
-- =====================================================

-- Finde das Match vom 01.11.2025
SELECT 
  'Match 01.11.2025 Details' as info,
  m.id,
  m.match_date,
  m.home_team_id,
  m.away_team_id,
  ht.club_name || ' ' || COALESCE(ht.team_name, '') as home_team,
  at.club_name || ' ' || COALESCE(at.team_name, '') as away_team,
  m.venue,
  m.location,
  m.season,
  m.status,
  m.home_score,
  m.away_score,
  m.final_score
FROM matchdays m
LEFT JOIN team_info ht ON ht.id = m.home_team_id
LEFT JOIN team_info at ON at.id = m.away_team_id
WHERE m.match_date::DATE = '2025-11-01'
AND (
  ht.club_name ILIKE '%VKC%' 
  OR at.club_name ILIKE '%VKC%'
  OR ht.club_name ILIKE '%Leverkusen%'
  OR at.club_name ILIKE '%Leverkusen%'
);

-- Zeige match_results für dieses Match
SELECT 
  'Match Results' as info,
  mr.id,
  mr.match_number,
  mr.match_type,
  mr.status,
  mr.winner,
  mr.set1_home,
  mr.set1_guest,
  mr.set2_home,
  mr.set2_guest
FROM match_results mr
WHERE mr.matchday_id IN (
  SELECT id FROM matchdays 
  WHERE match_date::DATE = '2025-11-01'
  AND (
    home_team_id IN (SELECT id FROM team_info WHERE club_name ILIKE '%VKC%')
    OR away_team_id IN (SELECT id FROM team_info WHERE club_name ILIKE '%VKC%')
  )
)
ORDER BY mr.match_number;

-- RESET Scores falls falsch
DO $$
DECLARE
  v_match_id UUID;
  v_match_info RECORD;
BEGIN
  -- Finde Match
  SELECT 
    m.id,
    m.home_score,
    m.away_score,
    ht.club_name as home,
    at.club_name as away
  INTO v_match_info
  FROM matchdays m
  LEFT JOIN team_info ht ON ht.id = m.home_team_id
  LEFT JOIN team_info at ON at.id = m.away_team_id
  WHERE m.match_date::DATE = '2025-11-01'
  AND m.venue ILIKE '%Schloß Morsbroich%'
  LIMIT 1;
  
  IF v_match_info.id IS NULL THEN
    RAISE NOTICE '❌ Match nicht gefunden!';
    RETURN;
  END IF;
  
  RAISE NOTICE '📊 Match gefunden:';
  RAISE NOTICE '  ID: %', v_match_info.id;
  RAISE NOTICE '  Home: % (Score: %)', v_match_info.home, v_match_info.home_score;
  RAISE NOTICE '  Away: % (Score: %)', v_match_info.away, v_match_info.away_score;
  RAISE NOTICE '';
  
  -- Wenn Ergebnis vorhanden ist
  IF v_match_info.home_score > 0 OR v_match_info.away_score > 0 THEN
    RAISE NOTICE '⚠️  Match hat Ergebnis: %:%', v_match_info.home_score, v_match_info.away_score;
    RAISE NOTICE '🔧 Setze auf 0:0 zurück...';
    
    -- Reset scores
    UPDATE matchdays
    SET 
      home_score = 0,
      away_score = 0,
      final_score = NULL,
      status = 'scheduled'
    WHERE id = v_match_info.id;
    
    -- Lösche auch match_results (falls vorhanden)
    DELETE FROM match_results
    WHERE matchday_id = v_match_info.id;
    
    RAISE NOTICE '✅ Scores zurückgesetzt auf 0:0';
    RAISE NOTICE '✅ Match-Results gelöscht';
  ELSE
    RAISE NOTICE '✅ Match hat bereits 0:0 (kein Reset nötig)';
  END IF;
  
END $$;

-- Verification
SELECT 
  '✅ Nach Reset' as info,
  m.match_date::DATE as datum,
  ht.club_name || ' vs ' || at.club_name as match_name,
  m.home_score,
  m.away_score,
  m.status
FROM matchdays m
LEFT JOIN team_info ht ON ht.id = m.home_team_id
LEFT JOIN team_info at ON at.id = m.away_team_id
WHERE m.match_date::DATE = '2025-11-01'
AND m.venue ILIKE '%Schloß Morsbroich%';


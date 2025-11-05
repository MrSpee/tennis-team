-- ============================================
-- UPDATE RPC FOR COURT RANGE
-- ============================================
-- Passt get_shoe_recommendation_for_match an
-- Gibt jetzt court_number + court_number_end zurück
-- ============================================

CREATE OR REPLACE FUNCTION get_shoe_recommendation_for_match(p_matchday_id UUID)
RETURNS TABLE (
  venue_name TEXT,
  court_number INTEGER,
  court_number_end INTEGER,  -- ✅ NEU!
  surface_name TEXT,
  icon_emoji TEXT,
  color_hex TEXT,
  shoe_recommendation TEXT,
  speed_rating INTEGER,
  bounce_rating INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.name::TEXT as venue_name,
    m.court_number,
    m.court_number_end,  -- ✅ NEU!
    st.name::TEXT as surface_name,
    st.icon_emoji::TEXT,
    st.color_hex::TEXT,
    st.shoe_recommendation::TEXT,
    st.speed_rating,
    st.bounce_rating
  FROM matchdays m
  JOIN venues v ON v.id = m.venue_id
  LEFT JOIN venue_courts vc ON vc.venue_id = v.id AND vc.court_number = m.court_number
  LEFT JOIN surface_types st ON st.id = vc.surface_type_id
  WHERE m.id = p_matchday_id
  LIMIT 1;
END;
$$;

-- Test die Funktion
SELECT 
  '✅ RPC FUNKTION GETESTET' as info,
  *
FROM get_shoe_recommendation_for_match(
  (SELECT id FROM matchdays WHERE court_number IS NOT NULL LIMIT 1)
);




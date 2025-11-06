-- ============================================
-- SETUP SURFACE INFO FÜR VKC KÖLN HERREN 55
-- ============================================

-- 1️⃣ RPC Funktion erstellen (mit SECURITY DEFINER!)
DROP FUNCTION IF EXISTS get_shoe_recommendation_for_match(UUID);

CREATE OR REPLACE FUNCTION get_shoe_recommendation_for_match(p_matchday_id UUID)
RETURNS TABLE (
  venue_name TEXT,
  court_number INTEGER,
  court_number_end INTEGER,
  surface_name TEXT,
  icon_emoji TEXT,
  color_hex TEXT,
  shoe_recommendation TEXT,
  speed_rating INTEGER,
  bounce_rating INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.name::TEXT as venue_name,
    m.court_number,
    m.court_number_end,
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

-- 2️⃣ Erstelle venue_courts für TH Schloß Morsbroich (alle Plätze = Teppich)
INSERT INTO venue_courts (venue_id, court_number, surface_type_id)
SELECT 
  '7a0d9168-de69-47e0-b05e-9e5201c92418'::uuid,
  i,
  '631417ee-713e-4c4b-870a-38a92ca2c226'::uuid  -- Teppich
FROM generate_series(1, 8) i
ON CONFLICT (venue_id, court_number) DO NOTHING;

-- 3️⃣ Test
SELECT 
  '✅ RPC TEST' as info,
  *
FROM get_shoe_recommendation_for_match('a83c44f0-1e0f-4aba-8999-138399f56c81'::uuid);





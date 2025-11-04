-- ============================================
-- VENUES & SURFACE SYSTEM V2
-- ============================================
-- GRANULARE Belag-Speicherung pro Platz!
-- Automatische Schuh-Empfehlung basierend auf court_number
-- ============================================

-- ====================================
-- 1️⃣ SURFACE TYPES (Belag-Typen)
-- ====================================

CREATE TABLE IF NOT EXISTS surface_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Belag-Info
  name TEXT UNIQUE NOT NULL,
  name_en TEXT,
  description TEXT,
  
  -- Schuh-Empfehlungen
  shoe_recommendation TEXT NOT NULL,
  shoe_type TEXT NOT NULL CHECK (shoe_type IN ('smooth', 'profile', 'both')),
  
  -- Eigenschaften
  speed_rating INTEGER CHECK (speed_rating BETWEEN 1 AND 5),
  bounce_rating INTEGER CHECK (bounce_rating BETWEEN 1 AND 5),
  is_indoor BOOLEAN DEFAULT true,
  
  -- Icon & Farbe
  icon_emoji TEXT DEFAULT '🎾',
  color_hex TEXT DEFAULT '#3b82f6',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surface_types_name ON surface_types(name);

-- ====================================
-- 2️⃣ VENUES (Hallen)
-- ====================================

CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basis-Info
  vnr TEXT UNIQUE,                               -- TVM Hallen-Nummer
  name TEXT NOT NULL,
  club_name TEXT,
  
  -- Adresse
  street TEXT,
  postal_code TEXT,
  city TEXT,
  region TEXT DEFAULT 'Mittelrhein',
  
  -- Koordinaten
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Platz-Info (Übersicht)
  court_count INTEGER DEFAULT 1,
  indoor BOOLEAN DEFAULT true,
  
  -- Zusatz
  has_parking BOOLEAN DEFAULT false,
  has_restaurant BOOLEAN DEFAULT false,
  has_pro_shop BOOLEAN DEFAULT false,
  notes TEXT,
  
  -- Kontakt
  phone TEXT,
  email TEXT,
  website TEXT,
  
  -- Meta
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venues_club ON venues(club_name);
CREATE INDEX IF NOT EXISTS idx_venues_city ON venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_region ON venues(region);
CREATE INDEX IF NOT EXISTS idx_venues_vnr ON venues(vnr);

COMMENT ON TABLE venues IS 'Tennishallen/Plätze';

-- ====================================
-- 3️⃣ VENUE_COURTS (Einzelne Plätze!)
-- ====================================

CREATE TABLE IF NOT EXISTS venue_courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Zuordnung
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  court_number INTEGER NOT NULL,                 -- 1, 2, 3, ..., 8
  
  -- Belag (pro Platz!)
  surface_type_id UUID NOT NULL REFERENCES surface_types(id),
  
  -- Platz-Status
  is_available BOOLEAN DEFAULT true,
  notes TEXT,                                     -- z.B. "Platz 5 derzeit gesperrt"
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_venue_court UNIQUE(venue_id, court_number)
);

CREATE INDEX IF NOT EXISTS idx_venue_courts_venue ON venue_courts(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_courts_surface ON venue_courts(surface_type_id);
CREATE INDEX IF NOT EXISTS idx_venue_courts_number ON venue_courts(venue_id, court_number);

COMMENT ON TABLE venue_courts IS 'Einzelne Plätze pro Venue mit spezifischem Belag';
COMMENT ON COLUMN venue_courts.court_number IS 'Platz-Nummer (1, 2, 3, ...)';

-- ====================================
-- 4️⃣ MATCHDAYS ERWEITERN
-- ====================================

ALTER TABLE matchdays 
ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id);

ALTER TABLE matchdays 
ADD COLUMN IF NOT EXISTS court_number INTEGER;

CREATE INDEX IF NOT EXISTS idx_matchdays_venue ON matchdays(venue_id);
CREATE INDEX IF NOT EXISTS idx_matchdays_court ON matchdays(venue_id, court_number);

COMMENT ON COLUMN matchdays.venue_id IS 'Verweis auf venues (Halle)';
COMMENT ON COLUMN matchdays.court_number IS 'Genauer Platz (1-8), kann NULL sein wenn unbekannt';

-- ====================================
-- 5️⃣ DEFAULT SURFACE TYPES
-- ====================================

INSERT INTO surface_types (name, name_en, description, shoe_recommendation, shoe_type, speed_rating, bounce_rating, icon_emoji, color_hex)
VALUES
  ('Teppich', 'Carpet', 'Klassischer Hallenbelag, schnell', 'Hallenschuhe mit glatter Sohle PFLICHT', 'smooth', 5, 2, '🟦', '#3b82f6'),
  ('Supreme', 'Supreme', 'Premium Teppich', 'Hallenschuhe mit glatter Sohle PFLICHT', 'smooth', 5, 2, '🟦', '#6366f1'),
  ('Taraflex', 'Taraflex', 'Synthetik-Kunststoff', 'Hallenschuhe mit glatter Sohle empfohlen', 'smooth', 4, 3, '🟩', '#10b981'),
  ('Strukturvelour', 'Structured Velour', 'Strukturierter Teppich mit Textur', 'Hallenschuhe mit glatter Sohle empfohlen', 'smooth', 4, 2, '🟦', '#6366f1'),
  ('Granulat', 'Granulate', 'Sandähnlich', 'Sandplatzschuhe mit Profil oder Allcourt', 'profile', 3, 3, '🟨', '#f59e0b'),
  ('Asche', 'Clay', 'Roter Sandplatz', 'Sandplatzschuhe mit Fischgrätenprofil', 'profile', 2, 4, '🟧', '#f97316'),
  ('Rebound Ace', 'Rebound Ace', 'Acryl-Hartplatz (Australian Open)', 'Hartplatzschuhe mit Profil', 'profile', 4, 3, '💙', '#0ea5e9'),
  ('Laykold', 'Laykold', 'Acryl-Hartplatz (US Open)', 'Hartplatzschuhe mit Profil', 'profile', 4, 3, '💚', '#14b8a6'),
  ('DecoTurf', 'DecoTurf', 'Acryl-Hartplatz', 'Hartplatzschuhe mit Profil', 'profile', 3, 3, '🔵', '#2563eb'),
  ('Kunststoff', 'Synthetic', 'Allgemeiner Kunststoff', 'Allcourt-Schuhe', 'both', 3, 3, '⚪', '#6b7280'),
  ('Unbekannt', 'Unknown', 'Belag unbekannt', 'Allcourt-Schuhe zur Sicherheit', 'both', 3, 3, '❓', '#9ca3af')
ON CONFLICT (name) DO NOTHING;

-- ====================================
-- 6️⃣ HELPER FUNCTIONS
-- ====================================

-- Hole Schuh-Empfehlung für Match (mit court_number!)
CREATE OR REPLACE FUNCTION get_shoe_recommendation_for_match(p_matchday_id UUID)
RETURNS TABLE (
  venue_name TEXT,
  court_number INTEGER,
  surface_name TEXT,
  shoe_recommendation TEXT,
  shoe_type TEXT,
  icon TEXT,
  has_specific_court BOOLEAN
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.name,
    m.court_number,
    st.name,
    st.shoe_recommendation,
    st.shoe_type,
    st.icon_emoji,
    (m.court_number IS NOT NULL AND vc.id IS NOT NULL) as has_specific_court
  FROM matchdays m
  JOIN venues v ON v.id = m.venue_id
  LEFT JOIN venue_courts vc ON vc.venue_id = m.venue_id AND vc.court_number = m.court_number
  LEFT JOIN surface_types st ON st.id = COALESCE(vc.surface_type_id, 
    (SELECT surface_type_id FROM venue_courts WHERE venue_id = m.venue_id LIMIT 1))  -- Fallback: Erster Platz
  WHERE m.id = p_matchday_id;
END;
$$;

COMMENT ON FUNCTION get_shoe_recommendation_for_match IS 
  'Gibt Schuh-Empfehlung basierend auf EXAKTEM Platz (court_number) zurück. Fallback wenn court_number unbekannt.';

-- Hole alle Plätze einer Venue
CREATE OR REPLACE FUNCTION get_venue_courts_summary(p_venue_id UUID)
RETURNS TABLE (
  court_number INTEGER,
  surface_name TEXT,
  surface_icon TEXT,
  shoe_type TEXT
)
LANGUAGE SQL STABLE
AS $$
  SELECT 
    vc.court_number,
    st.name,
    st.icon_emoji,
    st.shoe_type
  FROM venue_courts vc
  JOIN surface_types st ON st.id = vc.surface_type_id
  WHERE vc.venue_id = p_venue_id
  ORDER BY vc.court_number;
$$;

-- Prüfe ob Venue gemischte Beläge hat
CREATE OR REPLACE FUNCTION has_mixed_surfaces(p_venue_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT COUNT(DISTINCT surface_type_id) > 1
  FROM venue_courts
  WHERE venue_id = p_venue_id;
$$;

-- ====================================
-- 7️⃣ RLS POLICIES
-- ====================================

ALTER TABLE surface_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_courts ENABLE ROW LEVEL SECURITY;

-- Alle können lesen
CREATE POLICY "surface_types_select_all" ON surface_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "venues_select_all" ON venues FOR SELECT TO authenticated USING (true);
CREATE POLICY "venue_courts_select_all" ON venue_courts FOR SELECT TO authenticated USING (true);

-- Nur Super-Admins können schreiben
CREATE POLICY "surface_types_insert_super_admin" ON surface_types FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM players_unified WHERE user_id = auth.uid() AND is_super_admin = true));

CREATE POLICY "venues_insert_super_admin" ON venues FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM players_unified WHERE user_id = auth.uid() AND is_super_admin = true));

CREATE POLICY "venues_update_super_admin" ON venues FOR UPDATE TO authenticated
  USING (EXISTS(SELECT 1 FROM players_unified WHERE user_id = auth.uid() AND is_super_admin = true));

CREATE POLICY "venue_courts_insert_super_admin" ON venue_courts FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM players_unified WHERE user_id = auth.uid() AND is_super_admin = true));

CREATE POLICY "venue_courts_update_super_admin" ON venue_courts FOR UPDATE TO authenticated
  USING (EXISTS(SELECT 1 FROM players_unified WHERE user_id = auth.uid() AND is_super_admin = true));

-- ====================================
-- 8️⃣ VERIFICATION
-- ====================================

DO $$
DECLARE
  v_surface_count INTEGER;
  v_venue_count INTEGER;
  v_court_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_surface_count FROM surface_types;
  SELECT COUNT(*) INTO v_venue_count FROM venues;
  SELECT COUNT(*) INTO v_court_count FROM venue_courts;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ VENUES & SURFACE SYSTEM V2 ERSTELLT!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 STATISTIKEN:';
  RAISE NOTICE '   - Surface Types: %', v_surface_count;
  RAISE NOTICE '   - Venues: %', v_venue_count;
  RAISE NOTICE '   - Einzelne Plätze: %', v_court_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 VORTEILE:';
  RAISE NOTICE '   ✅ Jeder Platz hat spezifischen Belag';
  RAISE NOTICE '   ✅ Automatische Schuh-Empfehlung';
  RAISE NOTICE '   ✅ Gemischte Beläge unterstützt';
  RAISE NOTICE '   ✅ Match → Platz → Belag (1 Query)';
  RAISE NOTICE '';
END $$;

-- Zeige Surface Types
SELECT 
  '📋 SURFACE TYPES' as info,
  name,
  shoe_recommendation,
  shoe_type,
  icon_emoji
FROM surface_types
ORDER BY 
  CASE shoe_type 
    WHEN 'smooth' THEN 1 
    WHEN 'profile' THEN 2 
    WHEN 'both' THEN 3 
  END,
  name;


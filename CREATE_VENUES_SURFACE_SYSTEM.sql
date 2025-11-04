-- ============================================
-- VENUES & SURFACE SYSTEM
-- ============================================
-- Hallenplan mit Belag-Info und Schuh-Empfehlungen
-- ============================================

-- ====================================
-- 1️⃣ SURFACE TYPES (Belag-Typen)
-- ====================================

CREATE TABLE IF NOT EXISTS surface_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Belag-Info
  name TEXT UNIQUE NOT NULL,                    -- z.B. 'Teppich', 'Granulat'
  name_en TEXT,                                  -- Englischer Name (optional)
  description TEXT,                              -- Beschreibung
  
  -- Schuh-Empfehlungen
  shoe_recommendation TEXT NOT NULL,             -- z.B. 'Hallenschuhe mit glatter Sohle'
  shoe_type TEXT NOT NULL CHECK (shoe_type IN ('smooth', 'profile', 'both')),  -- 'smooth' = glatt, 'profile' = Profil
  
  -- Eigenschaften
  speed_rating INTEGER CHECK (speed_rating BETWEEN 1 AND 5),  -- 1=langsam, 5=schnell
  bounce_rating INTEGER CHECK (bounce_rating BETWEEN 1 AND 5), -- 1=niedrig, 5=hoch
  is_indoor BOOLEAN DEFAULT true,                -- Indoor oder Outdoor
  
  -- Icon & Farbe für UI
  icon_emoji TEXT DEFAULT '🎾',
  color_hex TEXT DEFAULT '#3b82f6',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surface_types_name ON surface_types(name);

COMMENT ON TABLE surface_types IS 'Belag-Typen mit Schuh-Empfehlungen';
COMMENT ON COLUMN surface_types.shoe_type IS 'smooth = glatte Sohle | profile = Profil | both = beides möglich';

-- ====================================
-- 2️⃣ VENUES (Hallen/Plätze)
-- ====================================

CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basis-Info
  name TEXT NOT NULL,                            -- z.B. 'TH Schloß Morsbroich'
  club_name TEXT,                                -- Zugehöriger Verein (optional)
  
  -- Adresse
  street TEXT,
  postal_code TEXT,
  city TEXT,
  region TEXT DEFAULT 'Mittelrhein',
  
  -- Koordinaten (für Maps später)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Platz-Details
  primary_surface_id UUID REFERENCES surface_types(id),  -- Haupt-Belag (häufigster)
  surface_details TEXT,                          -- Detailliert: "1-4 Teppich, 5-7 Laykold"
  court_count INTEGER DEFAULT 1,                 -- Anzahl Plätze
  indoor BOOLEAN DEFAULT true,                   -- Indoor oder Outdoor
  
  -- VNR (TVM Hallen-Nummer)
  vnr TEXT UNIQUE,                               -- z.B. '1002', '2097'
  
  -- Zusatz-Infos
  has_parking BOOLEAN DEFAULT false,
  has_restaurant BOOLEAN DEFAULT false,
  has_pro_shop BOOLEAN DEFAULT false,
  notes TEXT,
  
  -- Kontakt
  phone TEXT,
  email TEXT,
  website TEXT,
  
  -- Meta
  is_verified BOOLEAN DEFAULT false,             -- Von Admin verifiziert
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venues_club ON venues(club_name);
CREATE INDEX IF NOT EXISTS idx_venues_city ON venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_surface ON venues(primary_surface_id);
CREATE INDEX IF NOT EXISTS idx_venues_region ON venues(region);
CREATE INDEX IF NOT EXISTS idx_venues_vnr ON venues(vnr);

COMMENT ON TABLE venues IS 'Hallen und Tennisplätze mit Belag-Info';
COMMENT ON COLUMN venues.primary_surface_id IS 'Haupt-Belag (häufigster Belag in dieser Halle)';
COMMENT ON COLUMN venues.surface_details IS 'Detaillierte Belag-Info pro Platz, z.B. "1-4 Teppich, 5-7 Laykold"';
COMMENT ON COLUMN venues.vnr IS 'TVM Hallen-Nummer (Vereinsnummer)';

-- ====================================
-- 3️⃣ LINK MATCHDAYS → VENUES
-- ====================================

-- Füge venue_id zu matchdays hinzu (falls noch nicht vorhanden)
ALTER TABLE matchdays 
ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id);

CREATE INDEX IF NOT EXISTS idx_matchdays_venue ON matchdays(venue_id);

COMMENT ON COLUMN matchdays.venue_id IS 'Verweis auf venues Tabelle für Hallen-Info und Belag';

-- ====================================
-- 4️⃣ DEFAULT SURFACE TYPES
-- ====================================

INSERT INTO surface_types (name, name_en, description, shoe_recommendation, shoe_type, speed_rating, bounce_rating, icon_emoji, color_hex)
VALUES
  -- Teppich-Beläge (glatte Sohle)
  ('Teppich', 'Carpet', 'Klassischer Hallenbelag, schnell und rutschig', 'Hallenschuhe mit glatter Sohle PFLICHT', 'smooth', 5, 2, '🟦', '#3b82f6'),
  ('Supreme', 'Supreme Carpet', 'Hochwertiger Teppichbelag, sehr schnell', 'Hallenschuhe mit glatter Sohle PFLICHT', 'smooth', 5, 2, '🟦', '#6366f1'),
  ('Taraflex', 'Taraflex', 'Synthetischer Kunststoffbelag, ähnlich Teppich', 'Hallenschuhe mit glatter Sohle empfohlen', 'smooth', 4, 3, '🟩', '#10b981'),
  
  -- Granulat/Sand-Beläge (Profil möglich)
  ('Granulat', 'Granulate', 'Sandähnlicher Belag, mittlere Geschwindigkeit', 'Sandplatzschuhe mit Profil oder Allcourt', 'profile', 3, 3, '🟨', '#f59e0b'),
  ('Asche', 'Clay', 'Roter Sandplatz (selten in Halle)', 'Sandplatzschuhe mit Fischgrätenprofil', 'profile', 2, 4, '🟧', '#f97316'),
  
  -- Hartplatz-Beläge (Profil empfohlen)
  ('Rebound Ace', 'Rebound Ace', 'Acryl-Hartplatz (Australian Open)', 'Hartplatzschuhe mit Profil', 'profile', 4, 3, '💙', '#0ea5e9'),
  ('Laykold', 'Laykold', 'Acryl-Hartplatz (US Open)', 'Hartplatzschuhe mit Profil', 'profile', 4, 3, '💚', '#14b8a6'),
  ('DecoTurf', 'DecoTurf', 'Acryl-Hartplatz, mittlere Geschwindigkeit', 'Hartplatzschuhe mit Profil', 'profile', 3, 3, '🔵', '#2563eb'),
  
  -- Universal
  ('Kunststoff', 'Synthetic', 'Allgemeiner Kunststoffbelag', 'Allcourt-Schuhe', 'both', 3, 3, '⚪', '#6b7280'),
  ('Unbekannt', 'Unknown', 'Belag nicht bekannt', 'Allcourt-Schuhe zur Sicherheit', 'both', 3, 3, '❓', '#9ca3af')

ON CONFLICT (name) DO NOTHING;

-- ====================================
-- 5️⃣ HELPER FUNCTIONS
-- ====================================

-- Hole Schuh-Empfehlung für ein Match
CREATE OR REPLACE FUNCTION get_shoe_recommendation(p_matchday_id UUID)
RETURNS TABLE (
  venue_name TEXT,
  surface_name TEXT,
  surface_details TEXT,
  shoe_recommendation TEXT,
  shoe_type TEXT,
  icon TEXT
)
LANGUAGE SQL STABLE
AS $$
  SELECT 
    v.name,
    st.name,
    v.surface_details,
    st.shoe_recommendation,
    st.shoe_type,
    st.icon_emoji
  FROM matchdays m
  JOIN venues v ON v.id = m.venue_id
  JOIN surface_types st ON st.id = v.primary_surface_id
  WHERE m.id = p_matchday_id;
$$;

-- Hole alle Venues mit Belag-Info
CREATE OR REPLACE FUNCTION get_venues_with_surface()
RETURNS TABLE (
  venue_id UUID,
  venue_name TEXT,
  club_name TEXT,
  city TEXT,
  surface_name TEXT,
  surface_details TEXT,
  shoe_recommendation TEXT,
  shoe_type TEXT
)
LANGUAGE SQL STABLE
AS $$
  SELECT 
    v.id,
    v.name,
    v.club_name,
    v.city,
    st.name,
    v.surface_details,
    st.shoe_recommendation,
    st.shoe_type
  FROM venues v
  LEFT JOIN surface_types st ON st.id = v.primary_surface_id
  ORDER BY v.name;
$$;

-- ====================================
-- 6️⃣ RLS POLICIES
-- ====================================

ALTER TABLE surface_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Alle können lesen (öffentliche Info)
CREATE POLICY "surface_types_select_all"
  ON surface_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "venues_select_all"
  ON venues FOR SELECT TO authenticated USING (true);

-- Nur Super-Admins können erstellen/ändern
CREATE POLICY "surface_types_insert_super_admin"
  ON surface_types FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS(SELECT 1 FROM players_unified WHERE user_id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "venues_insert_super_admin"
  ON venues FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS(SELECT 1 FROM players_unified WHERE user_id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "venues_update_super_admin"
  ON venues FOR UPDATE TO authenticated
  USING (
    EXISTS(SELECT 1 FROM players_unified WHERE user_id = auth.uid() AND is_super_admin = true)
  );

-- ====================================
-- 7️⃣ VERIFICATION
-- ====================================

DO $$
DECLARE
  v_surface_count INTEGER;
  v_venue_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_surface_count FROM surface_types;
  SELECT COUNT(*) INTO v_venue_count FROM venues;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ VENUES & SURFACE SYSTEM ERSTELLT!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 STATISTIKEN:';
  RAISE NOTICE '   - Surface Types: %', v_surface_count;
  RAISE NOTICE '   - Venues: %', v_venue_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 BELAG-TYPEN:';
  RAISE NOTICE '   🟦 Teppich (glatte Sohle PFLICHT)';
  RAISE NOTICE '   🟦 Supreme (glatte Sohle PFLICHT)';
  RAISE NOTICE '   🟩 Taraflex (glatte Sohle empfohlen)';
  RAISE NOTICE '   🟨 Granulat (Profil möglich)';
  RAISE NOTICE '   🟧 Asche (Profil empfohlen)';
  RAISE NOTICE '   💙 Rebound Ace (Profil empfohlen)';
  RAISE NOTICE '   💚 Laykold (Profil empfohlen)';
  RAISE NOTICE '   🔵 DecoTurf (Profil empfohlen)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SICHERHEIT:';
  RAISE NOTICE '   ✅ RLS Policies aktiviert';
  RAISE NOTICE '   ✅ Nur Super-Admins können Venues erstellen';
  RAISE NOTICE '';
END $$;

-- Zeige alle Surface Types
SELECT 
  name,
  shoe_recommendation,
  shoe_type,
  speed_rating,
  icon_emoji
FROM surface_types
ORDER BY 
  CASE shoe_type 
    WHEN 'smooth' THEN 1 
    WHEN 'profile' THEN 2 
    WHEN 'both' THEN 3 
  END,
  name;


-- ================================================================
-- TRAINING SYSTEM SETUP für SV Rot-Gelb Sürth
-- ================================================================
-- Erstellt Tabellen für flexibles Training-Management
-- - Öffentliche Trainings (draußen, Mittwochs)
-- - Private Trainings (Halle, flexibel)
-- - Verfügbarkeits-System wie bei Matchdays
-- ================================================================

-- 1. TRAINING SESSIONS (Konkrete Trainings-Termine)
-- ================================================================
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES team_info(id),
  
  -- Termin-Details
  date TIMESTAMP NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  duration INTEGER, -- Minuten
  
  -- Location
  location TEXT NOT NULL, -- "Draußen" / "Halle" / Custom
  venue TEXT, -- "Tennishalle Sürth" / "Sportplatz"
  address TEXT,
  
  -- Training-Typ
  type TEXT NOT NULL DEFAULT 'public', -- "public" / "private"
  is_public BOOLEAN DEFAULT true, -- Private können öffentlich gemacht werden
  
  -- Organisator & Teilnehmer
  organizer_id UUID REFERENCES players(id),
  max_players INTEGER DEFAULT 8,
  target_players INTEGER DEFAULT 8, -- Ideale Anzahl (gerade Zahl)
  
  -- Status
  status TEXT DEFAULT 'scheduled', -- "scheduled" / "cancelled" / "completed"
  needs_substitute BOOLEAN DEFAULT false, -- "Spieler gesucht"
  weather_dependent BOOLEAN DEFAULT true, -- Wetterabhängig (draußen)
  
  -- Zusätzliche Infos
  title TEXT,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  CONSTRAINT valid_type CHECK (type IN ('public', 'private')),
  CONSTRAINT valid_max_players CHECK (max_players >= 2 AND max_players <= 12),
  CONSTRAINT valid_target_players CHECK (target_players >= 2 AND target_players <= max_players)
);

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON training_sessions(date);
CREATE INDEX IF NOT EXISTS idx_training_sessions_team ON training_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_status ON training_sessions(status);

-- 2. TRAINING ATTENDANCE (Zu-/Absagen)
-- ================================================================
CREATE TABLE IF NOT EXISTS training_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- "confirmed" / "declined" / "pending" / "substitute"
  response_date TIMESTAMP DEFAULT NOW(),
  
  -- Kommentar
  comment TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_attendance_status CHECK (status IN ('confirmed', 'declined', 'pending', 'substitute')),
  CONSTRAINT unique_player_per_session UNIQUE(session_id, player_id)
);

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_training_attendance_session ON training_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_training_attendance_player ON training_attendance(player_id);
CREATE INDEX IF NOT EXISTS idx_training_attendance_status ON training_attendance(status);

-- 3. TRAINING TEMPLATES (Wiederkehrende Termine - Optional für später)
-- ================================================================
CREATE TABLE IF NOT EXISTS training_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES team_info(id),
  
  -- Template-Info
  name TEXT NOT NULL, -- "Mittwoch Training"
  description TEXT,
  
  -- Wiederkehrung
  weekday INTEGER, -- 0=Sonntag, 3=Mittwoch, etc.
  start_time TIME NOT NULL,
  end_time TIME,
  duration INTEGER,
  
  -- Standard-Settings
  location TEXT NOT NULL,
  venue TEXT,
  type TEXT NOT NULL DEFAULT 'public',
  max_players INTEGER DEFAULT 8,
  target_players INTEGER DEFAULT 8,
  weather_dependent BOOLEAN DEFAULT true,
  
  -- Organisator
  organizer_id UUID REFERENCES players(id),
  
  -- Aktiv/Inaktiv
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_weekday CHECK (weekday >= 0 AND weekday <= 6)
);

-- 4. RLS POLICIES (Row Level Security)
-- ================================================================

-- Training Sessions: Lösche alte Policies falls vorhanden
DROP POLICY IF EXISTS "Allow all authenticated users to read training sessions" ON training_sessions;
DROP POLICY IF EXISTS "Allow captains and organizers to manage training sessions" ON training_sessions;

-- Enable RLS
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to read training sessions"
  ON training_sessions FOR SELECT
  TO authenticated
  USING (true);

-- Nur Captain/Organizer kann erstellen/editieren
CREATE POLICY "Allow captains and organizers to manage training sessions"
  ON training_sessions FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM players WHERE role = 'captain'
    )
    OR organizer_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- Training Attendance: Lösche alte Policies falls vorhanden
DROP POLICY IF EXISTS "Allow users to read all attendance" ON training_attendance;
DROP POLICY IF EXISTS "Allow users to manage their own attendance" ON training_attendance;
DROP POLICY IF EXISTS "Allow users to update their own attendance" ON training_attendance;

-- Enable RLS
ALTER TABLE training_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read all attendance"
  ON training_attendance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to manage their own attendance"
  ON training_attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow users to update their own attendance"
  ON training_attendance FOR UPDATE
  TO authenticated
  USING (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- Training Templates: Lösche alte Policies falls vorhanden
DROP POLICY IF EXISTS "Allow authenticated users to read templates" ON training_templates;
DROP POLICY IF EXISTS "Allow captains to manage templates" ON training_templates;

-- Enable RLS
ALTER TABLE training_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read templates"
  ON training_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow captains to manage templates"
  ON training_templates FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM players WHERE role = 'captain'
    )
  );

-- ================================================================
-- DEMO-DATEN: Nächste Trainings erstellen
-- ================================================================

DO $$
DECLARE
  v_team_id UUID;
  v_captain_id UUID;
  next_wednesday DATE;
BEGIN
  -- Finde Team
  SELECT id INTO v_team_id FROM team_info WHERE club_name = 'SV Rot-Gelb Sürth' LIMIT 1;
  
  -- Finde Captain
  SELECT id INTO v_captain_id FROM players WHERE role = 'captain' LIMIT 1;
  
  -- Berechne nächsten Mittwoch
  next_wednesday := CURRENT_DATE + ((3 - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 7) % 7)::INTEGER;
  IF next_wednesday = CURRENT_DATE THEN
    next_wednesday := next_wednesday + 7;
  END IF;
  
  -- Erstelle öffentliches Training (Mittwoch)
  INSERT INTO training_sessions (
    team_id,
    date,
    start_time,
    end_time,
    duration,
    location,
    venue,
    type,
    is_public,
    organizer_id,
    max_players,
    target_players,
    weather_dependent,
    title,
    notes
  ) VALUES (
    v_team_id,
    next_wednesday + TIME '17:00:00',
    '17:00:00',
    '19:00:00',
    120,
    'Draußen',
    'Tennisplatz SV Rot-Gelb Sürth',
    'public',
    true,
    v_captain_id,
    8,
    8,
    true,
    'Mittwoch Training',
    'Wetterabhängig! Bei Regen fällt das Training aus.'
  );
  
  -- Erstelle privates Training (Halle)
  INSERT INTO training_sessions (
    team_id,
    date,
    start_time,
    end_time,
    duration,
    location,
    venue,
    type,
    is_public,
    organizer_id,
    max_players,
    target_players,
    weather_dependent,
    title,
    notes,
    needs_substitute
  ) VALUES (
    v_team_id,
    next_wednesday + 2 + TIME '19:00:00', -- Freitag
    '19:00:00',
    '21:00:00',
    120,
    'Halle',
    'Tennishalle Köln-Sürth',
    'private',
    true, -- Öffentlich gemacht
    v_captain_id,
    4,
    4,
    false,
    'Privates Hallen-Training',
    'Noch 1 Spieler gesucht!',
    true -- Spieler gesucht
  );
  
  RAISE NOTICE '✅ Demo-Trainings erstellt für nächsten Mittwoch (%) und Freitag', next_wednesday;
END $$;

-- ================================================================
-- PRÜFUNG: Zeige erstellte Trainings
-- ================================================================
SELECT 
  ts.id,
  ts.title,
  ts.date,
  ts.start_time,
  ts.location,
  ts.type,
  ts.max_players,
  ts.needs_substitute,
  p.name as organizer
FROM training_sessions ts
LEFT JOIN players p ON ts.organizer_id = p.id
ORDER BY ts.date;

-- ================================================================
-- FERTIG! 🎾
-- ================================================================
-- Nächste Schritte:
-- 1. Trainingsseite erstellen (React Component)
-- 2. Zu-/Absage System implementieren
-- 3. WhatsApp-Share für "Spieler gesucht"
-- 4. Dashboard-Teaser hinzufügen
-- ================================================================


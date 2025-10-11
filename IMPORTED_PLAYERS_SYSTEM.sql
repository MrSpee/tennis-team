-- ============================================================
-- IMPORTED PLAYERS SYSTEM
-- ============================================================
-- Zweck: Spieler aus TVM-Imports speichern (OHNE user_id)
-- Later: Smart-Matching beim Onboarding
-- ============================================================

-- 1. Neue Tabelle: imported_players
CREATE TABLE IF NOT EXISTS public.imported_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basis-Daten (aus TVM-Import)
  name TEXT NOT NULL,
  import_lk TEXT, -- LK bei Import (Saison-Start, fix)
  tvm_id_number TEXT, -- TVM ID-Nummer (z.B. "17160158")
  
  -- Team-Zuordnung
  team_id UUID REFERENCES team_info(id) ON DELETE CASCADE,
  
  -- Import-Metadaten
  position INTEGER, -- Position in Meldeliste
  is_captain BOOLEAN DEFAULT false,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  imported_by UUID REFERENCES auth.users(id), -- Wer hat importiert
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending' | 'merged' | 'rejected'
  merged_to_player_id UUID REFERENCES players(id), -- Falls gemerged
  merged_at TIMESTAMP WITH TIME ZONE,
  
  -- Zusätzliche Infos
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_imported_players_name ON imported_players(name);
CREATE INDEX IF NOT EXISTS idx_imported_players_team ON imported_players(team_id);
CREATE INDEX IF NOT EXISTS idx_imported_players_status ON imported_players(status);
CREATE INDEX IF NOT EXISTS idx_imported_players_tvm_id ON imported_players(tvm_id_number);

-- 3. RLS Policies (OFFEN für Super-Admins)
ALTER TABLE imported_players ENABLE ROW LEVEL SECURITY;

-- Policy 1: Jeder kann lesen (für Onboarding-Suche)
CREATE POLICY "Anyone can read imported players"
  ON imported_players
  FOR SELECT
  USING (true);

-- Policy 2: Nur Super-Admins können einfügen
CREATE POLICY "Super-admins can insert imported players"
  ON imported_players
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE user_id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Policy 3: Super-Admins können updaten
CREATE POLICY "Super-admins can update imported players"
  ON imported_players
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE user_id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Policy 4: Super-Admins können löschen
CREATE POLICY "Super-admins can delete imported players"
  ON imported_players
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE user_id = auth.uid()
      AND is_super_admin = true
    )
  );

-- 4. Funktion: Merge imported_player zu players
CREATE OR REPLACE FUNCTION merge_imported_player(
  p_imported_player_id UUID,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_imported_player RECORD;
  v_new_player_id UUID;
BEGIN
  -- Hole imported_player Daten
  SELECT * INTO v_imported_player
  FROM imported_players
  WHERE id = p_imported_player_id
  AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Imported player not found or already merged';
  END IF;
  
  -- Erstelle neuen players Eintrag
  INSERT INTO players (
    user_id,
    name,
    season_start_lk,  -- Import-LK wird zur season_start_lk!
    current_lk,       -- Gleich wie season_start_lk (wird später aktualisiert)
    role,
    is_active,
    points
  ) VALUES (
    p_user_id,
    v_imported_player.name,
    v_imported_player.import_lk,
    v_imported_player.import_lk, -- Initial gleich
    CASE WHEN v_imported_player.is_captain THEN 'captain' ELSE 'player' END,
    true,
    0
  )
  RETURNING id INTO v_new_player_id;
  
  -- Kopiere Team-Zuordnung
  IF v_imported_player.team_id IS NOT NULL THEN
    INSERT INTO player_teams (
      player_id,
      team_id,
      role,
      is_primary
    ) VALUES (
      v_new_player_id,
      v_imported_player.team_id,
      CASE WHEN v_imported_player.is_captain THEN 'captain' ELSE 'player' END,
      true
    );
  END IF;
  
  -- Update imported_player Status
  UPDATE imported_players
  SET 
    status = 'merged',
    merged_to_player_id = v_new_player_id,
    merged_at = NOW()
  WHERE id = p_imported_player_id;
  
  RETURN v_new_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. View: Pending Imports (für Onboarding)
CREATE OR REPLACE VIEW pending_player_imports AS
SELECT 
  ip.id,
  ip.name,
  ip.import_lk,
  ip.tvm_id_number,
  ip.team_id,
  ip.position,
  ip.is_captain,
  ip.imported_at,
  ti.club_name,
  ti.team_name,
  ti.category
FROM imported_players ip
LEFT JOIN team_info ti ON ip.team_id = ti.id
WHERE ip.status = 'pending'
ORDER BY ip.imported_at DESC;

-- ============================================================
-- ANLEITUNG
-- ============================================================

/*

IMPORT-FLOW:
-------------
1. Super-Admin importiert Meldeliste
2. Spieler werden in `imported_players` gespeichert (OHNE user_id)
3. Status: 'pending'

ONBOARDING-FLOW:
----------------
1. Neuer User registriert sich
2. App zeigt: "Bist du einer dieser Spieler?"
3. User wählt sich aus `pending_player_imports`
4. App ruft `merge_imported_player(imported_id, user_id)` auf
5. Spieler wird zu `players` kopiert (MIT user_id)
6. Status: 'merged'

VORTEILE:
---------
✅ Import ohne RLS-Probleme
✅ Vereinfachtes Onboarding
✅ Automatische Team-Zuordnung
✅ Duplikat-Vermeidung

*/


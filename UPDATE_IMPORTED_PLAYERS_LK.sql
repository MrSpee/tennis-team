-- ============================================================
-- UPDATE: Spalte current_lk → import_lk umbenennen
-- ============================================================

-- 1. View ZUERST löschen (sonst blockiert es die Spalten-Änderung)
DROP VIEW IF EXISTS pending_player_imports;

-- 2. Spalte umbenennen
ALTER TABLE imported_players 
RENAME COLUMN current_lk TO import_lk;

-- 2. View neu erstellen (mit korrektem Feldnamen)
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

-- 3. Funktion neu erstellen (mit import_lk statt current_lk)
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

-- ✅ FERTIG!
-- Jetzt kannst du Spieler importieren und sie haben import_lk (fix)
-- Die current_lk wird später aus Spielergebnissen berechnet


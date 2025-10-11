-- ============================================================
-- FIX: Stelle sicher dass import_lk Spalte korrekt ist
-- ============================================================

-- 1. View ZUERST löschen
DROP VIEW IF EXISTS pending_player_imports;

-- 2. Prüfe ob current_lk existiert → umbenennen
-- Falls nicht, ist alles OK (Spalte heißt schon import_lk)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'imported_players' 
    AND column_name = 'current_lk'
  ) THEN
    ALTER TABLE imported_players RENAME COLUMN current_lk TO import_lk;
    RAISE NOTICE 'Spalte current_lk wurde zu import_lk umbenannt';
  ELSE
    RAISE NOTICE 'Spalte current_lk existiert nicht (vermutlich heißt sie schon import_lk)';
  END IF;
END $$;

-- 3. Erstelle/Update View
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

-- 4. Update Funktion
CREATE OR REPLACE FUNCTION merge_imported_player(
  p_imported_player_id UUID,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_imported_player RECORD;
  v_new_player_id UUID;
BEGIN
  SELECT * INTO v_imported_player
  FROM imported_players
  WHERE id = p_imported_player_id
  AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Imported player not found or already merged';
  END IF;
  
  INSERT INTO players (
    user_id,
    name,
    season_start_lk,
    current_lk,
    role,
    is_active,
    points
  ) VALUES (
    p_user_id,
    v_imported_player.name,
    v_imported_player.import_lk,
    v_imported_player.import_lk,
    CASE WHEN v_imported_player.is_captain THEN 'captain' ELSE 'player' END,
    true,
    0
  )
  RETURNING id INTO v_new_player_id;
  
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
SELECT 'Setup complete!' as status;


-- ============================================
-- DELETE USER BY EMAIL (Universell)
-- Löscht ALLE Daten eines Users basierend auf E-Mail
-- ============================================

-- ⚠️  ÄNDERE DIESE E-MAIL:
DO $$
DECLARE
  target_email TEXT := 'jorzig@live.de'; -- ← HIER E-MAIL ÄNDERN
  player_id_to_delete UUID;
  user_id_to_delete UUID;
  deleted_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🗑️  LÖSCHE USER: %', target_email;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';

  -- 1. Finde Player
  SELECT id, user_id INTO player_id_to_delete, user_id_to_delete
  FROM players
  WHERE email = target_email;

  IF player_id_to_delete IS NULL THEN
    RAISE NOTICE '⚠️  Kein Player mit E-Mail: %', target_email;
    RAISE NOTICE '';
    RAISE NOTICE '💡 Verfügbare Players:';
    FOR rec IN SELECT name, email FROM players ORDER BY email LOOP
      RAISE NOTICE '   - % ({})', rec.name, rec.email;
    END LOOP;
    RETURN;
  END IF;

  RAISE NOTICE '📋 Lösche Player:';
  RAISE NOTICE '   ID: %', player_id_to_delete;
  RAISE NOTICE '   User ID: %', user_id_to_delete;
  RAISE NOTICE '';

  -- 2. Lösche abhängige Daten
  DELETE FROM training_attendance WHERE player_id = player_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Training Attendance: % Einträge gelöscht', deleted_count;

  DELETE FROM match_availability WHERE player_id = player_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Match Availability: % Einträge gelöscht', deleted_count;

  DELETE FROM player_teams WHERE player_id = player_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Player Teams: % Einträge gelöscht', deleted_count;

  DELETE FROM activity_logs WHERE user_id = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Activity Logs: % Einträge gelöscht', deleted_count;

  DELETE FROM player_profiles WHERE player_id = player_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Player Profiles: % Einträge gelöscht', deleted_count;

  -- 3. Lösche Player selbst
  DELETE FROM players WHERE id = player_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Player: % Eintrag gelöscht', deleted_count;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 ERFOLGREICH GELÖSCHT!';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Auth-User noch vorhanden!';
  RAISE NOTICE '   Lösche manuell: Supabase → Authentication → Users';
  RAISE NOTICE '';
END $$;



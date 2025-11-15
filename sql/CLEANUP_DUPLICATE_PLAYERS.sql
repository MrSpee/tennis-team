-- ============================================
-- Cleanup-Script: Zusammenführen von Spieler-Duplikaten
-- ============================================
-- Dieses Script führt alle gefundenen Spieler-Duplikate zusammen.
-- Die Version mit app_user oder TVM ID wird behalten.
-- 
-- WICHTIG: Besonders vorsichtig bei Raoul van Herwijnen (app_user)!

DO $$
DECLARE
  duplicate_record RECORD;
  migrated_memberships INTEGER;
  migrated_match_results INTEGER;
  migrated_privacy_settings INTEGER;
  updated_primary_team_id INTEGER;
  deleted_player INTEGER;
BEGIN
  -- Liste der Duplikate: (duplicate_id, keep_id, name)
  -- keep_id ist immer die Version mit app_user oder TVM ID
  FOR duplicate_record IN 
    SELECT 
      'b4b1e4bc-f6aa-46ef-bf47-0ca0f1c12a30'::uuid as duplicate_id, 
      'cfbe5a66-8893-45de-a332-2aa71d22a50f'::uuid as keep_id, 
      'Meuser, Gary' as name
    UNION ALL
    SELECT '02b39d28-b280-4e64-9a47-482d17e8967e'::uuid, '319d0946-bbc8-4746-a300-372a99ddcc44'::uuid, 'van Herwijnen, Raoul'
    UNION ALL
    SELECT '0dae1708-6e49-4fdd-84f8-6ee39f9f8931'::uuid, 'a869f4e3-6424-423f-9c92-a2895f3f0464'::uuid, 'Wilwerscheid, Markus'
    UNION ALL
    SELECT '4fdb4484-110b-401c-970a-99444e3fdf2b'::uuid, 'e77f40ff-1890-47ca-a381-0871696f1811'::uuid, 'Loggia, Francesco'
    UNION ALL
    SELECT '4cfaf659-6863-4c9b-b20d-9fc7ee96c1d0'::uuid, 'ca969699-8441-457a-8273-896adaf0ead5'::uuid, 'Germelmann, Philipp'
    UNION ALL
    SELECT 'c6a1ccce-ce83-48e2-8e57-37f3b66c3ebe'::uuid, 'e45e7656-4699-459f-a21a-27b3597e6725'::uuid, 'Weikenmeier, Martin'
    UNION ALL
    SELECT '146ca209-ba6d-4ee7-a106-79f16e432ff8'::uuid, 'f2510667-2fa3-453b-8914-dbb8528d9703'::uuid, 'Vermee, Moritz'
    UNION ALL
    SELECT 'eb9be4e9-bc91-4a7d-9ef0-c26a752b3cb5'::uuid, '8b44f5e4-906a-4ec8-a688-48d8a2d07cef'::uuid, 'Fitschen, Torben'
    UNION ALL
    SELECT '0fee28d9-7202-4c7c-998a-0869c68fd78c'::uuid, '02225673-f671-46f2-b97c-8aaf0a4d6312'::uuid, 'Bungard, Eric'
    UNION ALL
    SELECT 'c26bc6b3-11dd-4879-8382-56f5da34abb8'::uuid, '01ee443d-82d8-4e84-9884-95f645ac6b6e'::uuid, 'Karkuth, Thorsten'
    UNION ALL
    SELECT 'abdeb2d4-49e4-4fae-891b-0789e08e7e97'::uuid, '433f3d94-a43a-4824-b4fd-5662c541d053'::uuid, 'Sikora, Michael'
    UNION ALL
    SELECT 'c42e187c-760d-4682-b0b6-d0833ec83d09'::uuid, '0457d305-27bf-4660-9d4d-d68b23f6d8dd'::uuid, 'Ridders, David'
    UNION ALL
    SELECT 'c06056de-ac01-42c8-9142-c974e959c68a'::uuid, '442f9610-1415-4708-b9d6-1400904c0b4a'::uuid, 'Kappenhagen, Jörg'
  LOOP
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verarbeite: %', duplicate_record.name;
    RAISE NOTICE 'Duplicate ID: %', duplicate_record.duplicate_id;
    RAISE NOTICE 'Keep ID: %', duplicate_record.keep_id;
    
    -- 1. Migriere match_results (alle Spalten, die player_id enthalten)
    UPDATE match_results 
    SET home_player_id = duplicate_record.keep_id
    WHERE home_player_id = duplicate_record.duplicate_id;
    GET DIAGNOSTICS migrated_match_results = ROW_COUNT;
    
    UPDATE match_results 
    SET guest_player_id = duplicate_record.keep_id
    WHERE guest_player_id = duplicate_record.duplicate_id;
    
    UPDATE match_results 
    SET guest_player1_id = duplicate_record.keep_id
    WHERE guest_player1_id = duplicate_record.duplicate_id;
    
    UPDATE match_results 
    SET guest_player2_id = duplicate_record.keep_id
    WHERE guest_player2_id = duplicate_record.duplicate_id;
    
    UPDATE match_results 
    SET home_player1_id = duplicate_record.keep_id
    WHERE home_player1_id = duplicate_record.duplicate_id;
    
    UPDATE match_results 
    SET home_player2_id = duplicate_record.keep_id
    WHERE home_player2_id = duplicate_record.duplicate_id;
    
    RAISE NOTICE '  → match_results migriert';
    
    -- 2. Migriere team_memberships (mit Duplikat-Prüfung)
    -- Lösche Duplikate zuerst (wenn keep_id bereits eine Membership für dasselbe Team/Season hat)
    DELETE FROM team_memberships tm1
    WHERE tm1.player_id = duplicate_record.duplicate_id
    AND EXISTS (
      SELECT 1 FROM team_memberships tm2
      WHERE tm2.player_id = duplicate_record.keep_id
      AND tm2.team_id = tm1.team_id
      AND tm2.season = tm1.season
    );
    
    -- Migriere verbleibende Memberships
    UPDATE team_memberships 
    SET player_id = duplicate_record.keep_id
    WHERE player_id = duplicate_record.duplicate_id;
    GET DIAGNOSTICS migrated_memberships = ROW_COUNT;
    
    RAISE NOTICE '  → team_memberships migriert: %', migrated_memberships;
    
    -- 3. Migriere player_privacy_settings (mit Duplikat-Prüfung)
    DELETE FROM player_privacy_settings pps1
    WHERE pps1.player_id = duplicate_record.duplicate_id
    AND EXISTS (
      SELECT 1 FROM player_privacy_settings pps2
      WHERE pps2.player_id = duplicate_record.keep_id
    );
    
    UPDATE player_privacy_settings 
    SET player_id = duplicate_record.keep_id
    WHERE player_id = duplicate_record.duplicate_id;
    GET DIAGNOSTICS migrated_privacy_settings = ROW_COUNT;
    
    RAISE NOTICE '  → player_privacy_settings migriert: %', migrated_privacy_settings;
    
    -- 4. Aktualisiere primary_team_id in players_unified (falls der Duplikat als primary_team_id verwendet wird)
    UPDATE players_unified 
    SET primary_team_id = (
      SELECT primary_team_id FROM players_unified WHERE id = duplicate_record.keep_id
    )
    WHERE primary_team_id = duplicate_record.duplicate_id;
    GET DIAGNOSTICS updated_primary_team_id = ROW_COUNT;
    
    IF updated_primary_team_id > 0 THEN
      RAISE NOTICE '  → primary_team_id aktualisiert: %', updated_primary_team_id;
    END IF;
    
    -- 5. Aktualisiere primary_team_id im keep_id Spieler (falls der Duplikat einen besseren primary_team_id hat)
    -- Nur wenn keep_id keinen primary_team_id hat, aber duplicate_id schon
    UPDATE players_unified 
    SET primary_team_id = (
      SELECT primary_team_id FROM players_unified WHERE id = duplicate_record.duplicate_id
    )
    WHERE id = duplicate_record.keep_id
    AND primary_team_id IS NULL
    AND EXISTS (
      SELECT 1 FROM players_unified WHERE id = duplicate_record.duplicate_id AND primary_team_id IS NOT NULL
    );
    
    -- 6. Lösche den Duplikat-Spieler
    DELETE FROM players_unified 
    WHERE id = duplicate_record.duplicate_id;
    GET DIAGNOSTICS deleted_player = ROW_COUNT;
    
    IF deleted_player = 1 THEN
      RAISE NOTICE '  → Duplikat-Spieler gelöscht: ✅';
    ELSE
      RAISE WARNING '  → Duplikat-Spieler konnte nicht gelöscht werden!';
    END IF;
    
    RAISE NOTICE '========================================';
  END LOOP;
  
  RAISE NOTICE '✅ Cleanup abgeschlossen!';
END $$;

-- ============================================
-- VERIFIKATION: Prüfe ob noch Duplikate existieren
-- ============================================
SELECT 
  COUNT(DISTINCT p1.id) as remaining_duplicate_players_count,
  COUNT(*) as remaining_duplicate_pairs_count
FROM (
  SELECT 
    id,
    name,
    tvm_id_number,
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(name, '[ä]', 'ae', 'g'), '[ö]', 'oe', 'g'), '[ü]', 'ue', 'g'), '[^a-z0-9 ]', '', 'g')) as name_norm,
    CASE 
      WHEN name LIKE '%,%' THEN 
        LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(SPLIT_PART(name, ',', 2), '[^a-z0-9 ]', '', 'g'), '\s+', ' ', 'g')) || ' ' || 
              TRIM(REGEXP_REPLACE(REGEXP_REPLACE(SPLIT_PART(name, ',', 1), '[^a-z0-9 ]', '', 'g'), '\s+', ' ', 'g')))
      ELSE NULL
    END as name_reversed
  FROM players_unified
) p1
JOIN (
  SELECT 
    id,
    name,
    tvm_id_number,
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(name, '[ä]', 'ae', 'g'), '[ö]', 'oe', 'g'), '[ü]', 'ue', 'g'), '[^a-z0-9 ]', '', 'g')) as name_norm,
    CASE 
      WHEN name LIKE '%,%' THEN 
        LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(SPLIT_PART(name, ',', 2), '[^a-z0-9 ]', '', 'g'), '\s+', ' ', 'g')) || ' ' || 
              TRIM(REGEXP_REPLACE(REGEXP_REPLACE(SPLIT_PART(name, ',', 1), '[^a-z0-9 ]', '', 'g'), '\s+', ' ', 'g')))
      ELSE NULL
    END as name_reversed
  FROM players_unified
) p2 ON (
  p1.id < p2.id
  AND (
    (p1.tvm_id_number = p2.tvm_id_number AND p1.tvm_id_number IS NOT NULL AND p1.tvm_id_number != '')
    OR
    (p1.name_norm = p2.name_norm)
    OR
    (p1.name_reversed IS NOT NULL AND p1.name_reversed = p2.name_norm)
    OR
    (p1.name_norm = p2.name_reversed)
    OR
    (p1.name_reversed IS NOT NULL AND p2.name_reversed IS NOT NULL AND p1.name_reversed = p2.name_reversed)
  )
);


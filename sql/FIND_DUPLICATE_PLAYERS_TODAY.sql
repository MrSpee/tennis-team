-- ============================================
-- Duplikat-Suche für heute erstellte Spieler
-- ============================================
-- Diese Abfrage findet alle Spieler, die heute erstellt wurden und möglicherweise
-- Duplikate von bereits existierenden Spielern sind.
-- 
-- Matching-Strategien:
-- 1. TVM ID Match (exakt)
-- 2. Normalisierter Name Match (ohne Sonderzeichen, Leerzeichen normalisiert)
-- 3. Umgekehrter Name Match ("Nachname, Vorname" vs "Vorname Nachname")
-- 4. Token-basierter Match (mindestens 2 gemeinsame Wörter)

WITH new_players AS (
  SELECT 
    id,
    name,
    tvm_id_number,
    created_at,
    player_type,
    import_source,
    -- Normalisierte Varianten
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(name, '[ä]', 'ae', 'g'), '[ö]', 'oe', 'g'), '[ü]', 'ue', 'g'), '[^a-z0-9 ]', '', 'g')) as name_norm,
    -- "Nachname, Vorname" -> "vorname nachname"
    CASE 
      WHEN name LIKE '%,%' THEN 
        LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(SPLIT_PART(name, ',', 2), '[^a-z0-9 ]', '', 'g'), '\s+', ' ', 'g')) || ' ' || 
              TRIM(REGEXP_REPLACE(REGEXP_REPLACE(SPLIT_PART(name, ',', 1), '[^a-z0-9 ]', '', 'g'), '\s+', ' ', 'g')))
      ELSE NULL
    END as name_reversed,
    -- Extrahiere Tokens (Wörter) für Token-basierte Suche
    ARRAY(SELECT TRIM(unnest(string_to_array(LOWER(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(name, '[ä]', 'ae', 'g'), '[ö]', 'oe', 'g'), '[ü]', 'ue', 'g'), '[^a-z0-9 ]', '', 'g')), ' ')))) as name_tokens
  FROM players_unified
  WHERE created_at::date = CURRENT_DATE
),
existing_players AS (
  SELECT 
    id,
    name,
    tvm_id_number,
    created_at,
    player_type,
    import_source,
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(name, '[ä]', 'ae', 'g'), '[ö]', 'oe', 'g'), '[ü]', 'ue', 'g'), '[^a-z0-9 ]', '', 'g')) as name_norm,
    CASE 
      WHEN name LIKE '%,%' THEN 
        LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(SPLIT_PART(name, ',', 2), '[^a-z0-9 ]', '', 'g'), '\s+', ' ', 'g')) || ' ' || 
              TRIM(REGEXP_REPLACE(REGEXP_REPLACE(SPLIT_PART(name, ',', 1), '[^a-z0-9 ]', '', 'g'), '\s+', ' ', 'g')))
      ELSE NULL
    END as name_reversed,
    ARRAY(SELECT TRIM(unnest(string_to_array(LOWER(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(name, '[ä]', 'ae', 'g'), '[ö]', 'oe', 'g'), '[ü]', 'ue', 'g'), '[^a-z0-9 ]', '', 'g')), ' ')))) as name_tokens
  FROM players_unified
  WHERE created_at::date < CURRENT_DATE
)
SELECT 
  np.id as new_id,
  np.name as new_name,
  np.tvm_id_number as new_tvm_id,
  np.created_at as new_created,
  np.player_type as new_player_type,
  np.import_source as new_import_source,
  ep.id as existing_id,
  ep.name as existing_name,
  ep.tvm_id_number as existing_tvm_id,
  ep.created_at as existing_created,
  ep.player_type as existing_player_type,
  ep.import_source as existing_import_source,
  CASE 
    WHEN np.tvm_id_number = ep.tvm_id_number AND np.tvm_id_number IS NOT NULL AND np.tvm_id_number != '' THEN 'TVM ID Match'
    WHEN np.name_norm = ep.name_norm THEN 'Exakter Name Match (normalisiert)'
    WHEN np.name_reversed IS NOT NULL AND np.name_reversed = ep.name_norm THEN 'Umgekehrter Name Match (new reversed = existing)'
    WHEN np.name_norm = ep.name_reversed THEN 'Umgekehrter Name Match (new = existing reversed)'
    WHEN np.name_reversed IS NOT NULL AND ep.name_reversed IS NOT NULL AND np.name_reversed = ep.name_reversed THEN 'Beide umgekehrt Match'
    WHEN array_length(np.name_tokens, 1) >= 2 AND array_length(ep.name_tokens, 1) >= 2 AND
         (SELECT COUNT(*) FROM unnest(np.name_tokens) t1 
          WHERE EXISTS (SELECT 1 FROM unnest(ep.name_tokens) t2 WHERE t1 = t2)) >= 2 THEN 'Token-basierter Match (mind. 2 gemeinsame Wörter)'
    ELSE 'Ähnlicher Name'
  END as match_type,
  -- Berechne gemeinsame Tokens
  (SELECT COUNT(*) FROM unnest(np.name_tokens) t1 
   WHERE EXISTS (SELECT 1 FROM unnest(ep.name_tokens) t2 WHERE t1 = t2)) as common_tokens,
  array_length(np.name_tokens, 1) as new_token_count,
  array_length(ep.name_tokens, 1) as existing_token_count
FROM new_players np
JOIN existing_players ep ON (
  -- TVM ID Match
  (np.tvm_id_number = ep.tvm_id_number AND np.tvm_id_number IS NOT NULL AND np.tvm_id_number != '')
  OR
  -- Exakter normalisierter Match
  (np.name_norm = ep.name_norm)
  OR
  -- Umgekehrte Matches
  (np.name_reversed IS NOT NULL AND np.name_reversed = ep.name_norm)
  OR
  (np.name_norm = ep.name_reversed)
  OR
  (np.name_reversed IS NOT NULL AND ep.name_reversed IS NOT NULL AND np.name_reversed = ep.name_reversed)
  OR
  -- Token-basierter Match (mindestens 2 gemeinsame Tokens)
  (
    array_length(np.name_tokens, 1) >= 2 
    AND array_length(ep.name_tokens, 1) >= 2
    AND (SELECT COUNT(*) FROM unnest(np.name_tokens) t1 
         WHERE EXISTS (SELECT 1 FROM unnest(ep.name_tokens) t2 WHERE t1 = t2)) >= 2
  )
)
ORDER BY 
  CASE 
    WHEN np.tvm_id_number = ep.tvm_id_number THEN 1
    WHEN np.name_norm = ep.name_norm THEN 2
    WHEN np.name_reversed = ep.name_norm OR np.name_norm = ep.name_reversed THEN 3
    ELSE 4
  END,
  np.created_at DESC,
  common_tokens DESC;

-- ============================================
-- ZUSAMMENFASSUNG: Anzahl der Duplikate
-- ============================================
SELECT 
  COUNT(DISTINCT np.id) as duplicate_count,
  COUNT(DISTINCT ep.id) as existing_matches_count
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
    END as name_reversed,
    ARRAY(SELECT TRIM(unnest(string_to_array(LOWER(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(name, '[ä]', 'ae', 'g'), '[ö]', 'oe', 'g'), '[ü]', 'ue', 'g'), '[^a-z0-9 ]', '', 'g')), ' ')))) as name_tokens
  FROM players_unified
  WHERE created_at::date = CURRENT_DATE
) np
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
    END as name_reversed,
    ARRAY(SELECT TRIM(unnest(string_to_array(LOWER(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(name, '[ä]', 'ae', 'g'), '[ö]', 'oe', 'g'), '[ü]', 'ue', 'g'), '[^a-z0-9 ]', '', 'g')), ' ')))) as name_tokens
  FROM players_unified
  WHERE created_at::date < CURRENT_DATE
) ep ON (
  (np.tvm_id_number = ep.tvm_id_number AND np.tvm_id_number IS NOT NULL AND np.tvm_id_number != '')
  OR
  (np.name_norm = ep.name_norm)
  OR
  (np.name_reversed IS NOT NULL AND np.name_reversed = ep.name_norm)
  OR
  (np.name_norm = ep.name_reversed)
  OR
  (np.name_reversed IS NOT NULL AND ep.name_reversed IS NOT NULL AND np.name_reversed = ep.name_reversed)
  OR
  (
    array_length(np.name_tokens, 1) >= 2 
    AND array_length(ep.name_tokens, 1) >= 2
    AND (SELECT COUNT(*) FROM unnest(np.name_tokens) t1 
         WHERE EXISTS (SELECT 1 FROM unnest(ep.name_tokens) t2 WHERE t1 = t2)) >= 2
  )
);


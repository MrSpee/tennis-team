-- ============================================
-- Duplikat-Suche für ALLE Spieler in der Datenbank
-- ============================================
-- Diese Abfrage findet alle Spieler-Duplikate in der gesamten Datenbank.
-- 
-- Matching-Strategien:
-- 1. TVM ID Match (exakt)
-- 2. Normalisierter Name Match (ohne Sonderzeichen, Leerzeichen normalisiert)
-- 3. Umgekehrter Name Match ("Nachname, Vorname" vs "Vorname Nachname")
-- 4. Token-basierter Match (mindestens 2 gemeinsame Wörter)

WITH all_players AS (
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
)
SELECT 
  p1.id as player1_id,
  p1.name as player1_name,
  p1.tvm_id_number as player1_tvm_id,
  p1.created_at as player1_created,
  p1.player_type as player1_type,
  p1.import_source as player1_import_source,
  p2.id as player2_id,
  p2.name as player2_name,
  p2.tvm_id_number as player2_tvm_id,
  p2.created_at as player2_created,
  p2.player_type as player2_type,
  p2.import_source as player2_import_source,
  CASE 
    WHEN p1.tvm_id_number = p2.tvm_id_number AND p1.tvm_id_number IS NOT NULL AND p1.tvm_id_number != '' THEN 'TVM ID Match'
    WHEN p1.name_norm = p2.name_norm THEN 'Exakter Name Match (normalisiert)'
    WHEN p1.name_reversed IS NOT NULL AND p1.name_reversed = p2.name_norm THEN 'Umgekehrter Name Match (p1 reversed = p2)'
    WHEN p1.name_norm = p2.name_reversed THEN 'Umgekehrter Name Match (p1 = p2 reversed)'
    WHEN p1.name_reversed IS NOT NULL AND p2.name_reversed IS NOT NULL AND p1.name_reversed = p2.name_reversed THEN 'Beide umgekehrt Match'
    WHEN array_length(p1.name_tokens, 1) >= 2 AND array_length(p2.name_tokens, 1) >= 2 AND
         (SELECT COUNT(*) FROM unnest(p1.name_tokens) t1 
          WHERE EXISTS (SELECT 1 FROM unnest(p2.name_tokens) t2 WHERE t1 = t2)) >= 2 THEN 'Token-basierter Match (mind. 2 gemeinsame Wörter)'
    ELSE 'Ähnlicher Name'
  END as match_type,
  -- Berechne gemeinsame Tokens
  (SELECT COUNT(*) FROM unnest(p1.name_tokens) t1 
   WHERE EXISTS (SELECT 1 FROM unnest(p2.name_tokens) t2 WHERE t1 = t2)) as common_tokens,
  array_length(p1.name_tokens, 1) as player1_token_count,
  array_length(p2.name_tokens, 1) as player2_token_count
FROM all_players p1
JOIN all_players p2 ON (
  p1.id < p2.id  -- Vermeide doppelte Paare (A-B und B-A)
  AND (
    -- TVM ID Match
    (p1.tvm_id_number = p2.tvm_id_number AND p1.tvm_id_number IS NOT NULL AND p1.tvm_id_number != '')
    OR
    -- Exakter normalisierter Match
    (p1.name_norm = p2.name_norm)
    OR
    -- Umgekehrte Matches
    (p1.name_reversed IS NOT NULL AND p1.name_reversed = p2.name_norm)
    OR
    (p1.name_norm = p2.name_reversed)
    OR
    (p1.name_reversed IS NOT NULL AND p2.name_reversed IS NOT NULL AND p1.name_reversed = p2.name_reversed)
    OR
    -- Token-basierter Match (mindestens 2 gemeinsame Tokens)
    (
      array_length(p1.name_tokens, 1) >= 2 
      AND array_length(p2.name_tokens, 1) >= 2
      AND (SELECT COUNT(*) FROM unnest(p1.name_tokens) t1 
           WHERE EXISTS (SELECT 1 FROM unnest(p2.name_tokens) t2 WHERE t1 = t2)) >= 2
    )
  )
)
ORDER BY 
  CASE 
    WHEN p1.tvm_id_number = p2.tvm_id_number THEN 1
    WHEN p1.name_norm = p2.name_norm THEN 2
    WHEN p1.name_reversed = p2.name_norm OR p1.name_norm = p2.name_reversed THEN 3
    ELSE 4
  END,
  p1.created_at DESC,
  common_tokens DESC;

-- ============================================
-- ZUSAMMENFASSUNG: Anzahl der Duplikate
-- ============================================
SELECT 
  COUNT(DISTINCT p1.id) as duplicate_players_count,
  COUNT(*) as duplicate_pairs_count
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
    END as name_reversed,
    ARRAY(SELECT TRIM(unnest(string_to_array(LOWER(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(name, '[ä]', 'ae', 'g'), '[ö]', 'oe', 'g'), '[ü]', 'ue', 'g'), '[^a-z0-9 ]', '', 'g')), ' ')))) as name_tokens
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
    OR
    (
      array_length(p1.name_tokens, 1) >= 2 
      AND array_length(p2.name_tokens, 1) >= 2
      AND (SELECT COUNT(*) FROM unnest(p1.name_tokens) t1 
           WHERE EXISTS (SELECT 1 FROM unnest(p2.name_tokens) t2 WHERE t1 = t2)) >= 2
    )
  )
);


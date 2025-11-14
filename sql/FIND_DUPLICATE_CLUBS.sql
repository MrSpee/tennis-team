-- FIND_DUPLICATE_CLUBS.sql
-- ============================================================
-- Findet potenzielle Duplikate in club_info
-- ============================================================

-- SCHRITT 1: Finde Clubs mit ähnlichen normalized_names
-- ============================================================
SELECT 
  '=== CLUBS MIT ÄHNLICHEN NORMALIZED_NAMES ===' as info,
  ci1.id as club1_id,
  ci1.name as club1_name,
  ci1.normalized_name as club1_normalized,
  ci2.id as club2_id,
  ci2.name as club2_name,
  ci2.normalized_name as club2_normalized,
  -- Berechne Ähnlichkeit (einfacher Levenshtein-ähnlicher Ansatz)
  CASE 
    WHEN ci1.normalized_name = ci2.normalized_name THEN 100
    WHEN ci1.normalized_name LIKE ci2.normalized_name || '%' OR ci2.normalized_name LIKE ci1.normalized_name || '%' THEN 90
    ELSE 0
  END as similarity_score
FROM club_info ci1
JOIN club_info ci2 ON ci1.id < ci2.id
WHERE ci1.normalized_name IS NOT NULL 
  AND ci2.normalized_name IS NOT NULL
  AND (
    ci1.normalized_name = ci2.normalized_name
    OR ci1.normalized_name LIKE ci2.normalized_name || '%'
    OR ci2.normalized_name LIKE ci1.normalized_name || '%'
    OR LENGTH(ci1.normalized_name) > 5 
    AND LENGTH(ci2.normalized_name) > 5
    AND (
      -- Ähnliche Namen (z.B. "tcdellbrück" vs "tvdellbrück")
      REPLACE(REPLACE(ci1.normalized_name, 'tc', ''), 'tv', '') = REPLACE(REPLACE(ci2.normalized_name, 'tc', ''), 'tv', '')
      OR REPLACE(REPLACE(ci1.normalized_name, 'tv', ''), 'tc', '') = REPLACE(REPLACE(ci2.normalized_name, 'tv', ''), 'tc', '')
    )
  )
ORDER BY similarity_score DESC, ci1.name;

-- SCHRITT 2: Finde Clubs mit ähnlichen Namen (ohne normalized_name)
-- ============================================================
SELECT 
  '=== CLUBS MIT ÄHNLICHEN NAMEN (TC vs TV) ===' as info,
  ci1.id as club1_id,
  ci1.name as club1_name,
  ci2.id as club2_id,
  ci2.name as club2_name,
  -- Entferne TC/TV Präfixe und vergleiche
  LOWER(REGEXP_REPLACE(ci1.name, '^(TC|TV)\s+', '', 'i')) as club1_base,
  LOWER(REGEXP_REPLACE(ci2.name, '^(TC|TV)\s+', '', 'i')) as club2_base
FROM club_info ci1
JOIN club_info ci2 ON ci1.id < ci2.id
WHERE (
  -- Gleicher Name nach Entfernen von TC/TV
  LOWER(REGEXP_REPLACE(ci1.name, '^(TC|TV)\s+', '', 'i')) = LOWER(REGEXP_REPLACE(ci2.name, '^(TC|TV)\s+', '', 'i'))
  -- Oder ein Name enthält den anderen (ohne TC/TV)
  OR LOWER(REGEXP_REPLACE(ci1.name, '^(TC|TV)\s+', '', 'i')) LIKE '%' || LOWER(REGEXP_REPLACE(ci2.name, '^(TC|TV)\s+', '', 'i')) || '%'
  OR LOWER(REGEXP_REPLACE(ci2.name, '^(TC|TV)\s+', '', 'i')) LIKE '%' || LOWER(REGEXP_REPLACE(ci1.name, '^(TC|TV)\s+', '', 'i')) || '%'
)
AND (
  -- Mindestens einer hat TC oder TV im Namen
  ci1.name ~* '^(TC|TV)\s+' OR ci2.name ~* '^(TC|TV)\s+'
)
ORDER BY ci1.name;

-- SCHRITT 3: Finde Clubs mit identischen Namen (außer Groß-/Kleinschreibung)
-- ============================================================
SELECT 
  '=== CLUBS MIT IDENTISCHEN NAMEN (CASE-INSENSITIVE) ===' as info,
  LOWER(ci.name) as normalized_name_lower,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(ci.id ORDER BY ci.created_at) as club_ids,
  ARRAY_AGG(ci.name ORDER BY ci.created_at) as club_names,
  ARRAY_AGG(ci.created_at ORDER BY ci.created_at) as created_dates
FROM club_info ci
GROUP BY LOWER(ci.name)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, normalized_name_lower;

-- SCHRITT 4: Finde Clubs mit sehr ähnlichen Namen (einfache String-Vergleiche)
-- ============================================================
-- Alternative zu Levenshtein: Vergleiche Substrings und gemeinsame Zeichen
SELECT 
  '=== CLUBS MIT SEHR ÄHNLICHEN NAMEN (SUBSTRING-VERGLEICH) ===' as info,
  ci1.id as club1_id,
  ci1.name as club1_name,
  ci2.id as club2_id,
  ci2.name as club2_name,
  -- Berechne Ähnlichkeit basierend auf gemeinsamen Zeichen
  (
    SELECT COUNT(*) 
    FROM unnest(string_to_array(LOWER(ci1.name), NULL)) c1
    WHERE EXISTS (
      SELECT 1 FROM unnest(string_to_array(LOWER(ci2.name), NULL)) c2 WHERE c1 = c2
    )
  )::float / GREATEST(LENGTH(ci1.name), LENGTH(ci2.name)) * 100 as similarity_percent
FROM club_info ci1
JOIN club_info ci2 ON ci1.id < ci2.id
WHERE LENGTH(ci1.name) > 3 
  AND LENGTH(ci2.name) > 3
  AND LOWER(ci1.name) != LOWER(ci2.name)  -- Nicht identisch
  AND (
    -- Ein Name beginnt mit dem anderen (mindestens 5 Zeichen)
    LOWER(ci1.name) LIKE LOWER(ci2.name) || '%' AND LENGTH(ci2.name) >= 5
    OR LOWER(ci2.name) LIKE LOWER(ci1.name) || '%' AND LENGTH(ci1.name) >= 5
    -- Oder ein Name ist Teil des anderen
    OR LOWER(ci1.name) LIKE '%' || LOWER(ci2.name) || '%'
    OR LOWER(ci2.name) LIKE '%' || LOWER(ci1.name) || '%'
  )
ORDER BY similarity_percent DESC
LIMIT 50;

-- SCHRITT 5: Zeige Details zu potenziellen Duplikaten
-- ============================================================
SELECT 
  '=== DETAILS ZU POTENZIELLEN DUPLIKATEN ===' as info,
  ci.id,
  ci.name,
  ci.normalized_name,
  ci.city,
  ci.region,
  ci.data_source,
  ci.created_at,
  ci.updated_at,
  (SELECT COUNT(*) FROM team_info WHERE club_id = ci.id) as teams_count,
  (SELECT COUNT(*) FROM team_info WHERE club_name = ci.name) as teams_by_name_count
FROM club_info ci
WHERE LOWER(ci.name) IN (
  -- Finde Namen, die mehrfach vorkommen (case-insensitive)
  SELECT LOWER(name)
  FROM club_info
  GROUP BY LOWER(name)
  HAVING COUNT(*) > 1
)
ORDER BY LOWER(ci.name), ci.created_at;

-- SCHRITT 6: Spezielle Prüfung: TC vs TV Präfixe
-- ============================================================
SELECT 
  '=== TC vs TV PRÄFIX DUPLIKATE ===' as info,
  base_name,
  ARRAY_AGG(DISTINCT prefix ORDER BY prefix) as prefixes,
  COUNT(DISTINCT prefix) as prefix_count,
  ARRAY_AGG(sub.id ORDER BY sub.created_at) as club_ids,
  ARRAY_AGG(sub.name ORDER BY sub.created_at) as club_names
FROM (
  SELECT 
    ci.id,
    ci.name,
    ci.created_at,
    CASE 
      WHEN ci.name ~* '^TC\s+' THEN 'TC'
      WHEN ci.name ~* '^TV\s+' THEN 'TV'
      ELSE 'OTHER'
    END as prefix,
    LOWER(REGEXP_REPLACE(ci.name, '^(TC|TV)\s+', '', 'i')) as base_name
  FROM club_info ci
) sub
GROUP BY base_name
HAVING COUNT(DISTINCT prefix) > 1 AND 'OTHER' != ALL(ARRAY_AGG(DISTINCT prefix))
ORDER BY prefix_count DESC, base_name;


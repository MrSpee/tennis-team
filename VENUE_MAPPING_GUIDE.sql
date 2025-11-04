-- ============================================
-- VENUE MAPPING GUIDE
-- ============================================
-- Übersicht aller Venue-Zuordnungen für manuelle Prüfung
-- ============================================

-- ====================================
-- PLATZ-NOTATION ERKLÄRUNG
-- ====================================

/*
TVM PLATZ-NOTATION:
-------------------
"1+4"  = Plätze 1,2,3,4 (alle 4 Plätze verfügbar)
"3+4"  = Plätze 3,4 (nur diese 2 Plätze)
"14+15" = Plätze 14,15
"1-7"  = Plätze 1,2,3,4,5,6,7 (alle 7 Plätze)

SPEICHERUNG IN DB:
------------------
matchdays.court_number = INTEGER (nur ein Wert!)
→ Wir speichern den ERSTEN Platz als Referenz

BEISPIEL:
"1+4" → court_number = 1
"3+4" → court_number = 3
"14+15" → court_number = 14

WICHTIG FÜR SHOE RECOMMENDATION:
Bei gemischten Belägen (z.B. Marienburger SC):
- Plätze 1-4: Teppich
- Plätze 14-15: ASCHE ⚠️
→ court_number muss EXAKT sein!
*/

-- ====================================
-- 1. VENUE MAPPING ÜBERSICHT
-- ====================================

WITH venue_mapping AS (
  SELECT 
    TRIM(m.venue) as matchday_venue,
    v.id as venue_id,
    v.name as db_venue_name,
    v.vnr,
    v.city,
    v.court_count,
    COUNT(m.id) as match_count,
    CASE 
      WHEN v.id IS NOT NULL THEN '✅ MATCHED'
      ELSE '❌ UNBEKANNT'
    END as status
  FROM matchdays m
  LEFT JOIN venues v ON (
    v.name ILIKE '%' || TRIM(m.venue) || '%' OR
    TRIM(m.venue) ILIKE '%' || v.name || '%' OR
    v.club_name ILIKE '%' || TRIM(m.venue) || '%'
  )
  WHERE m.venue IS NOT NULL
  GROUP BY TRIM(m.venue), v.id, v.name, v.vnr, v.city, v.court_count
)
SELECT * FROM venue_mapping
ORDER BY status DESC, match_count DESC;

-- ====================================
-- 2. AMBIGUOUS MAPPINGS (Mehrere Treffer)
-- ====================================

WITH ambiguous AS (
  SELECT 
    TRIM(m.venue) as matchday_venue,
    COUNT(DISTINCT v.id) as venue_matches
  FROM matchdays m
  LEFT JOIN venues v ON (
    v.name ILIKE '%' || TRIM(m.venue) || '%' OR
    TRIM(m.venue) ILIKE '%' || v.name || '%' OR
    v.club_name ILIKE '%' || TRIM(m.venue) || '%'
  )
  WHERE m.venue IS NOT NULL
  GROUP BY TRIM(m.venue)
  HAVING COUNT(DISTINCT v.id) > 1
)
SELECT 
  '⚠️ MEHRDEUTIGE ZUORDNUNGEN' as info,
  a.matchday_venue,
  a.venue_matches,
  STRING_AGG(v.name || ' (' || v.city || ')', ' | ') as possible_venues
FROM ambiguous a
LEFT JOIN matchdays m ON TRIM(m.venue) = a.matchday_venue
LEFT JOIN venues v ON (
  v.name ILIKE '%' || a.matchday_venue || '%' OR
  a.matchday_venue ILIKE '%' || v.name || '%' OR
  v.club_name ILIKE '%' || a.matchday_venue || '%'
)
GROUP BY a.matchday_venue, a.venue_matches;

-- ====================================
-- 3. UNKLAR: Namen zu kurz oder zu generisch
-- ====================================

SELECT 
  '⚠️ GENERISCHE VENUE-NAMEN (schwer zu matchen)' as info,
  venue,
  COUNT(*) as match_count,
  LENGTH(venue) as name_length
FROM matchdays
WHERE venue IS NOT NULL
  AND (
    LENGTH(venue) < 10 OR
    venue ILIKE '%Halle%' OR
    venue ILIKE '%Sportpark%' OR
    venue ILIKE '%Tennis%'
  )
GROUP BY venue
ORDER BY match_count DESC;

-- ====================================
-- 4. UNKLAR: Platz-Nummern in Venue-Namen
-- ====================================

SELECT 
  '🔢 VENUES MIT PLATZ-NUMMERN IM NAMEN' as info,
  venue,
  COUNT(*) as match_count,
  STRING_AGG(DISTINCT league, ', ') as leagues
FROM matchdays
WHERE venue IS NOT NULL
  AND venue SIMILAR TO '%[0-9]%'
GROUP BY venue
ORDER BY match_count DESC;

-- ====================================
-- 5. MANUELLE MAPPING-VORSCHLÄGE
-- ====================================

-- Diese Venues brauchen manuelle Zuordnung:

/*
BITTE PRÜFEN:
-------------
Falls folgende Venues in den Ergebnissen oben auftauchen,
bitte manuelle Zuordnung vornehmen:

TYPISCHE PROBLEM-FÄLLE:
- "TC XYZ" vs "TH XYZ" (Club vs Halle unterschiedlich benannt)
- "Sportpark X" vs "TH X" (verschiedene Namen für gleiche Location)
- "VKC" vs "VKC Köln" vs "Cologne Sportspark" (Aliases)
- "Halle 1" vs "Vereinsname Halle 1" (fehlender Vereinsname)

LÖSUNG:
1. In venues Tabelle nachschauen (vnr, name, club_name)
2. Mapping in UPDATE_MATCHDAYS_WITH_VENUES.sql ergänzen
3. ODER: venues Tabelle ergänzen mit alias-Spalte
*/

-- ====================================
-- 6. STATISTIK: COVERAGE
-- ====================================

SELECT 
  '📊 VENUE MAPPING COVERAGE' as info,
  COUNT(*) as total_matchdays,
  COUNT(*) FILTER (WHERE venue IS NOT NULL) as has_venue_text,
  COUNT(*) FILTER (WHERE venue_id IS NOT NULL) as has_venue_id_mapped,
  ROUND(100.0 * COUNT(*) FILTER (WHERE venue_id IS NOT NULL) / NULLIF(COUNT(*) FILTER (WHERE venue IS NOT NULL), 0), 1) as coverage_percent
FROM matchdays;

-- ====================================
-- 7. BEISPIELE FÜR ERFOLGREICHE MAPPINGS
-- ====================================

SELECT 
  '✅ ERFOLGREICHE MAPPINGS (Beispiele)' as info,
  m.venue as original_text,
  v.name as mapped_to,
  v.city,
  v.court_count,
  COUNT(m.id) as match_count
FROM matchdays m
JOIN venues v ON v.id = m.venue_id
GROUP BY m.venue, v.name, v.city, v.court_count
ORDER BY match_count DESC
LIMIT 10;

-- ====================================
-- 8. ACTION ITEMS FÜR USER
-- ====================================

SELECT '
════════════════════════════════════════════
📋 ACTION ITEMS FÜR VENUE MAPPING:
════════════════════════════════════════════

1️⃣ UNBEKANNTE VENUES:
   → Siehe Abschnitt "⚠️ VENUES OHNE DB-MATCH"
   → Diese müssen entweder:
      a) In venues Tabelle ergänzt werden, ODER
      b) Mit existierenden venues gemappt werden

2️⃣ MEHRDEUTIGE ZUORDNUNGEN:
   → Siehe Abschnitt "⚠️ MEHRDEUTIGE ZUORDNUNGEN"
   → Manuelle Entscheidung welche venue die richtige ist

3️⃣ PLATZ-NUMMERN:
   → TVM zeigt "1+4" = Plätze 1,2,3,4
   → Wir speichern nur ersten Platz (court_number = 1)
   → Bei gemischten Belägen WICHTIG für Schuhempfehlung!

4️⃣ UPDATE-SCRIPT ERWEITERN:
   → In UPDATE_MATCHDAYS_WITH_VENUES.sql
   → Neue Mappings hinzufügen nach diesem Pattern:
   
   SELECT id INTO v_venue_id FROM venues WHERE name ILIKE ''%NAME%'';
   IF v_venue_id IS NOT NULL THEN
     UPDATE matchdays 
     SET venue_id = v_venue_id, court_number = 1
     WHERE venue ILIKE ''%NAME%'' AND venue_id IS NULL;
   END IF;

════════════════════════════════════════════
' as instructions;



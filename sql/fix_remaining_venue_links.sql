-- ============================================
-- FIX REMAINING VENUE LINKS (Fuzzy Matching)
-- ============================================

-- 1. KTC 71 → Kölner TC'71
UPDATE matchdays m
SET venue_id = v.id
FROM venues v
WHERE m.venue = 'KTC 71'
  AND m.venue_id IS NULL
  AND v.name = 'Kölner TC''71';

-- 2. Tennis-Centrum Immendorf → Tenniscentrum Immendorf
UPDATE matchdays m
SET venue_id = v.id
FROM venues v
WHERE m.venue = 'Tennis-Centrum Immendorf'
  AND m.venue_id IS NULL
  AND v.name = 'Tenniscentrum Immendorf';

-- 3. Cologne Sportspark → Cologne Sportspark Poll
UPDATE matchdays m
SET venue_id = v.id
FROM venues v
WHERE m.venue = 'Cologne Sportspark'
  AND m.venue_id IS NULL
  AND v.name = 'Cologne Sportspark Poll';

-- 4. KölnerTHC Stadion RW → Kölner THC Stadion Rot-Weiß
UPDATE matchdays m
SET venue_id = v.id
FROM venues v
WHERE m.venue = 'KölnerTHC Stadion RW'
  AND m.venue_id IS NULL
  AND v.name = 'Kölner THC Stadion Rot-Weiß';

-- 5. Kölner KHT SW → Kölner KHT Schwarz-Weiss
UPDATE matchdays m
SET venue_id = v.id
FROM venues v
WHERE m.venue = 'Kölner KHT SW'
  AND m.venue_id IS NULL
  AND v.name = 'Kölner KHT Schwarz-Weiss';

-- 6. Sportpark Villeforst → TH Villeforst
UPDATE matchdays m
SET venue_id = v.id
FROM venues v
WHERE m.venue = 'Sportpark Villeforst'
  AND m.venue_id IS NULL
  AND v.name = 'TH Villeforst';

-- 7. Prüfe welche noch fehlen
SELECT 
  m.venue,
  COUNT(*) as match_count
FROM matchdays m
WHERE m.match_date >= CURRENT_DATE
  AND m.venue IS NOT NULL
  AND m.venue_id IS NULL
GROUP BY m.venue
ORDER BY match_count DESC;


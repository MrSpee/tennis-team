-- DELETE_DUPLICATES_KEEP_NEWEST.sql
-- Löscht Duplikate, behält immer den NEUESTEN Eintrag (neueste created_at)

-- SCHRITT 1: Zeige was gelöscht wird
SELECT 
  'ENTRIES TO DELETE' as status,
  ts.id,
  ts.team_id,
  ti.team_name,
  ts.season,
  ts.league,
  ts.group_name,
  ts.created_at
FROM team_seasons ts
JOIN team_info ti ON ts.team_id = ti.id
WHERE ts.is_active = true
  AND ts.id IN (
    -- Finde alle IDs, die ALTE Duplikate sind (nicht die neuesten)
    SELECT ts2.id
    FROM team_seasons ts2
    WHERE ts2.is_active = true
      AND ts2.team_id IN (
        -- Teams mit Duplikaten
        SELECT team_id
        FROM team_seasons
        WHERE is_active = true
        GROUP BY team_id, season
        HAVING COUNT(*) > 1
      )
      AND ts2.id NOT IN (
        -- Behalte nur die NEUESTEN IDs
        SELECT DISTINCT ON (team_id, season) id
        FROM team_seasons
        WHERE is_active = true
          AND team_id IN (
            SELECT team_id
            FROM team_seasons
            WHERE is_active = true
            GROUP BY team_id, season
            HAVING COUNT(*) > 1
          )
        ORDER BY team_id, season, created_at DESC
      )
  )
ORDER BY ts.team_id, ts.created_at;

-- SCHRITT 2: LÖSCHE die Duplikate (führe NUR aus wenn Step 1 zeigt was gelöscht wird!)
DELETE FROM team_seasons
WHERE is_active = true
  AND id IN (
    SELECT ts2.id
    FROM team_seasons ts2
    WHERE ts2.is_active = true
      AND ts2.team_id IN (
        SELECT team_id
        FROM team_seasons
        WHERE is_active = true
        GROUP BY team_id, season
        HAVING COUNT(*) > 1
      )
      AND ts2.id NOT IN (
        SELECT DISTINCT ON (team_id, season) id
        FROM team_seasons
        WHERE is_active = true
          AND team_id IN (
            SELECT team_id
            FROM team_seasons
            WHERE is_active = true
            GROUP BY team_id, season
            HAVING COUNT(*) > 1
          )
        ORDER BY team_id, season, created_at DESC
      )
  )
RETURNING 'DELETED' as status, id, team_id, season;





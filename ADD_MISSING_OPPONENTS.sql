-- ADD_MISSING_OPPONENTS.sql
-- Fügt fehlende Gegner-Spieler zu players_unified hinzu

-- 1. Prüfe, welche Gegner-IDs fehlen
SELECT 
  'MISSING OPPONENTS' as info,
  '3641863f-323f-45f6-a6d4-67eed87109de' as id, 'Gegner 1' as name
UNION ALL
SELECT 
  'MISSING OPPONENTS' as info,
  '01ee443d-82d8-4e84-9884-95f645ac6b6e' as id, 'Gegner 2' as name
UNION ALL
SELECT 
  'MISSING OPPONENTS' as info,
  '2eb20288-569d-4fae-8984-06991ce61ad7' as id, 'Gegner 3' as name
UNION ALL
SELECT 
  'MISSING OPPONENTS' as info,
  'e00ad920-effa-402b-ae1b-cfcc34f74c0c' as id, 'Gegner 4' as name;

-- 2. Füge fehlende Gegner-Spieler hinzu
INSERT INTO players_unified (
  id, name, email, phone, current_lk, season_start_lk, ranking, 
  points, player_type, tvm_id, info, is_captain, nation, position, 
  primary_team_id, is_active, created_at, updated_at
)
VALUES 
  (
    '3641863f-323f-45f6-a6d4-67eed87109de',
    'Leverkusen Spieler 1',
    NULL,
    NULL,
    'LK 15.0',
    'LK 15.0',
    'LK 15.0',
    0,
    'opponent',
    NULL,
    NULL,
    false,
    NULL,
    NULL,
    NULL,
    true,
    NOW(),
    NOW()
  ),
  (
    '01ee443d-82d8-4e84-9884-95f645ac6b6e',
    'Leverkusen Spieler 2',
    NULL,
    NULL,
    'LK 14.5',
    'LK 14.5',
    'LK 14.5',
    0,
    'opponent',
    NULL,
    NULL,
    false,
    NULL,
    NULL,
    NULL,
    true,
    NOW(),
    NOW()
  ),
  (
    '2eb20288-569d-4fae-8984-06991ce61ad7',
    'Leverkusen Spieler 3',
    NULL,
    NULL,
    'LK 16.0',
    'LK 16.0',
    'LK 16.0',
    0,
    'opponent',
    NULL,
    NULL,
    false,
    NULL,
    NULL,
    NULL,
    true,
    NOW(),
    NOW()
  ),
  (
    'e00ad920-effa-402b-ae1b-cfcc34f74c0c',
    'Leverkusen Spieler 4',
    NULL,
    NULL,
    'LK 13.5',
    'LK 13.5',
    'LK 13.5',
    0,
    'opponent',
    NULL,
    NULL,
    false,
    NULL,
    NULL,
    NULL,
    true,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Verifikation: Prüfe, ob alle Gegner jetzt existieren
SELECT 
  'VERIFICATION' as info,
  id, name, player_type, current_lk
FROM players_unified 
WHERE id IN (
  '3641863f-323f-45f6-a6d4-67eed87109de',
  '01ee443d-82d8-4e84-9884-95f645ac6b6e',
  '2eb20288-569d-4fae-8984-06991ce61ad7',
  'e00ad920-effa-402b-ae1b-cfcc34f74c0c'
);


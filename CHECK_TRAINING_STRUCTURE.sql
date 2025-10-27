-- ========================================
-- CHECK TRAINING STRUCTURE & CHRIS SPEE
-- ========================================

-- 1. Zeige Trainings wo Chris Organizer ist
SELECT 
  ts.id,
  ts.title,
  ts.date,
  ts.type,
  ts.organizer_id,
  ts.invited_players,
  ts.confirmed_count,
  pu.name as organizer_name
FROM training_sessions ts
JOIN players_unified pu ON ts.organizer_id = pu.id
WHERE ts.organizer_id = '43427aa7-771f-4e47-8858-c8454a1b9fee'
ORDER BY ts.date DESC
LIMIT 5;

-- 2. Zeige neuestes Round-Robin Training
SELECT 
  ts.id,
  ts.title,
  ts.date,
  ts.type,
  ts.round_robin_enabled,
  ts.organizer_id,
  ts.invited_players,
  ts.confirmed_count,
  pu.name as organizer_name
FROM training_sessions ts
JOIN players_unified pu ON ts.organizer_id = pu.id
WHERE ts.round_robin_enabled = true
  AND ts.type = 'private'
ORDER BY ts.date DESC
LIMIT 1;

-- 3. Prüfe ob Organizer automatisch invited sein sollte
SELECT 
  'FIX: Add organizer to invited_players if not present' as recommendation,
  COUNT(*) as affected_trainings
FROM training_sessions ts
WHERE ts.organizer_id IS NOT NULL
  AND (
    ts.invited_players IS NULL 
    OR NOT (ts.organizer_id = ANY(ts.invited_players))
  );



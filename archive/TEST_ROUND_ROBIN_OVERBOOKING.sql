-- ============================================================================
-- TEST: ROUND-ROBIN MIT ÜBERBUCHUNG
-- ============================================================================
-- Erstellt eine Überbuchungs-Situation für Test-Zwecke
-- ============================================================================

-- 1. WÄHLE EIN TRAINING AUS (das nächste "Volkers Hallenhelden" Training)
WITH next_training AS (
  SELECT id, title, date, max_players
  FROM training_sessions
  WHERE title = 'Volkers Hallenhelden'
  AND date >= CURRENT_DATE
  AND round_robin_enabled = true
  ORDER BY date ASC
  LIMIT 1
)
SELECT 
  'AUSGEWÄHLTES TEST-TRAINING:' as info,
  id,
  title,
  to_char(date, 'DD.MM.YYYY HH24:MI') as datum,
  max_players as "max_plätze",
  (
    SELECT COUNT(*) 
    FROM training_attendance ta 
    WHERE ta.session_id = next_training.id
    AND ta.status = 'confirmed'
  ) as "aktuelle_zusagen"
FROM next_training;

-- 2. OPTION A: Simuliere Überbuchung (füge 1 zusätzliche Zusage hinzu)
-- NUR AUSFÜHREN, WENN DU EINEN TEST-SPIELER HINZUFÜGEN WILLST!
-- Entferne die Kommentare:
/*
WITH next_training AS (
  SELECT id
  FROM training_sessions
  WHERE title = 'Volkers Hallenhelden'
  AND date >= CURRENT_DATE
  AND round_robin_enabled = true
  ORDER BY date ASC
  LIMIT 1
),
random_player AS (
  SELECT id
  FROM players
  WHERE is_active = true
  AND id NOT IN (
    SELECT player_id 
    FROM training_attendance 
    WHERE session_id = (SELECT id FROM next_training)
  )
  ORDER BY RANDOM()
  LIMIT 1
)
INSERT INTO training_attendance (session_id, player_id, status, response_date)
SELECT 
  next_training.id,
  random_player.id,
  'confirmed',
  NOW()
FROM next_training, random_player
WHERE NOT EXISTS (
  SELECT 1 
  FROM training_attendance 
  WHERE session_id = (SELECT id FROM next_training)
  AND player_id = (SELECT id FROM random_player)
);
*/

-- 3. ZEIGE PRIORITÄTS-BERECHNUNG für nächstes Training
WITH next_training AS (
  SELECT id, title, date, max_players, is_priority, round_robin_seed
  FROM training_sessions
  WHERE title = 'Volkers Hallenhelden'
  AND date >= CURRENT_DATE
  AND round_robin_enabled = true
  ORDER BY date ASC
  LIMIT 1
),
confirmed_players AS (
  SELECT 
    ta.player_id,
    p.name,
    p.training_stats,
    ta.status,
    ta.response_date
  FROM training_attendance ta
  JOIN players p ON p.id = ta.player_id
  WHERE ta.session_id = (SELECT id FROM next_training)
  AND ta.status = 'confirmed'
)
SELECT 
  ROW_NUMBER() OVER (ORDER BY 
    -- Simuliere Prioritäts-Berechnung (vereinfacht)
    COALESCE((training_stats->>'attendance_rate')::float, 0) * 40 +
    CASE WHEN (SELECT is_priority FROM next_training) THEN 30 ELSE 0 END +
    RANDOM() * 20 +
    CASE 
      WHEN training_stats->>'last_attended' IS NULL THEN 10
      ELSE LEAST(
        EXTRACT(EPOCH FROM (NOW() - (training_stats->>'last_attended')::timestamp)) / (7 * 24 * 60 * 60),
        10
      )
    END -
    COALESCE((training_stats->>'consecutive_declines')::int, 0) * 5
  DESC) as position,
  name as spieler,
  ROUND((COALESCE((training_stats->>'attendance_rate')::float, 0) * 100)::numeric, 1) || '%' as teilnahme_quote,
  COALESCE((training_stats->>'total_attended')::int, 0) as zusagen,
  COALESCE((training_stats->>'total_declined')::int, 0) as absagen,
  COALESCE((training_stats->>'consecutive_declines')::int, 0) as "absagen_in_folge",
  -- Vereinfachter Prioritäts-Score
  ROUND(
    (COALESCE((training_stats->>'attendance_rate')::float, 0) * 40 +
    CASE WHEN (SELECT is_priority FROM next_training) THEN 30 ELSE 0 END +
    RANDOM() * 20 +
    CASE 
      WHEN training_stats->>'last_attended' IS NULL THEN 10
      ELSE LEAST(
        EXTRACT(EPOCH FROM (NOW() - (training_stats->>'last_attended')::timestamp)) / (7 * 24 * 60 * 60),
        10
      )
    END -
    COALESCE((training_stats->>'consecutive_declines')::int, 0) * 5)::numeric,
    1
  ) as priorität_score,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY 
      COALESCE((training_stats->>'attendance_rate')::float, 0) * 40 +
      CASE WHEN (SELECT is_priority FROM next_training) THEN 30 ELSE 0 END +
      RANDOM() * 20 +
      CASE 
        WHEN training_stats->>'last_attended' IS NULL THEN 10
        ELSE LEAST(
          EXTRACT(EPOCH FROM (NOW() - (training_stats->>'last_attended')::timestamp)) / (7 * 24 * 60 * 60),
          10
        )
      END -
      COALESCE((training_stats->>'consecutive_declines')::int, 0) * 5
    DESC) <= (SELECT max_players FROM next_training)
    THEN '✅ DABEI'
    ELSE '⏳ WARTELISTE #' || (
      ROW_NUMBER() OVER (ORDER BY 
        COALESCE((training_stats->>'attendance_rate')::float, 0) * 40 +
        CASE WHEN (SELECT is_priority FROM next_training) THEN 30 ELSE 0 END +
        RANDOM() * 20 +
        CASE 
          WHEN training_stats->>'last_attended' IS NULL THEN 10
          ELSE LEAST(
            EXTRACT(EPOCH FROM (NOW() - (training_stats->>'last_attended')::timestamp)) / (7 * 24 * 60 * 60),
            10
          )
        END -
        COALESCE((training_stats->>'consecutive_declines')::int, 0) * 5
      DESC) - (SELECT max_players FROM next_training)
    )::text
  END as status
FROM confirmed_players
ORDER BY position;

-- 4. ZUSAMMENFASSUNG
WITH next_training AS (
  SELECT id, title, date, max_players
  FROM training_sessions
  WHERE title = 'Volkers Hallenhelden'
  AND date >= CURRENT_DATE
  AND round_robin_enabled = true
  ORDER BY date ASC
  LIMIT 1
)
SELECT 
  'ÜBERBUCHUNGS-STATUS:' as info,
  COUNT(*) as gesamt_zusagen,
  (SELECT max_players FROM next_training) as max_plätze,
  COUNT(*) - (SELECT max_players FROM next_training) as überbuchung,
  CASE 
    WHEN COUNT(*) > (SELECT max_players FROM next_training) 
    THEN '⚠️ ÜBERBUCHT - Warteliste wird erstellt'
    ELSE '✅ OK - Alle können spielen'
  END as status
FROM training_attendance
WHERE session_id = (SELECT id FROM next_training)
AND status = 'confirmed';

-- ============================================================================
-- HINWEISE:
-- ============================================================================
-- 1. Die Prioritäts-Berechnung hier ist VEREINFACHT (kein seeded random)
-- 2. Die echte Berechnung passiert im Frontend (roundRobinService.js)
-- 3. Diese Abfrage zeigt nur eine VORSCHAU, wie die Warteliste aussehen könnte
-- 4. Im Frontend werden die exakten Scores mit seededRandom berechnet
-- ============================================================================


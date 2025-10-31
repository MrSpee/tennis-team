-- ============================================================================
-- ENTFERNE FRANK RITTER AUS "VOLKERS HALLENHELDEN"
-- ============================================================================
-- Entfernt alle Zusagen von Frank Ritter für diese Trainingsgruppe
-- ============================================================================

-- 1. PRÜFE: Wo ist Frank Ritter eingetragen?
SELECT 
  'FRANK RITTERS ZUSAGEN:' as info,
  ts.title,
  to_char(ts.date, 'DD.MM.YYYY HH24:MI') as datum,
  ta.status,
  to_char(ta.response_date, 'DD.MM.YYYY HH24:MI') as zugesagt_am
FROM training_attendance ta
JOIN training_sessions ts ON ts.id = ta.session_id
JOIN players p ON p.id = ta.player_id
WHERE p.name ILIKE '%Frank%Ritter%'
AND ts.title = 'Volkers Hallenhelden'
AND ts.date >= CURRENT_DATE
ORDER BY ts.date ASC;

-- 2. ENTFERNE Frank Ritter aus allen "Volkers Hallenhelden" Trainings
DELETE FROM training_attendance
WHERE player_id IN (
  SELECT id FROM players WHERE name ILIKE '%Frank%Ritter%'
)
AND session_id IN (
  SELECT id 
  FROM training_sessions 
  WHERE title = 'Volkers Hallenhelden'
  AND date >= CURRENT_DATE
);

-- 3. BESTÄTIGUNG
SELECT 
  '✅ FRANK RITTER ENTFERNT' as status,
  'Aus allen zukünftigen "Volkers Hallenhelden" Trainings' as details;

-- 4. PRÜFE: Ist er wirklich weg?
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Frank Ritter ist nicht mehr in der Gruppe'
    ELSE '⚠️ Frank Ritter hat noch ' || COUNT(*) || ' Zusagen'
  END as verifikation
FROM training_attendance ta
JOIN training_sessions ts ON ts.id = ta.session_id
JOIN players p ON p.id = ta.player_id
WHERE p.name ILIKE '%Frank%Ritter%'
AND ts.title = 'Volkers Hallenhelden'
AND ts.date >= CURRENT_DATE;

-- ============================================================================
-- FERTIG! 🎉
-- ============================================================================
-- Frank Ritter wurde aus allen zukünftigen "Volkers Hallenhelden" Trainings
-- entfernt. Vergangene Trainings bleiben unberührt.
-- ============================================================================





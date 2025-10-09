-- ================================================================
-- UPDATE TRAINING TYPES: public → team
-- ================================================================
-- Ziel: Ändere alle 'public' Trainings zu 'team' Trainings
-- ================================================================

-- Zeige aktuelle Training-Typen
SELECT 
  '📊 Aktuelle Training-Typen:' as info,
  type,
  COUNT(*) as anzahl
FROM training_sessions
GROUP BY type
ORDER BY type;

-- Update: public → team
UPDATE training_sessions 
SET type = 'team'
WHERE type = 'public';

-- Zeige Ergebnis
SELECT 
  '✅ Nach Update:' as info,
  type,
  COUNT(*) as anzahl
FROM training_sessions
GROUP BY type
ORDER BY type;

-- Prüfe ob alle Updates erfolgreich waren
SELECT 
  '🔍 Prüfung:' as info,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Alle public Trainings wurden zu team geändert'
    ELSE '❌ Es gibt noch ' || COUNT(*) || ' public Trainings'
  END as status
FROM training_sessions
WHERE type = 'public';

-- Zeige finale Training-Typen
SELECT 
  '📋 Finale Training-Typen:' as info,
  type,
  COUNT(*) as anzahl
FROM training_sessions
GROUP BY type
ORDER BY type;

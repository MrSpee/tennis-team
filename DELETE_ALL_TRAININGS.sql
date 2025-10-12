-- ================================================================
-- DELETE ALL TRAINING SESSIONS
-- ================================================================
-- Ziel: Alle Trainingseinheiten und zugehörigen Daten komplett löschen
-- ================================================================

-- Zeige aktuelle Anzahl der Trainings
SELECT 
  '📊 Aktuelle Trainings:' as info,
  COUNT(*) as anzahl_trainings
FROM training_sessions;

-- Zeige aktuelle Anzahl der Attendance-Einträge
SELECT 
  '📊 Aktuelle Attendance-Einträge:' as info,
  COUNT(*) as anzahl_attendance
FROM training_attendance;

-- Lösche alle Attendance-Einträge (FOREIGN KEY zu training_sessions)
DELETE FROM training_attendance;

-- Zeige gelöschte Attendance-Einträge
SELECT 
  '✅ Attendance-Einträge gelöscht' as status;

-- Lösche alle Training-Sessions
DELETE FROM training_sessions;

-- Zeige gelöschte Trainings
SELECT 
  '✅ Training-Sessions gelöscht' as status;

-- Bestätigung: Alle Trainings gelöscht
SELECT 
  '📊 Verbleibende Trainings:' as info,
  COUNT(*) as anzahl_trainings
FROM training_sessions;

-- Bestätigung: Alle Attendance-Einträge gelöscht
SELECT 
  '📊 Verbleibende Attendance-Einträge:' as info,
  COUNT(*) as anzahl_attendance
FROM training_attendance;

-- Optional: Lösche auch Activity-Logs für Trainings (falls vorhanden)
-- DELETE FROM activity_logs WHERE activity_type IN ('training_created', 'training_response', 'training_updated', 'training_deleted');

SELECT '🎾 ALLE TRAININGS ERFOLGREICH GELÖSCHT!' as status;

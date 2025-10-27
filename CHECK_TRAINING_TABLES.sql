-- Analysiere die verschiedenen Training-Tabellen

-- 1. Was ist in training_attendance?
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'training_attendance'
ORDER BY ordinal_position;

-- 2. Was ist in training_sessions?
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'training_sessions'
ORDER BY ordinal_position;

-- 3. Was ist in training_sessions_with_access? (die View)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'training_sessions_with_access'
ORDER BY ordinal_position;

-- 4. Zeige Definition der View training_sessions_with_access
SELECT pg_get_viewdef('training_sessions_with_access'::regclass, true);

-- 5. Beispiel-Daten aus jeder Tabelle
SELECT * FROM training_attendance LIMIT 3;
SELECT * FROM training_sessions LIMIT 3;
SELECT * FROM training_sessions_with_access LIMIT 3;



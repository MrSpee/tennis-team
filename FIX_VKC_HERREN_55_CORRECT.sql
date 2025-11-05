-- ============================================
-- FIX VKC KÖLN HERREN 55 - RICHTIGE METHODE
-- ============================================
-- UPDATE statt DELETE: Kopiere Court-Daten zu alten Matches
-- ============================================

-- 1️⃣ Update ALT Match vom 01.11.2025 mit Court-Daten vom NEU Match
UPDATE matchdays
SET 
  court_number = 3,
  court_number_end = 4
WHERE id = 'd11fc0d0-91f2-44f6-a1d0-7a2a34b89334'; -- ALT Match (01.11.2025)

-- 2️⃣ Update ALT Match vom 24.01.2026 mit Court-Daten  
UPDATE matchdays
SET 
  court_number = 1,
  court_number_end = 2
WHERE id = '02f1b5ed-0395-42f0-8740-de8e6e96a584'; -- ALT Match (24.01.2026)

-- 3️⃣ Update ALT Match vom 08.03.2026 mit Court-Daten
UPDATE matchdays
SET 
  court_number = 3,
  court_number_end = 4
WHERE id = 'c97ed64c-3892-42de-840b-58f4773b09ae'; -- ALT Match (08.03.2026)

-- 4️⃣ Jetzt LÖSCHE die NEUEN Duplikat-Matches (ohne match_results)
DELETE FROM matchdays 
WHERE id IN (
  '3038a79e-b6ef-47fd-a4ae-9b7e71ee059e',  -- NEU Match 01.11.2025
  '460d8d53-c0a3-4c6b-9e71-5caabf242c34',  -- NEU Match 24.01.2026
  'e97c4b16-f1e3-4d61-a449-b8ce562d5f66'   -- NEU Match 08.03.2026
);

-- 5️⃣ Lösche das duplizierte Team
DELETE FROM team_info
WHERE id = '92115e89-e71a-4ba0-9b1f-c14df16aaaf8';

-- 6️⃣ Fixe Leerzeichen im team_name
UPDATE team_info
SET team_name = '1'
WHERE id = '3427d451-2665-43c5-ac70-f975934b7dac'
  AND team_name = ' 1';

-- 7️⃣ Verifiziere
SELECT 
  '✅ ERGEBNIS' as info,
  match_date::date,
  venue,
  court_number,
  court_number_end,
  (SELECT COUNT(*) FROM match_results WHERE matchday_id = matchdays.id) as result_count
FROM matchdays
WHERE home_team_id = '3427d451-2665-43c5-ac70-f975934b7dac'
   OR away_team_id = '3427d451-2665-43c5-ac70-f975934b7dac'
ORDER BY match_date;



-- Analyse: Spieltage und Ergebnisse
-- Erstellt: 2025-01-24

-- 1. Übersicht: Anzahl Ergebnisse pro Spieltag
SELECT 
  CASE 
    WHEN anzahl_ergebnisse = 0 THEN '0 Ergebnisse'
    WHEN anzahl_ergebnisse BETWEEN 1 AND 3 THEN '1-3 Ergebnisse'
    WHEN anzahl_ergebnisse BETWEEN 4 AND 6 THEN '4-6 Ergebnisse'
    WHEN anzahl_ergebnisse > 6 THEN '7+ Ergebnisse'
  END as ergebnis_kategorie,
  COUNT(*) as anzahl_spieltage,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM matchdays), 2) as prozent
FROM (
  SELECT 
    md.id,
    COUNT(mr.id) as anzahl_ergebnisse
  FROM matchdays md
  LEFT JOIN match_results mr ON md.id = mr.matchday_id
  GROUP BY md.id
) sub
GROUP BY ergebnis_kategorie
ORDER BY 
  CASE 
    WHEN ergebnis_kategorie = '0 Ergebnisse' THEN 1
    WHEN ergebnis_kategorie = '1-3 Ergebnisse' THEN 2
    WHEN ergebnis_kategorie = '4-6 Ergebnisse' THEN 3
    WHEN ergebnis_kategorie = '7+ Ergebnisse' THEN 4
  END;

-- 2. Vergangene Spieltage ohne Ergebnisse (mit meeting_id = Import-Kandidaten)
SELECT 
  md.id,
  md.match_date,
  md.meeting_id,
  md.status,
  ht.club_name || ' ' || COALESCE(ht.team_name, '') as home_team,
  at.club_name || ' ' || COALESCE(at.team_name, '') as away_team,
  md.final_score,
  CASE 
    WHEN md.meeting_id IS NOT NULL THEN '✅ Hat meeting_id'
    ELSE '❌ Kein meeting_id'
  END as import_moeglich
FROM matchdays md
LEFT JOIN team_info ht ON md.home_team_id = ht.id
LEFT JOIN team_info at ON md.away_team_id = at.id
WHERE md.match_date < NOW()
AND NOT EXISTS (
  SELECT 1 FROM match_results mr 
  WHERE mr.matchday_id = md.id
)
ORDER BY md.match_date DESC;


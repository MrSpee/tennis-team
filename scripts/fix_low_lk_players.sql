-- Script zum Korrigieren von Spielern mit falschen LK-Werten
-- Diese Spieler haben wahrscheinlich ihre Position statt ihrer LK als LK gespeichert

-- Liste der betroffenen Spieler:
-- Arne Luther: LK 1 (wahrscheinlich Position 1)
-- Markus Coenen: LK 2 (wahrscheinlich Position 2)
-- Peter Meier: LK 2 (wahrscheinlich Position 2)
-- Guido Steil: LK 2.9 (unwahrscheinlich, aber möglich)
-- Jörg Kanonenberg: LK 3.1 (unwahrscheinlich, aber möglich)
-- Max Lehmann: LK 3.8 (unwahrscheinlich, aber möglich)
-- Marc Hess: LK 4 (wahrscheinlich Position 4)
-- Steffen Hermann: LK 4 (wahrscheinlich Position 4)
-- Thomas Nordmann: LK 4 (wahrscheinlich Position 4)
-- Volker Sons: LK 4 (wahrscheinlich Position 4)
-- Georg Koeppinghoff: LK 4.3 (unwahrscheinlich, aber möglich)
-- Mark-Flavius Riehl: LK 4.3 (unwahrscheinlich, aber möglich)
-- Achim Linden: LK 5.0 (wahrscheinlich Position 5)
-- Peter AUS* Nowacki: LK 5 (wahrscheinlich Position 5)
-- Peter Missbach: LK 5 (wahrscheinlich Position 5)
-- Pascal Rögels: LK 5.4 (unwahrscheinlich, aber möglich)
-- Holger Hegemann: LK 5.5 (unwahrscheinlich, aber möglich)
-- Mark Witten: LK 5.6 (unwahrscheinlich, aber möglich)
-- Jörg Buschmeyer: LK 5.7 (unwahrscheinlich, aber möglich)
-- Georg Dressler: LK 6 (wahrscheinlich Position 6)
-- Ian IRL N Winick: LK 6 (wahrscheinlich Position 6)
-- Julian Kallfaß: LK 6.0 (wahrscheinlich Position 6)

-- Aktion: Setze LK auf NULL, damit sie beim nächsten Import/Update korrekt gesetzt werden kann
-- ODER: Setze auf einen Standard-Wert (z.B. 12.0) als Fallback

-- Option 1: Setze auf NULL (empfohlen)
UPDATE players_unified
SET 
  current_lk = NULL,
  season_start_lk = NULL,
  ranking = NULL
WHERE 
  CAST(REPLACE(REPLACE(COALESCE(current_lk, '25'), 'LK ', ''), ',', '.') AS NUMERIC) BETWEEN 1 AND 6
  AND player_type = 'app_user'
  AND is_active = false
  AND (tvm_id IS NULL AND tvm_id_number IS NULL);

-- Option 2: Setze auf Standard-Wert 12.0 (nur wenn sicher, dass es falsch ist)
-- UPDATE players_unified
-- SET 
--   current_lk = 'LK 12.0',
--   season_start_lk = 'LK 12.0'
-- WHERE 
--   CAST(REPLACE(REPLACE(COALESCE(current_lk, '25'), 'LK ', ''), ',', '.') AS NUMERIC) BETWEEN 1 AND 6
--   AND player_type = 'app_user'
--   AND is_active = false
--   AND (tvm_id IS NULL AND tvm_id_number IS NULL);


-- ==============================================================================
-- DOKUMENTATION: match_results.status Werte
-- ==============================================================================
-- 
-- Diese Datei dokumentiert die gültigen Werte für das 'status' Feld in der
-- 'match_results' Tabelle. Sie dient nur zur Dokumentation und muss NICHT
-- ausgeführt werden.
--
-- ==============================================================================

-- Gültige Status-Werte:
-- =====================

-- 1. NORMALE SPIELVERLÄUFE
-- -------------------------

-- 'pending'
--   - Match ist geplant, aber noch nicht begonnen
--   - Spieler können bereits zugeordnet sein
--   - Keine Scores vorhanden

-- 'in_progress'
--   - Match läuft gerade oder wurde teilweise gespielt
--   - Mindestens ein Satz hat begonnen
--   - Noch kein finaler Gewinner

-- 'completed'
--   - Match ist normal beendet
--   - Ein Gewinner wurde durch reguläre Tennis-Regeln ermittelt
--   - Alle Sätze wurden gespielt (Best of 3)


-- 2. SPIELABBRÜCHE
-- ----------------

-- 'retired'
--   - Spieler hat aufgegeben (Verletzung, Erschöpfung, Krankheit)
--   - Der ANDERE Spieler gewinnt automatisch
--   - Scores können bis zum Abbruch erfasst sein
--   - Beispiel: "Spieler X hat bei 6:4, 3:2 aufgegeben"
--   - Info: Der Grund sollte in 'notes' dokumentiert werden

-- 'walkover' (w/o)
--   - Kampflos gewonnen - Gegner ist nicht angetreten
--   - Der anwesende Spieler gewinnt automatisch
--   - Üblicherweise KEINE Scores (oder Standard-Score wie 6:0, 6:0)
--   - Beispiel: "Gegner nicht erschienen"

-- 'disqualified'
--   - Spieler wurde disqualifiziert
--   - Gründe: Unsportliches Verhalten, Regelverstöße, etc.
--   - Der ANDERE Spieler gewinnt automatisch
--   - Scores bis zur Disqualifikation können erfasst sein
--   - Info: Der Grund MUSS in 'notes' dokumentiert werden

-- 'defaulted'
--   - Spieler ist nicht angetreten / nicht erschienen
--   - Ähnlich wie 'walkover', aber spezifischer
--   - Der erschienene Spieler gewinnt automatisch
--   - KEINE Scores
--   - Beispiel: "Spieler X nicht erschienen"


-- ==============================================================================
-- WICHTIGE HINWEISE FÜR DIE IMPLEMENTIERUNG
-- ==============================================================================

-- 1. GEWINNER-BESTIMMUNG BEI SPIELABBRÜCHEN:
--    - Bei allen Abbruch-Status wird automatisch ein Gewinner ermittelt
--    - Standard-Annahme: Der HEIM-Spieler gewinnt (wenn nicht anders angegeben)
--    - Falls der GAST-Spieler gewinnen soll, müssen die Spieler-Positionen
--      getauscht werden ODER es muss ein separates 'winner' Feld genutzt werden

-- 2. NOTES FELD:
--    - Bei Spielabbrüchen SOLLTE der Grund im 'notes' Feld dokumentiert werden
--    - Format: "[Status-Label]. [Optional: Zusätzliche Details]"
--    - Beispiele:
--      * "Aufgegeben (Verletzung/Erschöpfung). Knieverletzung im 2. Satz"
--      * "Kampflos (w/o - Gegner nicht angetreten)"
--      * "Disqualifikation. Wiederholtes unsportliches Verhalten"

-- 3. SCORES BEI SPIELABBRÜCHEN:
--    - Bei 'retired', 'disqualified': Scores BIS ZUM ABBRUCH können erfasst werden
--    - Bei 'walkover', 'defaulted': KEINE Scores (oder optional Standard-Scores)

-- 4. COMPLETED_AT ZEITSTEMPEL:
--    - Wird bei allen beendeten Matches gesetzt (inkl. Spielabbrüchen)
--    - Nur 'pending' und 'in_progress' haben completed_at = NULL

-- ==============================================================================
-- BEISPIEL-QUERIES
-- ==============================================================================

-- Alle abgeschlossenen Matches (normal + Spielabbrüche):
-- SELECT * FROM match_results 
-- WHERE status IN ('completed', 'retired', 'walkover', 'disqualified', 'defaulted');

-- Alle Spielabbrüche:
-- SELECT * FROM match_results 
-- WHERE status IN ('retired', 'walkover', 'disqualified', 'defaulted');

-- Matches mit Verletzungen:
-- SELECT * FROM match_results 
-- WHERE status = 'retired' 
--   AND (notes ILIKE '%verletz%' OR notes ILIKE '%injury%');

-- ==============================================================================
-- CHANGELOG
-- ==============================================================================
-- 2025-01-15: Initiale Dokumentation der Status-Werte
--             Hinzufügen der Spielabbruch-Status: retired, walkover, disqualified, defaulted


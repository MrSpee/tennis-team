# Analyse: Falsche LK-Werte in der Datenbank

## Problem
22 Spieler haben sehr niedrige LK-Werte (1-6), die wahrscheinlich falsch sind.

## Ursache
Das Problem entstand wahrscheinlich durch:

1. **Position statt LK extrahiert**: Die `extractLkValue` Funktion hat möglicherweise die Position (1, 2, 3, etc.) aus der Meldeliste als LK interpretiert, anstatt die tatsächliche LK.

2. **Fehlende Validierung**: Die Funktion hat keine ausreichende Validierung, um sicherzustellen, dass die extrahierte Zahl wirklich eine LK ist (1-25) und nicht eine Position oder ID.

3. **Pattern 5 Problem**: Das Pattern 5 in der alten Version hat standalone Zahlen extrahiert, ohne ausreichend zu prüfen, ob es wirklich eine LK ist oder eine Position/ID.

## Betroffene Spieler
Alle haben:
- Keine `tvm_id` oder `tvm_id_number` (nicht über nuLiga Scraper importiert)
- `is_active: false` (nicht aktiv)
- `player_type: 'app_user'` (App-User, nicht extern)
- Sehr niedrige LK-Werte (1-6)

## Lösung
1. **Verbesserte Validierung** in `extractLkValue`:
   - Prüfe Kontext (muss "LK", "Leistungsklasse", "Position" enthalten)
   - Prüfe ob Zahl zwischen 1-25 liegt
   - Ignoriere Zahlen, die Teil einer größeren Zahl sind (z.B. ID-Nummern)

2. **Manuelle Korrektur**: Diese Spieler müssen manuell korrigiert werden, da wir ihre echten LK-Werte nicht automatisch ermitteln können (keine TVM-ID vorhanden).

3. **Prävention**: 
   - Beim Speichern von LK-Werten Validierung einbauen
   - Warnung ausgeben, wenn LK < 7 oder > 20
   - Logging für verdächtige LK-Werte


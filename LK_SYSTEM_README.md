# 🎾 LK-Tracking-System - Komplette Anleitung

## 📋 Überblick

Das LK-System bildet **realistisch** ab, wie Leistungsklassen im Tennis funktionieren:

### ✅ **Richtig verstanden:**
- 🎯 Die LK ist **spielergebunden**, nicht teamgebunden
- 📊 Ein Spieler kann in **mehreren Teams** spielen (z.B. Herren 40 + Herren 50)
- 🏆 **Alle** Medenspiele zählen zur LK (egal in welchem Team)
- 📈 Die LK entwickelt sich über die **gesamte Saison**
- 🎯 Auch **Turniere** können die LK beeinflussen

### ❌ **Häufige Missverständnisse:**
- ❌ "Jedes Team hat eigene LKs" → FALSCH
- ❌ "Die Meldelisten-LK ist fix" → FALSCH (nur Startpunkt!)
- ❌ "LK gilt nur für ein Team" → FALSCH

---

## 🏗️ **System-Architektur**

### **1. Datenbank-Struktur**

```
players
├── season_start_lk    → LK zu Saisonbeginn (aus Meldeliste)
├── current_lk         → Aktuelle LK (wird aktualisiert)
├── last_lk_update     → Zeitpunkt der letzten Änderung
└── season_improvement → Verbesserung seit Saisonstart

player_lk_history      → Komplette Historie aller LK-Änderungen
├── old_lk            
├── new_lk
├── lk_change          → Numerischer Wert (z.B. -0.5)
├── change_reason      → 'match_result', 'season_start', 'tournament', 'manual'
├── match_id           → Bezug zum Match (falls relevant)
├── team_id            → In welchem Team gespielt
└── season             → Welche Saison

match_results          → Einzelne Spielergebnisse
├── player_id
├── match_id
├── position           → Einzel 1-6
├── result             → 'win', 'loss', 'not_played'
├── opponent_lk        → LK des Gegners
├── lk_before          → LK vor dem Spiel
├── lk_after           → LK nach dem Spiel
└── lk_change          → Änderung durch dieses Spiel
```

---

## 🚀 **Schritt-für-Schritt: Team-Import**

### **SCHRITT 1: System einrichten**

```sql
-- Führe einmalig aus in Supabase SQL Editor:
\i LK_TRACKING_SYSTEM_SETUP.sql
```

Das erstellt:
- ✅ `player_lk_history` Tabelle
- ✅ `match_results` Tabelle
- ✅ Hilfsfunktionen (`lk_to_number`, `number_to_lk`)
- ✅ Trigger für automatisches Tracking
- ✅ RLS-Policies

---

### **SCHRITT 2: Meldeliste vorbereiten**

Sammle folgende Infos aus der TVM-Meldeliste:

```
Team-Info:
- Club-Name: "TC Sürth"
- Team-Name: "Herren 40 1"
- Kategorie: "Herren 40"
- Liga: "1. Bezirksliga"
- Gruppe: "Gr. 043"
- Saison: "Winter 2025/26"
- TVM-Link: "https://tvm...."

Spieler-Info (für jeden Spieler):
- Name: "Max Mustermann"
- Email: "max@example.com" (WICHTIG: Muss registriert sein!)
- LK aus Meldeliste: "LK 12.5"
- Rolle: "player" oder "captain"
- Ist Haupt-Team: true/false
```

---

### **SCHRITT 3: Import-Script anpassen**

Öffne `IMPORT_TEAM_WITH_PLAYERS.sql` und ersetze die Platzhalter:

```sql
-- Team-Daten
'[CLUB_NAME]'     → 'TC Sürth'
'[TEAM_NAME]'     → 'Herren 40 1'
'[CATEGORY]'      → 'Herren 40'
'[REGION]'        → 'Mittelrhein'
'[LEAGUE]'        → '1. Bezirksliga'
'[GROUP]'         → 'Gr. 043'
'[SEASON]'        → 'Winter 2025/26'
[TEAM_SIZE]       → 6
'[TVM_LINK]'      → 'https://...' oder NULL

-- Spieler-Daten (für jeden Spieler)
'[PLAYER_1_EMAIL]' → 'max@example.com'
'[PLAYER_1_LK]'    → 'LK 12.5'
[IS_PRIMARY]       → true
'[ROLE]'           → 'captain'

'[PLAYER_2_EMAIL]' → 'anna@example.com'
'[PLAYER_2_LK]'    → 'LK 14.8'
[IS_PRIMARY]       → true
'[ROLE]'           → 'player'
```

**WICHTIG:** 
- ⚠️ Spieler müssen sich **vorher registriert** haben!
- ⚠️ Die Email muss **exakt** übereinstimmen
- ⚠️ LK-Format: `'LK 12.5'` (mit Leerzeichen!)

---

### **SCHRITT 4: Import ausführen**

```sql
-- In Supabase SQL Editor (als postgres):
\i IMPORT_TEAM_WITH_PLAYERS.sql
```

Du solltest sehen:
```
✅ Club erstellt: TC Sürth (uuid)
✅ Team erstellt: Herren 40 1 (uuid)
✅ Saison erstellt: Winter 2025/26 - 1. Bezirksliga Gr. 043
👥 Importiere Spieler aus Meldeliste...
  ✅ Spieler 1: max@example.com → LK 12.5
  ✅ Spieler 2: anna@example.com → LK 14.8
  ...
✅ IMPORT ABGESCHLOSSEN!
```

---

## 📊 **Wie funktioniert die LK-Berechnung?**

### **1. Saisonstart (Import)**
```sql
season_start_lk = 'LK 12.5'  -- Aus Meldeliste
current_lk = 'LK 12.5'        -- Start = Current
season_improvement = 0        -- Noch keine Änderung
```

### **2. Nach erstem Medenspiel**
Kapitän erfasst Einzelergebnisse:
- Position: Einzel 1
- Ergebnis: Sieg
- Gegner-LK: LK 11.8

System berechnet:
```sql
lk_change = -0.2  -- Verbesserung (niedrigere Zahl = besser!)
current_lk = 'LK 12.3'
season_improvement = +0.2
```

Automatisch erstellt:
- ✅ Eintrag in `player_lk_history`
- ✅ Eintrag in `match_results`
- ✅ Update in `players.current_lk`

### **3. Nach weiterem Spiel in anderem Team**
Spieler spielt auch in "Herren 30 1":
- Ergebnis: Niederlage
- Gegner-LK: LK 10.5

```sql
lk_change = +0.3  -- Verschlechterung
current_lk = 'LK 12.6'
season_improvement = -0.1  -- Jetzt schlechter als Saisonstart!
```

**Wichtig:** Die `current_lk` gilt für **beide Teams**! ✅

---

## 🔍 **Nützliche Abfragen**

### **1. LK-Historie eines Spielers**
```sql
SELECT 
  plh.created_at::date as datum,
  plh.old_lk as alt,
  plh.new_lk as neu,
  plh.lk_change as änderung,
  plh.change_reason as grund,
  ti.club_name || ' - ' || ti.team_name as team,
  m.opponent as gegner
FROM player_lk_history plh
LEFT JOIN team_info ti ON ti.id = plh.team_id
LEFT JOIN matches m ON m.id = plh.match_id
WHERE plh.player_id = (SELECT id FROM players WHERE email = 'max@example.com')
ORDER BY plh.created_at DESC;
```

### **2. Top-Verbesserer der Saison**
```sql
SELECT 
  p.name,
  p.season_start_lk as start,
  p.current_lk as aktuell,
  p.season_improvement as verbesserung,
  ti.club_name || ' - ' || ti.team_name as haupt_team
FROM players p
JOIN player_teams pt ON pt.player_id = p.id AND pt.is_primary = true
JOIN team_info ti ON ti.id = pt.team_id
WHERE p.season_start_lk IS NOT NULL
  AND p.current_lk IS NOT NULL
ORDER BY p.season_improvement DESC
LIMIT 10;
```

### **3. LK-Entwicklung über Zeit**
```sql
SELECT 
  DATE_TRUNC('week', plh.created_at) as woche,
  AVG(lk_to_number(plh.new_lk)) as durchschnitt_lk,
  COUNT(*) as anzahl_änderungen
FROM player_lk_history plh
WHERE plh.created_at >= NOW() - INTERVAL '3 months'
GROUP BY woche
ORDER BY woche;
```

### **4. Match-Results eines Spielers**
```sql
SELECT 
  m.match_date::date as datum,
  ti.club_name as verein,
  m.opponent as gegner,
  mr.position as position,
  mr.result as ergebnis,
  mr.score as score,
  mr.opponent_lk as gegner_lk,
  mr.lk_before as lk_vorher,
  mr.lk_after as lk_nachher,
  mr.lk_change as änderung
FROM match_results mr
JOIN matches m ON m.id = mr.match_id
JOIN team_info ti ON ti.id = m.team_id
WHERE mr.player_id = (SELECT id FROM players WHERE email = 'max@example.com')
ORDER BY m.match_date DESC;
```

---

## 📱 **Frontend-Integration**

Die App zeigt automatisch:

### **Rankings-View**
- ✅ Aktuelle LK aller Spieler
- ✅ Season Improvement Badge
- ✅ Form-Trend (basiert auf Win-Rate)
- ✅ LK-History Graph (kommend)

### **Player-Profile**
- ✅ LK-Entwicklung über Saison
- ✅ Match-Results mit LK-Änderungen
- ✅ Teams-Übersicht (alle Teams des Spielers)

### **Dashboard**
- ✅ "Top-Verbesserer" Widget
- ✅ Team-LK-Durchschnitt

---

## 🎯 **Best Practices**

### **✅ DO:**
- ✅ Setze `season_start_lk` aus offizieller TVM-Meldeliste
- ✅ Erfasse Match-Results zeitnah nach Medenspielen
- ✅ Prüfe LK-Changes auf Plausibilität
- ✅ Nutze `player_lk_history` für Transparenz

### **❌ DON'T:**
- ❌ Setze nicht manuell `current_lk` direkt (außer bei Saisonstart)
- ❌ Erfasse keine Doppel-Ergebnisse einzeln (nur Einzel zählt für LK)
- ❌ Ändere nicht rückwirkend LKs (Historie bleibt bestehen!)
- ❌ Lösche keine Einträge aus `player_lk_history`

---

## 🔧 **Troubleshooting**

### **Problem: "Spieler hat keine LK"**
```sql
-- Prüfe ob season_start_lk gesetzt ist:
SELECT name, season_start_lk, current_lk 
FROM players 
WHERE email = 'max@example.com';

-- Falls NULL: Setze manuell
UPDATE players 
SET season_start_lk = 'LK 12.5',
    current_lk = 'LK 12.5'
WHERE email = 'max@example.com';
```

### **Problem: "LK-Änderung wird nicht getrackt"**
```sql
-- Prüfe ob Trigger existiert:
SELECT * FROM pg_trigger WHERE tgname = 'trigger_track_lk_changes';

-- Falls nicht: LK_TRACKING_SYSTEM_SETUP.sql nochmal ausführen
```

### **Problem: "Spieler nicht in Team"**
```sql
-- Prüfe player_teams:
SELECT * FROM player_teams pt
JOIN players p ON p.id = pt.player_id
WHERE p.email = 'max@example.com';

-- Falls leer: IMPORT_TEAM_WITH_PLAYERS.sql nochmal ausführen
```

---

## 📞 **Support**

Bei Fragen oder Problemen:
1. Prüfe `player_lk_history` für Hinweise
2. Schaue in Supabase SQL Editor Logs
3. Führe Verification-Queries aus

**Happy Tracking! 🎾🚀**


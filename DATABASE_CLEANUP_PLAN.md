# 🧹 Datenbank-Cleanup Plan

## 📊 **Aktuelle Situation (Chaos!)**

### Tabellen/Views:
- ✅ `players` - **HAUPT-TABELLE** (alle Spieler-Daten)
- ❌ `player_profiles` - **LEER** → LÖSCHEN
- ❌ `public_player_profiles` - **REDUNDANT** → LÖSCHEN  
- ❌ `player_teams` - **VIEW** → sollte Tabelle sein
- ❌ `player_teams_with_club` - **KOMPLEX** → vereinfachen

### Problem:
- LK-Daten sind in `players` Tabelle
- Views greifen auf verschiedene Quellen zu
- Inkonsistente Daten zwischen Tabellen/Views

---

## 🎯 **Ziel: Saubere Struktur**

### **Nur diese Tabellen behalten:**
1. ✅ `players` - Alle Spieler-Daten (inkl. LK)
2. ✅ `player_teams` - Spieler ↔ Teams Verknüpfung (als Tabelle!)
3. ✅ `team_info` - Team-Informationen
4. ✅ `matches` - Spiele
5. ✅ `match_availability` - Verfügbarkeiten
6. ✅ `match_results` - Einzelergebnisse (für LK-Berechnung)

### **Löschen:**
- ❌ `player_profiles` (leer)
- ❌ `public_player_profiles` (redundant)
- ❌ Views die auf gelöschte Tabellen zeigen

---

## 🚀 **Cleanup-Script**

### **SCHRITT 1: Prüfe was gelöscht werden kann**
```sql
-- Prüfe player_profiles
SELECT COUNT(*) as player_profiles_count FROM player_profiles;

-- Prüfe public_player_profiles  
SELECT COUNT(*) as public_profiles_count FROM public_player_profiles;

-- Prüfe Views
SELECT table_name, view_definition 
FROM information_schema.views 
WHERE table_schema = 'public'
  AND table_name LIKE '%player%';
```

### **SCHRITT 2: Lösche redundante Tabellen/Views**
```sql
-- Lösche leere player_profiles Tabelle
DROP TABLE IF EXISTS player_profiles CASCADE;

-- Lösche redundante View
DROP VIEW IF EXISTS public_player_profiles CASCADE;

-- Lösche unnötige Views (falls vorhanden)
DROP VIEW IF EXISTS player_teams CASCADE;
DROP VIEW IF EXISTS player_teams_with_club CASCADE;
```

### **SCHRITT 3: Erstelle player_teams als Tabelle (falls noch nicht vorhanden)**
```sql
-- Prüfe ob player_teams Tabelle existiert
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'player_teams';

-- Falls nicht vorhanden, erstelle sie:
CREATE TABLE IF NOT EXISTS player_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES team_info(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  role VARCHAR(50) DEFAULT 'player',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, team_id)
);
```

### **SCHRITT 4: Prüfe LK-Daten in players**
```sql
-- Zeige alle Spieler mit LK-Status
SELECT 
  name,
  current_lk,
  season_start_lk,
  ranking,
  CASE 
    WHEN current_lk IS NOT NULL THEN '✅ current_lk'
    WHEN season_start_lk IS NOT NULL THEN '✅ season_start_lk'  
    WHEN ranking IS NOT NULL THEN '⚠️ ranking (legacy)'
    ELSE '❌ KEINE LK'
  END as lk_status
FROM players
ORDER BY name;
```

---

## 🔧 **Nach dem Cleanup**

### **Einfache Datenstruktur:**
```
players (Haupt-Tabelle)
├── id, name, email, phone
├── current_lk, season_start_lk, season_improvement
├── profile_image, tennis_motto, favorite_shot
└── birth_date, address, emergency_contact

player_teams (Verknüpfung)
├── player_id → players.id
├── team_id → team_info.id  
├── is_primary, role
└── created_at

team_info (Teams)
├── id, club_name, team_name, category
├── league, group_name, region
└── tvm_link, created_at

matches (Spiele)
├── id, team_id, opponent, match_date
├── location, venue, season
└── players_needed

match_availability (Verfügbarkeiten)
├── match_id, player_id, status, comment
└── created_at, updated_at
```

### **Vorteile:**
- ✅ **Eine** Quelle für Spieler-Daten
- ✅ **Konsistente** LK-Verarbeitung
- ✅ **Einfache** Queries
- ✅ **Weniger** Verwirrung

---

## ⚠️ **WICHTIG: Vor dem Löschen**

### **Backup erstellen:**
```sql
-- Backup der aktuellen Struktur
CREATE TABLE player_profiles_backup AS SELECT * FROM player_profiles;
CREATE TABLE public_player_profiles_backup AS SELECT * FROM public_player_profiles;
```

### **Daten migrieren (falls nötig):**
```sql
-- Falls player_profiles Daten hat, migriere zu players
UPDATE players 
SET 
  profile_image = pp.profile_image,
  tennis_motto = pp.tennis_motto,
  favorite_shot = pp.favorite_shot
FROM player_profiles pp
WHERE players.id = pp.id;
```

---

## 🎯 **Empfehlung**

**Führe das Cleanup-Script aus:**
1. ✅ Prüfe was gelöscht werden kann
2. ✅ Lösche redundante Tabellen/Views  
3. ✅ Prüfe LK-Daten
4. ✅ Teste LK-Berechnung erneut

**Danach sollte Roland Reifens LK korrekt angezeigt werden!**

---

## 📋 **Quick-Check nach Cleanup**

```sql
-- Prüfe ob alles sauber ist
SELECT 
  'players' as tabelle, COUNT(*) as anzahl FROM players
UNION ALL
SELECT 
  'player_teams' as tabelle, COUNT(*) as anzahl FROM player_teams
UNION ALL  
SELECT
  'team_info' as tabelle, COUNT(*) as anzahl FROM team_info;

-- Prüfe LK-Daten
SELECT 
  COUNT(*) as spieler_mit_lk
FROM players 
WHERE current_lk IS NOT NULL OR season_start_lk IS NOT NULL;
```

**Soll ich das Cleanup-Script erstellen und ausführen?** 🧹


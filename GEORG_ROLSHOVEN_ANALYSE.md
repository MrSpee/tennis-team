# 🔍 Detaillierte Analyse: Georg Rolshoven - Duplikat-Problem

## Problem-Übersicht

Georg Rolshoven existiert **2x** in der Datenbank, was dazu führt, dass seine persönlichen Ergebnisse nicht vollständig angezeigt werden.

---

## 📊 Datenbank-Analyse

### 1. Zwei Player-Einträge gefunden:

#### **Aktiver Spieler** (Haupt-Eintrag):
- **ID**: `3bacc047-a692-4d94-8659-6bbcb629d83c`
- **Name**: Georg Rolshoven
- **Email**: georgrolshoven@gmail.com
- **user_id**: `887a98c2-5ef7-471e-93b3-fcd2d45b7f67` ✅ (hat Login)
- **current_lk**: LK 10.9
- **is_active**: `true` ✅
- **Erstellt**: 2025-10-09 18:38:25
- **Aktualisiert**: 2025-11-01 10:55:26

#### **Inaktiver Spieler** (Duplikat):
- **ID**: `9df79240-7c31-4a98-b2f6-fe1f0495207b`
- **Name**: Georg Rolshoven
- **Email**: `null` ❌
- **user_id**: `null` ❌ (kein Login)
- **current_lk**: 13.6
- **is_active**: `false` ❌
- **Erstellt**: 2025-12-14 07:54:49
- **Aktualisiert**: 2025-12-14 07:54:49

---

### 2. Match-Ergebnisse auf beide IDs verteilt:

#### **Aktiver Spieler** (ID: `3bacc047...`):
- **3 Ergebnisse** gefunden
- **2 verschiedene Matchdays**
- Ergebnisse vom:
  - 2025-11-01 (Einzel + Doppel)
  - 2025-10-04 (Einzel)

#### **Inaktiver Spieler** (ID: `9df79240...`):
- **2 Ergebnisse** gefunden
- **1 Matchday**
- Ergebnisse vom:
  - 2025-12-06 (Einzel + Doppel)

**Gesamt**: **5 Ergebnisse** verteilt auf **2 verschiedene IDs**!

---

### 3. Team-Memberships:

Der aktive Spieler (`3bacc047...`) hat **3 aktive Team-Memberships**:
1. Rodenkirchener TC - Herren (Hauptmannschaft)
2. Rodenkirchener TC - Herren 30 (Hauptmannschaft)
3. SV RG Sürth - Herren 40 (inaktiv)

Der inaktive Spieler (`9df79240...`) hat **1 aktive Team-Membership**:
1. Rodenkirchener TC - Herren 30 (Hauptmannschaft) ⚠️

---

## 🔴 Warum werden die Ergebnisse nicht angezeigt?

### Problem im Code (`PlayerProfileSimple.jsx`):

1. **`.single()` schlägt bei Duplikaten fehl**:
   - Zeile 77: `.eq('name', decodedName).single()`
   - Wenn 2 Einträge mit demselben Namen existieren, wirft `.single()` einen Fehler
   - Der Code hat zwar einen Fallback, aber **welcher Eintrag wird genommen?**

2. **Ergebnisse werden nur für eine ID geladen**:
   - Zeile 187: Die Query sucht nur nach der gefundenen `playerId`
   - Wenn das Profil mit ID `3bacc047...` geladen wird, werden nur **3 Ergebnisse** angezeigt
   - Die **2 Ergebnisse** mit ID `9df79240...` werden **nicht** gefunden

3. **Keine Zusammenführung von Duplikaten**:
   - Der Code prüft nicht, ob es mehrere Player-Einträge mit demselben Namen gibt
   - Es werden keine Ergebnisse von Duplikaten zusammengeführt

---

## ✅ Lösungsvorschläge

### **Option 1: Ergebnisse migrieren (EMPFOHLEN)**

Migriere alle Ergebnisse von der inaktiven ID zur aktiven ID:

```sql
-- 1. Migriere Einzel-Matches
UPDATE match_results
SET home_player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
WHERE home_player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';

UPDATE match_results
SET guest_player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
WHERE guest_player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';

-- 2. Migriere Doppel-Matches (home_player1_id)
UPDATE match_results
SET home_player1_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
WHERE home_player1_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';

-- 3. Migriere Doppel-Matches (home_player2_id)
UPDATE match_results
SET home_player2_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
WHERE home_player2_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';

-- 4. Migriere Doppel-Matches (guest_player1_id)
UPDATE match_results
SET guest_player1_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
WHERE guest_player1_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';

-- 5. Migriere Doppel-Matches (guest_player2_id)
UPDATE match_results
SET guest_player2_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
WHERE guest_player2_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';

-- 6. Migriere Team-Memberships
UPDATE team_memberships
SET player_id = '3bacc047-a692-4d94-8659-6bbcb629d83c'
WHERE player_id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';

-- 7. Lösche den inaktiven Spieler-Eintrag
DELETE FROM players_unified
WHERE id = '9df79240-7c31-4a98-b2f6-fe1f0495207b';
```

**⚠️ WICHTIG**: Vor dem Löschen prüfen, ob es weitere Verknüpfungen gibt!

---

### **Option 2: Code-Anpassung (Alternative)**

Erweitere `PlayerProfileSimple.jsx`, um auch Duplikate zu berücksichtigen:

```javascript
// In loadPlayerProfile() - statt .single() verwenden:
const { data: players, error } = await supabase
  .from('players_unified')
  .select('*')
  .eq('name', decodedName)
  .order('is_active', { ascending: false }) // Aktive zuerst
  .order('created_at', { ascending: true }); // Älteste zuerst

// Nimm den aktiven Spieler (oder den ersten)
const player = players?.[0];

// In loadPerformanceStats() - suche nach beiden IDs:
const allPlayerIds = [player.id];
// Finde Duplikate
const duplicateIds = players
  .filter(p => p.id !== player.id)
  .map(p => p.id);

// Erweitere die Query um alle IDs
const { data: results } = await supabase
  .from('match_results')
  .select('*')
  .or(`${[...allPlayerIds, ...duplicateIds].map(id => 
    `home_player_id.eq.${id},home_player1_id.eq.${id},home_player2_id.eq.${id},guest_player_id.eq.${id},guest_player1_id.eq.${id},guest_player2_id.eq.${id}`
  ).join(',')}`);
```

**⚠️ NACHTEIL**: Dies ist nur eine Workaround-Lösung. Duplikate sollten vermieden werden!

---

## 🎯 Empfehlung

**Option 1 (Migration) ist die sauberste Lösung**, da:
- ✅ Alle Daten an einem Ort sind
- ✅ Keine Code-Änderungen nötig sind
- ✅ Das Problem an der Wurzel behoben wird
- ✅ Zukünftige Duplikate vermieden werden (durch bessere Validierung)

---

## 🔍 Wie ist das Duplikat entstanden?

Vermutlich:
1. Georg wurde am **2025-10-09** als normaler User registriert (aktiver Eintrag)
2. Am **2025-12-14** wurde ein **zweiter Eintrag erstellt** (vielleicht durch Import oder manuell)
3. Der zweite Eintrag wurde als `is_active = false` markiert, aber die Ergebnisse wurden mit dieser ID verknüpft

**Mögliche Ursachen:**
- Import-Script hat einen neuen Eintrag erstellt statt den bestehenden zu verwenden
- Manuelle Eingabe ohne Prüfung auf Duplikate
- Fehlerhafte Datenmigration

---

## 📝 Nächste Schritte

1. ✅ **Migration-Script ausführen** (siehe Option 1)
2. ✅ **Duplikat-Eintrag löschen**
3. ✅ **Validierung einbauen**: Verhindere zukünftige Duplikate durch UNIQUE-Constraint oder Prüfung im Code
4. ✅ **Weitere Duplikate prüfen**: Suche nach anderen Spielern mit doppelten Einträgen


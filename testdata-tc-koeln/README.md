# 🎾 TC Köln Test-Daten

## 📁 Inhalt

Diese Daten dienen zum Testen des **Multi-Team Support** für Theo Tester.

### Dateien:
- `tc-koeln-team.json` - Team-Info, Spieler, Matches für TC Köln

---

## 🚀 Verwendung

### Option 1: Nur für Frontend-Tests (EMPFOHLEN)
Die Daten bleiben lokal und werden **NICHT** in die Datenbank importiert.

**Verwendung:**
1. In `DataContext.jsx` einen Test-Modus aktivieren
2. Lokale Daten mit Supabase-Daten mergen
3. Frontend zeigt beide Teams (real + test)

---

### Option 2: In Supabase importieren (später)
Falls du die TC Köln Daten dauerhaft haben willst:
1. SQL-Script erstellen (INSERT Statements)
2. In Supabase ausführen
3. Echte Daten in DB speichern

---

## 🧪 Test-Szenario

**Theo Tester spielt für:**
1. **SV Rot-Gelb Sürth** (Haupt-Team, echte Daten aus Supabase)
2. **TC Köln** (Neben-Team, Test-Daten lokal)

**TC Köln Matches:**
- 20.12.2025: TC Bayer Leverkusen (Auswärts, 3 Zusagen)
- 10.01.2026: TG Grün-Weiß Bonn (Heim, keine Zusagen)
- 01.10.2024: TC Rheinland (Heim, beendet 4:2 Sieg)

---

## 🗑️ Löschen

Um die Test-Daten zu entfernen:
```bash
rm -rf testdata-tc-koeln/
```

Oder einfach `enabled: false` in `tc-koeln-team.json` setzen.

---

**Status:** Bereit für Integration! 🎉


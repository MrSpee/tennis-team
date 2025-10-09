# 🎾 Training-System für SV Rot-Gelb Sürth

## ✅ Phase 1 - Implementiert

### **Datenbank-Struktur**

#### **1. training_sessions** (Trainings-Termine)
Speichert alle Trainings (öffentlich und privat).

**Wichtige Felder:**
- `date`, `start_time`, `end_time` - Termin
- `location` - "Draußen" / "Halle"
- `type` - "public" / "private"
- `is_public` - Private können öffentlich gemacht werden
- `max_players`, `target_players` - Platzbegrenzung (idealerweise 2/4/6/8)
- `needs_substitute` - "Spieler gesucht" Flag
- `weather_dependent` - Wetterabhängig (draußen)

#### **2. training_attendance** (Zu-/Absagen)
Speichert wer zu-/abgesagt hat.

**Status:**
- `confirmed` - Zusage
- `declined` - Absage
- `pending` - Noch keine Antwort
- `substitute` - Einspringer

#### **3. training_templates** (Optional - für später)
Wiederkehrende Termine (z.B. "Jeden Mittwoch 17:00 Uhr").

---

## 🚀 Features

### **A) Trainingsseite (`/training`)**

**Navigation:** Neuer Tab in der Bottom-Navigation (🏋️ Training)

**Features:**
- ✅ Übersicht aller kommenden Trainings
- ✅ Gruppierung: Diese Woche / Nächste Woche / Später
- ✅ Filter: Alle / Öffentlich / Privat
- ✅ Zu-/Absage-Buttons (wie bei Matchdays)
- ✅ WhatsApp-Share für "Spieler gesucht"
- ✅ Teilnehmer-Liste mit Zusagen
- ✅ Wetter-Warnung für Outdoor-Trainings
- ✅ Location-Badge (☀️ Draußen / 🏠 Halle)
- ✅ Status-Badge (Vollständig/Fast voll/Spieler gesucht)

### **B) Dashboard-Integration**

**Position:** Zwischen Formkurve und Aktuelle Saison

**Teaser-Card:**
- 🎾 Nächstes Training
- Klickbar → Leitet zu `/training`
- Zeigt nächstes Training (Mittwoch 17:00 Uhr)
- "Neu"-Badge für Aufmerksamkeit

---

## 📋 Setup-Anleitung

### **1. Datenbank einrichten**

```bash
# Führe SQL-Script aus
# → TRAINING_SYSTEM_SETUP.sql
```

**Was macht das Script:**
- ✅ Erstellt 3 Tabellen (training_sessions, training_attendance, training_templates)
- ✅ Setzt RLS Policies (Row Level Security)
- ✅ Erstellt Demo-Trainings:
  - Mittwoch (draußen, öffentlich)
  - Freitag (Halle, privat, "Spieler gesucht")

### **2. App neu starten**

```bash
npm run dev
```

### **3. Testen**

1. **Dashboard:** Siehst du die neue "🎾 Nächstes Training" Card?
2. **Navigation:** Neuer Tab "Training" vorhanden?
3. **Trainingsseite:** 
   - Zwei Trainings sichtbar?
   - Zu-/Absage funktioniert?
   - WhatsApp-Share funktioniert?
   - Filter (Alle/Öffentlich/Privat) funktioniert?

---

## 🎯 Besonderheiten für SV Rot-Gelb Sürth

### **Mittwoch-Training (Draußen)**
- ⏰ 17:00 - 19:00 Uhr
- ☀️ Draußen (wetterabhängig!)
- 👥 Idealerweise 8 Spieler (gerade Zahl)
- 🎾 2 Plätze verfügbar

### **Private Trainings (Halle)**
- 🏠 Tennishalle
- 👥 Flexibel: 2/4/6 Spieler
- 🔔 Können "öffentlich gemacht" werden
- 📲 WhatsApp-Share bei "Spieler gesucht"

---

## 🔮 Geplante Erweiterungen (Phase 2 & 3)

### **Phase 2: Smart Features**
- [ ] Automatische Erinnerungen (24h vorher)
- [ ] "Einspringer gesucht" Push-Benachrichtigungen
- [ ] Wetter-API Integration (automatische Absage bei Regen)
- [ ] Wiederkehrende Termine (Template-System)

### **Phase 3: Admin-Features**
- [ ] Training erstellen/bearbeiten (nur Captain)
- [ ] Teilnehmer-Verwaltung
- [ ] Statistiken (Teilnahme-Quote pro Spieler)
- [ ] Export zu Google Calendar/iCal

---

## 📊 Datenbank-Felder Übersicht

### **training_sessions**
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primary Key |
| team_id | UUID | Mannschaft |
| date | TIMESTAMP | Datum & Zeit |
| start_time | TIME | Startzeit |
| end_time | TIME | Endzeit |
| location | TEXT | "Draußen" / "Halle" |
| venue | TEXT | "Tennisplatz Sürth" |
| type | TEXT | "public" / "private" |
| is_public | BOOLEAN | Öffentlich gemacht? |
| max_players | INTEGER | Max. Teilnehmer (2-12) |
| target_players | INTEGER | Ideale Anzahl (gerade!) |
| needs_substitute | BOOLEAN | "Spieler gesucht" |
| weather_dependent | BOOLEAN | Wetterabhängig |
| organizer_id | UUID | Organisator |
| status | TEXT | "scheduled" / "cancelled" |
| title | TEXT | "Mittwoch Training" |
| notes | TEXT | Zusätzliche Infos |

### **training_attendance**
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primary Key |
| session_id | UUID | → training_sessions |
| player_id | UUID | → players |
| status | TEXT | "confirmed" / "declined" / "pending" / "substitute" |
| response_date | TIMESTAMP | Zeitpunkt der Antwort |
| comment | TEXT | Optional |

---

## 🎨 UI-Design

**Verwendet Dashboard.css:**
- `lk-card-full` - Card-Container
- `formkurve-header` - Card-Header
- `match-count-badge` - Status-Badges
- `btn-modern` - Buttons
- `match-info-row` - Info-Zeilen

**Farben:**
- 🟢 Vollständig: `#10b981`
- 🔵 Fast voll: `#3b82f6`
- 🟠 Spieler gesucht: `#f59e0b`
- ⚫ Normal: `#6b7280`

---

## 💡 WhatsApp-Integration

**Share-Message-Format:**
```
🎾 *Tennis-Training - Spieler gesucht!*

📅 Mittwoch, 15.10. um 17:00 Uhr
📍 Draußen - Tennisplatz Sürth
👥 6/8 Zusagen

Wer hat Lust mitzumachen?

Anmelden in der App: https://...
```

**Verwendung:**
- Button "Teilen" bei jedem Training
- Öffnet WhatsApp mit vorgefertigter Nachricht
- Kann in Gruppen-Chat geteilt werden

---

## ✅ Checklist für Go-Live

- [x] Datenbank-Schema erstellt
- [x] Trainingsseite implementiert
- [x] Navigation erweitert
- [x] Dashboard-Teaser hinzugefügt
- [x] WhatsApp-Share funktioniert
- [x] Zu-/Absage System funktioniert
- [ ] Demo-Daten in Produktion anlegen
- [ ] Mit Team testen

---

**Erstellt:** 07.10.2025  
**Version:** 1.0 - Initial Release


## ✅ Phase 1 - Implementiert

### **Datenbank-Struktur**

#### **1. training_sessions** (Trainings-Termine)
Speichert alle Trainings (öffentlich und privat).

**Wichtige Felder:**
- `date`, `start_time`, `end_time` - Termin
- `location` - "Draußen" / "Halle"
- `type` - "public" / "private"
- `is_public` - Private können öffentlich gemacht werden
- `max_players`, `target_players` - Platzbegrenzung (idealerweise 2/4/6/8)
- `needs_substitute` - "Spieler gesucht" Flag
- `weather_dependent` - Wetterabhängig (draußen)

#### **2. training_attendance** (Zu-/Absagen)
Speichert wer zu-/abgesagt hat.

**Status:**
- `confirmed` - Zusage
- `declined` - Absage
- `pending` - Noch keine Antwort
- `substitute` - Einspringer

#### **3. training_templates** (Optional - für später)
Wiederkehrende Termine (z.B. "Jeden Mittwoch 17:00 Uhr").

---

## 🚀 Features

### **A) Trainingsseite (`/training`)**

**Navigation:** Neuer Tab in der Bottom-Navigation (🏋️ Training)

**Features:**
- ✅ Übersicht aller kommenden Trainings
- ✅ Gruppierung: Diese Woche / Nächste Woche / Später
- ✅ Filter: Alle / Öffentlich / Privat
- ✅ Zu-/Absage-Buttons (wie bei Matchdays)
- ✅ WhatsApp-Share für "Spieler gesucht"
- ✅ Teilnehmer-Liste mit Zusagen
- ✅ Wetter-Warnung für Outdoor-Trainings
- ✅ Location-Badge (☀️ Draußen / 🏠 Halle)
- ✅ Status-Badge (Vollständig/Fast voll/Spieler gesucht)

### **B) Dashboard-Integration**

**Position:** Zwischen Formkurve und Aktuelle Saison

**Teaser-Card:**
- 🎾 Nächstes Training
- Klickbar → Leitet zu `/training`
- Zeigt nächstes Training (Mittwoch 17:00 Uhr)
- "Neu"-Badge für Aufmerksamkeit

---

## 📋 Setup-Anleitung

### **1. Datenbank einrichten**

```bash
# Führe SQL-Script aus
# → TRAINING_SYSTEM_SETUP.sql
```

**Was macht das Script:**
- ✅ Erstellt 3 Tabellen (training_sessions, training_attendance, training_templates)
- ✅ Setzt RLS Policies (Row Level Security)
- ✅ Erstellt Demo-Trainings:
  - Mittwoch (draußen, öffentlich)
  - Freitag (Halle, privat, "Spieler gesucht")

### **2. App neu starten**

```bash
npm run dev
```

### **3. Testen**

1. **Dashboard:** Siehst du die neue "🎾 Nächstes Training" Card?
2. **Navigation:** Neuer Tab "Training" vorhanden?
3. **Trainingsseite:** 
   - Zwei Trainings sichtbar?
   - Zu-/Absage funktioniert?
   - WhatsApp-Share funktioniert?
   - Filter (Alle/Öffentlich/Privat) funktioniert?

---

## 🎯 Besonderheiten für SV Rot-Gelb Sürth

### **Mittwoch-Training (Draußen)**
- ⏰ 17:00 - 19:00 Uhr
- ☀️ Draußen (wetterabhängig!)
- 👥 Idealerweise 8 Spieler (gerade Zahl)
- 🎾 2 Plätze verfügbar

### **Private Trainings (Halle)**
- 🏠 Tennishalle
- 👥 Flexibel: 2/4/6 Spieler
- 🔔 Können "öffentlich gemacht" werden
- 📲 WhatsApp-Share bei "Spieler gesucht"

---

## 🔮 Geplante Erweiterungen (Phase 2 & 3)

### **Phase 2: Smart Features**
- [ ] Automatische Erinnerungen (24h vorher)
- [ ] "Einspringer gesucht" Push-Benachrichtigungen
- [ ] Wetter-API Integration (automatische Absage bei Regen)
- [ ] Wiederkehrende Termine (Template-System)

### **Phase 3: Admin-Features**
- [ ] Training erstellen/bearbeiten (nur Captain)
- [ ] Teilnehmer-Verwaltung
- [ ] Statistiken (Teilnahme-Quote pro Spieler)
- [ ] Export zu Google Calendar/iCal

---

## 📊 Datenbank-Felder Übersicht

### **training_sessions**
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primary Key |
| team_id | UUID | Mannschaft |
| date | TIMESTAMP | Datum & Zeit |
| start_time | TIME | Startzeit |
| end_time | TIME | Endzeit |
| location | TEXT | "Draußen" / "Halle" |
| venue | TEXT | "Tennisplatz Sürth" |
| type | TEXT | "public" / "private" |
| is_public | BOOLEAN | Öffentlich gemacht? |
| max_players | INTEGER | Max. Teilnehmer (2-12) |
| target_players | INTEGER | Ideale Anzahl (gerade!) |
| needs_substitute | BOOLEAN | "Spieler gesucht" |
| weather_dependent | BOOLEAN | Wetterabhängig |
| organizer_id | UUID | Organisator |
| status | TEXT | "scheduled" / "cancelled" |
| title | TEXT | "Mittwoch Training" |
| notes | TEXT | Zusätzliche Infos |

### **training_attendance**
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primary Key |
| session_id | UUID | → training_sessions |
| player_id | UUID | → players |
| status | TEXT | "confirmed" / "declined" / "pending" / "substitute" |
| response_date | TIMESTAMP | Zeitpunkt der Antwort |
| comment | TEXT | Optional |

---

## 🎨 UI-Design

**Verwendet Dashboard.css:**
- `lk-card-full` - Card-Container
- `formkurve-header` - Card-Header
- `match-count-badge` - Status-Badges
- `btn-modern` - Buttons
- `match-info-row` - Info-Zeilen

**Farben:**
- 🟢 Vollständig: `#10b981`
- 🔵 Fast voll: `#3b82f6`
- 🟠 Spieler gesucht: `#f59e0b`
- ⚫ Normal: `#6b7280`

---

## 💡 WhatsApp-Integration

**Share-Message-Format:**
```
🎾 *Tennis-Training - Spieler gesucht!*

📅 Mittwoch, 15.10. um 17:00 Uhr
📍 Draußen - Tennisplatz Sürth
👥 6/8 Zusagen

Wer hat Lust mitzumachen?

Anmelden in der App: https://...
```

**Verwendung:**
- Button "Teilen" bei jedem Training
- Öffnet WhatsApp mit vorgefertigter Nachricht
- Kann in Gruppen-Chat geteilt werden

---

## ✅ Checklist für Go-Live

- [x] Datenbank-Schema erstellt
- [x] Trainingsseite implementiert
- [x] Navigation erweitert
- [x] Dashboard-Teaser hinzugefügt
- [x] WhatsApp-Share funktioniert
- [x] Zu-/Absage System funktioniert
- [ ] Demo-Daten in Produktion anlegen
- [ ] Mit Team testen

---

**Erstellt:** 07.10.2025  
**Version:** 1.0 - Initial Release




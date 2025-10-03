# 📊 Tennis Team App - Aktueller Status & Plan

## ✅ AKTUELL IMPLEMENTIERTE FEATURES

### 1. 🏠 **Dashboard (Home)**
- ✅ Willkommensnachricht mit Benutzername
- ✅ Statistik-Karten:
  - Anzahl kommender Spiele
  - Gesamtzahl Spieler
  - Aktuelle Liga-Position
- ✅ Vorschau nächste 3 Spiele
- ✅ Verfügbarkeits-Übersicht pro Spiel
- ✅ Logout-Button

### 2. 📅 **Matches (Spiele)**
**Für alle Spieler:**
- ✅ Anzeige kommender Spiele
- ✅ Anzeige vergangener Spiele
- ✅ Details pro Spiel:
  - Gegner
  - Datum & Uhrzeit
  - Heim/Auswärts
  - Saison (Winter/Sommer)
  - Benötigte Spieler (4 Winter, 6 Sommer)
- ✅ **Verfügbarkeit melden:**
  - "Verfügbar" / "Nicht verfügbar"
  - Optionaler Kommentar
  - Änderung jederzeit möglich
- ✅ Anzeige aller Team-Antworten
- ✅ Echtzeit-Statistik (verfügbar/nicht verfügbar)

### 3. 🏆 **Rankings (Rangliste)**
- ✅ Alle Team-Spieler (bis zu 14)
- ✅ LK (Leistungsklasse) Anzeige
- ✅ Ranglistenpunkte
- ✅ Farbcodierung nach Stärke:
  - 🟢 LK 8-9 (Sehr stark)
  - 🔵 LK 10-11 (Stark)
  - 🟠 LK 12+ (Gut)
- ✅ Sortierung nach Punkten/LK
- ✅ Top 3 mit Trophäen 🏆🥈🥉
- ✅ Erklärung des LK-Systems

### 4. 📊 **League Table (Tabelle)**
- ✅ Aktuelle Liga-Tabelle
- ✅ Alle Teams mit:
  - Position
  - Gespielte Spiele
  - Siege/Niederlagen
  - Punkte
- ✅ Hervorhebung eigenes Team
- ✅ Aufstieg/Abstieg Markierung

### 5. 👤 **Profile (Profil)**
**Aktuell 3 Versionen:**
- `Profile.jsx` - Komplex (viele Felder)
- `SimpleProfile.jsx` - Einfach (3 Felder)
- `SupabaseProfile.jsx` - Für Supabase

**Felder:**
- Name (Pflicht)
- Telefon
- LK-Ranking
- (+ weitere in komplexer Version)

### 6. 🔐 **Login/Auth**
**Aktuell 3 Versionen:**
- `Login.jsx` - Mit Tabs (Spieler/Admin)
- `SimpleLogin.jsx` - Ultra-einfach
- `SupabaseLogin.jsx` - Email/Passwort für Supabase

**Funktion:**
- 4-stelliger Code für Spieler
- Code 1234 für Admin
- localStorage basiert

### 7. ⚙️ **Admin Panel**
**Nur für Team Captain (Code 1234):**
- ✅ Neue Spiele erstellen
- ✅ Spiele löschen
- ✅ Verfügbarkeits-Übersicht
- ✅ Warnung bei zu wenig Spielern
- ✅ Alle kommenden Spiele verwalten

### 8. 📱 **Navigation**
- ✅ Bottom Navigation Bar
- ✅ 5 Tabs für Spieler:
  - Start (Dashboard)
  - Spiele (Matches)
  - Rangliste (Rankings)
  - Tabelle (League)
  - Profil (Profile)
- ✅ 6. Tab für Admin (Settings)

---

## 🔴 AKTUELLES PROBLEM

### localStorage vs. Supabase
**Status:** App nutzt aktuell localStorage
- ❌ **Problem:** Jedes Gerät hat eigene Daten
- ❌ Spieler A (Handy) sieht andere Daten als Spieler B (Laptop)
- ❌ Keine Synchronisation zwischen Geräten
- ❌ Nicht geeignet für Team-Nutzung

**Lösung:** Supabase (zentrale Datenbank)
- ✅ Alle sehen dieselben Daten
- ✅ Echtzeit-Synchronisation
- ✅ Von jedem Gerät (Handy, Laptop, Tablet)

---

## 🎯 PLAN: SUPABASE INTEGRATION

### Phase 1: Vorbereitung (JETZT)
**Entscheidungen treffen:**

#### A) Login-System wählen:
**Option 1: SimpleLogin (4-stelliger Code)**
- ✅ Pro: Sehr einfach
- ❌ Con: Weniger sicher
- ❌ Con: Schwer in Supabase zu integrieren

**Option 2: Email/Passwort (SupabaseLogin)**
- ✅ Pro: Standard, sicher
- ✅ Pro: Perfekt für Supabase
- ✅ Pro: Professionell
- ❌ Con: Spieler müssen sich Email merken

**Option 3: Hybrid (Email + PIN)**
- ✅ Pro: Sicher aber einfach
- ✅ Pro: Email als ID, 4-stelliger PIN als Passwort
- ✅ Pro: Beste Balance
- **EMPFEHLUNG** 🌟

#### B) Profil-System wählen:
**Option 1: SimpleProfile (3 Felder)**
- Name, Telefon, LK
- ✅ Schnell ausgefüllt
- **EMPFEHLUNG für Start** 🌟

**Option 2: Vollständiges Profil**
- + Adresse, Notfallkontakt, etc.
- Später erweitern

---

### Phase 2: Features finalisieren (VOR Supabase)

#### 🔧 **Zu finalisieren:**

1. **Login vereinheitlichen**
   - Entscheidung: Welches System?
   - Nur EINE Login-Komponente behalten
   - Anderen löschen

2. **Profil vereinheitlichen**
   - Entscheidung: Welche Felder?
   - Nur EINE Profil-Komponente behalten
   - Anderen löschen

3. **Rangliste verbessern**
   - ❓ Sollen Punkte editierbar sein?
   - ❓ Automatische Berechnung?
   - ❓ Nach jedem Match aktualisieren?

4. **Match-Features**
   - ✅ Verfügbarkeit melden - funktioniert
   - ❓ WhatsApp-Benachrichtigung? (Phase 2)
   - ❓ Automatische Erinnerungen?

5. **Admin-Features**
   - ✅ Spiele erstellen - funktioniert
   - ❓ Spieler manuell hinzufügen?
   - ❓ Team-Aufstellung erstellen?

---

### Phase 3: Supabase Migration

**Dann:**
1. `.env` mit Supabase Keys erstellen
2. Email-Bestätigung in Supabase deaktivieren
3. `main.jsx` auf Supabase-Version umstellen
4. Testen mit mehreren Geräten
5. Demo-Accounts für Team erstellen

---

## ❓ ENTSCHEIDUNGEN NOTWENDIG

### 1. **Login-System**
Welches soll es sein?
- [ ] A) SimpleLogin (4-stelliger Code)
- [ ] B) SupabaseLogin (Email/Passwort)
- [ ] C) Hybrid (Email + 4-stelliger PIN) **← EMPFEHLUNG**

### 2. **Profil-Felder**
Was braucht die App?
- [x] Name (Pflicht)
- [x] Telefon (für Benachrichtigungen)
- [x] LK-Ranking (für Rangliste)
- [ ] Email (wenn nicht für Login)
- [ ] Geburtsdatum
- [ ] Adresse
- [ ] Notfallkontakt

**Empfehlung:** Start mit 3 Feldern (Name, Telefon, LK) ✅

### 3. **Ranglisten-System**
Wie werden Punkte vergeben?
- [ ] A) Manuell vom Admin (einfach)
- [ ] B) Automatisch nach Match-Ergebnis (komplex)
- [ ] C) Import von DTB/Tennisverband

**Empfehlung:** Start mit manuell, später automatisch ✅

### 4. **Benachrichtigungen**
Wie sollen Spieler benachrichtigt werden?
- [ ] Nur in der App
- [ ] + Email
- [ ] + WhatsApp (später)
- [ ] + Push-Notifications (PWA)

---

## 📋 NÄCHSTE SCHRITTE

### 🔴 JETZT (vor Supabase):

1. **Entscheidungen treffen** (siehe oben)
2. **Code aufräumen:**
   - Nur EINE Login-Komponente behalten
   - Nur EINE Profil-Komponente behalten
   - Ungenutzte Komponenten löschen
3. **Features finalisieren:**
   - Login-Flow testen
   - Profil-Flow testen
   - Alle Features durchgehen

### 🟡 DANN (Supabase):

4. **Supabase einrichten:**
   - `.env` Datei erstellen
   - Email-Bestätigung konfigurieren
   - Demo-Accounts anlegen
5. **App umstellen:**
   - `main.jsx` auf Supabase
   - Testen
   - Bugfixes
6. **Team onboarden:**
   - Accounts für alle erstellen
   - Anleitung schreiben
   - Erste Spiele anlegen

---

## 🎯 WAS FEHLT NOCH?

### Features für später:
- [ ] WhatsApp-Integration
- [ ] Automatische Benachrichtigungen
- [ ] Trainingstermine
- [ ] Match-Ergebnisse eintragen
- [ ] Spieler-Statistiken
- [ ] Interne Rangliste (Match-basiert)
- [ ] Chat-Funktion
- [ ] Foto-Upload (Profilbilder)

---

## 💬 IHRE MEINUNG?

**Bitte entscheiden Sie:**

1. **Login:** Simple (Code) oder Email/Passwort oder Hybrid?
2. **Profil:** 3 Felder oder mehr?
3. **Rangliste:** Manuell oder automatisch?

**Dann machen wir:**
- Code aufräumen
- Features finalisieren
- Supabase integrieren
- Team kann loslegen! 🎾


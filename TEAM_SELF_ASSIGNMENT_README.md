# 🏆 Team Self-Assignment System

## ✅ Was wurde implementiert:

### **1. Datenbank-Schema**
- `player_teams.status` - Status der Team-Zuordnung ('active', 'pending', 'rejected')
- `player_teams.requested_at` - Zeitpunkt der Anfrage
- `player_teams.approved_at` - Zeitpunkt der Bestätigung
- `player_teams.approved_by` - Wer hat bestätigt
- RLS Policies für Self-Service

### **2. Frontend-Komponente: TeamSelector**
- Anzeige aller eigenen Teams
- "Team beitreten" Button
- Team-Auswahl aus allen verfügbaren Teams
- Primäres Team setzen
- Team verlassen
- Status-Badges (Aktiv, Ausstehend, Abgelehnt)

### **3. Integration ins Profil**
- TeamSelector wird im Profil angezeigt
- Nur im Ansichtsmodus (nicht beim Bearbeiten)
- Automatisches Reload nach Team-Änderungen

---

## 🚀 Installation:

### **Schritt 1: Datenbank-Setup**
```sql
-- In Supabase SQL Editor:
-- Öffne: TEAM_SELF_ASSIGNMENT_SETUP.sql
-- Führe KOMPLETT aus
```

### **Schritt 2: Frontend testen**
1. ✅ Öffne: `http://localhost:3002/profile`
2. ✅ Sieh dir die "🏆 Meine Teams" Sektion an
3. ✅ Klicke "Team beitreten"
4. ✅ Wähle ein Team aus
5. ✅ Klicke "Beitreten"
6. ✅ Du solltest sofort dem Team zugeordnet sein!

---

## 🎯 Features:

### **Für Spieler:**
- ✅ Selbst Teams beitreten (keine Bestätigung nötig)
- ✅ Mehrere Teams gleichzeitig
- ✅ Primäres Team festlegen
- ✅ Teams verlassen
- ✅ Status-Übersicht

### **Für Team Captains (später):**
- ⏳ Anfragen bestätigen/ablehnen
- ⏳ Team-Mitglieder verwalten
- ⏳ Notifications bei neuen Anfragen

---

## 📋 UI-Übersicht:

### **Meine Teams - Leer:**
```
┌─────────────────────────────────────────┐
│ 🏆 Meine Teams (0)    [+ Team beitreten]│
├─────────────────────────────────────────┤
│                                         │
│        👥                               │
│                                         │
│  Du bist noch keinem Team zugeordnet.  │
│  Klicke auf "Team beitreten" um        │
│  loszulegen!                            │
│                                         │
└─────────────────────────────────────────┘
```

### **Meine Teams - Mit Teams:**
```
┌─────────────────────────────────────────┐
│ 🏆 Meine Teams (3)    [+ Team beitreten]│
├─────────────────────────────────────────┤
│ ┌───────────────────────────────────┐   │
│ │ VKC Köln - Herren 40 1   [Primär]│   │
│ │ Herren 40 • player • ✅ Aktiv    │   │
│ │          [Als Primär setzen] [Verlassen]│
│ └───────────────────────────────────┘   │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ SV Rot-Gelb Sürth - Herren 40    │   │
│ │ Herren 40 • player • ✅ Aktiv    │   │
│ │          [Als Primär setzen] [Verlassen]│
│ └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### **Team beitreten - Modal:**
```
┌─────────────────────────────────────────┐
│ 🏆 Team beitreten                       │
├─────────────────────────────────────────┤
│                                         │
│ Wähle ein Team:                         │
│ ▼ VKC Köln - Herren 40 1 (Herren 40)  │
│   SV Rot-Gelb Sürth - Herren 40       │
│   ...                                   │
│                                         │
│              [Abbrechen] [✅ Beitreten] │
└─────────────────────────────────────────┘
```

---

## 🔒 Sicherheit:

### **RLS Policies:**
1. **Spieler können ihre eigenen Teams sehen**
   - `player_id` = aktueller User

2. **Spieler können sich selbst zu Teams hinzufügen**
   - `INSERT` Policy erlaubt Self-Service

3. **Team Captains sehen alle Anfragen**
   - `role IN ('captain', 'admin')`

4. **Team Captains können Anfragen verwalten**
   - `UPDATE` Policy für Status-Änderungen

---

## 🎯 Workflow:

### **Normaler Spieler:**
```
1. Öffnet Profil
2. Klickt "Team beitreten"
3. Wählt Team aus
4. Klickt "Beitreten"
5. ✅ Sofort aktiv (status = 'active')
6. Kann jetzt Team-Trainings sehen und erstellen
```

### **Mit Bestätigung (später):**
```
1. Spieler klickt "Team beitreten"
2. Status = 'pending'
3. Team Captain erhält Notification
4. Captain bestätigt/lehnt ab
5. Status = 'active' oder 'rejected'
6. Spieler erhält Notification
```

---

## 🚀 Testing:

### **Test 1: Team beitreten**
1. ✅ Öffne Profil
2. ✅ Klicke "Team beitreten"
3. ✅ Wähle "VKC Köln - Herren 40 1"
4. ✅ Klicke "Beitreten"
5. ✅ Team sollte in Liste erscheinen mit "✅ Aktiv"

### **Test 2: Primäres Team setzen**
1. ✅ Klicke "Als Primär setzen" bei anderem Team
2. ✅ Grüner Border sollte wechseln
3. ✅ "Primär" Badge sollte wechseln

### **Test 3: Team verlassen**
1. ✅ Klicke "Verlassen"
2. ✅ Bestätige Dialog
3. ✅ Team sollte aus Liste verschwinden

### **Test 4: Training erstellen**
1. ✅ Gehe zu Training
2. ✅ Klicke "Training erstellen"
3. ✅ Wähle "Team-Training"
4. ✅ Dropdown sollte ALLE deine Teams zeigen!
5. ✅ Erstelle Training
6. ✅ Sollte sichtbar sein

---

## 🎯 Nächste Schritte:

### **Phase 1: MVP (FERTIG)**
- ✅ Self-Service Team-Beitritt
- ✅ Team-Übersicht im Profil
- ✅ Primäres Team festlegen

### **Phase 2: Bestätigung (optional)**
- ⏳ `status = 'pending'` bei Beitritt
- ⏳ Team Captain Benachrichtigungen
- ⏳ Bestätigungs-UI für Captains

### **Phase 3: Verwaltung**
- ⏳ Captain kann Spieler hinzufügen/entfernen
- ⏳ Captain kann Rollen ändern
- ⏳ Team-Mitglieder-Übersicht

---

## ✅ Fertig!

Das Team Self-Assignment System ist jetzt **voll funktionsfähig**!

Spieler können:
- ✅ Sich selbst Teams zuordnen
- ✅ Mehrere Teams gleichzeitig verwalten
- ✅ Primäres Team festlegen
- ✅ Team-Trainings für ihre Teams erstellen
- ✅ Nur Team-Trainings ihrer Teams sehen


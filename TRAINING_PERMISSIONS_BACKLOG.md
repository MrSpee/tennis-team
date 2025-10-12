# 🎾 Training Permissions & Features - Backlog

## 📋 **TO-DO LISTE**

### 🔒 **BERECHTIGUNGEN & SICHERHEIT**
1. ✅ **Vereinstraining-Berechtigung prüfen**
   - Nur Vereins-Mitglieder können Vereinstrainings erstellen
   - Validierung: `player_teams` prüfen vor Training-Erstellung

2. ✅ **Private Training - Vereins-übergreifend**
   - Alle Spieler aus allen Vereinen verfügbar
   - Zugriff auf `players` + `imported_players`

3. ✅ **Suchfunktion für alle Spieler**
   - Vereins-Spieler + Importierte Spieler in einer Suche
   - Markierungslogik für bereits ausgewählte Spieler

4. ⏳ **Manuelle Spieler-Erstellung**
   - Formular für externe Spieler (nicht in App/Import)
   - WhatsApp-Einladung automatisch

5. ⏳ **Backlog: Sonderregelungen**
   - Dokumentation für zukünftige Features
   - Admin-Rechte, Cross-Verein-Trainings, etc.

---

## 🔧 **IMPLEMENTATION STATUS**

### ✅ **ERLEDIGT:**
- [x] Einladungsfunktion für weitere Spieler
- [x] WhatsApp-Integration
- [x] Datenbank-Speicherung in `external_players`
- [x] Strukturierte Anzeige (Dabei/Absage/Ausstehend)

### 🔄 **IN ARBEIT:**
- [ ] **Aufgabe 1:** Vereinstraining-Berechtigung implementieren
- [ ] **Aufgabe 2:** Private Training - Vereins-übergreifende Spieler-Suche
- [ ] **Aufgabe 3:** Suchfunktion mit eigenen Vereins-Spielern

### ⏳ **BACKLOG:**
- [ ] **Aufgabe 4:** Manuelle Spieler-Erstellung für externe
- [ ] **Aufgabe 5:** Backlog-Dokumentation erweitern
- [ ] [ ] Admin-Panel für Training-Management
- [ ] [ ] Bulk-Einladungen per CSV
- [ ] [ ] Training-Templates
- [ ] [ ] Automatische Erinnerungen
- [ ] [ ] Training-Statistiken
- [ ] [ ] Cross-Verein-Trainings (Admin-Feature)

---

## 🎯 **NÄCHSTE SCHRITTE**

**Starte mit den ersten 3 Aufgaben:**
1. **Vereinstraining-Berechtigung prüfen**
2. **Private Training - Vereins-übergreifende Spieler-Suche**  
3. **Suchfunktion mit eigenen Vereins-Spielern**

---

## 📊 **TECHNISCHE DETAILS**

### **Datenbank-Struktur:**
- `training_sessions`: `team_id` für Vereinstrainings, `NULL` für private
- `player_teams`: Vereins-Zugehörigkeit prüfen
- `players`: Alle registrierten Spieler
- `imported_players`: Importierte Spieler (ohne App-Zugang)

### **Berechtigungen:**
```sql
-- Vereinstraining: Nur eigene Vereins-Mitglieder
WHERE player_teams.team_id = training.team_id

-- Private Training: Alle Spieler
WHERE players.is_active = true OR imported_players.status = 'pending'
```

---

**Erstellt:** $(date)  
**Status:** In Arbeit  
**Priorität:** Hoch

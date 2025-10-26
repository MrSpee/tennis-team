# Frontend-Test-Plan für Unified Player System

## 🚨 **KRITISCHE KOMPONENTEN DIE ANGEPASST WERDEN MÜSSEN:**

### **1. DataContext.jsx**
- ❌ `getPlayerProfile()` nutzt noch `players` Tabelle
- ✅ `loadPlayerTeams()` nutzt bereits `team_memberships`

### **2. AuthContext.jsx**
- ❌ `loadPlayerData()` nutzt noch `players` Tabelle
- ❌ Team-Checks nutzen noch `player_teams`

### **3. MatchdayResults.jsx**
- ❌ `homePlayersData` nutzt noch `players` Tabelle
- ❌ `opponentPlayersData` nutzt noch `opponent_players` Tabelle

### **4. roundRobinService.js**
- ❌ `loadPlayersWithStats()` nutzt noch `players` Tabelle
- ❌ Training-Stats Updates nutzen noch `players` Tabelle

### **5. ImportTab.jsx (AKTUELLE VERSION)**
- ❌ `loadUserTeams()` nutzt noch `player_teams`
- ❌ `linkPlayerToTeam()` nutzt noch `player_teams`
- ❌ `performPlayerMatching()` nutzt noch `players` + `imported_players`

### **6. SuperAdminDashboard.jsx (AKTUELLE VERSION)**
- ❌ Statistiken nutzen noch `players` + `imported_players`
- ❌ `loadPlayers()` nutzt noch `players` + `imported_players`
- ❌ `player_teams` Queries überall

### **7. OnboardingFlow.jsx (AKTUELLE VERSION)**
- ❌ `searchImportedPlayers()` nutzt noch `imported_players`
- ❌ `handleComplete()` nutzt noch `players` + `imported_players`
- ❌ `player_teams` Insertions

### **8. Training.jsx**
- ❌ `loadPlayerTeams()` nutzt noch `player_teams`
- ❌ `loadAllPlayers()` nutzt noch `players` + `imported_players`
- ❌ Training-Invites nutzen noch `player_teams`

### **9. supabaseClient.js**
- ❌ `createPlayer()` nutzt noch `players` Tabelle

## 🎯 **TEST-PRIORITÄTEN:**

### **PRIORITÄT 1: KRITISCHE FUNKTIONEN**
1. **AuthContext.jsx** - Login/Logout funktioniert nicht
2. **DataContext.jsx** - Daten werden nicht geladen
3. **OnboardingFlow.jsx** - Neue User können sich nicht registrieren

### **PRIORITÄT 2: WICHTIGE FUNKTIONEN**
4. **MatchdayResults.jsx** - Match-Ergebnisse werden nicht angezeigt
5. **Training.jsx** - Training-System funktioniert nicht
6. **SuperAdminDashboard.jsx** - Admin-Funktionen funktionieren nicht

### **PRIORITÄT 3: NICE-TO-HAVE**
7. **roundRobinService.js** - Training-Stats
8. **ImportTab.jsx** - KI-Import (haben wir bereits vereinfacht)

## 🚀 **TEST-STRATEGIE:**

### **SCHRITT 1: KRITISCHE KOMPONENTEN ANPASSEN**
- AuthContext.jsx → players_unified
- DataContext.jsx → players_unified
- OnboardingFlow.jsx → players_unified (vereinfachte Version verwenden)

### **SCHRITT 2: FUNKTIONALE TESTS**
- Login/Logout testen
- Onboarding testen
- Daten-Laden testen

### **SCHRITT 3: WEITERE KOMPONENTEN**
- MatchdayResults.jsx
- Training.jsx
- SuperAdminDashboard.jsx

### **SCHRITT 4: VOLLSTÄNDIGER TEST**
- Alle Funktionen durchgehen
- Edge Cases testen
- Performance prüfen

## ⚠️ **WARNUNG:**

**Das Frontend wird aktuell NICHT funktionieren!**
Alle Komponenten nutzen noch die alten Tabellen, die wir gelöscht haben.

**Wir müssen die Komponenten anpassen, bevor wir testen können!**


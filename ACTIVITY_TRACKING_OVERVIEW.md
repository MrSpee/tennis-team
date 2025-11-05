# 📊 ACTIVITY TRACKING ÜBERSICHT

## Vollständige Auflistung aller getrackten Aktivitäten in der Plattform

---

## 🎯 1. ONBOARDING & REGISTRIERUNG

### 1.1 Onboarding-Start
- **Action:** `onboarding_started`
- **Entity:** `player`
- **Details:** `{ user_email, step: 1, source: 'onboarding' }`
- **Wo:** `OnboardingFlow.jsx` (Schritt 1)
- **Status:** ✅ **IMPLEMENTIERT**

### 1.2 Onboarding-Schritt Navigation
- **Action:** `onboarding_step`
- **Entity:** `player`
- **Details:** `{ step, step_name, ...stepData, source: 'onboarding' }`
- **Wo:** `OnboardingFlow.jsx` (alle 3 Schritte)
- **Status:** ✅ **IMPLEMENTIERT**
- **Schritte:**
  - Schritt 1: Vereinsauswahl
  - Schritt 2: Mannschaftsauswahl
  - Schritt 3: Persönliche Daten

### 1.3 Smart-Match Suche
- **Action:** `onboarding_search`
- **Entity:** `player`
- **Details:** `{ search_term, results_count, player_selected, ... }`
- **Wo:** `OnboardingFlow.jsx` (Schritt 3)
- **Status:** ✅ **IMPLEMENTIERT**

### 1.4 Smart-Match Auswahl
- **Action:** `onboarding_smart_match`
- **Entity:** `player`
- **Details:** `{ imported_player_name, imported_player_lk, imported_player_team, will_merge }`
- **Wo:** `OnboardingFlow.jsx` (Schritt 3)
- **Status:** ✅ **IMPLEMENTIERT**

### 1.5 Manuelle Dateneingabe
- **Action:** `onboarding_manual_entry`
- **Entity:** `player`
- **Details:** `{ player_name, has_lk, has_phone, source: 'onboarding_step3' }`
- **Wo:** `OnboardingFlow.jsx` (Schritt 3)
- **Status:** ✅ **IMPLEMENTIERT**

### 1.6 Team-Auswahl aus DB
- **Action:** `onboarding_team_from_db`
- **Entity:** `team`
- **Details:** `{ team_name, club_name, league, season }`
- **Wo:** `OnboardingFlow.jsx` (Schritt 2)
- **Status:** ✅ **IMPLEMENTIERT**

### 1.7 Manuelle Team-Erstellung
- **Action:** `onboarding_team_manual`
- **Entity:** `team`
- **Details:** `{ team_name, club_name, league, team_size, is_custom }`
- **Wo:** `OnboardingFlow.jsx` (Schritt 2)
- **Status:** ✅ **IMPLEMENTIERT**

### 1.8 Onboarding-Abschluss
- **Action:** `onboarding_completed`
- **Entity:** `player`
- **Details:** `{ player_name, player_lk, teams_count, teams_from_db, teams_manual, used_smart_match, duration_seconds, ... }`
- **Wo:** `OnboardingFlow.jsx` (Schritt 4)
- **Status:** ✅ **IMPLEMENTIERT**

---

## 🏢 2. VEREINS-MANAGEMENT

### 2.1 Vereinsauswahl
- **Action:** `club_selected`
- **Entity:** `club`
- **Details:** `{ club_name, is_verified, source: 'onboarding' }`
- **Wo:** `activityLogger.js` (definiert, aber **NICHT VERWENDET**)
- **Status:** ⚠️ **DEFINIERT ABER UNGENUTZT**

### 2.2 Verein genehmigt
- **Action:** `club_approve`
- **Entity:** `club`
- **Details:** `{ action, admin_action: true, source: 'super_admin_dashboard' }`
- **Wo:** `SuperAdminDashboard.jsx`
- **Status:** ✅ **IMPLEMENTIERT**

### 2.3 Verein abgelehnt
- **Action:** `club_reject`
- **Entity:** `club`
- **Details:** `{ action, admin_action: true, source: 'super_admin_dashboard' }`
- **Wo:** `SuperAdminDashboard.jsx`
- **Status:** ✅ **IMPLEMENTIERT**

---

## 🏆 3. TEAM-MANAGEMENT

### 3.1 Team erstellt
- **Action:** `team_created`
- **Entity:** `team`
- **Details:** `{ team_name, club_name, league, team_size, source: 'onboarding' }`
- **Wo:** `activityLogger.js` (definiert, aber **NICHT VERWENDET**)
- **Status:** ⚠️ **DEFINIERT ABER UNGENUTZT**

### 3.2 Team gewechselt
- **Action:** `team_changed`
- **Entity:** `player`
- **Details:** `{ old_team_id, new_team_id, source: 'team_management' }`
- **Wo:** `activityLogger.js` (definiert, aber **NICHT VERWENDET**)
- **Status:** ⚠️ **DEFINIERT ABER UNGENUTZT**

---

## 👤 4. PROFIL-MANAGEMENT

### 4.1 Profil aktualisiert
- **Action:** `profile_updated`
- **Entity:** `player`
- **Details:** `{ updated_fields: [], source: 'profile_page' }`
- **Wo:** `activityLogger.js` (definiert, aber **NICHT VERWENDET**)
- **Status:** ⚠️ **DEFINIERT ABER UNGENUTZT**

### 4.2 Profil bearbeitet
- **Action:** `profile_edited`
- **Entity:** `player`
- **Details:** `{ field_count, changes: {field: {old, new}}, field_names }`
- **Wo:** `SupabaseProfile.jsx`
- **Status:** ✅ **IMPLEMENTIERT**
- **Getrackte Felder:**
  - Name, Telefon, E-Mail, Adresse
  - Geburtsdatum, Nationalität
  - Notfallkontakt, Notfall-Telefon
  - Vorhand/Position, Lieblingsschlag, Tennis-Motto
  - Spieloberfläche, Superstition, Pre-Match-Routine

### 4.3 LK geändert
- **Action:** `lk_changed`
- **Entity:** `player`
- **Details:** `{ old_lk, new_lk, source: 'profile_page' }`
- **Wo:** `activityLogger.js` (definiert, aber **NICHT VERWENDET**)
- **Status:** ⚠️ **DEFINIERT ABER UNGENUTZT**

---

## 🏃 5. TRAINING

### 5.1 Training erstellt
- **Action:** `training_created`
- **Entity:** `training`
- **Details:** `{ training_type, is_public, is_recurring, max_players, organizer_id }`
- **Wo:** `Training.jsx`
- **Status:** ✅ **IMPLEMENTIERT**

### 5.2 Training zugesagt
- **Action:** `training_confirm`
- **Entity:** `training`
- **Details:** `{ response: 'confirm', player_id, source: 'training_page' }`
- **Wo:** `Training.jsx`
- **Status:** ✅ **IMPLEMENTIERT**

### 5.3 Training abgesagt
- **Action:** `training_decline`
- **Entity:** `training`
- **Details:** `{ response: 'decline', player_id, source: 'training_page' }`
- **Wo:** `Training.jsx`
- **Status:** ✅ **IMPLEMENTIERT**

---

## 🎾 6. MATCHDAYS & MATCHES

### 6.1 Matchday zugesagt
- **Action:** `matchday_confirm`
- **Entity:** `match`
- **Details:** `{ response: 'confirm', player_id, source: 'matches_page' }`
- **Wo:** `Matches.jsx`
- **Status:** ✅ **IMPLEMENTIERT**

### 6.2 Matchday abgesagt
- **Action:** `matchday_decline`
- **Entity:** `match`
- **Details:** `{ response: 'decline', player_id, source: 'matches_page' }`
- **Wo:** `Matches.jsx`
- **Status:** ✅ **IMPLEMENTIERT**

### 6.3 Matchday verfügbar
- **Action:** `matchday_available`
- **Entity:** `match`
- **Details:** `{ response: 'available', player_id, source: 'matches_page' }`
- **Wo:** `activityLogger.js` (definiert, aber **NICHT VERWENDET**)
- **Status:** ⚠️ **DEFINIERT ABER UNGENUTZT**

### 6.4 Matchday nicht verfügbar
- **Action:** `matchday_unavailable`
- **Entity:** `match`
- **Details:** `{ response: 'unavailable', player_id, source: 'matches_page' }`
- **Wo:** `activityLogger.js` (definiert, aber **NICHT VERWENDET**)
- **Status:** ⚠️ **DEFINIERT ABER UNGENUTZT**

### 6.5 Match-Ergebnis eingegeben
- **Action:** `match_result_entered`
- **Entity:** `match`
- **Details:** `{ result_data, entered_by, source: 'matchday_results' }`
- **Wo:** `activityLogger.js` (definiert, aber **NICHT VERWENDET**)
- **Status:** ⚠️ **DEFINIERT ABER UNGENUTZT**

---

## 🤖 7. KI-IMPORT

### 7.1 KI-Import: Spieler
- **Action:** `ki_import_player`
- **Entity:** `player`
- **Details:** `{ player_name, player_lk, tvm_id_number, ... }`
- **Wo:** `ImportTab.jsx`
- **Status:** ✅ **IMPLEMENTIERT**

### 7.2 KI-Import: Match
- **Action:** `ki_import_match`
- **Entity:** `matchday`
- **Details:** `{ match_date, home_team_id, away_team_id, ... }`
- **Wo:** `ImportTab.jsx`
- **Status:** ✅ **IMPLEMENTIERT**

---

## 🔧 8. ADMIN-AKTIONEN

### 8.1 Admin-Aktion (generisch)
- **Action:** `admin_{action}`
- **Entity:** beliebig
- **Details:** `{ admin_action: true, source: 'super_admin_dashboard' }`
- **Wo:** `activityLogger.js` (definiert, aber **NICHT VERWENDET**)
- **Status:** ⚠️ **DEFINIERT ABER UNGENUTZT**

---

## 🧭 9. NAVIGATION & SYSTEM

### 9.1 Seiten-Navigation
- **Action:** `page_navigation`
- **Entity:** `navigation`
- **Details:** `{ current_page, previous_page, source: 'app_navigation' }`
- **Wo:** `activityLogger.js` (definiert, aber **NICHT VERWENDET**)
- **Status:** ⚠️ **DEFINIERT ABER UNGENUTZT**

### 9.2 Fehler aufgetreten
- **Action:** `error_occurred`
- **Entity:** `system`
- **Details:** `{ error_message, error_stack, context, source: 'error_handler' }`
- **Wo:** `activityLogger.js` (definiert, aber **NICHT VERWENDET**)
- **Status:** ⚠️ **DEFINIERT ABER UNGENUTZT**

---

## 👤 10. AUTHENTIFICATION

### 10.1 User Login
- **Action:** `user_login`
- **Entity:** `user`
- **Details:** `{ user_email, login_method, source: 'login_page' }`
- **Wo:** `activityLogger.js` (definiert, aber **NICHT VERWENDET**)
- **Status:** ⚠️ **DEFINIERT ABER UNGENUTZT**

### 10.2 User Logout
- **Action:** `user_logout`
- **Entity:** `user`
- **Details:** `{ user_email, source: 'app' }`
- **Wo:** `activityLogger.js` (definiert, aber **NICHT VERWENDET**)
- **Status:** ⚠️ **DEFINIERT ABER UNGENUTZT**

---

## 📊 ZUSAMMENFASSUNG

### ✅ Implementiert (16/30)
1. ✅ `onboarding_started`
2. ✅ `onboarding_step` (3x)
3. ✅ `onboarding_search`
4. ✅ `onboarding_smart_match`
5. ✅ `onboarding_manual_entry`
6. ✅ `onboarding_team_from_db`
7. ✅ `onboarding_team_manual`
8. ✅ `onboarding_completed`
9. ✅ `club_approve`
10. ✅ `club_reject`
11. ✅ `profile_edited`
12. ✅ `training_created`
13. ✅ `training_confirm`
14. ✅ `training_decline`
15. ✅ `matchday_confirm`
16. ✅ `matchday_decline`
17. ✅ `ki_import_player`
18. ✅ `ki_import_match`

### ⚠️ Definiert aber ungenutzt (14/30)
1. ⚠️ `club_selected`
2. ⚠️ `team_created`
3. ⚠️ `team_changed`
4. ⚠️ `profile_updated`
5. ⚠️ `lk_changed`
6. ⚠️ `matchday_available`
7. ⚠️ `matchday_unavailable`
8. ⚠️ `match_result_entered`
9. ⚠️ `admin_{action}` (generisch)
10. ⚠️ `page_navigation`
11. ⚠️ `error_occurred`
12. ⚠️ `user_login`
13. ⚠️ `user_logout`
14. ⚠️ `profile_updated` (alte Methode)

---

## 📋 DETAILS ZU JEDEM TRACKING

### LoggingService.logOnboardingStart()
- **Vollständig getrackt:** Ja
- **Details:** User-Email wird gespeichert

### LoggingService.logOnboardingStep()
- **Vollständig getrackt:** Ja
- **Details:** Schrittnummer, Schrittname, zusätzliche Daten

### LoggingService.logImportedPlayerSearch()
- **Vollständig getrackt:** Ja
- **Details:** Suchterm, Anzahl Ergebnisse, ob Spieler ausgewählt

### LoggingService.logImportedPlayerSelection()
- **Vollständig getrackt:** Ja
- **Details:** Importierter Spieler-Name, LK, Verein, Merge-Info

### LoggingService.logManualDataEntry()
- **Vollständig getrackt:** Ja
- **Details:** Name, ob LK vorhanden, ob Telefon vorhanden

### LoggingService.logTeamSelectionFromDB()
- **Vollständig getrackt:** Ja
- **Details:** Team-Name, Verein, Liga, Saison

### LoggingService.logManualTeamEntry()
- **Vollständig getrackt:** Ja
- **Details:** Team-Name, Verein, Liga, Teamgröße

### LoggingService.logOnboardingCompletion()
- **Vollständig getrackt:** Ja
- **Details:** Komplette Onboarding-Statistik (Teams, Smart-Match, Dauer)

### LoggingService.logTrainingCreation()
- **Vollständig getrackt:** Ja
- **Details:** Training-Typ, Public/Private, Max Players, Organizer

### LoggingService.logTrainingResponse()
- **Vollständig getrackt:** Ja
- **Details:** Response-Typ, Player-ID

### LoggingService.logMatchdayResponse()
- **Vollständig getrackt:** Ja
- **Details:** Response-Typ, Player-ID

### LoggingService.logProfileEdit()
- **Vollständig getrackt:** Ja
- **Details:** Liste aller geänderten Felder mit old/new Werten

---

## 🔍 VOLLSTÄNDIGE METADATEN

### Standard-Metadaten in jedem Log:
- `timestamp`: ISO-String der Aktion
- `userAgent`: Browser-Informationen
- `url`: Aktuelle URL
- `referrer`: Referrer-URL
- `user_id`: UUID des Users (von Supabase Auth)
- `created_at`: Automatisch von DB gesetzt
- `action`: Der Action-Name
- `entity_type`: Typ der Entität (club, team, player, etc.)
- `entity_id`: ID der Entität
- `details`: JSON-Objekt mit spezifischen Details

---

## 💡 EMPFEHLUNGEN

### Sofort aktivierbar:
1. **Login/Logout Tracking:** Einfach in `AuthContext.jsx` einbauen
2. **Page Navigation:** In `App.jsx` oder `DataContext.jsx` integrieren
3. **Error Tracking:** Global Error Handler implementieren

### Mittelfristig sinnvoll:
4. **Match-Ergebnis Tracking:** Bei Result-Eingabe in `Results.jsx`
5. **LK-Änderung Tracking:** Bei manueller LK-Berechnung
6. **Team-Wechsel Tracking:** Falls Feature implementiert wird

### Optional:
7. **Matchday Available/Unavailable:** Unterscheidung vom Standard confirm/decline
8. **Admin-Aktionen:** Für detailliertes Admin-Tracking

---

**Letzte Aktualisierung:** 31.10.2025  
**Version:** 2.0  
**Status:** Production Ready ✅





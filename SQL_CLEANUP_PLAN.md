# SQL-Dateien Cleanup Plan für Production Deployment

## Kategorisierung der SQL-Dateien

### 1. ✅ BEREITS ARCHIVIERT (archive/)
- Migration Phase Scripts
- Legacy Cleanup Scripts
- Test Scripts

### 2. 🗑️ LÖSCHEN - Leere/Placeholder Dateien
- `FIX_MISSING_TEAMS_FOR_PLAYERS.sql` (leer)
- `CHECK_MISSING_PRIMARY_TEAM.sql` (leer)

### 3. 🗑️ LÖSCHEN - Einmalige Test-/Debug-Scripts
- `FIX_TEST_USER_SCRIPT.sql` (nur für Test-User xaveba5302@dwakm.com)
- `FIX_DUPLICATE_PLAYERS.sql` (Datenbereinigung bereits durchgeführt)
- `MANUAL_CHANGES.txt`
- `MANUAL_FIX.txt`
- `QUICK_DEBUG.sql`
- `QUICK_FIX_TEAM_NAME.sql`
- `QUICK_RANKINGS_CHECK.sql`

### 4. 🗑️ LÖSCHEN - Specific Issue Fixes (bereits angewendet)
- `FIX_TEAM_NAME_HERREN_40.sql`
- `FIX_TEAM_WITHOUT_NAME.sql`
- `FIX_ENSEN_WESTHOVEN_*` (alle 4 Dateien - bereits gefixt)
- `DELETE_TEAM_HERREN_40.sql`
- `SIMPLE_DELETE_DUPLICATE_HERREN_40.sql`
- `ADD_CHRIS_TO_HERREN_1.sql`
- `ADD_THEO_TO_VKC.sql`
- `ADD_THEO_TO_VKC_SIMPLE.sql`
- `CREATE_TC_FORD_KOELN_2.sql`
- `FIX_TC_FORD_KOELN_2.sql`
- `CHECK_THEO_*` (alle 4 Dateien)
- `FIND_ALL_THEOS.sql`
- `FIND_THEO_TESTER_INFO.sql`
- `SETUP_THEO_SUPERADMIN.sql`
- `VERIFY_THEO_VKC.sql`
- `CHECK_CHRIS_OCT_25.sql`
- `CHECK_CHRIS_MATCHDAYS.sql`
- `DEBUG_CHRIS_TEAMS_AND_MATCHDAYS.sql`

### 5. 🗑️ LÖSCHEN - Matchday/Match Fixes (bereits angewendet)
- `FIX_ALL_SURTH_MATCHDAYS.sql`
- `FIX_SURTH_MATCHDAYS_TEAM_ID.sql`
- `FIX_SURTH_TEAM_CONSOLIDATION.sql`
- `FINAL_FIX_SURTH_MATCHDAYS.sql`
- `INSERT_MISSING_SURTH_MATCHDAYS.sql`
- `DELETE_ALL_SURTH_MATCHDAYS.sql`
- `DELETE_DUPLICATE_MATCHDAY.sql`
- `CHECK_MATCHDAY_21_03.sql`
- `CHECK_MATCHDAY_ISSUES.sql`
- `FIX_MATCHDAYS_DIRECT.sql`
- `INSERT_MATCHDAYS_ONLY.sql`
- `FIX_LEVERKUSEN_MATCH.sql`
- `FIX_DOUBLE_TEAM_MATCH.sql`
- `GET_ALL_SURTH_OPPONENTS.sql`

### 6. 📦 ARCHIVIEREN - Analysis/Check Scripts (für Referenz behalten)
- `CHECK_*` Dateien → archive/analysis/
- `ANALYZE_*` Dateien → archive/analysis/
- `GET_*` Dateien → archive/analysis/
- `VERIFY_*` Dateien → archive/analysis/
- `DEBUG_*` Dateien → archive/debug/
- `IDENTIFY_DUPLICATES.sql` → archive/debug/

### 7. 📦 ARCHIVIEREN - Dokumentation/Doku-Migrations
- `*_ANLEITUNG.md` → archive/docs/
- `*_GUIDE.md` → archive/docs/
- `MATCHDAY_*` (nicht SQL) → archive/docs/
- `MIGRATION_*` → archive/docs/
- `ROUND_ROBIN_*` (nicht SQL) → archive/docs/
- `SUMMARY_*.md` → archive/docs/

### 8. ✅ BEHALTEN - Core Setup/Migration Scripts
- `ADD_SUPERADMIN_COLUMN.sql`
- `ADD_TVM_ID_COLUMN.sql`
- `ADD_YEAR_COLUMN_TO_MATCHDAYS.sql`
- `CREATE_MATCHDAYS_SYSTEM.sql`
- `CREATE_MATCHDAYS_WITHOUT_TRIGGERS.sql`
- `CREATE_MATCHDAY_IMPORT_SYSTEM.sql`
- `FIX_CASCADE_DELETE.sql`
- `CLEAN_DB_SETUP.sql`
- `CLEAN_DUPLICATE_TEAM_SEASONS.sql`
- `CLEANUP_AND_REDESIGN.sql`
- `CREATE_SYSTEM_STATS_TABLE.sql`

### 9. ✅ BEHALTEN - Aktuelle Fixes/Updates (noch relevant)
- `FIX_PLAYER_TEAMS_COMPLETE.sql` (Fall: Team-Zuordnungen fehlen)
- `FIX_MISSING_TEAMS_EXECUTE.sql` (Manual Fix Scripts)
- `FIX_MISSING_TEAMS_ANLEITUNG.md`

### 10. 📝 BEHALTEN - Production-Relevant
- `REMOVE_FRANK_RITTER.sql` (Falls noch benötigt)
- `ADD_MISSING_OPPONENTS.sql`
- `CREATE_VKC_CLUB.sql`
- `CREATE_MISSING_LEVERKUSEN_TEAM.sql`
- `CREATE_MISSING_TEAMS_AND_UPDATE_MATCHDAYS.sql`

### 11. 📝 BEHALTEN - Schema/Structure Checks
- `TEST_DB_STRUCTURE.sql`
- `CHECK_MATCHES_COLUMNS.sql`
- `CHECK_MATCHES_TABLE_STRUCTURE.sql`
- `CHECK_MATCH_RESULTS_COLUMNS.sql`
- `CHECK_MATCH_RESULTS_CONSTRAINTS.sql`
- `CHECK_MATCH_RESULTS_STRUCTURE.sql`
- `CHECK_CURRENT_MATCHES_STRUCTURE.sql`
- `CHECK_TRAINING_STRUCTURE.sql`
- `CHECK_TRAINING_TABLES.sql`
- `CHECK_SUPERADMIN_COLUMN.sql`
- `CHECK_TVM_ID_COLUMN.sql`
- `CHECK_CLUB_COLUMN.sql`

### 12. 📝 BEHALTEN - Auto-Fixes
- `AUTO_FIX_MATCH_WINNERS.sql`
- `CHECK_ALL_MATCH_WINNERS.sql`
- `FIX_SEASON_VALUE.sql`
- `FIX_SUMMER_MATCHES_TO_WINTER.sql`
- `FIX_LOCATION_VALUES.sql`

### 13. 📝 BEHALTEN - Team Management
- `CHECK_TEAM_DUPLICATES.sql`
- `MERGE_DUPLICATE_TEAMS.sql`
- `CHECK_MISSING_TEAMS.sql`
- `FIX_WRONG_TEAM_ID.sql`
- `FIX_ALIAS_MAPPINGS_TABLE.sql`
- `GET_TEAM_IDS.sql`

### 14. 🗑️ LÖSCHEN - Obsolete Analysis
- `ANALYZE_RANKINGS_DB_STRUCTURE.sql` (zu gross, 16KB)
- `ANALYZE_RANKINGS_SIMPLE.sql`
- `ANALYZE_ROUNDROBIN_DATA.sql`
- `ANALYZE_ATTENDANCE_OCT_25.sql`

## Zusammenfassung

### Sofort Löschen: ~35 SQL Dateien
### Sofort Archivieren: ~25 SQL Dateien
### Behalten: ~48 SQL Dateien

## Nächste Schritte

1. ✅ Löschen-Liste erstellen
2. ✅ Archiv-Ordner für Kategorien erstellen
3. ✅ Script zum automatischen Verschieben
4. ✅ Git Commit mit Cleanup





-- ==========================================
-- CLEANUP & REDESIGN: Sauberes DB-Schema
-- ==========================================

-- STEP 1: Lösche alle Match/Matchday Daten
TRUNCATE TABLE matchdays CASCADE;
TRUNCATE TABLE match_results CASCADE;
TRUNCATE TABLE match_availability CASCADE;
TRUNCATE TABLE matches CASCADE;

RAISE NOTICE '✅ Alle Match-Daten gelöscht';

-- ==========================================
-- RECOMMENDED DATABASE SCHEMA
-- ==========================================
/*
KERN-ENTITÄTEN (vereinfacht):

1. players_unified
   - Alle Spieler (aktiv & inaktiv aus KI-Import)
   - Fields: id, name, current_lk, user_id, is_active, tvm_id_number, player_type
   
2. team_info
   - Alle Mannschaften aller Vereine
   - Fields: id, team_name, club_name, category, league, group_name, etc.
   
3. team_memberships
   - Verbindung: Spieler ↔ Teams
   - Fields: player_id, team_id, role, is_primary
   
4. matchdays
   - Spieltage (die wir gerade erstellen)
   - Fields: id, home_team_id, away_team_id, match_date, venue, location, season, status
   
5. match_results
   - Einzelne Spielergebnisse innerhalb eines Matchdays
   - Fields: id, matchday_id, player_home_id, player_away_id, score, etc.
   
6. match_availability
   - Spielerverfügbarkeit für Matchdays
   - Fields: id, matchday_id (NOT match_id!), player_id, status, comment
*/

SELECT 'Datenbank aufgeräumt - bereit für Clean-Setup' as status;



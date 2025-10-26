-- MULTI-TEAM DATABASE RESTRUCTURE
-- Ziel: Jeder Verein sieht die Daten aus seiner eigenen Perspektive

-- 1. ANALYSE: Aktuelle Struktur verstehen
-- ======================================

-- Aktuelle matches Tabelle
SELECT 
  'MATCHES TABLE' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'matches' 
ORDER BY ordinal_position;

-- Aktuelle match_results Tabelle  
SELECT 
  'MATCH_RESULTS TABLE' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'match_results' 
ORDER BY ordinal_position;

-- Aktuelle team_info Tabelle
SELECT 
  'TEAM_INFO TABLE' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'team_info' 
ORDER BY ordinal_position;

-- 2. PROBLEM IDENTIFIZIEREN
-- ==========================

-- Schaue dir die aktuellen Daten an
SELECT 
  m.id,
  m.opponent,
  m.location,
  m.team_id,
  ti.club_name,
  ti.team_name,
  'Problem: team_id ist NULL oder falsch zugeordnet' as issue
FROM matches m
LEFT JOIN team_info ti ON m.team_id = ti.id
WHERE m.opponent = 'TG Leverkusen 2'
LIMIT 5;

-- Schaue dir die match_results an
SELECT 
  mr.id,
  mr.match_id,
  mr.winner,
  mr.home_player_id,
  mr.guest_player_id,
  'Problem: winner ist absolut, nicht relativ zum Team' as issue
FROM match_results mr
JOIN matches m ON mr.match_id = m.id
WHERE m.opponent = 'TG Leverkusen 2'
LIMIT 5;

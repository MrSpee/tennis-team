-- ============================================
-- MIGRATION_PHASE_4_UPDATE_QUERIES.sql
-- Phase 4: Beispiel-Queries für Code-Updates
-- ============================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📋 FRONTEND CODE-ÄNDERUNGEN
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/*
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. DataContext.jsx - loadPlayerTeams()                                       │
└──────────────────────────────────────────────────────────────────────────────┘

ALT (club_name als String):
────────────────────────────────
const { data, error } = await supabase
  .from('player_teams')
  .select(`
    *,
    team_info (
      id,
      team_name,
      club_name,     ← String!
      category,
      region,
      tvm_link
    )
  `)
  .eq('player_id', playerId);

NEU (club_id als Foreign Key):
────────────────────────────────
const { data, error } = await supabase
  .from('player_teams')
  .select(`
    *,
    team_info (
      id,
      team_name,
      category,
      region,
      tvm_link,
      club_info (      ← JOIN zu club_info!
        id,
        name,
        normalized_name,
        city,
        region,
        website
      )
    )
  `)
  .eq('player_id', playerId);

// Daten-Transformation anpassen:
let teams = data.map(pt => ({
  ...pt.team_info,
  club_name: pt.team_info.club_info?.name,  ← Aus club_info extrahieren
  club_id: pt.team_info.club_info?.id,
  club_website: pt.team_info.club_info?.website,
  club_logo: pt.team_info.club_info?.logo_url,
  is_primary: pt.is_primary,
  role: pt.role
}));

┌──────────────────────────────────────────────────────────────────────────────┐
│ 2. SupabaseProfile.jsx - loadPlayerTeamsAndClubs()                          │
└──────────────────────────────────────────────────────────────────────────────┘

ALT:
────────────────────────────────
const { data: teamsData } = await supabase
  .from('player_teams')
  .select(`
    *,
    team_info (
      id,
      team_name,
      club_name,
      category,
      region,
      tvm_link
    )
  `);

// Clubs manuell gruppieren
const clubsMap = {};
teamsData.forEach(pt => {
  const clubName = pt.team_info?.club_name;  ← String-basiert!
  if (!clubsMap[clubName]) {
    clubsMap[clubName] = { name: clubName, teams: [] };
  }
  clubsMap[clubName].teams.push(pt.team_info);
});

NEU (mit Foreign Key):
────────────────────────────────
const { data: teamsData } = await supabase
  .from('player_teams')
  .select(`
    *,
    team_info!inner (
      id,
      team_name,
      category,
      region,
      tvm_link,
      club_info!inner (       ← JOIN zu club_info!
        id,
        name,
        normalized_name,
        city,
        postal_code,
        region,
        state,
        address,
        website,
        federation
      )
    )
  `);

// Clubs automatisch gruppiert durch club_id
const clubsMap = new Map();
teamsData.forEach(pt => {
  const clubInfo = pt.team_info?.club_info;
  const clubId = clubInfo?.id;  ← UUID statt String!
  
  if (!clubsMap.has(clubId)) {
    clubsMap.set(clubId, {
      id: clubId,
      name: clubInfo.name,
      normalized_name: clubInfo.normalized_name,
      city: clubInfo.city,
      region: clubInfo.region,
      website: clubInfo.website,
      teams: []
    });
  }
  
  clubsMap.get(clubId).teams.push({
    ...pt.team_info,
    club_id: clubId,
    club_name: clubInfo.name
  });
});

const clubs = Array.from(clubsMap.values());

┌──────────────────────────────────────────────────────────────────────────────┐
│ 3. SuperAdminDashboard.jsx - Clubs & Player-Counts laden                    │
└──────────────────────────────────────────────────────────────────────────────┘

ALT (komplexes String-Matching):
────────────────────────────────
// Clubs laden
const { data: allClubsData } = await supabase
  .from('club_info')
  .select('*');

// Player-Counts manuell berechnen
const { data: clubPlayerCounts } = await supabase
  .from('player_teams')
  .select(`
    player_id,
    team_info!inner(club_name)
  `);

const playerCountMap = {};
clubPlayerCounts?.forEach(pt => {
  const clubName = pt.team_info?.club_name;  ← String!
  if (!playerCountMap[clubName]) {
    playerCountMap[clubName] = new Set();
  }
  playerCountMap[clubName].add(pt.player_id);
});

NEU (mit club_stats View):
────────────────────────────────
// Alles in einer Query mit der materialized view!
const { data: clubsWithStats } = await supabase
  .from('club_stats')
  .select('*')
  .order('player_count', { ascending: false });

// Fertig! Kein manuelles Gruppieren mehr nötig.
// clubsWithStats enthält bereits:
// - club_id, club_name, team_count, player_count

┌──────────────────────────────────────────────────────────────────────────────┐
│ 4. Onboarding - ClubSelection Component                                     │
└──────────────────────────────────────────────────────────────────────────────┘

ALT (String-basiert):
────────────────────────────────
// Club speichern als String
await supabase
  .from('player_teams')
  .insert({
    player_id: playerId,
    team_id: teamId,
    role: 'player',
    is_primary: true
  });

// team_info hat club_name als String

NEU (mit club_id):
────────────────────────────────
// 1. Club aus club_info auswählen (mit Autocomplete)
const { data: clubs } = await supabase
  .from('club_info')
  .select('id, name, city, region')
  .ilike('name', `%${searchTerm}%`)
  .order('name');

// 2. Team erstellen mit club_id
const { data: newTeam } = await supabase
  .from('team_info')
  .insert({
    club_id: selectedClub.id,  ← Foreign Key!
    team_name: teamName,
    category: category,
    region: region
  })
  .select()
  .single();

// 3. Player-Team Zuordnung
await supabase
  .from('player_teams')
  .insert({
    player_id: playerId,
    team_id: newTeam.id,
    role: 'player',
    is_primary: true
  });
*/

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📝 NÜTZLICHE QUERY-PATTERNS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1️⃣ Alle Teams eines Spielers mit vollständigen Club-Infos
SELECT 
  p.name as player_name,
  t.team_name,
  t.category,
  c.name as club_name,
  c.city,
  c.website,
  c.logo_url,
  pt.role,
  pt.is_primary
FROM players p
INNER JOIN player_teams pt ON p.id = pt.player_id
INNER JOIN team_info t ON pt.team_id = t.id
INNER JOIN club_info c ON t.club_id = c.id
WHERE p.id = 'PLAYER_UUID'
ORDER BY pt.is_primary DESC, c.name, t.team_name;

-- 2️⃣ Alle Spieler eines Vereins
SELECT 
  c.name as club_name,
  t.team_name,
  p.name as player_name,
  p.email,
  p.current_lk,
  pt.role
FROM club_info c
INNER JOIN team_info t ON t.club_id = c.id
INNER JOIN player_teams pt ON pt.team_id = t.id
INNER JOIN players p ON pt.player_id = p.id
WHERE c.id = 'CLUB_UUID'
ORDER BY t.team_name, pt.role DESC, p.name;

-- 3️⃣ Club-Statistiken (ohne Materialized View)
SELECT 
  c.id,
  c.name,
  c.city,
  COUNT(DISTINCT t.id) as team_count,
  COUNT(DISTINCT pt.player_id) as player_count,
  STRING_AGG(DISTINCT t.category, ', ') as categories
FROM club_info c
LEFT JOIN team_info t ON t.club_id = c.id
LEFT JOIN player_teams pt ON pt.team_id = t.id
GROUP BY c.id, c.name, c.city
ORDER BY player_count DESC;

-- 4️⃣ Suche Club (für Autocomplete)
SELECT 
  id,
  name,
  normalized_name,
  city,
  region,
  is_verified,
  data_source
FROM club_info
WHERE 
  (
    name ILIKE '%SEARCH_TERM%'
    OR normalized_name ILIKE '%SEARCH_TERM%'
    OR city ILIKE '%SEARCH_TERM%'
  )
ORDER BY 
  is_verified DESC,  -- Verifizierte zuerst
  name
LIMIT 10;

-- 5️⃣ Team mit allen Details
SELECT 
  t.id as team_id,
  t.team_name,
  t.category,
  t.tvm_link,
  c.id as club_id,
  c.name as club_name,
  c.normalized_name as club_normalized_name,
  c.city,
  c.postal_code,
  c.region,
  c.state,
  c.address,
  c.phone,
  c.email,
  c.website,
  c.federation,
  ts.season,
  ts.league,
  ts.group_name,
  ts.team_size
FROM team_info t
INNER JOIN club_info c ON t.club_id = c.id
LEFT JOIN team_seasons ts ON ts.team_id = t.id AND ts.is_active = true
WHERE t.id = 'TEAM_UUID';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🧪 TESTS & VALIDIERUNG
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Test 1: Alle Teams haben einen gültigen club_id
SELECT 
  COUNT(*) as teams_without_club_id,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as test_result
FROM team_info
WHERE club_id IS NULL;

-- Test 2: Keine orphaned Teams (club_id zeigt auf nicht-existierenden Club)
SELECT 
  COUNT(*) as orphaned_teams,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as test_result
FROM team_info t
LEFT JOIN club_info c ON t.club_id = c.id
WHERE t.club_id IS NOT NULL AND c.id IS NULL;

-- Test 3: club_name stimmt mit club_info.name überein
SELECT 
  COUNT(*) as mismatched_names,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '⚠️  WARNING'
  END as test_result
FROM team_info t
INNER JOIN club_info c ON t.club_id = c.id
WHERE LOWER(t.club_name) != LOWER(c.name);

-- Test 4: Alle Clubs haben mindestens ein Team
SELECT 
  COUNT(*) as clubs_without_teams
FROM club_info c
LEFT JOIN team_info t ON t.club_id = c.id
WHERE t.id IS NULL;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📊 MIGRATIONS-STATUS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📋 MIGRATION PHASE 4: Code-Update Beispiele';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '✅ SQL-Teil der Migration ist abgeschlossen!';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Nächste Schritte:';
  RAISE NOTICE '   1. Frontend-Code anpassen (siehe SQL-Kommentare oben)';
  RAISE NOTICE '   2. Tests durchführen';
  RAISE NOTICE '   3. Deployment';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Wichtige Änderungen im Frontend:';
  RAISE NOTICE '   - DataContext.jsx → loadPlayerTeams()';
  RAISE NOTICE '   - SupabaseProfile.jsx → loadPlayerTeamsAndClubs()';
  RAISE NOTICE '   - SuperAdminDashboard.jsx → Nutze club_stats View';
  RAISE NOTICE '   - Onboarding → ClubSelection mit club_id';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Optional: MIGRATION_PHASE_5_DEPRECATE_CLUB_NAME.sql';
  RAISE NOTICE '    (club_name Spalte entfernen - erst nach Code-Update!)';
  RAISE NOTICE '';
END $$;


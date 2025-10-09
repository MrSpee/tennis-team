-- ================================================================
-- Füge aktuellen User zu seinen Teams hinzu
-- ================================================================

-- 1. Prüfe aktuellen Player
SELECT 
  '👤 Dein Player-Profil:' as info,
  id,
  name,
  email
FROM players
WHERE user_id = auth.uid();

-- 2. Prüfe ob bereits Team-Zuordnungen existieren
SELECT 
  '🔍 Bestehende Team-Zuordnungen:' as info,
  COUNT(*) as anzahl
FROM player_teams
WHERE player_id IN (SELECT id FROM players WHERE user_id = auth.uid());

-- 3. Füge zu ALLEN Teams hinzu (für Testzwecke)
-- Option A: Zu allen Teams hinzufügen
INSERT INTO player_teams (player_id, team_id, is_primary, role)
SELECT 
  (SELECT id FROM players WHERE user_id = auth.uid() LIMIT 1) as player_id,
  ti.id as team_id,
  CASE 
    WHEN ti.club_name = 'VKC Köln' AND ti.team_name = 'Herren 40 1' THEN true
    ELSE false
  END as is_primary,
  'player' as role
FROM team_info ti
WHERE NOT EXISTS (
  SELECT 1 FROM player_teams pt
  WHERE pt.player_id = (SELECT id FROM players WHERE user_id = auth.uid())
    AND pt.team_id = ti.id
);

-- 4. Prüfe Ergebnis
SELECT 
  '✅ Deine Team-Zuordnungen:' as info,
  pt.id,
  ti.team_name,
  ti.club_name,
  pt.is_primary,
  pt.role
FROM player_teams pt
JOIN team_info ti ON pt.team_id = ti.id
WHERE pt.player_id IN (SELECT id FROM players WHERE user_id = auth.uid())
ORDER BY pt.is_primary DESC, ti.club_name, ti.team_name;

-- Fertig!
SELECT '✅ Du bist jetzt allen Teams zugeordnet!' as status;

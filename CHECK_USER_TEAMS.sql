-- Prüfe welcher User eingeloggt ist
SELECT 
  '👤 Aktueller User:' as info,
  id,
  email,
  raw_user_meta_data
FROM auth.users
WHERE id = auth.uid();

-- Prüfe player für aktuellen User
SELECT 
  '🎾 Player-Profil:' as info,
  id,
  user_id,
  name,
  email
FROM players
WHERE user_id = auth.uid();

-- Prüfe player_teams für aktuellen Player
SELECT 
  '🏆 Team-Zuordnungen:' as info,
  pt.id,
  pt.player_id,
  pt.team_id,
  pt.is_primary,
  pt.role,
  ti.team_name,
  ti.club_name,
  ti.category
FROM player_teams pt
LEFT JOIN team_info ti ON pt.team_id = ti.id
WHERE pt.player_id IN (
  SELECT id FROM players WHERE user_id = auth.uid()
);

-- Falls keine Zuordnung: Zeige alle verfügbaren Teams
SELECT 
  '📋 Alle verfügbaren Teams:' as info,
  id,
  team_name,
  club_name,
  category
FROM team_info
ORDER BY club_name, team_name;

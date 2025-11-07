import { createClient } from '@supabase/supabase-js';

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env;

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  console.error('Supabase Umgebungsvariablen fehlen.');
  process.exit(1);
}

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

try {
  const { data, error } = await supabase
    .from('team_seasons')
    .select('team_id, season, league, group_name, team_info(id, team_name, club_name, category)')
    .eq('league', '1. Kreisliga')
    .eq('group_name', 'Gr. 046')
    .eq('season', 'Winter 2025/26');

  if (error) {
    console.error('Fehler beim Laden der team_seasons:', error.message);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
} catch (err) {
  console.error('Unerwarteter Fehler beim Laden der team_seasons:', err.message);
  process.exit(1);
}

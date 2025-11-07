import { createClient } from '@supabase/supabase-js';

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env;

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  console.error('Supabase Umgebungsvariablen fehlen.');
  process.exit(1);
}

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

try {
  const { data, error } = await supabase
    .from('team_info')
    .select('id, team_name, club_name, category')
    .order('club_name');

  if (error) {
    console.error('Fehler beim Laden der Teams:', error.message);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
} catch (err) {
  console.error('Unerwarteter Fehler beim Laden der Teams:', err.message);
  process.exit(1);
}

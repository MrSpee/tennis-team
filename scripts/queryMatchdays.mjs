import { createClient } from '@supabase/supabase-js';

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env;

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  console.error('Supabase Umgebungsvariablen fehlen.');
  process.exit(1);
}

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

try {
  const { data, error } = await supabase
    .from('matchdays')
    .select('*')
    .order('match_date');

  if (error) {
    console.error('Fehler beim Laden der Matchdays:', error.message);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
} catch (err) {
  console.error('Unerwarteter Fehler beim Laden der Matchdays:', err.message);
  process.exit(1);
}

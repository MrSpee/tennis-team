import { createClient } from '@supabase/supabase-js';

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env;

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  console.error('Supabase Umgebungsvariablen fehlen.');
  process.exit(1);
}

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

try {
  const { data, error } = await supabase
    .from('team_memberships')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Fehler beim Laden der team_memberships:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('Keine Datensätze gefunden.');
    process.exit(0);
  }

  console.log('Spalten:', Object.keys(data[0]));
  console.log('Datensatz:', JSON.stringify(data[0], null, 2));
  process.exit(0);
} catch (err) {
  console.error('Unerwarteter Fehler beim Laden der team_memberships:', err.message);
  process.exit(1);
}

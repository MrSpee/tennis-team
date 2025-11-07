import { createClient } from '@supabase/supabase-js';

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env;

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  console.error('Supabase Umgebungsvariablen fehlen.');
  process.exit(1);
}

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

try {
  const { count, error } = await supabase
    .from('matchdays')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Fehler beim Zählen der Matchdays:', error.message);
    process.exit(1);
  }

  console.log('Matchdays insgesamt:', count ?? 0);
  process.exit(0);
} catch (err) {
  console.error('Unerwarteter Fehler beim Zählen der Matchdays:', err.message);
  process.exit(1);
}

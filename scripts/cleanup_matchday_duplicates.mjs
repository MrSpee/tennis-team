import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^\s*([A-Za-z_0-9]+)\s*=\s*(.+)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    });
  } catch (err) {
    console.warn('⚠️ Konnte .env nicht einlesen:', err.message);
  }
}

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Fehlende Supabase-Konfiguration. Bitte SUPABASE_URL und SERVICE_ROLE_KEY setzen.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const chunk = (arr, size) => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

const main = async () => {
  console.log('🔍 Lade Matchdays zur Duplikatsprüfung …');
  const { data, error } = await supabase
    .from('matchdays')
    .select('id, match_date, home_team_id, away_team_id, season, created_at')
    .order('match_date', { ascending: true })
    .limit(10000);

  if (error) {
    console.error('❌ Fehler beim Laden der Matchdays:', error);
    process.exit(1);
  }

  const byKey = new Map();
  const selfMatches = new Set();

  (data || []).forEach((row) => {
    if (!row || !row.id) return;
    if (row.home_team_id && row.home_team_id === row.away_team_id) {
      selfMatches.add(row.id);
    }
    const key = [
      row.season || 'unknown',
      row.match_date || 'unknown',
      row.home_team_id || 'unknown',
      row.away_team_id || 'unknown'
    ].join('::');
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  });

  const duplicateIds = [];
  let duplicateGroups = 0;

  byKey.forEach((rows) => {
    if (rows.length <= 1) return;
    duplicateGroups += 1;
    rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    rows.slice(1).forEach((row) => duplicateIds.push(row.id));
  });

  const idsToDelete = Array.from(new Set([...duplicateIds, ...selfMatches]));

  if (idsToDelete.length === 0) {
    console.log('✅ Keine Duplikate oder fehlerhaften Matches gefunden.');
    return;
  }

  console.log(
    `🧹 Entferne ${idsToDelete.length} Matchday-Einträge (${duplicateGroups} Duplikat-Gruppen, ${selfMatches.size} Heim=Gast Matches).`
  );

  for (const part of chunk(idsToDelete, 100)) {
    const { error: deleteError } = await supabase.from('matchdays').delete().in('id', part);
    if (deleteError) {
      console.error('❌ Fehler beim Löschen:', deleteError);
      process.exit(1);
    }
    console.log(`   • ${part.length} Einträge entfernt …`);
  }

  console.log('✅ Bereinigung abgeschlossen.');
};

main().catch((err) => {
  console.error('❌ Unerwarteter Fehler:', err);
  process.exit(1);
});



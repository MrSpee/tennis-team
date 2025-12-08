/**
 * Test: Team-Erstellung für Junioren-Teams
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

// Test: Finde Grossrotter Hof Club
const { data: club, error: clubError } = await supabase
  .from('club_info')
  .select('id, name')
  .ilike('name', '%Grossrotter%')
  .limit(1)
  .single();

if (clubError || !club) {
  console.error('❌ Club nicht gefunden:', clubError);
  process.exit(1);
}

console.log(`✅ Club gefunden: ${club.name} (${club.id})\n`);

// Test: Erstelle U12 mixed Team
const testCategory = 'U12 mixed';
const testTeamNumber = '1';

console.log(`🔍 Prüfe ob Team existiert: ${testCategory} Mannschaft ${testTeamNumber}`);
const { data: existingTeam } = await supabase
  .from('team_info')
  .select('id')
  .eq('club_id', club.id)
  .eq('category', testCategory)
  .eq('team_name', testTeamNumber)
  .maybeSingle();

if (existingTeam) {
  console.log(`✅ Team existiert bereits: ${existingTeam.id}`);
  process.exit(0);
}

console.log(`\n➕ Erstelle Team via RPC...`);
const { data: rpcTeam, error: rpcError } = await supabase
  .rpc('create_team_as_super_admin', {
    p_team_name: testTeamNumber,
    p_category: testCategory,
    p_club_id: club.id,
    p_region: 'Mittelrhein',
    p_tvm_link: null
  });

if (rpcError) {
  console.error(`❌ RPC Fehler:`, rpcError);
  console.log(`\n🔄 Versuche direkten INSERT...`);
  
  const { data: insertedTeam, error: insertError } = await supabase
    .from('team_info')
    .insert({
      team_name: testTeamNumber,
      category: testCategory,
      club_id: club.id,
      club_name: club.name,
      region: 'Mittelrhein',
      tvm_link: null
    })
    .select('id')
    .single();
  
  if (insertError) {
    console.error(`❌ INSERT Fehler:`, insertError);
    process.exit(1);
  }
  
  console.log(`✅ Team erstellt via direkten INSERT: ${insertedTeam.id}`);
} else {
  const team = Array.isArray(rpcTeam) ? rpcTeam[0] : rpcTeam;
  console.log(`✅ Team erstellt via RPC: ${team.id}`);
}


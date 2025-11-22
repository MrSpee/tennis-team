#!/usr/bin/env node
/**
 * Korrigiert Spieler mit falschen LK-Werten (1-6)
 * Diese wurden wahrscheinlich durch falsche Extraktion der Position statt LK erstellt
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lade .env.local
let supabaseUrl, supabaseKey;
try {
  const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (key.trim() === 'VITE_SUPABASE_URL') supabaseUrl = value;
        if (key.trim() === 'VITE_SUPABASE_ANON_KEY') supabaseKey = value;
      }
    }
  });
} catch (e) {
  console.error('⚠️ Konnte .env.local nicht laden:', e.message);
  supabaseUrl = process.env.VITE_SUPABASE_URL;
  supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Fehlende Supabase-Credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLowLKPlayers() {
  console.log('🔍 Suche nach Spielern mit verdächtig niedrigen LK-Werten (1-6)...\n');
  
  // Hole alle betroffenen Spieler
  const { data: players, error } = await supabase
    .from('players_unified')
    .select('id, name, current_lk, season_start_lk, ranking, tvm_id, tvm_id_number, player_type, is_active')
    .eq('player_type', 'app_user')
    .eq('is_active', false)
    .is('tvm_id', null)
    .is('tvm_id_number', null);
  
  if (error) {
    console.error('❌ Fehler beim Laden:', error);
    return;
  }
  
  const suspiciousPlayers = (players || []).filter(p => {
    if (!p.current_lk) return false;
    const lkValue = parseFloat(p.current_lk.replace('LK ', '').replace(',', '.'));
    return lkValue >= 1 && lkValue <= 6;
  });
  
  console.log(`📋 Gefunden: ${suspiciousPlayers.length} Spieler mit verdächtig niedrigen LK-Werten\n`);
  
  console.log('Liste der betroffenen Spieler:');
  console.log('='.repeat(80));
  suspiciousPlayers.forEach((p, i) => {
    const lkValue = parseFloat(p.current_lk.replace('LK ', '').replace(',', '.'));
    console.log(`${i + 1}. ${p.name.padEnd(30)} | LK: ${p.current_lk.padEnd(8)} | ID: ${p.id}`);
  });
  console.log('='.repeat(80));
  
  console.log('\n⚠️  Diese Spieler haben wahrscheinlich ihre Position (1-6) statt ihrer LK als LK gespeichert.');
  console.log('💡 Lösung: Setze LK auf NULL, damit sie beim nächsten Import/Update korrekt gesetzt werden kann.\n');
  
  // Setze LK auf NULL
  const playerIds = suspiciousPlayers.map(p => p.id);
  
  const { error: updateError } = await supabase
    .from('players_unified')
    .update({
      current_lk: null,
      season_start_lk: null,
      ranking: null
    })
    .in('id', playerIds);
  
  if (updateError) {
    console.error('❌ Fehler beim Aktualisieren:', updateError);
    return;
  }
  
  console.log(`✅ ${playerIds.length} Spieler korrigiert: LK auf NULL gesetzt`);
  console.log('📝 Diese Spieler müssen beim nächsten Import/Update ihre korrekte LK erhalten.');
}

fixLowLKPlayers().catch(console.error);


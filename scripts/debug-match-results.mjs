#!/usr/bin/env node
/**
 * Debug-Script: Prüft Match-Results und Spieler-Daten in der DB
 * 
 * Usage: node scripts/debug-match-results.mjs [matchday_id]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lade .env.local manuell
function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value.trim();
        }
      }
    }
  } catch (err) {
    // Ignore if file doesn't exist
  }
}

// Versuche .env.local zu laden
loadEnvFile(join(__dirname, '..', '.env.local'));
loadEnvFile(join(__dirname, '..', '.env'));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Fehler: VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY nicht gefunden!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugMatchResults(matchdayId = null) {
  console.log('🔍 Debug: Match-Results und Spieler-Daten\n');

  try {
    // Lade alle Matchdays (oder spezifisches)
    // WICHTIG: Zeige zuerst Matchdays MIT Match-Results, dann ohne
    let matchdaysQuery = supabase
      .from('matchdays')
      .select('id, match_number, home_team_id, away_team_id, season, league, group_name, status, match_date')
      .order('match_date', { ascending: false });

    if (matchdayId) {
      matchdaysQuery = matchdaysQuery.eq('id', matchdayId);
    } else {
      // Lade mehr Matchdays, um auch welche mit Results zu finden
      matchdaysQuery = matchdaysQuery.limit(50);
    }

    const { data: allMatchdays, error: matchdaysError } = await matchdaysQuery;

    if (matchdaysError) {
      throw matchdaysError;
    }

    if (!allMatchdays || allMatchdays.length === 0) {
      console.log('⚠️ Keine Matchdays gefunden');
      return;
    }

    // Prüfe welche Matchdays Match-Results haben
    const matchdayIds = allMatchdays.map(m => m.id);
    const { data: allResults } = await supabase
      .from('match_results')
      .select('matchday_id')
      .in('matchday_id', matchdayIds);
    
    const matchdaysWithResults = new Set(allResults?.map(r => r.matchday_id) || []);
    
    // Sortiere: Zuerst mit Results, dann ohne
    const matchdays = allMatchdays.sort((a, b) => {
      const aHasResults = matchdaysWithResults.has(a.id);
      const bHasResults = matchdaysWithResults.has(b.id);
      if (aHasResults && !bHasResults) return -1;
      if (!aHasResults && bHasResults) return 1;
      return 0;
    });

    console.log(`📊 Gefundene Matchdays: ${matchdays.length}`);
    console.log(`   ✅ Mit Match-Results: ${matchdaysWithResults.size}`);
    console.log(`   ⚠️  Ohne Match-Results: ${matchdays.length - matchdaysWithResults.size}\n`);

    for (const matchday of matchdays) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Matchday ID: ${matchday.id}`);
      console.log(`Match #${matchday.match_number} | ${matchday.season} | ${matchday.league}`);
      console.log(`${'='.repeat(80)}\n`);

      // Lade Match-Results für diesen Matchday
      const { data: results, error: resultsError } = await supabase
        .from('match_results')
        .select('*')
        .eq('matchday_id', matchday.id)
        .order('match_number', { ascending: true });

      if (resultsError) {
        console.error(`❌ Fehler beim Laden der Match-Results:`, resultsError);
        continue;
      }

      if (!results || results.length === 0) {
        console.log('⚠️ Keine Match-Results gefunden');
        continue;
      }

      console.log(`📋 Match-Results: ${results.length}\n`);

      // Sammle alle Player-IDs
      const playerIds = new Set();
      results.forEach(r => {
        if (r.home_player_id) playerIds.add(r.home_player_id);
        if (r.guest_player_id) playerIds.add(r.guest_player_id);
        if (r.home_player1_id) playerIds.add(r.home_player1_id);
        if (r.home_player2_id) playerIds.add(r.home_player2_id);
        if (r.guest_player1_id) playerIds.add(r.guest_player1_id);
        if (r.guest_player2_id) playerIds.add(r.guest_player2_id);
      });

      console.log(`👥 Gefundene Player-IDs: ${playerIds.size}`);
      if (playerIds.size > 0) {
        console.log(`   IDs: ${Array.from(playerIds).join(', ')}\n`);
      } else {
        console.log('   ⚠️ KEINE Player-IDs gefunden!');
        
        // Prüfe ob Teams existieren und ob es Spieler in diesen Teams gibt
        if (matchday.home_team_id || matchday.away_team_id) {
          console.log('\n   🔍 Prüfe Teams und deren Spieler...');
          
          const teamIds = [matchday.home_team_id, matchday.away_team_id].filter(Boolean);
          if (teamIds.length > 0) {
            const { data: teamMembers } = await supabase
              .from('team_memberships')
              .select('player_id, players_unified(id, name, current_lk)')
              .in('team_id', teamIds);
            
            if (teamMembers && teamMembers.length > 0) {
              console.log(`   ✅ Gefundene Team-Mitglieder: ${teamMembers.length}`);
              teamMembers.slice(0, 5).forEach(tm => {
                const player = tm.players_unified;
                if (player) {
                  console.log(`      - ${player.name} (LK: ${player.current_lk || 'keine'})`);
                }
              });
            } else {
              console.log('   ⚠️ Keine Team-Mitglieder gefunden');
            }
          }
        }
        console.log('');
      }

      // Lade Spieler-Daten
      let players = {};
      if (playerIds.size > 0) {
        const { data: playersData, error: playersError } = await supabase
          .from('players_unified')
          .select('id, name, current_lk')
          .in('id', Array.from(playerIds));

        if (playersError) {
          console.error(`❌ Fehler beim Laden der Spieler:`, playersError);
        } else if (playersData) {
          playersData.forEach(p => {
            players[p.id] = p;
          });
          console.log(`✅ Geladene Spieler: ${playersData.length}`);
        }
      }

      // Zeige Details für jeden Match-Result
      results.forEach((result, idx) => {
        console.log(`\n${'-'.repeat(80)}`);
        console.log(`Match ${result.match_number} (${result.match_type}):`);
        console.log(`  Score: ${result.home_score || 0}:${result.away_score || 0}`);
        console.log(`  Status: ${result.status || 'unknown'}`);

        if (result.match_type === 'Einzel') {
          console.log(`  Home Player ID: ${result.home_player_id || 'NULL'}`);
          if (result.home_player_id) {
            const player = players[result.home_player_id];
            if (player) {
              console.log(`    → Name: ${player.name}, LK: ${player.current_lk || 'keine'}`);
            } else {
              console.log(`    → ⚠️ Spieler nicht in players_unified gefunden!`);
            }
          }

          console.log(`  Guest Player ID: ${result.guest_player_id || 'NULL'}`);
          if (result.guest_player_id) {
            const player = players[result.guest_player_id];
            if (player) {
              console.log(`    → Name: ${player.name}, LK: ${player.current_lk || 'keine'}`);
            } else {
              console.log(`    → ⚠️ Spieler nicht in players_unified gefunden!`);
            }
          }
        } else {
          console.log(`  Home Player 1 ID: ${result.home_player1_id || 'NULL'}`);
          if (result.home_player1_id) {
            const player = players[result.home_player1_id];
            if (player) {
              console.log(`    → Name: ${player.name}, LK: ${player.current_lk || 'keine'}`);
            } else {
              console.log(`    → ⚠️ Spieler nicht in players_unified gefunden!`);
            }
          }

          console.log(`  Home Player 2 ID: ${result.home_player2_id || 'NULL'}`);
          if (result.home_player2_id) {
            const player = players[result.home_player2_id];
            if (player) {
              console.log(`    → Name: ${player.name}, LK: ${player.current_lk || 'keine'}`);
            } else {
              console.log(`    → ⚠️ Spieler nicht in players_unified gefunden!`);
            }
          }

          console.log(`  Guest Player 1 ID: ${result.guest_player1_id || 'NULL'}`);
          if (result.guest_player1_id) {
            const player = players[result.guest_player1_id];
            if (player) {
              console.log(`    → Name: ${player.name}, LK: ${player.current_lk || 'keine'}`);
            } else {
              console.log(`    → ⚠️ Spieler nicht in players_unified gefunden!`);
            }
          }

          console.log(`  Guest Player 2 ID: ${result.guest_player2_id || 'NULL'}`);
          if (result.guest_player2_id) {
            const player = players[result.guest_player2_id];
            if (player) {
              console.log(`    → Name: ${player.name}, LK: ${player.current_lk || 'keine'}`);
            } else {
              console.log(`    → ⚠️ Spieler nicht in players_unified gefunden!`);
            }
          }
        }
      });
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

// Main
const matchdayId = process.argv[2] || null;
debugMatchResults(matchdayId).then(() => {
  console.log('\n✅ Debug abgeschlossen');
  process.exit(0);
});


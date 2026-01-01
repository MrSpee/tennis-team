const { createSupabaseClient } = require('../_lib/supabaseAdmin');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function withCors(res, status, payload) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.status(status).json(payload);
}

/**
 * Parst die nuLiga Team-Portrait-Seite und extrahiert die Meldeliste
 * @param {string} teamPortraitUrl - URL zur Team-Portrait-Seite (z.B. https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471133&championship=...)
 * @returns {Promise<Array>} Array von Spielern mit Rang, Name, LK, etc.
 */
async function parseTeamPortrait(teamPortraitUrl) {
  try {
    console.log(`[parse-team-roster] 🔍 Lade Team-Portrait-Seite: ${teamPortraitUrl}`);
    
    const response = await fetch(teamPortraitUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    let html = await response.text();
    
    // Finde die Spieler-Tabelle: Sie kommt nach <h2>Spieler</h2>
    const spielerHeadingIndex = html.indexOf('<h2>Spieler');
    if (spielerHeadingIndex === -1) {
      console.log('[parse-team-roster] ⚠️ "Spieler" Überschrift nicht gefunden, versuche alle Tabellen...');
    } else {
      console.log(`[parse-team-roster] ✅ "Spieler" Überschrift gefunden bei Position ${spielerHeadingIndex}`);
      // Extrahiere Bereich nach der Überschrift
      const sectionAfterHeading = html.substring(spielerHeadingIndex, spielerHeadingIndex + 50000);
      
      // Finde die erste Tabelle nach der Überschrift (das ist die Spieler-Tabelle)
      const tableMatch = sectionAfterHeading.match(/<table[^>]*>([\s\S]*?)<\/table>/);
      if (tableMatch) {
        console.log('[parse-team-roster] ✅ Spieler-Tabelle gefunden nach Überschrift');
        // Verwende nur diese Tabelle für das Parsing
        html = tableMatch[0];
      }
    }
    
    // Parse HTML mit Regex (da wir keine cheerio in Vercel Functions haben)
    const roster = [];
    
    // Basierend auf der tatsächlichen nuLiga HTML-Struktur:
    // Die Meldeliste ist in einer Tabelle mit <tr> Zeilen
    // Format: Rang | LK | TVM-ID | Name (mit Link) | Geburtsjahr | Einzel | Doppel | Gesamt
    
    // Verbesserter Pattern: Suche nach Tabellenzeilen mit Spielerdaten
    // Beispiel aus nuLiga: <tr><td>1</td><td>LK12,3</td><td>12345678</td><td><a>Mustermann, Max</a></td><td>1980</td>...
    
    // Pattern 1: Vollständige Zeile mit allen Feldern
    // Basierend auf tatsächlicher nuLiga-Struktur: Rang | Mannschaft | LK | ID-Nummer | Name (Geburtsjahr) | Nation | Info | SG | Einzel | Doppel
    // Beispiel: <td> 1 </td> <td> 1 </td> <td>LK10,4</td> <td>17104633&nbsp;</td> <td> <a>Meuser, Gary</a>... </div> (1971)</td>
    // WICHTIG: ID hat &nbsp; am Ende, Geburtsjahr steht in Klammern NACH dem </div> im gleichen <td>
    // WICHTIG: Pattern muss Header-Zeilen ausschließen (keine <th> Tags)
    // Geburtsjahr steht am Ende der Spalte 5, nach allen divs und Links
    const fullRowPattern = /<tr[^>]*>(?![\s\S]*?<th)[\s\S]*?<td[^>]*>\s*(\d{1,2})\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>(LK[\d,\.]+)<\/td>\s*<td[^>]*>(\d{7,})(?:&nbsp;)?\s*<\/td>\s*<td[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>[\s\S]*?<\/div>[\s\S]*?\((\d{4})\)[\s\S]*?<\/td>[\s\S]*?(?:<td[^>]*>[^<]*<\/td>[\s\S]*?){2,4}<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>/gi;
    
    let match;
    while ((match = fullRowPattern.exec(html)) !== null) {
      const rank = parseInt(match[1], 10);
      const teamNumber = match[2]; // Mannschaftsnummer (nicht verwendet)
      const lk = match[3].trim();
      const tvmId = match[4].trim();
      const name = match[5].trim();
      
      // Geburtsjahr extrahieren: Suche in der gesamten Zeile nach (Jahr)
      // Falls Pattern es nicht gefunden hat, suche in der Zeile
      let birthYear = match[6] ? parseInt(match[6], 10) : null;
      if (!birthYear) {
        // Fallback: Suche nach (Jahr) in der gesamten Zeile
        const rowEnd = html.indexOf('</tr>', match.index);
        const rowContent = html.substring(match.index, rowEnd);
        const birthMatch = rowContent.match(/\((\d{4})\)/);
        if (birthMatch) {
          birthYear = parseInt(birthMatch[1], 10);
        }
      }
      
      const singles = match[7]?.trim() || null;
      const doubles = match[8]?.trim() || null;
      // Gesamt-Bilanz berechnen aus Einzel + Doppel (falls vorhanden)
      const total = (singles && doubles) ? `${singles}:${doubles.split(':')[1] || '0'}` : null;
      
      roster.push({
        rank,
        name,
        lk: lk.startsWith('LK') ? lk : `LK ${lk}`,
        tvmId,
        birthYear,
        singles: singles && singles !== '-' ? singles : null,
        doubles: doubles && doubles !== '-' ? doubles : null,
        total: total && total !== '-' ? total : null
      });
    }
    
    // Pattern 2: Fallback - Suche nach Zeilen mit Rang, LK, TVM-ID und Name (ohne Bilanz)
    if (roster.length === 0) {
      console.log('[parse-team-roster] ⚠️ Vollständiges Pattern hat keine Ergebnisse, versuche vereinfachtes Pattern...');
      
      // Pattern 2: Vereinfacht - Rang | Mannschaft | LK | ID-Nummer | Name (Geburtsjahr)
      // Berücksichtigt &nbsp; in ID und Geburtsjahr in Klammern
      // Rang muss 1-2 Ziffern sein (1-99), um falsche Matches zu vermeiden
      // WICHTIG: Pattern muss Header-Zeilen ausschließen (keine <th> Tags)
      // Geburtsjahr steht nach </div> in Klammern, ist aber optional
      const simpleRowPattern = /<tr[^>]*>(?![\s\S]*?<th)[\s\S]*?<td[^>]*>\s*(\d{1,2})\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>(LK[\d,\.]+)<\/td>\s*<td[^>]*>(\d{7,})(?:&nbsp;)?\s*<\/td>\s*<td[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>[\s\S]*?(?:<\/div>[\s\S]*?\((\d{4})\))?/gi;
      let simpleMatch;
      
      while ((simpleMatch = simpleRowPattern.exec(html)) !== null) {
        const rank = parseInt(simpleMatch[1], 10);
        const teamNumber = simpleMatch[2]; // Mannschaftsnummer (nicht verwendet)
        const lk = simpleMatch[3].trim();
        const tvmId = simpleMatch[4].trim();
        const name = simpleMatch[5].trim();
        
        // Geburtsjahr extrahieren: Suche in der gesamten Zeile nach (Jahr)
        let birthYear = simpleMatch[6] ? parseInt(simpleMatch[6], 10) : null;
        if (!birthYear) {
          // Fallback: Suche nach (Jahr) in der gesamten Zeile
          const rowEnd = html.indexOf('</tr>', simpleMatch.index);
          const rowContent = html.substring(simpleMatch.index, rowEnd);
          const birthMatch = rowContent.match(/\((\d{4})\)/);
          if (birthMatch) {
            birthYear = parseInt(birthMatch[1], 10);
          }
        }
        
        // Validiere dass es ein echter Spieler-Eintrag ist
        if (name && name.length > 2 && tvmId && tvmId.match(/^\d+$/)) {
          
          roster.push({
            rank,
            name,
            lk: lk.startsWith('LK') ? lk : `LK ${lk}`,
            tvmId,
            birthYear,
            singles: null,
            doubles: null,
            total: null
          });
        }
      }
    }
    
    // Pattern 3: Letzter Fallback - Suche nach allen Zeilen mit Spielernamen-Links
    if (roster.length === 0) {
      console.log('[parse-team-roster] ⚠️ Vereinfachtes Pattern hat keine Ergebnisse, versuche letzten Fallback...');
      
      // Suche nach allen Links die wie Spielernamen aussehen
      const nameLinkPattern = /<td[^>]*>(\d+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>.*?<a[^>]*>([A-ZÄÖÜ][a-zäöüß]+,\s*[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)<\/a>/gi;
      let nameMatch;
      let currentRank = 1;
      
      while ((nameMatch = nameLinkPattern.exec(html)) !== null) {
        const rank = parseInt(nameMatch[1], 10) || currentRank;
        const lk = nameMatch[2].trim();
        const tvmId = nameMatch[3].trim();
        const name = nameMatch[4].trim();
        
        if (name && name.length > 3 && tvmId && tvmId.match(/^\d+$/)) {
          roster.push({
            rank,
            name,
            lk: lk.match(/LK|[\d,\.]/) ? (lk.startsWith('LK') ? lk : `LK ${lk}`) : null,
            tvmId,
            birthYear: null,
            singles: null,
            doubles: null,
            total: null
          });
          currentRank++;
        }
      }
    }
    
    console.log(`[parse-team-roster] ✅ ${roster.length} Spieler aus Meldeliste extrahiert`);
    return roster;
    
  } catch (error) {
    console.error('[parse-team-roster] ❌ Fehler beim Parsen der Team-Portrait-Seite:', error);
    throw error;
  }
}

/**
 * Berechnet Ähnlichkeit zwischen zwei Strings (Dice Coefficient)
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const normalize = (s) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  if (s1 === s2) return 100;
  
  // Dice Coefficient: Berechnet Ähnlichkeit basierend auf Bigrammen
  const getBigrams = (s) => {
    const bigrams = new Set();
    for (let i = 0; i < s.length - 1; i++) {
      bigrams.add(s.substring(i, i + 2));
    }
    return bigrams;
  };
  
  const bigrams1 = getBigrams(s1);
  const bigrams2 = getBigrams(s2);
  
  let intersection = 0;
  bigrams1.forEach(bigram => {
    if (bigrams2.has(bigram)) intersection++;
  });
  
  const union = bigrams1.size + bigrams2.size;
  if (union === 0) return 0;
  
  return Math.round((2 * intersection / union) * 100);
}

/**
 * Führt Fuzzy-Matching mit players_unified durch
 */
async function matchPlayerToUnified(supabase, rosterPlayer) {
  try {
    // 1. Exakte Übereinstimmung (Name) - Normalisiere Namen für besseres Matching
    // Normalisiere Namen: "Dr. Ellrich, Robert" → "Robert Ellrich", "Mengelkamp, Thomas" → "Thomas Mengelkamp"
    const normalizeName = (name) => {
      // Entferne Titel (Dr., Prof., etc.)
      name = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
      // Konvertiere "Nachname, Vorname" → "Vorname Nachname"
      const commaMatch = name.match(/^([^,]+),\s*(.+)$/);
      if (commaMatch) {
        return `${commaMatch[2].trim()} ${commaMatch[1].trim()}`;
      }
      return name.trim();
    };
    
    const normalizedRosterName = normalizeName(rosterPlayer.name);
    
    const { data: exactMatches } = await supabase
      .from('players_unified')
      .select('id, name, current_lk, tvm_id_number, user_id, email')
      .ilike('name', normalizedRosterName)
      .limit(10);
    
    if (exactMatches && exactMatches.length > 0) {
      // PRIORITÄT: Bevorzuge Spieler MIT App-Account (user_id)
      // Sortiere: zuerst Spieler mit user_id, dann ohne
      exactMatches.sort((a, b) => {
        if (a.user_id && !b.user_id) return -1;
        if (!a.user_id && b.user_id) return 1;
        return 0;
      });
      
      // Prüfe erst exakte Übereinstimmung mit normalisiertem Namen
      const exactMatch = exactMatches.find(p => 
        p.name.toLowerCase() === normalizedRosterName.toLowerCase()
      );
      if (exactMatch) {
        console.log(`[parse-team-roster] ✅ Exaktes Match gefunden: ${exactMatch.name} (${exactMatch.id})${exactMatch.user_id ? ' [HAT APP-ACCOUNT]' : ''}`);
        return { playerId: exactMatch.id, confidence: 100, matchType: 'exact', hasUserAccount: !!exactMatch.user_id };
      }
      
      // Fallback: Prüfe auch mit Original-Namen (für Fälle wo DB-Name schon normalisiert ist)
      const originalMatch = exactMatches.find(p => 
        p.name.toLowerCase() === rosterPlayer.name.toLowerCase()
      );
      if (originalMatch) {
        console.log(`[parse-team-roster] ✅ Exaktes Match gefunden (Original-Format): ${originalMatch.name} (${originalMatch.id})${originalMatch.user_id ? ' [HAT APP-ACCOUNT]' : ''}`);
        return { playerId: originalMatch.id, confidence: 100, matchType: 'exact', hasUserAccount: !!originalMatch.user_id };
      }
    }
    
    // 2. TVM-ID Match (falls vorhanden) - WICHTIG: Spalte heißt tvm_id_number, nicht tvm_id!
    // Wenn mehrere Spieler die gleiche TVM-ID haben, bevorzuge den mit App-Account
    if (rosterPlayer.tvmId) {
      const { data: tvmMatchesAll } = await supabase
        .from('players_unified')
        .select('id, name, tvm_id_number, user_id, email')
        .eq('tvm_id_number', rosterPlayer.tvmId);
      
      if (tvmMatchesAll && tvmMatchesAll.length > 0) {
        // PRIORITÄT: Bevorzuge Spieler MIT App-Account
        tvmMatchesAll.sort((a, b) => {
          if (a.user_id && !b.user_id) return -1;
          if (!a.user_id && b.user_id) return 1;
          return 0;
        });
        
        const tvmMatch = tvmMatchesAll[0]; // Nimm den ersten (mit user_id wenn vorhanden)
        console.log(`[parse-team-roster] ✅ TVM-ID Match gefunden: ${tvmMatch.name} (${tvmMatch.id})${tvmMatch.user_id ? ' [HAT APP-ACCOUNT]' : ''}`);
        return { playerId: tvmMatch.id, confidence: 95, matchType: 'tvm_id', hasUserAccount: !!tvmMatch.user_id };
      }
    }
    
    // 3. Fuzzy-Matching (Name-Ähnlichkeit) - mit normalisiertem Namen
    const { data: allPlayers } = await supabase
      .from('players_unified')
      .select('id, name, current_lk, tvm_id_number, user_id, email')
      .limit(1000); // Begrenze für Performance
    
    if (!allPlayers || allPlayers.length === 0) {
      return { playerId: null, confidence: 0, matchType: 'none' };
    }
    
    // Normalisiere Namen-Funktion (wie oben)
    const normalizeNameForFuzzy = (name) => {
      name = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
      const commaMatch = name.match(/^([^,]+),\s*(.+)$/);
      if (commaMatch) {
        return `${commaMatch[2].trim()} ${commaMatch[1].trim()}`;
      }
      return name.trim();
    };
    
    // Berechne Similarity für alle Spieler (verwende normalisierten Namen)
    const matches = allPlayers
      .map(player => ({
        ...player,
        normalizedName: normalizeNameForFuzzy(player.name),
        similarity: calculateSimilarity(normalizeNameForFuzzy(player.name), normalizedRosterName)
      }))
      .filter(m => m.similarity >= 70) // Mindestens 70% Ähnlichkeit
      .sort((a, b) => {
        // PRIORITÄT: Erst nach user_id (App-Account), dann nach Similarity
        if (a.user_id && !b.user_id) return -1;
        if (!a.user_id && b.user_id) return 1;
        return b.similarity - a.similarity;
      });
    
    if (matches.length > 0) {
      const bestMatch = matches[0];
      console.log(`[parse-team-roster] 🎯 Fuzzy-Match gefunden: ${bestMatch.name} (${bestMatch.similarity}% Ähnlichkeit)${bestMatch.user_id ? ' [HAT APP-ACCOUNT]' : ''}`);
      return { 
        playerId: bestMatch.id, 
        confidence: bestMatch.similarity, 
        matchType: 'fuzzy',
        hasUserAccount: !!bestMatch.user_id,
        allMatches: matches.slice(0, 5).map(m => ({
          id: m.id,
          name: m.name,
          similarity: m.similarity,
          hasUserAccount: !!m.user_id
        })) // Top 5 Matches für Review
      };
    }
    
    // Kein Match gefunden
    console.log(`[parse-team-roster] ⚠️ Kein Match gefunden für: ${rosterPlayer.name}`);
    return { playerId: null, confidence: 0, matchType: 'none' };
    
  } catch (error) {
    console.error('[parse-team-roster] ❌ Fehler beim Fuzzy-Matching:', error);
    return { playerId: null, confidence: 0, matchType: 'error', error: error.message };
  }
}

/**
 * Speichert die Meldeliste in der Datenbank mit Fuzzy-Matching zu players_unified
 */
async function saveTeamRoster(supabase, teamId, season, roster) {
  try {
    console.log(`[parse-team-roster] 💾 Speichere Meldeliste für Team ${teamId}, Saison ${season}...`);
    
    // Führe Fuzzy-Matching für jeden Spieler durch
    console.log(`[parse-team-roster] 🔍 Führe Fuzzy-Matching für ${roster.length} Spieler durch...`);
    const rosterEntries = [];
    let matchedCount = 0;
    let unmatchedCount = 0;
    
    for (const player of roster) {
      const matchResult = await matchPlayerToUnified(supabase, player);
      
      rosterEntries.push({
        team_id: teamId,
        season: season,
        rank: player.rank,
        player_name: player.name,
        lk: player.lk,
        tvm_id: player.tvmId || null,
        birth_year: player.birthYear || null,
        singles_record: player.singles || null,
        doubles_record: player.doubles || null,
        total_record: player.total || null,
        player_id: matchResult.playerId || null // Verknüpfung zu players_unified
      });
      
      if (matchResult.playerId) {
        matchedCount++;
      } else {
        unmatchedCount++;
      }
      
      // Kurze Pause zwischen Matches (um DB nicht zu überlasten)
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`[parse-team-roster] 📊 Matching-Ergebnisse: ${matchedCount} gematcht, ${unmatchedCount} nicht gematcht`);
    
    // ✅ FIX: Verwende UPSERT statt DELETE + INSERT um Duplikat-Fehler zu vermeiden
    // Supabase's upsert funktioniert standardmäßig mit PRIMARY KEY
    // Für UNIQUE constraints verwenden wir eine Alternative: Einzelne UPSERTs pro Eintrag
    const savedEntries = [];
    let upsertedCount = 0;
    let insertedCount = 0;
    
    for (const entry of rosterEntries) {
      try {
        // Prüfe ob Eintrag bereits existiert
        const { data: existing } = await supabase
          .from('team_roster')
          .select('id')
          .eq('team_id', entry.team_id)
          .eq('season', entry.season)
          .eq('rank', entry.rank)
          .maybeSingle();
        
        if (existing) {
          // UPDATE existierenden Eintrag
          const { data: updated, error: updateError } = await supabase
            .from('team_roster')
            .update(entry)
            .eq('id', existing.id)
            .select()
            .single();
          
          if (updateError) {
            console.warn(`[parse-team-roster] ⚠️ Fehler beim Update von Rank ${entry.rank}:`, updateError);
          } else {
            savedEntries.push(updated);
            upsertedCount++;
          }
        } else {
          // INSERT neuen Eintrag
          const { data: inserted, error: insertError } = await supabase
            .from('team_roster')
            .insert(entry)
            .select()
            .single();
          
          if (insertError) {
            console.warn(`[parse-team-roster] ⚠️ Fehler beim Insert von Rank ${entry.rank}:`, insertError);
            // Falls es doch ein Duplikat gibt, versuche UPDATE
            if (insertError.code === '23505') { // PostgreSQL duplicate key error
              console.log(`[parse-team-roster] 🔄 Duplikat erkannt, versuche UPDATE für Rank ${entry.rank}...`);
              const { data: updated, error: updateError } = await supabase
                .from('team_roster')
                .update(entry)
                .eq('team_id', entry.team_id)
                .eq('season', entry.season)
                .eq('rank', entry.rank)
                .select()
                .single();
              
              if (updateError) {
                throw updateError;
              }
              savedEntries.push(updated);
              upsertedCount++;
            } else {
              throw insertError;
            }
          } else {
            savedEntries.push(inserted);
            insertedCount++;
          }
        }
      } catch (entryError) {
        console.error(`[parse-team-roster] ❌ Fehler beim Speichern von Rank ${entry.rank}:`, entryError);
        // Continue mit nächstem Eintrag statt komplett zu scheitern
      }
    }
    
    console.log(`[parse-team-roster] ✅ ${savedEntries.length} Spieler in team_roster gespeichert (${insertedCount} neu, ${upsertedCount} aktualisiert, ${matchedCount} mit player_id verknüpft)`);
    return {
      roster: savedEntries,
      stats: {
        total: roster.length,
        saved: savedEntries.length,
        inserted: insertedCount,
        updated: upsertedCount,
        matched: matchedCount,
        unmatched: unmatchedCount
      }
    };
    
  } catch (error) {
    console.error('[parse-team-roster] ❌ Fehler beim Speichern der Meldeliste:', error);
    throw error;
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return withCors(res, 200, {});
  }
  
  if (req.method !== 'POST') {
    return withCors(res, 405, { error: 'Method not allowed' });
  }
  
  try {
    const { teamPortraitUrl, teamId, season, apply = false } = req.body;
    
    if (!teamPortraitUrl) {
      return withCors(res, 400, { error: 'teamPortraitUrl ist erforderlich' });
    }
    
    if (!teamId) {
      return withCors(res, 400, { error: 'teamId ist erforderlich' });
    }
    
    if (!season) {
      return withCors(res, 400, { error: 'season ist erforderlich' });
    }
    
    // Parse Meldeliste
    const roster = await parseTeamPortrait(teamPortraitUrl);
    
    if (roster.length === 0) {
      return withCors(res, 200, {
        success: false,
        error: 'Keine Spieler in der Meldeliste gefunden',
        roster: []
      });
    }
    
    // Wenn apply=false, führe Matching durch und gebe Ergebnisse zurück (für Review)
    let matchingResults = null;
    if (!apply) {
      const supabase = createSupabaseClient();
      matchingResults = [];
      
      for (const player of roster) {
        const matchResult = await matchPlayerToUnified(supabase, player);
        matchingResults.push({
          rosterPlayer: player,
          matchResult: matchResult
        });
        // Kurze Pause zwischen Matches
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    // Speichere in DB wenn apply=true
    // WICHTIG: Verwende Service Role für DB-Schreibvorgänge (umgeht RLS)
    let savedRoster = null;
    if (apply) {
      const supabase = createSupabaseClient(true); // Service Role für DB-Schreibvorgänge
      const result = await saveTeamRoster(supabase, teamId, season, roster);
      savedRoster = result;
    }
    
    return withCors(res, 200, {
      success: true,
      roster,
      matchingResults: !apply ? matchingResults : null, // Matching-Ergebnisse nur bei apply=false
      saved: apply ? savedRoster : null,
      message: apply 
        ? `${savedRoster?.stats?.saved || 0} Spieler erfolgreich gespeichert (${savedRoster?.stats?.inserted || 0} neu, ${savedRoster?.stats?.updated || 0} aktualisiert, ${savedRoster?.stats?.matched || 0} mit players_unified verknüpft)`
        : `${roster.length} Spieler gefunden (Dry-Run, nicht gespeichert)`
    });
    
  } catch (error) {
    console.error('[parse-team-roster] ❌ Fehler:', error);
    return withCors(res, 500, {
      error: error.message || 'Fehler beim Parsen der Meldeliste'
    });
  }
};


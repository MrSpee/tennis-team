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
 * Extrahiert die Club-Nummer aus einer clubPools-URL
 * @param {string} url - z.B. "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154"
 * @returns {string|null} Club-Nummer oder null
 */
function extractClubNumber(url) {
  try {
    const match = url.match(/[?&]club=(\d+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.warn('[parse-club-rosters] ⚠️ Fehler beim Extrahieren der Club-Nummer:', error);
    return null;
  }
}

/**
 * Parst die clubPools-Übersichtsseite und extrahiert alle Teams für eine Saison
 * @param {string} clubPoolsUrl - URL zur clubPools-Seite (z.B. https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154)
 * @param {string} targetSeason - Ziel-Saison (z.B. "Winter 2025/2026")
 * @returns {Promise<Array>} Array von Teams mit ihren Team-Portrait-URLs
 */
async function parseClubPoolsPage(clubPoolsUrl, targetSeason) {
  try {
    console.log(`[parse-club-rosters] 🔍 Lade clubPools-Seite: ${clubPoolsUrl}`);
    
    const response = await fetch(clubPoolsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const teams = [];
    
    // Extrahiere Club-Nummer aus URL
    const clubNumber = extractClubNumber(clubPoolsUrl);
    if (!clubNumber) {
      throw new Error('Club-Nummer konnte nicht aus URL extrahiert werden');
    }
    
    // Extrahiere Vereinsnamen aus HTML
    // Der Vereinsname steht vor "Namentliche Mannschaftsmeldung"
    // Format: "VKC Köln" (dick/fett) gefolgt von "Namentliche Mannschaftsmeldung"
    let clubName = null;
    
    // Pattern 1: Suche nach Text vor "Namentliche Mannschaftsmeldung"
    // Der Vereinsname steht meist in einem <h1>, <h2>, <strong> oder <b> Tag
    const mannschaftsmeldungIndex = html.indexOf('Namentliche Mannschaftsmeldung');
    if (mannschaftsmeldungIndex !== -1) {
      // Suche im Bereich 200 Zeichen vor "Namentliche Mannschaftsmeldung"
      const searchSection = html.substring(Math.max(0, mannschaftsmeldungIndex - 500), mannschaftsmeldungIndex);
      
      // Pattern 1: <h1>Vereinsname</h1>
      const h1Match = searchSection.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (h1Match) {
        clubName = h1Match[1].trim();
        console.log(`[parse-club-rosters] ✅ Vereinsname gefunden (h1): "${clubName}"`);
      }
      
      // Pattern 2: <h2>Vereinsname</h2>
      if (!clubName) {
        const h2Match = searchSection.match(/<h2[^>]*>([^<]+)<\/h2>/i);
        if (h2Match) {
          clubName = h2Match[1].trim();
          console.log(`[parse-club-rosters] ✅ Vereinsname gefunden (h2): "${clubName}"`);
        }
      }
      
      // Pattern 3: <strong>Vereinsname</strong> oder <b>Vereinsname</b>
      if (!clubName) {
        const strongMatch = searchSection.match(/<(?:strong|b)[^>]*>([^<]+)<\/(?:strong|b)>/i);
        if (strongMatch) {
          clubName = strongMatch[1].trim();
          console.log(`[parse-club-rosters] ✅ Vereinsname gefunden (strong/b): "${clubName}"`);
        }
      }
      
      // Pattern 4: Text direkt vor "Namentliche Mannschaftsmeldung" (ohne HTML-Tags)
      if (!clubName) {
        // Entferne HTML-Tags und suche nach Text
        const textOnly = searchSection.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        // Suche nach Großbuchstaben-Wörtern (Vereinsnamen sind meist groß geschrieben)
        const nameMatch = textOnly.match(/([A-ZÄÖÜ][a-zäöüß\s]+(?:[A-ZÄÖÜ][a-zäöüß\s]+)*)\s*Namentliche/i);
        if (nameMatch && nameMatch[1]) {
          clubName = nameMatch[1].trim();
          console.log(`[parse-club-rosters] ✅ Vereinsname gefunden (Text-Pattern): "${clubName}"`);
        }
      }
    }
    
    if (!clubName) {
      console.warn(`[parse-club-rosters] ⚠️ Vereinsname konnte nicht automatisch erkannt werden`);
    }
    
    // Finde den Bereich für die Ziel-Saison
    // Die Saison wird als Überschrift angezeigt, z.B. "Winter 2025/2026"
    // Versuche verschiedene Saison-Formate (z.B. "Winter 2025/2026" vs "Winter 2025/26")
    const normalizedSeason = targetSeason.replace(/\s+/g, ' ').trim();
    let seasonPattern = new RegExp(`<h2[^>]*>\\s*${normalizedSeason.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</h2>`, 'i');
    let seasonMatch = html.match(seasonPattern);
    
    // Fallback: Versuche alternative Saison-Formate
    if (!seasonMatch) {
      // Versuche "Winter 2025/26" statt "Winter 2025/2026"
      const altSeason = normalizedSeason.replace(/(\d{4})\/(\d{4})/, (match, y1, y2) => {
        const shortY2 = y2.substring(2); // "2026" -> "26"
        return `${y1}/${shortY2}`;
      });
      if (altSeason !== normalizedSeason) {
        seasonPattern = new RegExp(`<h2[^>]*>\\s*${altSeason.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</h2>`, 'i');
        seasonMatch = html.match(seasonPattern);
        if (seasonMatch) {
          console.log(`[parse-club-rosters] ✅ Saison mit alternativem Format gefunden: "${altSeason}"`);
        }
      }
    }
    
    // Fallback 2: Versuche umgekehrt (von "2025/26" zu "2025/2026")
    if (!seasonMatch) {
      const altSeason2 = normalizedSeason.replace(/(\d{4})\/(\d{2})/, (match, y1, y2) => {
        const fullY2 = y2.length === 2 ? `20${y2}` : y2; // "26" -> "2026"
        return `${y1}/${fullY2}`;
      });
      if (altSeason2 !== normalizedSeason) {
        seasonPattern = new RegExp(`<h2[^>]*>\\s*${altSeason2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</h2>`, 'i');
        seasonMatch = html.match(seasonPattern);
        if (seasonMatch) {
          console.log(`[parse-club-rosters] ✅ Saison mit alternativem Format gefunden: "${altSeason2}"`);
        }
      }
    }
    
    if (!seasonMatch) {
      console.warn(`[parse-club-rosters] ⚠️ Saison "${targetSeason}" nicht gefunden auf der Seite`);
      // Debug: Zeige verfügbare Saisons
      const allSeasons = html.match(/<h2[^>]*>([^<]+)<\/h2>/gi);
      if (allSeasons) {
        console.warn(`[parse-club-rosters] ⚠️ Verfügbare Saisons auf der Seite:`, allSeasons.map(s => s.replace(/<[^>]+>/g, '')).slice(0, 5));
      }
      return { clubNumber, clubName, teams: [] };
    }
    
    // Extrahiere den Bereich nach der Saison-Überschrift (bis zur nächsten h2 oder Ende)
    const seasonStartIndex = seasonMatch.index + seasonMatch[0].length;
    const nextSectionMatch = html.substring(seasonStartIndex).match(/<h2[^>]*>/);
    const seasonEndIndex = nextSectionMatch 
      ? seasonStartIndex + nextSectionMatch.index 
      : html.length;
    
    const seasonSection = html.substring(seasonStartIndex, seasonEndIndex);
    
    // Finde alle Team-Links in diesem Bereich
    // Format: <a href="/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154&seasonName=Winter+2025%2F2026&contestType=Herren+40">Herren 40</a>
    // Oder: <a href="/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154&amp;seasonName=Winter+2025%2F2026&amp;contestType=Herren+40">Herren 40</a>
    const teamLinkPattern = /<a\s+href="([^"]*clubPools[^"]*seasonName=[^"]*[&amp;]contestType=([^"]+))"[^>]*>([^<]+)<\/a>/gi;
    
    let match;
    const seenTeams = new Set(); // Vermeide Duplikate
    
    while ((match = teamLinkPattern.exec(seasonSection)) !== null) {
      let teamUrl = match[1].replace(/&amp;/g, '&'); // Konvertiere &amp; zu &
      teamUrl = teamUrl.startsWith('http') 
        ? teamUrl 
        : `https://tvm.liga.nu${teamUrl}`;
      const contestType = decodeURIComponent(match[2].replace(/\+/g, ' '));
      const teamName = match[3].trim();
      
      // Vermeide Duplikate
      const teamKey = `${contestType}-${targetSeason}`;
      if (seenTeams.has(teamKey)) {
        continue;
      }
      seenTeams.add(teamKey);
      
      // Parse die Meldeliste direkt von der Team-Detail-Seite
      const roster = await parseRosterFromClubPoolsPage(teamUrl);
      
      // Warnung wenn Roster leer ist
      if (!roster || roster.length === 0) {
        console.warn(`[parse-club-rosters] ⚠️ Keine Spieler für Team "${contestType}" gefunden (URL: ${teamUrl})`);
      } else {
        console.log(`[parse-club-rosters] ✅ ${roster.length} Spieler für Team "${contestType}" gefunden`);
      }
      
      // Kurze Pause zwischen Requests (um nicht als Bot erkannt zu werden)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      teams.push({
        contestType, // z.B. "Herren 40"
        teamName,    // z.B. "Herren 40"
        teamUrl,     // clubPools-URL für dieses Team
        roster: roster || [], // Meldeliste (Array von Spielern) - immer Array, auch wenn leer
        playerCount: roster?.length || 0 // Anzahl Spieler für einfachere Anzeige
      });
    }
    
    console.log(`[parse-club-rosters] ✅ ${teams.length} Teams für Saison "${targetSeason}" gefunden`);
    return { clubNumber, clubName, teams };
    
  } catch (error) {
    console.error('[parse-club-rosters] ❌ Fehler beim Parsen der clubPools-Seite:', error);
    throw error;
  }
}

/**
 * Parst die Meldeliste direkt von einer clubPools Team-Detail-Seite
 * @param {string} teamUrl - URL zur Team-Detail-Seite (clubPools mit contestType)
 * @returns {Promise<Array>} Array von Spielern mit Rang, Name, LK, etc.
 */
async function parseRosterFromClubPoolsPage(teamUrl) {
  try {
    console.log(`[parse-club-rosters] 🔍 Parse Meldeliste von: ${teamUrl}`);
    
    const response = await fetch(teamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.warn(`[parse-club-rosters] ⚠️ HTTP ${response.status} beim Laden der Team-Detail-Seite`);
      return [];
    }
    
    const html = await response.text();
    const roster = [];
    
    // Finde die Spieler-Tabelle: Suche nach Tabelle mit "Rang" und "Mannschaft" Header
    let htmlToParse = html;
    
    // Suche nach Tabelle mit result-set class (die Spieler-Tabelle)
    const tableMatch = html.match(/<table[^>]*class\s*=\s*["']result-set["'][^>]*>([\s\S]*?)<\/table>/i);
    if (tableMatch) {
      console.log(`[parse-club-rosters] ✅ Spieler-Tabelle gefunden (result-set)`);
      htmlToParse = tableMatch[0];
    } else {
      // Fallback: Suche nach <h2>Spieler</h2>
      const spielerHeadingIndex = html.indexOf('<h2>Spieler');
      if (spielerHeadingIndex !== -1) {
        console.log(`[parse-club-rosters] ✅ "Spieler" Überschrift gefunden`);
        const sectionAfterHeading = html.substring(spielerHeadingIndex, spielerHeadingIndex + 50000);
        const tableMatch2 = sectionAfterHeading.match(/<table[^>]*>([\s\S]*?)<\/table>/);
        if (tableMatch2) {
          htmlToParse = tableMatch2[0];
        }
      }
    }
    
    // Pattern für clubPools-Seite: Rang | Mannschaft | LK | ID-Nummer | Name (Jahrgang) | Nation | ...
    // Die Struktur ist: <tr><td>Rang</td><td>Mannschaft</td><td>LK</td><td>ID-Nummer</td><td>Name (Jahrgang)</td>...
    // WICHTIG: <td> Elemente können Whitespace und Zeilenumbrüche enthalten
    // WICHTIG: Das Geburtsjahr steht NACH dem </a> Tag, nicht im <a> Tag!
    // Pattern 1: Vollständige Zeile mit allen Feldern
    // Struktur: <td>Rang</td><td>Mannschaft</td><td>LK</td><td>ID-Nummer</td><td><a>Name</a> (Jahrgang)</td>
    const fullRowPattern = /<tr[^>]*>(?![\s\S]*?<th)[\s\S]*?<td[^>]*>[\s\S]*?(\d{1,2})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(\d+)[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(LK[\d,\.]+)[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(\d{7,})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>([\s\S]*?)<\/td>/gi;
    
    let match;
    while ((match = fullRowPattern.exec(htmlToParse)) !== null) {
      const rank = parseInt(match[1], 10);
      const lk = match[3].trim();
      const tvmId = match[4].trim();
      const name = match[5].trim();
      
      // Geburtsjahr steht NACH dem </a> Tag im selben <td>
      let birthYear = null;
      const nameCellContent = match[6] || ''; // Inhalt nach </a> bis </td>
      const birthMatch = nameCellContent.match(/\((\d{4})\)/);
      if (birthMatch) {
        birthYear = parseInt(birthMatch[1], 10);
      }
      
      // Validierung: Name und TVM-ID müssen vorhanden sein
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
      } else {
        console.warn(`[parse-club-rosters] ⚠️ Ungültige Zeile übersprungen: rank=${rank}, name="${name}", tvmId="${tvmId}"`);
      }
    }
    
    // Pattern 2: Fallback - Vereinfachtes Pattern (ohne Geburtsjahr)
    if (roster.length === 0) {
      console.log('[parse-club-rosters] ⚠️ Vollständiges Pattern hat keine Ergebnisse, versuche vereinfachtes Pattern...');
      const simpleRowPattern = /<tr[^>]*>(?![\s\S]*?<th)[\s\S]*?<td[^>]*>[\s\S]*?(\d{1,2})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(\d+)[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(LK[\d,\.]+)[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(\d{7,})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>([\s\S]*?)<\/td>/gi;
      let simpleMatch;
      
      while ((simpleMatch = simpleRowPattern.exec(htmlToParse)) !== null) {
        const rank = parseInt(simpleMatch[1], 10);
        const lk = simpleMatch[3].trim();
        const tvmId = simpleMatch[4].trim();
        const name = simpleMatch[5].trim();
        
        // Geburtsjahr aus dem Inhalt nach </a> extrahieren
        let birthYear = null;
        const nameCellContent = simpleMatch[6] || '';
        const birthMatch = nameCellContent.match(/\((\d{4})\)/);
        if (birthMatch) {
          birthYear = parseInt(birthMatch[1], 10);
        }
        
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
    
    if (roster.length === 0) {
      console.warn(`[parse-club-rosters] ⚠️ KEINE Spieler aus Meldeliste extrahiert für URL: ${teamUrl}`);
      console.warn(`[parse-club-rosters] ⚠️ HTML-Länge: ${html.length} Zeichen`);
      
      // Debug: Speichere HTML-Snippet für Analyse
      const tableMatchDebug = html.match(/<table[^>]*class\s*=\s*["']result-set["'][^>]*>/i);
      if (!tableMatchDebug) {
        console.warn(`[parse-club-rosters] ⚠️ Keine Tabelle mit class="result-set" gefunden`);
      }
      
      const spielerHeadingDebug = html.indexOf('<h2>Spieler');
      if (spielerHeadingDebug === -1) {
        console.warn(`[parse-club-rosters] ⚠️ Keine "<h2>Spieler</h2>" Überschrift gefunden`);
      }
      
      // Versuche alternative Patterns
      const alternativePatterns = [
        /<tr[^>]*>[\s\S]*?<td[^>]*>(\d+)[\s\S]*?<\/td>[\s\S]*?<td[^>]*>([^<]+)<\/a>/gi,
        /<td[^>]*>(\d{1,2})<\/td>[\s\S]*?<td[^>]*>([^<]+)<\/a>/gi
      ];
      
      for (let i = 0; i < alternativePatterns.length; i++) {
        const altPattern = alternativePatterns[i];
        const altMatches = html.match(altPattern);
        if (altMatches && altMatches.length > 0) {
          console.warn(`[parse-club-rosters] ⚠️ Alternative Pattern ${i + 1} hat ${altMatches.length} Matches gefunden, aber Struktur passt nicht`);
        }
      }
    } else {
      console.log(`[parse-club-rosters] ✅ ${roster.length} Spieler aus Meldeliste extrahiert`);
    }
    
    return roster;
    
  } catch (error) {
    console.error('[parse-club-rosters] ❌ Fehler beim Parsen der Meldeliste:', error);
    console.error('[parse-club-rosters] ❌ URL war:', teamUrl);
    return [];
  }
}

/**
 * Normalisiert Namen für Vergleich (behandelt "Nachname, Vorname" und "Vorname Nachname")
 */
function normalizeNameForComparison(name) {
  if (!name) return '';
  // Entferne Leerzeichen und konvertiere zu lowercase
  const normalized = name.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Wenn Format "Nachname, Vorname" → konvertiere zu "Vorname Nachname"
  const commaMatch = normalized.match(/^([^,]+),\s*(.+)$/);
  if (commaMatch) {
    return `${commaMatch[2]} ${commaMatch[1]}`.trim();
  }
  
  return normalized;
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
    const rosterName = rosterPlayer.name;
    const normalizedRosterName = normalizeNameForComparison(rosterName);
    
    console.log(`[parse-club-rosters] 🔍 Matche Spieler: "${rosterName}" (normalisiert: "${normalizedRosterName}")`);
    
    // 1. TVM-ID Match (falls vorhanden) - HÖCHSTE Priorität (eindeutig!)
    if (rosterPlayer.tvmId) {
      const { data: tvmMatch } = await supabase
        .from('players_unified')
        .select('id, name, tvm_id')
        .eq('tvm_id', rosterPlayer.tvmId)
        .maybeSingle();
      
      if (tvmMatch) {
        console.log(`[parse-club-rosters] ✅ TVM-ID Match gefunden: ${tvmMatch.name} (${tvmMatch.id})`);
        return { playerId: tvmMatch.id, confidence: 100, matchType: 'tvm_id' };
      }
    }
    
    // 2. Lade alle Spieler für Matching
    const { data: allPlayers } = await supabase
      .from('players_unified')
      .select('id, name, current_lk, tvm_id')
      .limit(1000);
    
    if (!allPlayers || allPlayers.length === 0) {
      return { playerId: null, confidence: 0, matchType: 'none' };
    }
    
    // 3. Exakte Übereinstimmung (Name) - auch mit normalisiertem Namen
    const exactMatch = allPlayers.find(p => {
      const normalizedPlayerName = normalizeNameForComparison(p.name);
      return normalizedPlayerName === normalizedRosterName || 
             p.name.toLowerCase() === rosterName.toLowerCase();
    });
    
    if (exactMatch) {
      console.log(`[parse-club-rosters] ✅ Exaktes Match gefunden: ${exactMatch.name} (${exactMatch.id})`);
      return { playerId: exactMatch.id, confidence: 100, matchType: 'exact' };
    }
    
    // 4. Fuzzy-Matching (Name-Ähnlichkeit) mit normalisiertem Namen
    const matches = allPlayers
      .map(player => {
        const normalizedPlayerName = normalizeNameForComparison(player.name);
        const similarity1 = calculateSimilarity(player.name, rosterName);
        const similarity2 = calculateSimilarity(normalizedPlayerName, normalizedRosterName);
        return {
          ...player,
          similarity: Math.max(similarity1, similarity2) // Nimm höchste Similarity
        };
      })
      .filter(m => m.similarity >= 80) // Mindestens 80% Ähnlichkeit
      .sort((a, b) => b.similarity - a.similarity);
    
    if (matches.length > 0) {
      const bestMatch = matches[0];
      console.log(`[parse-club-rosters] 🎯 Fuzzy-Match gefunden: ${bestMatch.name} (${bestMatch.similarity}% Ähnlichkeit)`);
      return { 
        playerId: bestMatch.id, 
        confidence: bestMatch.similarity, 
        matchType: 'fuzzy'
      };
    }
    
    return { playerId: null, confidence: 0, matchType: 'none' };
    
  } catch (error) {
    console.error('[parse-club-rosters] ❌ Fehler beim Fuzzy-Matching:', error);
    return { playerId: null, confidence: 0, matchType: 'error', error: error.message };
  }
}

/**
 * Erstellt oder aktualisiert team_membership für einen Spieler
 * @param {Function} callback - Callback mit (created, updated) Parametern
 */
async function ensureTeamMembership(supabase, playerId, teamId, normalizedSeason, callback = null) {
  try {
    // Prüfe ob team_membership bereits existiert
    const { data: existing, error: checkError } = await supabase
      .from('team_memberships')
      .select('id, is_active')
      .eq('player_id', playerId)
      .eq('team_id', teamId)
      .eq('season', normalizedSeason)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.warn(`[parse-club-rosters] ⚠️ Fehler beim Prüfen der team_membership:`, checkError);
      return false;
    }
    
    if (existing) {
      // Membership existiert bereits - aktiviere sie falls inaktiv
      if (!existing.is_active) {
        const { error: updateError } = await supabase
          .from('team_memberships')
          .update({ is_active: true })
          .eq('id', existing.id);
        
        if (updateError) {
          console.warn(`[parse-club-rosters] ⚠️ Fehler beim Aktivieren der team_membership:`, updateError);
          return false;
        }
        console.log(`[parse-club-rosters] ✅ team_membership aktiviert für Spieler ${playerId} in Team ${teamId}`);
        if (callback) callback(false, true); // updated = true
        return true;
      } else {
        console.log(`[parse-club-rosters] ℹ️ team_membership existiert bereits (aktiv) für Spieler ${playerId} in Team ${teamId}`);
        if (callback) callback(false, false); // weder created noch updated
        return true;
      }
    }
    
    // Prüfe ob Spieler bereits andere Teams in dieser Saison hat (für is_primary)
    const { data: otherMemberships } = await supabase
      .from('team_memberships')
      .select('id, is_primary')
      .eq('player_id', playerId)
      .eq('season', normalizedSeason)
      .eq('is_active', true);
    
    const hasPrimaryTeam = otherMemberships?.some(m => m.is_primary) || false;
    
    // Erstelle neue team_membership
    const { error: insertError } = await supabase
      .from('team_memberships')
      .insert({
        player_id: playerId,
        team_id: teamId,
        season: normalizedSeason,
        role: 'player',
        is_primary: !hasPrimaryTeam, // Erstes Team wird primär
        is_active: true
      });
    
    if (insertError) {
      console.warn(`[parse-club-rosters] ⚠️ Fehler beim Erstellen der team_membership:`, insertError);
      return false;
    }
    
    console.log(`[parse-club-rosters] ✅ team_membership erstellt für Spieler ${playerId} in Team ${teamId} (is_primary: ${!hasPrimaryTeam})`);
    if (callback) callback(true, false); // created = true
    return true;
    
  } catch (error) {
    console.error(`[parse-club-rosters] ❌ Fehler in ensureTeamMembership:`, error);
    return false;
  }
}

/**
 * Speichert die Meldeliste in der Datenbank mit Fuzzy-Matching zu players_unified
 */
async function saveTeamRoster(supabase, teamId, season, roster) {
  try {
    // Normalisiere Saison-Format (konsistent mit DB: "Winter 2025/26")
    const normalizeSeason = (s) => {
      if (!s) return s;
      // Konvertiere "Winter 2025/2026" zu "Winter 2025/26"
      return s.replace(/(\d{4})\/(\d{4})/, (match, y1, y2) => {
        const shortY2 = y2.substring(2); // "2026" -> "26"
        return `${y1}/${shortY2}`;
      });
    };
    
    const normalizedSeason = normalizeSeason(season);
    console.log(`[parse-club-rosters] 💾 Speichere Meldeliste für Team ${teamId}, Saison ${normalizedSeason} (original: ${season})...`);
    
    // Validierung: Roster muss vorhanden sein
    if (!roster || roster.length === 0) {
      throw new Error('Roster ist leer - keine Spieler zum Speichern');
    }
    
    // Lösche alte Einträge für dieses Team/Saison
    const { error: deleteError } = await supabase
      .from('team_roster')
      .delete()
      .eq('team_id', teamId)
      .eq('season', normalizedSeason);
    
    if (deleteError) {
      console.warn('[parse-club-rosters] ⚠️ Fehler beim Löschen alter Einträge:', deleteError);
    }
    
    // Führe Fuzzy-Matching für jeden Spieler durch
    console.log(`[parse-club-rosters] 🔍 Führe Fuzzy-Matching für ${roster.length} Spieler durch...`);
    const rosterEntries = [];
    let matchedCount = 0;
    let unmatchedCount = 0;
    let membershipCreatedCount = 0;
    let membershipUpdatedCount = 0;
    
    for (const player of roster) {
      // Validierung: rank muss positiv sein (Constraint in DB)
      if (!player.rank || player.rank <= 0) {
        console.warn(`[parse-club-rosters] ⚠️ Ungültiger Rang für Spieler "${player.name}": ${player.rank} - überspringe`);
        continue;
      }
      
      // Validierung: name muss vorhanden sein
      if (!player.name || player.name.trim().length < 2) {
        console.warn(`[parse-club-rosters] ⚠️ Ungültiger Name für Spieler mit Rang ${player.rank}: "${player.name}" - überspringe`);
        continue;
      }
      
      const matchResult = await matchPlayerToUnified(supabase, player);
      
      // Wenn Spieler gematcht wurde: Erstelle/aktualisiere team_membership
      if (matchResult.playerId) {
        const membershipResult = await ensureTeamMembership(supabase, matchResult.playerId, teamId, normalizedSeason, (created, updated) => {
          if (created) membershipCreatedCount++;
          if (updated) membershipUpdatedCount++;
        });
      }
      
      rosterEntries.push({
        team_id: teamId,
        season: normalizedSeason, // Verwende normalisierte Saison
        rank: player.rank,
        player_name: player.name.trim(),
        lk: player.lk || null,
        tvm_id: player.tvmId || null,
        birth_year: player.birthYear || null,
        singles_record: player.singles || null,
        doubles_record: player.doubles || null,
        total_record: player.total || null,
        player_id: matchResult.playerId || null
      });
      
      if (matchResult.playerId) {
        matchedCount++;
      } else {
        unmatchedCount++;
      }
      
      // Kurze Pause zwischen Matches
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`[parse-club-rosters] 📊 Matching-Ergebnisse: ${matchedCount} gematcht, ${unmatchedCount} nicht gematcht`);
    
    // Validierung: Mindestens ein Eintrag muss vorhanden sein
    if (rosterEntries.length === 0) {
      throw new Error('Keine gültigen Spieler-Einträge zum Speichern (alle wurden gefiltert)');
    }
    
    // Erstelle neue Einträge
    const { data, error } = await supabase
      .from('team_roster')
      .insert(rosterEntries)
      .select();
    
    if (error) {
      console.error(`[parse-club-rosters] ❌ Fehler beim INSERT in team_roster:`, error);
      console.error(`[parse-club-rosters] ❌ Erste 3 Einträge:`, rosterEntries.slice(0, 3).map(e => ({
        team_id: e.team_id,
        season: e.season,
        rank: e.rank,
        player_name: e.player_name.substring(0, 30)
      })));
      throw new Error(`Fehler beim Speichern in Datenbank: ${error.message} (Code: ${error.code || 'unknown'})`);
    }
    
    console.log(`[parse-club-rosters] ✅ ${data.length} Spieler in team_roster gespeichert (${matchedCount} mit player_id verknüpft, ${unmatchedCount} ohne player_id)`);
    console.log(`[parse-club-rosters] ✅ ${membershipCreatedCount} team_memberships erstellt, ${membershipUpdatedCount} aktualisiert`);
    return {
      roster: data,
      stats: {
        total: rosterEntries.length, // Anzahl tatsächlich gespeicherter Einträge
        matched: matchedCount,
        unmatched: unmatchedCount,
        membershipsCreated: membershipCreatedCount,
        membershipsUpdated: membershipUpdatedCount
      }
    };
    
  } catch (error) {
    console.error('[parse-club-rosters] ❌ Fehler beim Speichern der Meldeliste:', error);
    throw error;
  }
}

/**
 * Speichert die Club-Nummer in team_info
 */
async function saveClubNumber(supabase, clubId, clubNumber) {
  try {
    // Update alle Teams dieses Vereins
    const { error } = await supabase
      .from('team_info')
      .update({ club_number: clubNumber })
      .eq('club_id', clubId);
    
    if (error) {
      throw error;
    }
    
    console.log(`[parse-club-rosters] ✅ Club-Nummer ${clubNumber} für Club ${clubId} gespeichert`);
    return true;
  } catch (error) {
    console.error('[parse-club-rosters] ❌ Fehler beim Speichern der Club-Nummer:', error);
    throw error;
  }
}

// Exportiere Handler als default (für Vercel)
async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return withCors(res, 200, {});
  }
  
  if (req.method !== 'POST') {
    return withCors(res, 405, { error: 'Method not allowed' });
  }
  
  try {
    const { 
      clubPoolsUrl, 
      targetSeason = 'Winter 2025/2026', 
      clubId = null, 
      teamMapping = {}, // { "Herren 40": "team-uuid", ... }
      apply = false 
    } = req.body;
    
    if (!clubPoolsUrl) {
      return withCors(res, 400, { error: 'clubPoolsUrl ist erforderlich' });
    }
    
    // Parse clubPools-Seite
    const { clubNumber, clubName, teams } = await parseClubPoolsPage(clubPoolsUrl, targetSeason);
    
    const results = {
      clubNumber,
      clubName,
      teams: [],
      savedRosters: []
    };
    
    // Speichere Club-Nummer wenn apply=true und clubId vorhanden
    if (apply && clubId && clubNumber) {
      const supabase = createSupabaseClient(true); // Service Role für RLS-Umgehung
      await saveClubNumber(supabase, clubId, clubNumber);
    }
    
    // Speichere Meldelisten wenn apply=true und teamMapping vorhanden
    if (apply && Object.keys(teamMapping).length > 0) {
      const supabase = createSupabaseClient(true); // Service Role für RLS-Umgehung
      const failedRosters = [];
      
      for (const team of teams) {
        const teamId = teamMapping[team.contestType] || teamMapping[team.teamName];
        
        if (!teamId) {
          failedRosters.push({
            teamName: team.teamName,
            contestType: team.contestType,
            reason: 'Kein Team-Mapping gefunden'
          });
          continue;
        }
        
        if (!team.roster || team.roster.length === 0) {
          failedRosters.push({
            teamName: team.teamName,
            contestType: team.contestType,
            teamUrl: team.teamUrl,
            reason: `Keine Spieler in Meldeliste gefunden (${team.roster?.length || 0} Spieler) - Parsing fehlgeschlagen oder Meldeliste leer`
          });
          console.warn(`[parse-club-rosters] ⚠️ Team "${team.contestType}" hat leere Meldeliste - wird nicht gespeichert`);
          continue;
        }
        
        try {
          const savedRoster = await saveTeamRoster(supabase, teamId, targetSeason, team.roster);
          results.savedRosters.push({
            teamName: team.teamName,
            contestType: team.contestType,
            ...savedRoster.stats
          });
        } catch (error) {
          console.error(`[parse-club-rosters] ❌ Fehler beim Speichern der Meldeliste für ${team.teamName}:`, error);
          failedRosters.push({
            teamName: team.teamName,
            contestType: team.contestType,
            reason: `Fehler beim Speichern: ${error.message}`
          });
        }
      }
      
      if (failedRosters.length > 0) {
        results.failedTeams = failedRosters;
      }
    }
    
    // Bereite Response vor
    results.teams = teams.map(team => ({
      contestType: team.contestType,
      teamName: team.teamName,
      teamUrl: team.teamUrl,
      playerCount: team.roster ? team.roster.length : 0,
      roster: apply ? undefined : (team.roster || []) // Nur im Dry-Run die vollständigen Daten senden
    }));
    
    // Erstelle detaillierte Nachricht
    let message = `${teams.length} Teams für Saison "${targetSeason}" gefunden${clubNumber ? ` (Club-Nummer: ${clubNumber})` : ''}`;
    if (apply) {
      if (results.savedRosters && results.savedRosters.length > 0) {
        message += ` - ${results.savedRosters.length} Meldelisten gespeichert`;
      }
      if (results.failedTeams && results.failedTeams.length > 0) {
        message += ` - ⚠️ ${results.failedTeams.length} Teams konnten nicht importiert werden`;
      }
    }
    
    return withCors(res, 200, {
      success: true,
      ...results,
      message
    });
    
  } catch (error) {
    console.error('[parse-club-rosters] ❌ Fehler:', error);
    return withCors(res, 500, {
      error: error.message || 'Fehler beim Parsen der clubPools-Seite'
    });
  }
}

// Exportiere Handler als default (für Vercel)
// UND exportiere Funktionen für Wiederverwendung
const handlerWithExports = handler;
handlerWithExports.parseClubPoolsPage = parseClubPoolsPage;
handlerWithExports.parseRosterFromClubPoolsPage = parseRosterFromClubPoolsPage;
handlerWithExports.saveTeamRoster = saveTeamRoster;
handlerWithExports.saveClubNumber = saveClubNumber;
handlerWithExports.extractClubNumber = extractClubNumber;
module.exports = handlerWithExports;


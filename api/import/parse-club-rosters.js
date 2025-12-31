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
    const teamPromises = []; // Sammle alle Team-Parsing-Promises
    
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
      
      // Sammle Promise für paralleles Parsen (mit Rate-Limiting)
      teamPromises.push(
        (async () => {
          // Parse die Meldeliste direkt von der Team-Detail-Seite
          const roster = await parseRosterFromClubPoolsPage(teamUrl);
          
          // Warnung wenn Roster leer ist
          if (!roster || roster.length === 0) {
            console.warn(`[parse-club-rosters] ⚠️ Keine Spieler für Team "${contestType}" gefunden (URL: ${teamUrl})`);
          } else {
            console.log(`[parse-club-rosters] ✅ ${roster.length} Spieler für Team "${contestType}" gefunden`);
          }
          
          return {
            contestType, // z.B. "Herren 40"
            teamName,    // z.B. "Herren 40"
            teamUrl,     // clubPools-URL für dieses Team
            roster: roster || [], // Meldeliste (Array von Spielern) - immer Array, auch wenn leer
            playerCount: roster?.length || 0 // Anzahl Spieler für einfachere Anzeige
          };
        })()
      );
    }
    
    // ✅ OPTIMIERUNG: Paralleles Parsen mit erhöhter Batch-Größe (max 5 gleichzeitig)
    const BATCH_SIZE = 5; // Erhöht von 3 auf 5 für bessere Performance
    for (let i = 0; i < teamPromises.length; i += BATCH_SIZE) {
      const batch = teamPromises.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch);
      teams.push(...batchResults);
      
      // ✅ OPTIMIERUNG: Reduzierte Pause zwischen Batches (nur wenn nicht letzter Batch)
      if (i + BATCH_SIZE < teamPromises.length) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Reduziert von 300ms auf 100ms
      }
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
    // WICHTIG: Die Spalte "Mannschaft" kommt NACH "Rang" und enthält die Mannschaftsnummer (1, 2, 3, etc.)
    // Pattern 1: Vollständige Zeile mit allen Feldern
    // Struktur: <td>Rang</td><td>Mannschaft</td><td>LK</td><td>ID-Nummer</td><td><a>Name</a> (Jahrgang)</td>
    // Verbessertes Pattern: Erzwinge, dass die 2. Spalte (Mannschaft) eine Zahl ist
    const fullRowPattern = /<tr[^>]*>(?![\s\S]*?<th)[\s\S]*?<td[^>]*>[\s\S]*?(\d{1,2})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(\d{1,2})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(LK[\d,\.]+)[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(\d{7,})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>([\s\S]*?)<\/td>/gi;
    
    let match;
    while ((match = fullRowPattern.exec(htmlToParse)) !== null) {
      const rank = parseInt(match[1], 10);
      const teamNumber = parseInt(match[2], 10); // Mannschaftsnummer (1, 2, 3, etc.) - WICHTIG: Aus Spalte "Mannschaft"
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
      
      // Validierung: Name, TVM-ID und teamNumber müssen vorhanden sein
      if (name && name.length > 2 && tvmId && tvmId.match(/^\d+$/) && teamNumber && teamNumber > 0) {
        roster.push({
          rank,
          teamNumber, // Mannschaftsnummer (1, 2, 3, etc.) - WICHTIG: Aus Spalte "Mannschaft"
          name,
          lk: lk.startsWith('LK') ? lk : `LK ${lk}`,
          tvmId,
          birthYear,
          singles: null,
          doubles: null,
          total: null
        });
        console.log(`[parse-club-rosters] ✅ Spieler geparst: ${name} (Rang ${rank}, Mannschaft ${teamNumber}, LK ${lk}, TVM-ID ${tvmId})`);
      } else {
        console.warn(`[parse-club-rosters] ⚠️ Ungültige Zeile übersprungen: rank=${rank}, teamNumber=${teamNumber}, name="${name}", tvmId="${tvmId}"`);
      }
    }
    
    // Pattern 2: Fallback - Vereinfachtes Pattern (ohne Geburtsjahr)
    if (roster.length === 0) {
      console.log('[parse-club-rosters] ⚠️ Vollständiges Pattern hat keine Ergebnisse, versuche vereinfachtes Pattern...');
      const simpleRowPattern = /<tr[^>]*>(?![\s\S]*?<th)[\s\S]*?<td[^>]*>[\s\S]*?(\d{1,2})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(\d{1,2})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(LK[\d,\.]+)[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(\d{7,})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>([\s\S]*?)<\/td>/gi;
      let simpleMatch;
      
      while ((simpleMatch = simpleRowPattern.exec(htmlToParse)) !== null) {
        const rank = parseInt(simpleMatch[1], 10);
        const teamNumber = parseInt(simpleMatch[2], 10); // Mannschaftsnummer (1, 2, 3, etc.) - WICHTIG: Aus Spalte "Mannschaft"
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
        
        if (name && name.length > 2 && tvmId && tvmId.match(/^\d+$/) && teamNumber && teamNumber > 0) {
          roster.push({
            rank,
            teamNumber, // Mannschaftsnummer (1, 2, 3, etc.) - WICHTIG: Aus Spalte "Mannschaft"
            name,
            lk: lk.startsWith('LK') ? lk : `LK ${lk}`,
            tvmId,
            birthYear,
            singles: null,
            doubles: null,
            total: null
          });
          console.log(`[parse-club-rosters] ✅ Spieler geparst (Fallback): ${name} (Rang ${rank}, Mannschaft ${teamNumber}, LK ${lk}, TVM-ID ${tvmId})`);
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
 * OPTIMIERT: Nutzt bereits geladene Spieler-Liste (playerCache) für bessere Performance
 */
async function matchPlayerToUnified(supabase, rosterPlayer, playerCache = null) {
  try {
    const rosterName = rosterPlayer.name;
    const normalizedRosterName = normalizeNameForComparison(rosterName);
    
    // 1. TVM-ID Match (falls vorhanden) - HÖCHSTE Priorität (eindeutig!)
    // Wenn mehrere Spieler die gleiche TVM-ID haben, bevorzuge den mit App-Account
    if (rosterPlayer.tvmId) {
      // Wenn Cache vorhanden, suche dort zuerst
      if (playerCache) {
        const tvmMatches = playerCache.filter(p => p.tvm_id === rosterPlayer.tvmId || p.tvm_id_number === rosterPlayer.tvmId);
        if (tvmMatches.length > 0) {
          // PRIORITÄT: Bevorzuge Spieler MIT App-Account
          tvmMatches.sort((a, b) => {
            if (a.user_id && !b.user_id) return -1;
            if (!a.user_id && b.user_id) return 1;
            return 0;
          });
          const tvmMatch = tvmMatches[0];
          return { 
            playerId: tvmMatch.id, 
            confidence: 100, 
            matchType: 'tvm_id',
            hasUserAccount: !!tvmMatch.user_id 
          };
        }
      }
      
      // Fallback: DB-Query nur wenn nicht im Cache
      const { data: tvmMatchesAll } = await supabase
        .from('players_unified')
        .select('id, name, tvm_id, tvm_id_number, user_id, email')
        .or(`tvm_id.eq.${rosterPlayer.tvmId},tvm_id_number.eq.${rosterPlayer.tvmId}`);
      
      if (tvmMatchesAll && tvmMatchesAll.length > 0) {
        // PRIORITÄT: Bevorzuge Spieler MIT App-Account
        tvmMatchesAll.sort((a, b) => {
          if (a.user_id && !b.user_id) return -1;
          if (!a.user_id && b.user_id) return 1;
          return 0;
        });
        const tvmMatch = tvmMatchesAll[0];
        console.log(`[parse-club-rosters] ✅ TVM-ID Match gefunden: ${tvmMatch.name} (${tvmMatch.id})${tvmMatch.user_id ? ' [HAT APP-ACCOUNT]' : ''}`);
        return { 
          playerId: tvmMatch.id, 
          confidence: 100, 
          matchType: 'tvm_id',
          hasUserAccount: !!tvmMatch.user_id 
        };
      }
    }
    
    // 2. Verwende Cache oder lade Spieler (nur einmal!)
    let allPlayers = playerCache;
    if (!allPlayers) {
      const { data: players } = await supabase
        .from('players_unified')
        .select('id, name, current_lk, tvm_id, tvm_id_number, user_id, email')
        .limit(1000);
      allPlayers = players || [];
    }
    
    if (!allPlayers || allPlayers.length === 0) {
      return { playerId: null, confidence: 0, matchType: 'none' };
    }
    
    // 3. Exakte Übereinstimmung (Name) - auch mit normalisiertem Namen
    // PRIORITÄT: Bevorzuge Spieler MIT App-Account
    const exactMatches = allPlayers.filter(p => {
      const normalizedPlayerName = normalizeNameForComparison(p.name);
      return normalizedPlayerName === normalizedRosterName || 
             p.name.toLowerCase() === rosterName.toLowerCase();
    });
    
    if (exactMatches.length > 0) {
      // Sortiere: zuerst Spieler mit user_id, dann ohne
      exactMatches.sort((a, b) => {
        if (a.user_id && !b.user_id) return -1;
        if (!a.user_id && b.user_id) return 1;
        return 0;
      });
      const exactMatch = exactMatches[0];
      console.log(`[parse-club-rosters] ✅ Exaktes Match gefunden: ${exactMatch.name} (${exactMatch.id})${exactMatch.user_id ? ' [HAT APP-ACCOUNT]' : ''}`);
      return { 
        playerId: exactMatch.id, 
        confidence: 100, 
        matchType: 'exact',
        hasUserAccount: !!exactMatch.user_id 
      };
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
      .sort((a, b) => {
        // PRIORITÄT: Erst nach user_id (App-Account), dann nach Similarity
        if (a.user_id && !b.user_id) return -1;
        if (!a.user_id && b.user_id) return 1;
        return b.similarity - a.similarity;
      });
    
    if (matches.length > 0) {
      const bestMatch = matches[0];
      console.log(`[parse-club-rosters] 🎯 Fuzzy-Match gefunden: ${bestMatch.name} (${bestMatch.similarity}% Ähnlichkeit)${bestMatch.user_id ? ' [HAT APP-ACCOUNT]' : ''}`);
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
    
    return { playerId: null, confidence: 0, matchType: 'none' };
    
  } catch (error) {
    console.error('[parse-club-rosters] ❌ Fehler beim Fuzzy-Matching:', error);
    return { playerId: null, confidence: 0, matchType: 'error', error: error.message };
  }
}

/**
 * Erstellt oder aktualisiert team_membership für einen Spieler
 * Berücksichtigt die DTB-Wettspielordnung:
 * - Ein Spieler darf nicht in derselben Altersklasse für zwei verschiedene Mannschaften im selben Wettbewerb spielen
 * - Die Meldeliste ist die Quelle der Wahrheit - wenn ein Spieler auf einer Meldeliste steht, ist er für dieses Team spielberechtigt
 * 
 * @param {Function} callback - Callback mit (created, updated) Parametern
 */
async function ensureTeamMembership(supabase, playerId, teamId, normalizedSeason, teamCategory, callback = null, teamInfoCache = null) {
  try {
    // ✅ OPTIMIERUNG: Verwende Team-Info aus Cache, falls vorhanden
    let teamInfo = teamInfoCache;
    if (!teamInfo) {
      // Fallback: Lade Team-Info nur wenn nicht im Cache
      const { data: loadedTeamInfo } = await supabase
        .from('team_info')
        .select('id, category, club_id')
        .eq('id', teamId)
        .single();
      
      if (!loadedTeamInfo) {
        console.warn(`[parse-club-rosters] ⚠️ Team ${teamId} nicht gefunden`);
        return false;
      }
      teamInfo = loadedTeamInfo;
    }
    
    const teamCategoryToUse = teamCategory || teamInfo.category;
    const teamClubId = teamInfo.club_id;
    
    // Prüfe ob team_membership bereits existiert
    const { data: existing, error: checkError } = await supabase
      .from('team_memberships')
      .select('id, is_active, team_id')
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
    
    // WICHTIG: Prüfe auf Konflikte gemäß DTB-Wettspielordnung
    // Ein Spieler darf nicht in derselben Altersklasse für zwei verschiedene Mannschaften im selben Wettbewerb spielen
    // Lade alle aktiven Memberships des Spielers in dieser Saison
    const { data: allActiveMemberships } = await supabase
      .from('team_memberships')
      .select(`
        id,
        team_id,
        is_active,
        team_info:team_id (
          id,
          category,
          club_id
        )
      `)
      .eq('player_id', playerId)
      .eq('season', normalizedSeason)
      .eq('is_active', true);
    
    // Prüfe auf Konflikte: Gleiche Kategorie + gleicher Verein = Konflikt!
    if (allActiveMemberships && allActiveMemberships.length > 0) {
      for (const membership of allActiveMemberships) {
        const otherTeam = membership.team_info;
        if (otherTeam && 
            otherTeam.category === teamCategoryToUse && 
            otherTeam.club_id === teamClubId &&
            otherTeam.id !== teamId) {
          // KONFLIKT: Spieler ist bereits für ein anderes Team derselben Kategorie im selben Verein gemeldet
          console.warn(`[parse-club-rosters] ⚠️ WETTSPIELORDNUNG: Spieler ${playerId} ist bereits für Team ${otherTeam.id} (${teamCategoryToUse}) gemeldet. Deaktiviere alte Zuordnung, da Meldeliste die Quelle der Wahrheit ist.`);
          
          // Deaktiviere alte Zuordnung (Meldeliste hat Priorität!)
          const { error: deactivateError } = await supabase
            .from('team_memberships')
            .update({ is_active: false })
            .eq('id', membership.id);
          
          if (deactivateError) {
            console.warn(`[parse-club-rosters] ⚠️ Fehler beim Deaktivieren der alten team_membership:`, deactivateError);
          } else {
            console.log(`[parse-club-rosters] ✅ Alte team_membership deaktiviert (Team ${otherTeam.id})`);
          }
        }
      }
    }
    
    // Prüfe ob Spieler bereits andere Teams in dieser Saison hat (für is_primary)
    // Jetzt nur noch aktive Memberships (nach Konfliktbereinigung)
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
 * Erstellt automatisch ein Team, wenn es nicht existiert
 * @param {Object} supabase - Supabase Client
 * @param {string} clubId - Club-ID
 * @param {string} contestType - Kategorie (z.B. "Herren 40", "Damen 30")
 * @param {string|number} teamNumber - Mannschaftsnummer (z.B. "1", "2")
 * @param {string} clubName - Name des Clubs (für Fallback)
 * @returns {Promise<string|null>} Team-ID oder null bei Fehler
 */
async function createTeamIfNotExists(supabase, clubId, contestType, teamNumber, clubName, targetSeason = null) {
  try {
    if (!clubId) {
      console.warn(`[parse-club-rosters] ⚠️ Keine clubId vorhanden, kann Team nicht erstellen`);
      return null;
    }
    
    // Normalisiere teamNumber zu String
    const teamNumberStr = String(teamNumber || '1').trim();
    
    console.log(`[parse-club-rosters] ➕ Erstelle Team: ${contestType} Mannschaft ${teamNumberStr} für Club ${clubId}`);
    
    // ✅ WICHTIG: Verwende RPC-Funktion für Team-Erstellung (umgeht RLS und nutzt bestehende Datenbank-Logik)
    // Prüfe zuerst, ob Team bereits existiert
    const { data: existingTeam } = await supabase
      .from('team_info')
      .select('id')
      .eq('club_id', clubId)
      .eq('category', contestType)
      .eq('team_name', teamNumberStr)
      .maybeSingle();
    
    if (existingTeam) {
      console.log(`[parse-club-rosters] ✅ Team existiert bereits: ${existingTeam.id} (${contestType} Mannschaft ${teamNumberStr})`);
      return existingTeam.id;
    }
    
    // Hole Club-Name für Fallback
    const { data: clubData } = await supabase
      .from('club_info')
      .select('name')
      .eq('id', clubId)
      .single();
    
    const clubNameForTeam = clubData?.name || clubName || 'Unbekannt';
    
    // Erstelle Team via RPC-Funktion (nutzt bestehende Datenbank-Funktion)
    console.log(`[parse-club-rosters] ➕ Erstelle Team via RPC: ${contestType} Mannschaft ${teamNumberStr}`);
    const { data: newTeam, error: createError } = await supabase
      .rpc('create_team_as_super_admin', {
        p_team_name: teamNumberStr,
        p_category: contestType,
        p_club_id: clubId,
        p_region: 'Mittelrhein',
        p_tvm_link: null
      });
    
    if (createError) {
      console.error(`[parse-club-rosters] ❌ Fehler beim Erstellen des Teams via RPC:`, createError);
      console.log(`[parse-club-rosters] 🔄 Versuche Fallback: Direktes INSERT mit Service Role`);
      
      // Fallback: Direktes INSERT mit Service Role (umgeht RLS komplett)
      // Prüfe nochmal ob Team existiert (könnte zwischenzeitlich erstellt worden sein)
      const { data: fallbackCheckTeam } = await supabase
        .from('team_info')
        .select('id')
        .eq('club_id', clubId)
        .eq('category', contestType)
        .eq('team_name', teamNumberStr)
        .maybeSingle();
      
      if (fallbackCheckTeam) {
        console.log(`[parse-club-rosters] ✅ Team gefunden (Fallback-Check): ${fallbackCheckTeam.id}`);
        return fallbackCheckTeam.id;
      }
      
      // Versuche direktes INSERT (Service Role sollte RLS umgehen)
      const { data: insertedTeam, error: insertError } = await supabase
        .from('team_info')
        .insert({
          team_name: teamNumberStr,
          category: contestType,
          club_id: clubId,
          club_name: clubNameForTeam,
          region: 'Mittelrhein',
          tvm_link: null
        })
        .select('id')
        .single();
      
      if (insertError) {
        console.error(`[parse-club-rosters] ❌ Fehler beim direkten INSERT:`, insertError);
        return null;
      }
      
      console.log(`[parse-club-rosters] ✅ Team erstellt via direkten INSERT: ${insertedTeam.id}`);
      return insertedTeam.id;
    }
    
    // RPC gibt Array zurück, nimm ersten Eintrag
    const team = Array.isArray(newTeam) ? newTeam[0] : newTeam;
    const teamId = team?.id || null;
    
    if (!teamId) {
      console.error(`[parse-club-rosters] ❌ RPC-Funktion gab keine Team-ID zurück`);
      return null;
    }
    
    console.log(`[parse-club-rosters] ✅ Team erstellt via RPC: ${teamId} (${contestType} Mannschaft ${teamNumberStr})`);
    
    // Erstelle auch team_seasons Eintrag wenn targetSeason vorhanden
    if (targetSeason) {
      // Normalisiere Saison-Format (konsistent mit DB: "Winter 2025/26")
      const normalizeSeason = (s) => {
        if (!s) return s;
        // Konvertiere "Winter 2025/2026" zu "Winter 2025/26"
        return s.replace(/(\d{4})\/(\d{4})/, (match, year1, year2) => {
          return `${year1}/${year2.slice(2)}`;
        });
      };
      
      const normalizedSeason = normalizeSeason(targetSeason);
      
      // Prüfe ob team_seasons Eintrag bereits existiert
      const { data: existingSeason } = await supabase
        .from('team_seasons')
        .select('id')
        .eq('team_id', teamId)
        .eq('season', normalizedSeason)
        .maybeSingle();
      
      if (!existingSeason) {
        const { error: seasonError } = await supabase
          .from('team_seasons')
          .insert({
            team_id: teamId,
            season: normalizedSeason,
            is_active: true,
            league: 'Automatisch erstellt', // Platzhalter
            group_name: 'Automatisch erstellt' // Platzhalter
          });
        
        if (seasonError) {
          console.warn(`[parse-club-rosters] ⚠️ Fehler beim Erstellen von team_seasons:`, seasonError);
        } else {
          console.log(`[parse-club-rosters] ✅ team_seasons Eintrag für Team ${teamId} Saison ${normalizedSeason} erstellt`);
        }
      }
    }
    
    return teamId; // ✅ Korrigiert: Verwende teamId statt newTeam.id
    
  } catch (error) {
    console.error(`[parse-club-rosters] ❌ Fehler in createTeamIfNotExists:`, error);
    return null;
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
    
    // ✅ OPTIMIERUNG: Lade Team-Info EINMAL (nicht für jeden Spieler)
    const { data: teamInfo } = await supabase
      .from('team_info')
      .select('category')
      .eq('id', teamId)
      .single();
    
    const teamCategory = teamInfo?.category || null;
    
    // ✅ OPTIMIERUNG: Lade alle Spieler EINMAL für Batch-Matching
    console.log(`[parse-club-rosters] 🔍 Lade Spieler-Cache für Batch-Matching...`);
    const { data: allPlayers } = await supabase
      .from('players_unified')
      .select('id, name, current_lk, tvm_id')
      .limit(1000);
    
    const playerCache = allPlayers || [];
    console.log(`[parse-club-rosters] ✅ ${playerCache.length} Spieler im Cache geladen`);
    
    // ✅ OPTIMIERUNG: Batch-Matching ohne sequenzielle Pausen
    console.log(`[parse-club-rosters] 🔍 Führe Batch-Matching für ${roster.length} Spieler durch...`);
    const rosterEntries = [];
    const matchResults = [];
    let matchedCount = 0;
    let unmatchedCount = 0;
    let membershipCreatedCount = 0;
    let membershipUpdatedCount = 0;
    
    // Validiere und matche alle Spieler parallel
    const validPlayers = roster.filter(player => {
      if (!player.rank || player.rank <= 0) {
        console.warn(`[parse-club-rosters] ⚠️ Ungültiger Rang für Spieler "${player.name}": ${player.rank} - überspringe`);
        return false;
      }
      if (!player.name || player.name.trim().length < 2) {
        console.warn(`[parse-club-rosters] ⚠️ Ungültiger Name für Spieler mit Rang ${player.rank}: "${player.name}" - überspringe`);
        return false;
      }
      return true;
    });
    
    // Matche alle Spieler parallel (ohne Pausen)
    const matchPromises = validPlayers.map(player => 
      matchPlayerToUnified(supabase, player, playerCache)
    );
    const matchResultsArray = await Promise.all(matchPromises);
    
    // Verarbeite Ergebnisse und erstelle rosterEntries
    for (let i = 0; i < validPlayers.length; i++) {
      const player = validPlayers[i];
      const matchResult = matchResultsArray[i];
      
      rosterEntries.push({
        team_id: teamId,
        season: normalizedSeason,
        rank: player.rank,
        team_number: player.teamNumber || null,
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
        matchResults.push({ player, matchResult });
      } else {
        unmatchedCount++;
      }
    }
    
    // ✅ OPTIMIERUNG: Erstelle team_memberships in Batches (reduziert DB-Queries)
    // Übergebe Team-Info als Cache, um redundante DB-Queries zu vermeiden
    console.log(`[parse-club-rosters] 🔗 Erstelle team_memberships für ${matchResults.length} gematchte Spieler...`);
    
    // ✅ BATCH-OPTIMIERUNG: Prüfe alle Memberships auf einmal
    if (matchResults.length > 0) {
      const playerIds = matchResults.map(({ matchResult }) => matchResult.playerId).filter(Boolean);
      
      // Lade alle existierenden Memberships für diese Spieler auf einmal
      const { data: existingMemberships } = await supabase
        .from('team_memberships')
        .select('id, player_id, team_id, is_active, is_primary')
        .in('player_id', playerIds)
        .eq('team_id', teamId)
        .eq('season', normalizedSeason);
      
      // Erstelle Map für schnellen Lookup
      const membershipMap = new Map();
      (existingMemberships || []).forEach(m => {
        const key = `${m.player_id}::${m.team_id}::${normalizedSeason}`;
        membershipMap.set(key, m);
      });
      
      // Lade alle aktiven Memberships für Konfliktprüfung (batch)
      const { data: allActiveMemberships } = await supabase
        .from('team_memberships')
        .select(`
          id,
          player_id,
          team_id,
          is_active,
          team_info:team_id (
            id,
            category,
            club_id
          )
        `)
        .in('player_id', playerIds)
        .eq('season', normalizedSeason)
        .eq('is_active', true);
      
      // Gruppiere nach player_id für schnellen Lookup
      const activeMembershipsByPlayer = new Map();
      (allActiveMemberships || []).forEach(m => {
        if (!activeMembershipsByPlayer.has(m.player_id)) {
          activeMembershipsByPlayer.set(m.player_id, []);
        }
        activeMembershipsByPlayer.get(m.player_id).push(m);
      });
      
      // Verarbeite alle Spieler mit Batch-Queries
      const membershipInserts = [];
      const membershipUpdates = [];
      
      for (const { player, matchResult } of matchResults) {
        if (!matchResult.playerId) continue;
        
        const membershipKey = `${matchResult.playerId}::${teamId}::${normalizedSeason}`;
        const existing = membershipMap.get(membershipKey);
        
        if (existing) {
          // Membership existiert bereits
          if (!existing.is_active) {
            membershipUpdates.push({ id: existing.id, is_active: true });
            membershipUpdatedCount++;
          }
          // Sonst: bereits aktiv, nichts zu tun
        } else {
          // Prüfe Konflikte (vereinfacht - nur für diesen Spieler)
          const playerActiveMemberships = activeMembershipsByPlayer.get(matchResult.playerId) || [];
          const hasConflict = playerActiveMemberships.some(m => {
            const otherTeam = m.team_info;
            return otherTeam && 
                   otherTeam.category === teamCategory && 
                   otherTeam.club_id === teamInfo.club_id &&
                   otherTeam.id !== teamId;
          });
          
          // Deaktiviere Konflikte (batch)
          if (hasConflict) {
            const conflictIds = playerActiveMemberships
              .filter(m => {
                const otherTeam = m.team_info;
                return otherTeam && 
                       otherTeam.category === teamCategory && 
                       otherTeam.club_id === teamInfo.club_id &&
                       otherTeam.id !== teamId;
              })
              .map(m => m.id);
            
            if (conflictIds.length > 0) {
              await supabase
                .from('team_memberships')
                .update({ is_active: false })
                .in('id', conflictIds);
            }
          }
          
          // Prüfe is_primary (vereinfacht: erstes Team wird primär)
          const hasPrimary = playerActiveMemberships.some(m => m.is_primary && m.team_id !== teamId);
          
          // Füge zu Insert-Liste hinzu
          membershipInserts.push({
            player_id: matchResult.playerId,
            team_id: teamId,
            season: normalizedSeason,
            role: 'player',
            is_primary: !hasPrimary,
            is_active: true
          });
          membershipCreatedCount++;
        }
      }
      
      // ✅ BATCH-INSERT: Erstelle alle neuen Memberships auf einmal
      if (membershipInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('team_memberships')
          .insert(membershipInserts);
        
        if (insertError) {
          console.warn(`[parse-club-rosters] ⚠️ Fehler beim Batch-Insert von team_memberships:`, insertError);
        } else {
          console.log(`[parse-club-rosters] ✅ ${membershipInserts.length} team_memberships per Batch-Insert erstellt`);
        }
      }
      
      // ✅ BATCH-UPDATE: Aktiviere alle inaktiven Memberships auf einmal
      if (membershipUpdates.length > 0) {
        // Supabase unterstützt kein Batch-Update, daher einzeln (aber parallel)
        const updatePromises = membershipUpdates.map(update =>
          supabase
            .from('team_memberships')
            .update({ is_active: true })
            .eq('id', update.id)
        );
        await Promise.all(updatePromises);
        console.log(`[parse-club-rosters] ✅ ${membershipUpdates.length} team_memberships per Batch-Update aktiviert`);
      }
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
    
    // clubId wird für Team-Matching benötigt
    // Wenn nicht übergeben, versuche es aus clubNumber oder clubName zu finden
    let effectiveClubId = clubId;
    
    if (!effectiveClubId && (clubNumber || clubName)) {
      const supabase = createSupabaseClient(true);
      
      // Versuche zuerst über club_number
      if (clubNumber) {
        const { data: clubByNumber } = await supabase
          .from('team_info')
          .select('club_id')
          .eq('club_number', clubNumber)
          .limit(1)
          .maybeSingle();
        
        if (clubByNumber?.club_id) {
          effectiveClubId = clubByNumber.club_id;
          console.log(`[parse-club-rosters] ✅ Club-ID gefunden via club_number: ${effectiveClubId}`);
        }
      }
      
      // Fallback: Suche über club_name
      if (!effectiveClubId && clubName) {
        const { data: clubByName } = await supabase
          .from('club_info')
          .select('id')
          .ilike('name', `%${clubName}%`)
          .limit(1)
          .maybeSingle();
        
        if (clubByName?.id) {
          effectiveClubId = clubByName.id;
          console.log(`[parse-club-rosters] ✅ Club-ID gefunden via club_name: ${effectiveClubId}`);
        }
      }
      
      if (!effectiveClubId) {
        console.warn(`[parse-club-rosters] ⚠️ Keine Club-ID gefunden für "${clubName}" (club_number: ${clubNumber}). Teams können nicht automatisch erstellt werden.`);
      }
    }
    
    // Speichere Club-Nummer wenn apply=true und clubId vorhanden
    if (apply && effectiveClubId && clubNumber) {
      const supabase = createSupabaseClient(true); // Service Role für RLS-Umgehung
      await saveClubNumber(supabase, effectiveClubId, clubNumber);
    }
    
    // Speichere Meldelisten wenn apply=true (teamMapping ist optional, Teams werden automatisch erstellt wenn nicht vorhanden)
    if (apply) {
      const supabase = createSupabaseClient(true); // Service Role für RLS-Umgehung
      const failedRosters = [];
      
      for (const team of teams) {
        // Gruppiere Roster nach Mannschaftsnummer (team_number)
        const rosterByTeamNumber = {};
        if (team.roster && team.roster.length > 0) {
          for (const player of team.roster) {
            const teamNum = player.teamNumber || 1; // Fallback: 1 wenn nicht vorhanden
            if (!rosterByTeamNumber[teamNum]) {
              rosterByTeamNumber[teamNum] = [];
            }
            rosterByTeamNumber[teamNum].push(player);
          }
        }
        
        // Für jede Mannschaftsnummer: Finde das richtige Team und speichere
        for (const [teamNumber, rosterForTeam] of Object.entries(rosterByTeamNumber)) {
          // Versuche Team-Mapping basierend auf contestType + teamNumber
          // z.B. "Herren 50" + "1" → Suche nach Team mit category="Herren 50" und team_name="1"
          let teamId = null;
          
          // Strategie 1: Direktes Mapping über contestType-teamNumber (z.B. "Herren 50-1")
          const teamKey = `${team.contestType}-${teamNumber}`;
          teamId = teamMapping[teamKey] || teamMapping[team.contestType] || teamMapping[team.teamName];
          
          // Strategie 2: Wenn mehrere Teams in derselben Kategorie, suche nach team_name
          if (!teamId || Object.keys(rosterByTeamNumber).length > 1) {
            // Lade alle Teams dieser Kategorie für diesen Club
            let categoryTeamsQuery = supabase
              .from('team_info')
              .select('id, team_name, category')
              .eq('category', team.contestType);
            
            if (effectiveClubId) {
              categoryTeamsQuery = categoryTeamsQuery.eq('club_id', effectiveClubId);
            }
            
            const { data: categoryTeams } = await categoryTeamsQuery;
            
            if (categoryTeams && categoryTeams.length > 0) {
              // Suche nach Team mit passender team_name
              const matchingTeam = categoryTeams.find(t => 
                t.team_name === teamNumber.toString() || 
                t.team_name === teamNumber
              );
              
              if (matchingTeam) {
                teamId = matchingTeam.id;
                console.log(`[parse-club-rosters] ✅ Team gefunden für "${team.contestType}" Mannschaft ${teamNumber}: ${matchingTeam.id}`);
              } else if (categoryTeams.length === 1) {
                // Nur ein Team in dieser Kategorie → verwende es
                teamId = categoryTeams[0].id;
                console.log(`[parse-club-rosters] ℹ️ Nur ein Team in "${team.contestType}" gefunden, verwende es für alle Mannschaften`);
              }
            }
          }
          
          // Strategie 3: Automatisch Team erstellen, wenn nicht gefunden
          if (!teamId && effectiveClubId) {
            console.log(`[parse-club-rosters] ➕ Erstelle automatisch Team für "${team.contestType}" Mannschaft ${teamNumber}`);
            teamId = await createTeamIfNotExists(
              supabase, 
              effectiveClubId, 
              team.contestType, 
              teamNumber, 
              clubName,
              targetSeason // ✅ WICHTIG: Übergebe targetSeason für team_seasons Erstellung
            );
            
            if (teamId) {
              console.log(`[parse-club-rosters] ✅ Team automatisch erstellt: ${teamId}`);
              
              // Erstelle auch team_seasons Eintrag für das neue Team
              const normalizeSeason = (s) => {
                if (!s) return s;
                return s.replace(/(\d{4})\/(\d{4})/, (match, year1, year2) => {
                  return `${year1}/${year2.slice(2)}`;
                });
              };
              
              const normalizedSeason = normalizeSeason(targetSeason);
              
              // Prüfe ob team_seasons Eintrag bereits existiert
              const { data: existingSeason } = await supabase
                .from('team_seasons')
                .select('id')
                .eq('team_id', teamId)
                .eq('season', normalizedSeason)
                .maybeSingle();
              
              if (!existingSeason) {
                const { error: seasonError } = await supabase
                  .from('team_seasons')
                  .insert({
                    team_id: teamId,
                    season: normalizedSeason,
                    is_active: true
                  });
                
                if (seasonError) {
                  console.warn(`[parse-club-rosters] ⚠️ Fehler beim Erstellen von team_seasons:`, seasonError);
                } else {
                  console.log(`[parse-club-rosters] ✅ team_seasons Eintrag erstellt für Team ${teamId}, Saison ${normalizedSeason}`);
                }
              }
            } else {
              failedRosters.push({
                teamName: `${team.teamName} (Mannschaft ${teamNumber})`,
                contestType: team.contestType,
                teamNumber: parseInt(teamNumber),
                reason: `Team konnte nicht erstellt werden für "${team.contestType}" Mannschaft ${teamNumber}`
              });
              console.warn(`[parse-club-rosters] ⚠️ Team konnte nicht erstellt werden für "${team.contestType}" Mannschaft ${teamNumber}`);
              continue;
            }
          } else if (!teamId) {
            failedRosters.push({
              teamName: `${team.teamName} (Mannschaft ${teamNumber})`,
              contestType: team.contestType,
              teamNumber: parseInt(teamNumber),
              reason: `Kein Team-Mapping gefunden und keine clubId vorhanden für "${team.contestType}" Mannschaft ${teamNumber}`
            });
            console.warn(`[parse-club-rosters] ⚠️ Kein Team gefunden und keine clubId für "${team.contestType}" Mannschaft ${teamNumber}`);
            continue;
          }
          
          if (!rosterForTeam || rosterForTeam.length === 0) {
            failedRosters.push({
              teamName: `${team.teamName} (Mannschaft ${teamNumber})`,
              contestType: team.contestType,
              teamNumber: parseInt(teamNumber),
              reason: `Keine Spieler in Meldeliste gefunden (${rosterForTeam?.length || 0} Spieler)`
            });
            continue;
          }
          
          try {
            const savedRoster = await saveTeamRoster(supabase, teamId, targetSeason, rosterForTeam);
            results.savedRosters.push({
              teamName: `${team.teamName} (Mannschaft ${teamNumber})`,
              contestType: team.contestType,
              teamNumber: parseInt(teamNumber),
              ...savedRoster.stats
            });
          } catch (error) {
            console.error(`[parse-club-rosters] ❌ Fehler beim Speichern der Meldeliste für ${team.teamName} Mannschaft ${teamNumber}:`, error);
            failedRosters.push({
              teamName: `${team.teamName} (Mannschaft ${teamNumber})`,
              contestType: team.contestType,
              teamNumber: parseInt(teamNumber),
              reason: `Fehler beim Speichern: ${error.message}`
            });
          }
        }
      }
      
      if (failedRosters.length > 0) {
        results.failedTeams = failedRosters;
      }
    }
    
    // Wenn apply=false, führe Matching durch und gebe Ergebnisse zurück (für Review)
    let allMatchingResults = null;
    if (!apply && teams.length > 0) {
      const supabase = createSupabaseClient(true);
      allMatchingResults = [];
      
      // Lade Spieler-Cache einmal für alle Teams
      const { data: allPlayers } = await supabase
        .from('players_unified')
        .select('id, name, current_lk, tvm_id, tvm_id_number, user_id, email')
        .limit(1000);
      const playerCache = allPlayers || [];
      
      for (const team of teams) {
        if (!team.roster || team.roster.length === 0) continue;
        
        const teamMatchingResults = [];
        for (const player of team.roster) {
          const matchResult = await matchPlayerToUnified(supabase, player, playerCache);
          teamMatchingResults.push({
            rosterPlayer: player,
            matchResult: matchResult
          });
        }
        
        allMatchingResults.push({
          contestType: team.contestType,
          teamName: team.teamName,
          matchingResults: teamMatchingResults
        });
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
    
    // Füge Matching-Ergebnisse hinzu wenn apply=false
    if (!apply && allMatchingResults) {
      results.matchingResults = allMatchingResults;
    }
    
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


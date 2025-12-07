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
 * Sucht nach einem Verein auf der nuLiga Vereinssuche-Seite
 * @param {string} clubName - Name des Vereins (z.B. "VKC Köln" oder "SV Rot-Gelb Sürth")
 * @returns {Promise<Array>} Array von gefundenen Vereinen mit Club-Nummern
 */
async function searchClubOnNuLiga(clubName) {
  try {
    console.log(`[find-club-numbers] 🔍 Suche nach Verein: "${clubName}"`);
    
    // URL für die Vereinssuche (POST-Request)
    const searchUrl = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubSearch';
    
    // Form-Daten für POST-Request
    const formData = new URLSearchParams();
    formData.append('searchFor', clubName);
    formData.append('federation', 'TVM');
    formData.append('region', 'DE.WE.TVM');
    formData.append('showSearchForm', '1');
    formData.append('clubSearch', 'Suchen');
    formData.append('WOSubmitAction', 'clubSearch');
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubSearch?federation=TVM&showSearchForm=1'
      },
      body: formData.toString(),
      redirect: 'follow' // WICHTIG: Folge Redirects automatisch
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // ✅ WICHTIG: Extrahiere Club-Nummer aus der finalen URL (nach Redirect)
    const finalUrl = response.url;
    console.log(`[find-club-numbers] 📍 Finale URL nach Redirect: ${finalUrl}`);
    
    // Extrahiere Club-Nummer aus der URL (z.B. clubInfoDisplay?club=36154)
    let clubNumber = null;
    const clubNumberMatch = finalUrl.match(/[?&]club=(\d+)/);
    if (clubNumberMatch) {
      clubNumber = clubNumberMatch[1];
      console.log(`[find-club-numbers] ✅ Club-Nummer aus URL extrahiert: ${clubNumber}`);
    }
    
    // Lade HTML für weitere Analyse
    const html = await response.text();
    
    // Wenn keine Club-Nummer in URL, suche in HTML nach Club-Nummern
    if (!clubNumber) {
      console.log(`[find-club-numbers] ⚠️ Keine Club-Nummer in URL, suche in HTML...`);
      const clubLinkPattern = /club(?:Pools|Portrait|InfoDisplay|Meetings|Teams)\?club=(\d+)/gi;
      const clubLinks = [...html.matchAll(clubLinkPattern)];
      const directClubPattern = /[?&]club=(\d+)/gi;
      const directClubs = [...html.matchAll(directClubPattern)];
      
      const allClubNumbers = new Set();
      clubLinks.forEach(match => allClubNumbers.add(match[1]));
      directClubs.forEach(match => allClubNumbers.add(match[1]));
      
      if (allClubNumbers.size > 0) {
        // Nimm die erste gefundene Club-Nummer (meist die richtige bei exakter Suche)
        clubNumber = Array.from(allClubNumbers)[0];
        console.log(`[find-club-numbers] ✅ Club-Nummer in HTML gefunden: ${clubNumber}`);
      }
    }
    
    if (!clubNumber) {
      console.log(`[find-club-numbers] ❌ Keine Club-Nummer gefunden für "${clubName}"`);
      return [];
    }
    
    // Extrahiere Vereinsnamen aus HTML
    let foundClubName = null;
    
    // Pattern 1: <h1>Vereinsname<br />Vereinsinfo</h1> oder <h1>Vereinsname</h1>
    const h1Match = html.match(/<h1[^>]*>([^<]+)(?:<br[^>]*>)?/i);
    if (h1Match) {
      foundClubName = h1Match[1].trim();
    }
    
    // Pattern 2: <div id="title">Vereinsname</div>
    if (!foundClubName) {
      const titleMatch = html.match(/<div[^>]*id=["']title["'][^>]*>([^<]+)<\/div>/i);
      if (titleMatch) {
        foundClubName = titleMatch[1].trim();
      }
    }
    
    // Pattern 3: <title>...Vereinsname...</title>
    if (!foundClubName) {
      const titleTagMatch = html.match(/<title[^>]*>.*?([A-ZÄÖÜ][^<&]+?)(?:\s*&ndash;|\s*–|<\/title>)/i);
      if (titleTagMatch) {
        foundClubName = titleTagMatch[1].trim();
      }
    }
    
    // ✅ WICHTIG: Initialisiere results Array
    const results = [];
    
    results.push({
      clubNumber: clubNumber,
      clubName: foundClubName || clubName, // Fallback auf Suchbegriff
      matchScore: foundClubName ? calculateSimilarity(clubName, foundClubName) : 0.8
    });
    
    // Sortiere nach Match-Score (beste Matches zuerst)
    results.sort((a, b) => b.matchScore - a.matchScore);
    
    console.log(`[find-club-numbers] ✅ ${results.length} mögliche Treffer gefunden für "${clubName}"`);
    return results;
    
  } catch (error) {
    console.error(`[find-club-numbers] ❌ Fehler beim Suchen nach "${clubName}":`, error);
    throw error;
  }
}

/**
 * Berechnet die Ähnlichkeit zwischen zwei Strings (Dice-Coefficient)
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const normalize = (s) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  if (s1 === s2) return 1.0;
  
  // Bigram-Ähnlichkeit
  const bigrams1 = new Set();
  const bigrams2 = new Set();
  
  for (let i = 0; i < s1.length - 1; i++) {
    bigrams1.add(s1.substring(i, i + 2));
  }
  for (let i = 0; i < s2.length - 1; i++) {
    bigrams2.add(s2.substring(i, i + 2));
  }
  
  let intersection = 0;
  bigrams1.forEach(bigram => {
    if (bigrams2.has(bigram)) intersection++;
  });
  
  const union = bigrams1.size + bigrams2.size;
  return union > 0 ? (2 * intersection) / union : 0;
}

/**
 * Speichert die Club-Nummer für einen Verein
 */
async function saveClubNumber(supabase, clubId, clubNumber) {
  try {
    // Update alle Teams dieses Clubs
    const { error: updateError } = await supabase
      .from('team_info')
      .update({ club_number: clubNumber })
      .eq('club_id', clubId);
    
    if (updateError) {
      console.error(`[find-club-numbers] ❌ Fehler beim Speichern der Club-Nummer:`, updateError);
      throw updateError;
    }
    
    console.log(`[find-club-numbers] ✅ Club-Nummer ${clubNumber} für Club ${clubId} gespeichert`);
  } catch (error) {
    console.error(`[find-club-numbers] ❌ Fehler beim Speichern:`, error);
    throw error;
  }
}

/**
 * Haupt-Handler: Findet Club-Nummern für Vereine in der Datenbank
 */
async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return withCors(res, 200, {});
  }
  
  if (req.method !== 'POST') {
    return withCors(res, 405, { error: 'Method not allowed' });
  }
  
  try {
    const { clubIds, maxClubs, dryRun = false } = req.body;
    const supabase = createSupabaseClient(true);
    
    // Lade Vereine aus der Datenbank
    let query = supabase
      .from('club_info')
      .select('id, name, city')
      .order('name', { ascending: true });
    
    // Filter nach clubIds falls angegeben
    if (clubIds && clubIds.length > 0) {
      query = query.in('id', clubIds);
    }
    
    // Limit falls angegeben
    if (maxClubs) {
      query = query.limit(parseInt(maxClubs));
    }
    
    const { data: clubs, error: clubsError } = await query;
    
    if (clubsError) {
      throw new Error(`Fehler beim Laden der Vereine: ${clubsError.message}`);
    }
    
    if (!clubs || clubs.length === 0) {
      return withCors(res, 200, {
        success: false,
        message: 'Keine Vereine gefunden',
        results: []
      });
    }
    
    console.log(`[find-club-numbers] 🔍 Starte Suche für ${clubs.length} Vereine...`);
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Verarbeite jeden Verein (mit Pause zwischen den Requests)
    for (let i = 0; i < clubs.length; i++) {
      const club = clubs[i];
      
      try {
        // Pause zwischen Requests (10-15 Sekunden, um nicht als Bot erkannt zu werden)
        if (i > 0) {
          const delay = 10000 + Math.random() * 5000; // 10-15 Sekunden
          console.log(`[find-club-numbers] ⏳ Warte ${Math.round(delay / 1000)} Sekunden vor nächster Suche...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        console.log(`[find-club-numbers] 🔍 [${i + 1}/${clubs.length}] Suche Club-Nummer für: ${club.name}`);
        
        // Suche nach dem Verein auf nuLiga
        const searchResults = await searchClubOnNuLiga(club.name);
        
        if (searchResults.length === 0) {
          results.push({
            clubId: club.id,
            clubName: club.name,
            status: 'not_found',
            message: 'Keine Treffer auf nuLiga gefunden',
            clubNumber: null
          });
          errorCount++;
          continue;
        }
        
        // Nimm das beste Match (höchster Score)
        const bestMatch = searchResults[0];
        
        // Prüfe ob Match-Score hoch genug ist (mindestens 0.7)
        if (bestMatch.matchScore < 0.7) {
          results.push({
            clubId: club.id,
            clubName: club.name,
            status: 'low_confidence',
            message: `Niedrige Übereinstimmung (${Math.round(bestMatch.matchScore * 100)}%): ${bestMatch.clubName}`,
            clubNumber: bestMatch.clubNumber,
            alternatives: searchResults.slice(0, 3).map(r => ({
              clubNumber: r.clubNumber,
              clubName: r.clubName,
              score: r.matchScore
            }))
          });
          errorCount++;
          continue;
        }
        
        // Speichere Club-Nummer (wenn nicht dryRun)
        if (!dryRun) {
          await saveClubNumber(supabase, club.id, bestMatch.clubNumber);
        }
        
        results.push({
          clubId: club.id,
          clubName: club.name,
          status: 'success',
          message: `Club-Nummer gefunden: ${bestMatch.clubNumber}`,
          clubNumber: bestMatch.clubNumber,
          matchedClubName: bestMatch.clubName,
          matchScore: bestMatch.matchScore
        });
        successCount++;
        
      } catch (error) {
        console.error(`[find-club-numbers] ❌ Fehler bei ${club.name}:`, error);
        results.push({
          clubId: club.id,
          clubName: club.name,
          status: 'error',
          message: error.message,
          clubNumber: null
        });
        errorCount++;
      }
    }
    
    return withCors(res, 200, {
      success: true,
      message: `Suche abgeschlossen: ${successCount} erfolgreich, ${errorCount} Fehler`,
      summary: {
        total: clubs.length,
        success: successCount,
        errors: errorCount,
        dryRun: dryRun
      },
      results: results
    });
    
  } catch (error) {
    console.error('[find-club-numbers] ❌ Fehler:', error);
    return withCors(res, 500, {
      success: false,
      error: error.message
    });
  }
}

module.exports = handler;


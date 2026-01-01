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
    
    // Generiere alternative Suchbegriffe, falls die erste Suche fehlschlägt
    const generateSearchTerms = (name) => {
      const terms = [name]; // Original-Name zuerst
      
      // ✅ NEU: Entferne Zusätze wie "5 zurückgezogen am '16.09.2025'"
      const cleanName = name.replace(/\s+\d+\s+.*?$/, '').trim();
      if (cleanName !== name) {
        terms.push(cleanName);
      }
      
      // Entferne Bindestriche und ersetze durch Leerzeichen
      const withoutHyphens = cleanName.replace(/-/g, ' ');
      if (withoutHyphens !== cleanName) {
        terms.push(withoutHyphens);
      }
      
      // Teile den Namen in Wörter auf
      const words = cleanName.split(/[\s-]+/).filter(w => w.length > 0);
      
      // ✅ VERBESSERT: Mehr Varianten für bessere Trefferquote
      if (words.length > 2) {
        // Alle Wörter außer dem letzten (oft Stadt/Ort)
        terms.push(words.slice(0, -1).join(' '));
        // Letzte 2 Wörter (oft Stadt/Ort)
        terms.push(words.slice(-2).join(' '));
        // Vorletztes Wort (oft der eigentliche Vereinsname)
        terms.push(words[words.length - 2]);
        // Nur letztes Wort
        terms.push(words.slice(-1).join(' '));
      } else if (words.length > 1) {
        // Erste Wort (oft Vereinsname)
        terms.push(words[0]);
        // Nur letztes Wort
        terms.push(words.slice(-1).join(' '));
      }
      
      // ✅ NEU: Entferne häufige Abkürzungen und ersetze sie
      const abbreviations = {
        'TK': 'Tennisklub',
        'TC': 'Tennisclub',
        'TG': 'Turngemeinde',
        'TV': 'Turnverein',
        'MTV': 'Männerturnverein',
        'HTC': 'Hockey- und Tennisclub',
        'KHT': 'Kölner Hockey- und Tennisclub',
        'KTC': 'Kölner Tennisclub',
        'GW': 'Gut Wohlfahrt',
        'RW': 'Rot-Weiß',
        'SW': 'Schwarz-Weiß',
        'BG': 'Blau-Gelb',
        'GWR': 'Gut Wohlfahrt Rot'
      };
      
      // Versuche Abkürzungen zu erweitern
      words.forEach((word, idx) => {
        if (abbreviations[word]) {
          const expanded = [...words];
          expanded[idx] = abbreviations[word];
          terms.push(expanded.join(' '));
        }
      });
      
      // Entferne Duplikate und leere Strings
      return [...new Set(terms)].filter(t => t && t.length > 0);
    };
    
    const searchTerms = generateSearchTerms(clubName);
    console.log(`[find-club-numbers] 📋 Suchbegriffe: ${searchTerms.join(', ')}`);
    
    // Versuche jeden Suchbegriff
    for (let termIndex = 0; termIndex < searchTerms.length; termIndex++) {
      const searchTerm = searchTerms[termIndex];
      console.log(`[find-club-numbers] 🔍 Versuche Suchbegriff ${termIndex + 1}/${searchTerms.length}: "${searchTerm}"`);
      
      // Form-Daten für POST-Request
      const formData = new URLSearchParams();
      formData.append('searchFor', searchTerm);
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
        if (termIndex < searchTerms.length - 1) {
          console.log(`[find-club-numbers] ⚠️ HTTP ${response.status}, versuche nächsten Suchbegriff...`);
          continue;
        }
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
      
      // ✅ DEBUG: Log HTML-Länge und erste 500 Zeichen für Debugging
      console.log(`[find-club-numbers] 📄 HTML-Response: ${html.length} Zeichen`);
      console.log(`[find-club-numbers] 📄 HTML-Preview (erste 500 Zeichen): ${html.substring(0, 500)}`);
      
      // Prüfe verschiedene Varianten von "Keine Treffer"
      const noResultsPatterns = [
        /Keine Treffer/i,
        /keine.*treffer/i,
        /no.*results/i,
        /nichts.*gefunden/i
      ];
      
      const hasNoResults = noResultsPatterns.some(pattern => pattern.test(html));
      
      if (hasNoResults) {
        console.log(`[find-club-numbers] ⚠️ "Keine Treffer" erkannt für "${searchTerm}"`);
        // Prüfe auch, ob wir vielleicht auf einer Suchergebnis-Seite sind, aber ohne Ergebnisse
        if (termIndex < searchTerms.length - 1) {
          continue; // Versuche nächsten Suchbegriff
        }
      }
      
      // Wenn keine Club-Nummer in URL, suche in HTML nach Club-Nummern
      if (!clubNumber) {
        console.log(`[find-club-numbers] ⚠️ Keine Club-Nummer in URL, suche in HTML...`);
        
        // Prüfe ob wir auf einer Suchergebnis-Seite sind
        const isSearchResultsPage = finalUrl.includes('clubSearch') && !finalUrl.includes('club=');
        
        if (isSearchResultsPage) {
          console.log(`[find-club-numbers] 📋 Auf Suchergebnis-Seite gelandet, parse Ergebnisse...`);
          
          // ✅ DEBUG: Suche nach typischen nuLiga-Strukturen
          const hasClubTable = html.includes('Verein') || html.includes('club') || html.includes('Club');
          const hasLinks = html.includes('href') && html.includes('club');
          console.log(`[find-club-numbers] 🔍 HTML-Analyse: hasClubTable=${hasClubTable}, hasLinks=${hasLinks}`);
          
          // Suche nach Club-Links in Suchergebnissen
          // Pattern: Links die zu clubInfoDisplay, clubPools, etc. führen
          // ✅ VERBESSERT: Mehrere Pattern-Varianten für bessere Erkennung
          const clubLinkPatterns = [
            /href=["']([^"']*club(?:InfoDisplay|Pools|Portrait|Meetings|Teams)\?club=(\d+)[^"']*)["']/gi,
            /href=["']([^"']*[?&]club=(\d+)[^"']*)["']/gi,
            /club(?:InfoDisplay|Pools|Portrait|Meetings|Teams)\?club=(\d+)/gi,
            /[?&]club=(\d+)/gi,
            // Auch ohne href (falls in JavaScript oder anderen Attributen)
            /club=(\d+)/gi
          ];
          
          const foundClubs = new Map(); // Map<clubNumber, {url, context}>
          
          clubLinkPatterns.forEach((pattern, patternIndex) => {
            const matches = [...html.matchAll(pattern)];
            console.log(`[find-club-numbers] 🔍 Pattern ${patternIndex + 1}: ${matches.length} Matches gefunden`);
            matches.forEach((match, matchIndex) => {
              // Extrahiere Club-Nummer aus verschiedenen Match-Positionen
              const foundClubNumber = match[2] || match[1] || match[0]?.match(/club=(\d+)/)?.[1];
              if (foundClubNumber && /^\d+$/.test(foundClubNumber)) {
                // Extrahiere Kontext um den Link (Vereinsname)
                const linkStart = match.index;
                const contextStart = Math.max(0, linkStart - 200);
                const contextEnd = Math.min(html.length, linkStart + match[0].length + 200);
                const context = html.substring(contextStart, contextEnd);
                
                // Versuche Vereinsnamen aus dem Kontext zu extrahieren
                const nameMatch = context.match(/>([^<]{5,50}?)</);
                const clubNameFromContext = nameMatch ? nameMatch[1].trim() : null;
                
                if (!foundClubs.has(foundClubNumber)) {
                  foundClubs.set(foundClubNumber, {
                    url: match[1] || match[0],
                    context: clubNameFromContext,
                    fullContext: context.substring(0, 300)
                  });
                }
              }
            });
          });
          
          console.log(`[find-club-numbers] 🔍 ${foundClubs.size} verschiedene Club-Nummern in Suchergebnissen gefunden`);
          
          // ✅ DEBUG: Zeige alle gefundenen Club-Nummern
          if (foundClubs.size > 0) {
            console.log(`[find-club-numbers] 📋 Gefundene Club-Nummern:`);
            foundClubs.forEach((data, num) => {
              console.log(`  - Club ${num}: "${data.context || 'kein Name'}"`);
            });
          } else {
            // ✅ DEBUG: Wenn keine Club-Nummern gefunden, zeige HTML-Ausschnitt
            console.log(`[find-club-numbers] ⚠️ Keine Club-Nummern in HTML gefunden`);
            // Suche nach typischen nuLiga-Strukturen
            const clubSearchIndicators = [
              html.includes('clubSearch'),
              html.includes('Verein'),
              html.includes('Suchergebnis'),
              html.match(/club=\d+/g)?.length > 0
            ];
            console.log(`[find-club-numbers] 🔍 HTML-Indikatoren:`, clubSearchIndicators);
            
            // Zeige HTML-Ausschnitt um typische Suchbegriffe
            const searchTermIndex = html.toLowerCase().indexOf(searchTerm.toLowerCase());
            if (searchTermIndex !== -1) {
              const snippet = html.substring(Math.max(0, searchTermIndex - 200), Math.min(html.length, searchTermIndex + 200));
              console.log(`[find-club-numbers] 📄 HTML-Ausschnitt um "${searchTerm}": ${snippet}`);
            }
          }
          
          if (foundClubs.size > 0) {
            // Versuche das beste Match zu finden basierend auf Vereinsnamen
            let bestMatch = null;
            let bestScore = 0;
            
            foundClubs.forEach((data, foundClubNumber) => {
              const contextName = data.context || '';
              const score = calculateSimilarity(clubName, contextName);
              console.log(`[find-club-numbers]   - Club ${foundClubNumber}: "${contextName}" (Score: ${score.toFixed(2)})`);
              
              if (score > bestScore) {
                bestScore = score;
                bestMatch = {
                  clubNumber: foundClubNumber,
                  clubName: contextName,
                  score: score
                };
              }
            });
            
            if (bestMatch && bestMatch.score >= 0.5) {
              clubNumber = bestMatch.clubNumber;
              console.log(`[find-club-numbers] ✅ Bestes Match gefunden: Club ${clubNumber} (Score: ${bestMatch.score.toFixed(2)})`);
            } else if (foundClubs.size === 1) {
              // Wenn nur ein Ergebnis, nimm es
              const onlyClub = Array.from(foundClubs.entries())[0];
              clubNumber = onlyClub[0];
              console.log(`[find-club-numbers] ✅ Einziges Ergebnis gefunden: Club ${clubNumber}`);
            }
          }
        } else {
          // Normale Suche in HTML (falls wir auf einer Detail-Seite sind)
          const clubLinkPattern = /club(?:Pools|Portrait|InfoDisplay|Meetings|Teams)\?club=(\d+)/gi;
          const clubLinks = [...html.matchAll(clubLinkPattern)];
          const directClubPattern = /[?&]club=(\d+)/gi;
          const directClubs = [...html.matchAll(directClubPattern)];
          
          const allClubNumbers = new Set();
          clubLinks.forEach(match => allClubNumbers.add(match[1]));
          directClubs.forEach(match => allClubNumbers.add(match[1]));
          
          if (allClubNumbers.size > 0) {
            clubNumber = Array.from(allClubNumbers)[0];
            console.log(`[find-club-numbers] ✅ Club-Nummer in HTML gefunden: ${clubNumber}`);
          }
        }
      }
      
      // Wenn wir eine Club-Nummer gefunden haben, breche ab
      if (clubNumber) {
        // Extrahiere Vereinsnamen aus HTML für das beste Match
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
      }
    }
    
    // Wenn wir hier ankommen, wurde keine Club-Nummer gefunden
    console.log(`[find-club-numbers] ❌ Keine Club-Nummer gefunden für "${clubName}" nach ${searchTerms.length} Versuchen`);
    return [];
    
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
    // Prüfe zuerst, ob es Teams mit dieser club_id gibt
    const { data: teams, error: teamsError } = await supabase
      .from('team_info')
      .select('id, club_id')
      .eq('club_id', clubId)
      .limit(1);
    
    if (teamsError) {
      console.error(`[find-club-numbers] ❌ Fehler beim Prüfen der Teams:`, teamsError);
      throw teamsError;
    }
    
    if (!teams || teams.length === 0) {
      console.warn(`[find-club-numbers] ⚠️ Keine Teams mit club_id ${clubId} gefunden - Club-Nummer kann nicht gespeichert werden`);
      // Versuche trotzdem, falls es Teams mit club_name gibt
      const { data: clubs } = await supabase
        .from('club_info')
        .select('name')
        .eq('id', clubId)
        .single();
      
      if (clubs) {
        // Suche Teams nach club_name
        const { error: updateByNameError } = await supabase
          .from('team_info')
          .update({ club_number: clubNumber })
          .eq('club_name', clubs.name);
        
        if (updateByNameError) {
          throw new Error(`Keine Teams gefunden und Update nach club_name fehlgeschlagen: ${updateByNameError.message}`);
        }
        console.log(`[find-club-numbers] ✅ Club-Nummer ${clubNumber} für Club "${clubs.name}" via club_name gespeichert`);
        return;
      }
      throw new Error(`Keine Teams mit club_id ${clubId} gefunden`);
    }
    
    // Update alle Teams dieses Clubs
    const { data: updatedTeams, error: updateError } = await supabase
      .from('team_info')
      .update({ club_number: clubNumber })
      .eq('club_id', clubId)
      .select('id');
    
    if (updateError) {
      console.error(`[find-club-numbers] ❌ Fehler beim Speichern der Club-Nummer:`, updateError);
      throw updateError;
    }
    
    const updatedCount = updatedTeams?.length || 0;
    console.log(`[find-club-numbers] ✅ Club-Nummer ${clubNumber} für Club ${clubId} gespeichert (${updatedCount} Teams aktualisiert)`);
    
    if (updatedCount === 0) {
      throw new Error(`Keine Teams aktualisiert - möglicherweise RLS-Problem oder keine Teams mit club_id ${clubId}`);
    }
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
    
    // ✅ WICHTIG: Limit pro Request, um Timeout zu vermeiden (Vercel Hobby Plan: 10 Sekunden)
    // Jede Suche kann 3-5 Sekunden dauern + 10-15 Sekunden Delay = ~15-20 Sekunden pro Verein
    // Limit auf 1 Verein pro Request, um sicherzustellen, dass wir das 10-Sekunden-Timeout nicht überschreiten
    const MAX_CLUBS_PER_REQUEST = 1;
    
    if (clubs.length > MAX_CLUBS_PER_REQUEST) {
      return withCors(res, 400, {
        success: false,
        error: 'Zu viele Vereine ausgewählt',
        message: `Bitte wähle maximal ${MAX_CLUBS_PER_REQUEST} Verein(e) pro Request aus. Die Suche kann nur einen Verein gleichzeitig verarbeiten, um das Timeout zu vermeiden.`,
        maxClubsPerRequest: MAX_CLUBS_PER_REQUEST,
        selectedClubs: clubs.length
      });
    }
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Verarbeite jeden Verein (mit Pause zwischen den Requests)
    // NOTE: Mit MAX_CLUBS_PER_REQUEST = 1 wird diese Schleife nur einmal ausgeführt
    for (let i = 0; i < clubs.length; i++) {
      const club = clubs[i];
      
      try {
        // Pause zwischen Requests (nur bei mehreren Vereinen, aber mit MAX_CLUBS_PER_REQUEST = 1 wird dies nie ausgeführt)
        // Reduziertes Delay, um Timeout zu vermeiden (3-5 Sekunden statt 10-15)
        if (i > 0) {
          const delay = 3000 + Math.random() * 2000; // 3-5 Sekunden (reduziert für bessere Performance)
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
        
        // Prüfe ob Match-Score hoch genug ist (mindestens 0.5 für automatisches Speichern)
        // Bei niedrigerem Score wird trotzdem gespeichert, aber mit Warnung
        if (bestMatch.matchScore < 0.5) {
          results.push({
            clubId: club.id,
            clubName: club.name,
            status: 'low_confidence',
            message: `Sehr niedrige Übereinstimmung (${Math.round(bestMatch.matchScore * 100)}%): ${bestMatch.clubName} - nicht gespeichert`,
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
          try {
            await saveClubNumber(supabase, club.id, bestMatch.clubNumber);
          } catch (saveError) {
            console.error(`[find-club-numbers] ❌ Fehler beim Speichern für ${club.name}:`, saveError);
            results.push({
              clubId: club.id,
              clubName: club.name,
              status: 'error',
              message: `Club-Nummer gefunden, aber Speichern fehlgeschlagen: ${saveError.message}`,
              clubNumber: bestMatch.clubNumber
            });
            errorCount++;
            continue;
          }
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


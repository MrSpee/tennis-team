/**
 * Vercel Serverless Function: nuLiga Team-Portrait Scraper
 * 
 * Endpoint: POST /api/import/team-portrait
 * 
 * Input: { teamPortraitUrl: string }
 * Output: { 
 *   team_info: { club_name, team_name, category, league, ... },
 *   players: Array<{ name, lk, id_number, position, birth_year, ... }>,
 *   matches: Array<{ match_date, start_time, home_team, away_team, match_number, ... }>
 * }
 * 
 * Scraped die nuLiga Team-Portrait-Seite und extrahiert:
 * - Verein-Informationen (Name, Adresse, Website, Mannschaftsführer)
 * - Mannschafts-Informationen (Name, Liga, Kategorie)
 * - Spielerliste (Rang, LK, ID-Nummer, Name, Geburtsjahr, Position)
 * - Spieltermine (Datum, Uhrzeit, Match-Nummer, Heim/Gast, Spielort, Platz)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

module.exports = async function handler(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Nur POST erlaubt
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed. Use POST.',
      ...corsHeaders 
    });
  }

  try {
    const { teamPortraitUrl } = req.body;

    // Validierung
    if (!teamPortraitUrl) {
      return res.status(400).json({ 
        error: 'teamPortraitUrl ist erforderlich.',
        ...corsHeaders 
      });
    }

    // URL-Validierung
    if (!teamPortraitUrl.includes('teamPortrait')) {
      return res.status(400).json({ 
        error: 'Ungültige URL. Bitte eine nuLiga Team-Portrait-URL verwenden.',
        ...corsHeaders 
      });
    }

    console.log('🔄 Scraping Team-Portrait:', teamPortraitUrl);

    // Fetch HTML
    const response = await fetch(teamPortraitUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Parse HTML mit cheerio
    // In Vercel Serverless Functions (CommonJS) verwenden wir require
    let cheerio;
    try {
      cheerio = require('cheerio');
    } catch (e) {
      try {
        // Fallback für ES Modules
        const cheerioModule = await import('cheerio');
        cheerio = cheerioModule.default || cheerioModule;
      } catch (importError) {
        console.error('❌ Cheerio konnte nicht geladen werden:', importError);
        throw new Error('Cheerio-Bibliothek nicht verfügbar. Bitte installiere: npm install cheerio');
      }
    }
    
    if (!cheerio) {
      throw new Error('Cheerio konnte nicht initialisiert werden');
    }
    
    const $ = cheerio.load(html);

    // 1. VEREIN-INFORMATIONEN extrahieren
    const clubInfo = extractClubInfo($);
    
    // 2. MANNSCHAFTS-INFORMATIONEN extrahieren
    const teamInfo = extractTeamInfo($);
    
    // 3. SPIELERLISTE extrahieren
    const players = extractPlayers($);
    
    // 4. SPIELTERMINE extrahieren
    const matches = extractMatches($);

    console.log('✅ Scraping erfolgreich:', {
      club: clubInfo.club_name,
      team: teamInfo.team_name,
      players: players.length,
      matches: matches.length
    });

    // Erfolgreiche Response - setze CORS-Header
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    return res.status(200).json({
      success: true,
      data: {
        club_info: clubInfo,
        team_info: teamInfo,
        players: players,
        matches: matches,
        metadata: {
          scraped_at: new Date().toISOString(),
          source_url: teamPortraitUrl
        }
      }
    });

  } catch (error) {
    console.error('❌ Error scraping team portrait:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Stelle sicher, dass CORS-Header gesetzt sind
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    return res.status(500).json({
      success: false,
      error: 'Fehler beim Scrapen der Team-Portrait-Seite',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Extrahiert Verein-Informationen aus der HTML
 */
function extractClubInfo($) {
  const clubInfo = {
    club_name: null,
    club_id: null, // TVM Club ID (z.B. "2097")
    address: null,
    city: null,
    postal_code: null,
    website: null,
    captain: null,
    captain_phone: null,
    captain_email: null
  };

  // Verein-Name und ID (z.B. "Kölner THC Stadion Rot-Weiss (2097)")
  // Suche nach h1 oder anderen Headern
  let clubHeader = $('h1').first().text().trim();
  if (!clubHeader) {
    // Fallback: Suche nach Text mit Verein-Info
    clubHeader = $('body').text().match(/^([^\n]+?)\s*\((\d+)\)/)?.[0] || '';
  }
  
  const clubMatch = clubHeader.match(/^(.+?)\s*\((\d+)\)$/);
  if (clubMatch) {
    clubInfo.club_name = clubMatch[1].trim();
    clubInfo.club_id = clubMatch[2].trim();
  } else if (clubHeader) {
    clubInfo.club_name = clubHeader;
  }

  // Adresse (aus Tabelle "Verein")
  $('table').each((i, table) => {
    const $table = $(table);
    const headerText = $table.find('th').first().text().trim();
    
    if (headerText === 'Verein' || headerText.includes('Verein')) {
      $table.find('tr').each((j, row) => {
        const $row = $(row);
        const label = $row.find('td').first().text().trim();
        const value = $row.find('td').last().text().trim();
        
        if (label === 'Verein' && value) {
          // Extrahiere Adresse aus dem Wert (kann mehrere Zeilen enthalten)
          const lines = value.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length > 0) {
            // Erste Zeile ist meist der Name (falls nicht schon extrahiert)
            if (!clubInfo.club_name) {
              clubInfo.club_name = lines[0];
            }
            // Weitere Zeilen können Adresse, PLZ, Stadt enthalten
            lines.slice(1).forEach(line => {
              if (line.match(/^\d{5}\s/)) {
                // PLZ + Stadt
                const plzMatch = line.match(/^(\d{5})\s+(.+)$/);
                if (plzMatch) {
                  clubInfo.postal_code = plzMatch[1];
                  clubInfo.city = plzMatch[2];
                }
              } else if (line.match(/^http/)) {
                // Website
                clubInfo.website = line;
              } else if (line.trim()) {
                // Adresse
                clubInfo.address = (clubInfo.address ? clubInfo.address + ', ' : '') + line;
              }
            });
          }
        }
      });
    }
  });

  // Mannschaftsführer (aus Tabelle oder Text)
  const captainText = $('body').text();
  const captainMatch = captainText.match(/Mannschaftsführer[:\s]+([^\n]+?)(?:\s*-\s*Mobil[:\s]+([^\n]+?))?(?:\s*([^\s@]+@[^\s]+))?/i);
  if (captainMatch) {
    clubInfo.captain = captainMatch[1].trim();
    if (captainMatch[2]) {
      clubInfo.captain_phone = captainMatch[2].trim();
    }
    if (captainMatch[3]) {
      clubInfo.captain_email = captainMatch[3].trim();
    }
  }

  return clubInfo;
}

/**
 * Extrahiert Mannschafts-Informationen
 */
function extractTeamInfo($) {
  const teamInfo = {
    team_name: null,
    category: null,
    league: null,
    group_name: null,
    season: null
  };

  // Mannschafts-Name (aus Tabelle "Mannschaft")
  // Suche nach Tabellen mit Verein/Mannschaft/Liga Info
  $('table').each((i, table) => {
    const $table = $(table);
    const tableText = $table.text();
    
    // Prüfe ob es die Info-Tabelle ist (enthält "Verein", "Mannschaft", "Liga")
    if (tableText.includes('Verein') || tableText.includes('Mannschaft') || tableText.includes('Liga')) {
      $table.find('tr').each((j, row) => {
        const $row = $(row);
        const cells = $row.find('td, th');
        if (cells.length >= 2) {
          const label = cells.first().text().trim();
          const value = cells.last().text().trim();
          
          if (label === 'Mannschaft' && value) {
            teamInfo.team_name = value;
          }
          if (label === 'Liga' && value) {
            teamInfo.league = value;
            // Extrahiere Kategorie und Gruppe aus Liga (z.B. "Herren 40 1. Bezirksliga Gr. 043")
            const categoryMatch = value.match(/^(Herren|Damen|Mixed)\s+(\d+)/i);
            if (categoryMatch) {
              teamInfo.category = `${categoryMatch[1]} ${categoryMatch[2]}`;
            }
            const groupMatch = value.match(/Gr\.\s*(\d+)/i);
            if (groupMatch) {
              teamInfo.group_name = `Gr. ${groupMatch[1].padStart(3, '0')}`;
            }
          }
        }
      });
    }
  });

  // Saison (aus Header oder Text)
  const seasonMatch = $('body').text().match(/(Winter|Sommer)\s+(\d{4})\/(\d{2,4})/i);
  if (seasonMatch) {
    const seasonName = seasonMatch[1].charAt(0).toUpperCase() + seasonMatch[1].slice(1).toLowerCase();
    const year1 = seasonMatch[2];
    const year2 = seasonMatch[3].length === 2 ? seasonMatch[3] : seasonMatch[3].slice(-2);
    teamInfo.season = `${seasonName} ${year1}/${year2}`;
  }

  return teamInfo;
}

/**
 * Extrahiert Spielerliste aus der Tabelle
 */
function extractPlayers($) {
  const players = [];

  // Finde die Spieler-Tabelle (Header enthält "Rang", "LK", "ID-Nummer", "Name")
  $('table').each((i, table) => {
    const $table = $(table);
    const headers = [];
    $table.find('thead tr th, thead tr td, tbody tr:first-child th, tbody tr:first-child td').each((j, th) => {
      headers.push($(th).text().trim());
    });

    // Prüfe ob es die Spieler-Tabelle ist
    const hasRank = headers.some(h => h.includes('Rang') || h.includes('Pos'));
    const hasLK = headers.some(h => h.includes('LK'));
    const hasID = headers.some(h => h.includes('ID') || h.includes('Nummer'));
    const hasName = headers.some(h => h.includes('Name'));

    if (hasRank && hasLK && hasID && hasName) {
      // Finde Spalten-Indizes
      const rankIdx = headers.findIndex(h => h.includes('Rang') || h.includes('Pos'));
      const teamIdx = headers.findIndex(h => h.includes('Mannschaft'));
      const lkIdx = headers.findIndex(h => h.includes('LK'));
      const idIdx = headers.findIndex(h => h.includes('ID') || h.includes('Nummer'));
      const nameIdx = headers.findIndex(h => h.includes('Name'));
      const nationIdx = headers.findIndex(h => h.includes('Nation'));

      // Parse Spieler-Zeilen
      $table.find('tbody tr, tr').each((j, row) => {
        const $row = $(row);
        const cells = [];
        $row.find('td, th').each((k, cell) => {
          cells.push($(cell).text().trim());
        });

        // Überspringe Header-Zeile
        if (cells[rankIdx] === 'Rang' || cells[rankIdx] === 'Pos' || !cells[rankIdx]) {
          return;
        }

        const rank = parseInt(cells[rankIdx], 10);
        if (isNaN(rank)) return;

        const name = cells[nameIdx] || '';
        if (!name) return;

        // Extrahiere LK (kann "LK6,0" oder "6,0" sein)
        let lk = null;
        const lkText = cells[lkIdx] || '';
        const lkMatch = lkText.match(/LK\s*([0-9]+(?:[.,][0-9]+)?)/i) || lkText.match(/^([0-9]+(?:[.,][0-9]+)?)$/);
        if (lkMatch) {
          lk = lkMatch[1].replace(',', '.');
        }

        // Extrahiere ID-Nummer
        const idNumber = cells[idIdx] || '';

        // Extrahiere Geburtsjahr aus Name (z.B. "Olschewski, Thomas (1980)")
        let birthYear = null;
        let playerName = name;
        const birthMatch = name.match(/\((\d{4})\)/);
        if (birthMatch) {
          birthYear = parseInt(birthMatch[1], 10);
          // Entferne Geburtsjahr aus Name
          playerName = name.replace(/\s*\(\d{4}\)/, '');
        }

        players.push({
          position: rank,
          team_number: cells[teamIdx] || null,
          lk: lk,
          id_number: idNumber,
          name: playerName.trim(),
          birth_year: birthYear,
          nation: cells[nationIdx] || null
        });
      });
    }
  });

  return players;
}

/**
 * Extrahiert Spieltermine aus der Tabelle
 */
function extractMatches($) {
  const matches = [];

  // Finde die Spieltermine-Tabelle (Header enthält "Datum", "Nr.", "Heimmannschaft", "Gastmannschaft")
  $('table').each((i, table) => {
    const $table = $(table);
    const headers = [];
    $table.find('thead tr th, thead tr td, tbody tr:first-child th, tbody tr:first-child td').each((j, th) => {
      headers.push($(th).text().trim());
    });

    // Prüfe ob es die Spieltermine-Tabelle ist
    const hasDate = headers.some(h => h.includes('Datum'));
    const hasMatchNr = headers.some(h => h.includes('Nr.') || h.includes('Nummer'));
    const hasHome = headers.some(h => h.includes('Heim') || h.includes('Heimmannschaft'));
    const hasAway = headers.some(h => h.includes('Gast') || h.includes('Gastmannschaft'));

    if (hasDate && hasHome && hasAway) {
      // Finde Spalten-Indizes
      const dateIdx = headers.findIndex(h => h.includes('Datum'));
      const matchNrIdx = headers.findIndex(h => h.includes('Nr.') || h.includes('Nummer'));
      const venueIdx = headers.findIndex(h => h.includes('Spielort'));
      const courtIdx = headers.findIndex(h => h.includes('Platz'));
      const homeIdx = headers.findIndex(h => h.includes('Heim') || h.includes('Heimmannschaft'));
      const awayIdx = headers.findIndex(h => h.includes('Gast') || h.includes('Gastmannschaft'));
      const pointsIdx = headers.findIndex(h => h.includes('Matchpunkte') || h.includes('Match'));
      const statusIdx = headers.findIndex(h => h.includes('Spielbericht') || h.includes('Status'));

      // Parse Match-Zeilen
      $table.find('tbody tr, tr').each((j, row) => {
        const $row = $(row);
        const cells = [];
        $row.find('td, th').each((k, cell) => {
          cells.push($(cell).text().trim());
        });

        // Überspringe Header-Zeile
        if (cells[dateIdx] === 'Datum' || !cells[dateIdx]) {
          return;
        }

        const dateText = cells[dateIdx] || '';
        if (!dateText) return;

        // Parse Datum (z.B. "Sa. 15.11.2025 18:00")
        const dateMatch = dateText.match(/(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
        if (!dateMatch) return;

        const day = dateMatch[1];
        const month = dateMatch[2];
        const year = dateMatch[3];
        const hour = dateMatch[4] || null;
        const minute = dateMatch[5] || null;

        const matchDate = `${year}-${month}-${day}`;
        const startTime = hour && minute ? `${hour}:${minute}` : null;

        const matchNumber = cells[matchNrIdx] ? parseInt(cells[matchNrIdx], 10) : null;
        const venue = cells[venueIdx] || null;
        const courtRange = cells[courtIdx] || null;
        const homeTeam = cells[homeIdx] || null;
        const awayTeam = cells[awayIdx] || null;
        const matchPoints = cells[pointsIdx] || null;
        const statusText = cells[statusIdx] || '';

        // Bestimme Status
        let status = 'scheduled';
        if (statusText.includes('anzeigen') || statusText.includes('completed')) {
          status = 'completed';
        } else if (statusText.includes('offen')) {
          status = 'scheduled';
        }

        if (homeTeam && awayTeam) {
          matches.push({
            match_date: matchDate,
            start_time: startTime,
            match_number: matchNumber,
            home_team: homeTeam,
            away_team: awayTeam,
            venue: venue,
            court_range: courtRange,
            match_points: matchPoints,
            status: status
          });
        }
      });
    }
  });

  return matches;
}


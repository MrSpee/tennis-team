/**
 * ============================================================================
 * MATCHDAY IMPORT SERVICE (für bestehende Tabellen)
 * ============================================================================
 * KI-gestützter Import von Medenspiel-Übersichten mit Fuzzy Matching
 * Nutzt die BESTEHENDEN Tabellen: club_info, team_info, matchdays
 * Keine import_sessions/import_entities - alles direkter Zugriff
 * ============================================================================
 */

import { supabase } from '../lib/supabaseClient';

/**
 * ============================================================================
 * FUZZY MATCHING ENGINE
 * ============================================================================
 */

/**
 * Normalisiert einen String für Matching
 */
export const normalizeString = (str) => {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Mehrfachspaces zu Single Space
    .replace(/[ä]/g, 'ae')
    .replace(/[ö]/g, 'oe')
    .replace(/[ü]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, '') // Entferne Sonderzeichen
    .trim();
};

/**
 * Erweitertes Token-Set für besseres Matching
 */
export const tokenize = (str) => {
  const normalized = normalizeString(str);
  const tokens = normalized.split(/\s+/);
  
  // Entferne Stoppwörter
  const stopwords = ['e.v', 'ev', 'tc', 'sv', 'tv', 'sc', '1', '2', '3', 'gr', 'gruppe', 'herren', 'damen', 'jugend'];
  return tokens.filter(t => t.length > 1 && !stopwords.includes(t));
};

/**
 * Berechne Jaro-Winkler Similarity
 */
export const jaroWinkler = (s1, s2) => {
  const s1Norm = normalizeString(s1);
  const s2Norm = normalizeString(s2);
  
  if (s1Norm === s2Norm) return 1.0;
  if (!s1Norm || !s2Norm) return 0.0;
  
  // Jaro Distance
  const matchWindow = Math.floor(Math.max(s1Norm.length, s2Norm.length) / 2) - 1;
  const s1Matches = new Array(s1Norm.length).fill(false);
  const s2Matches = new Array(s2Norm.length).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matches
  for (let i = 0; i < s1Norm.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2Norm.length);
    
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1Norm[i] !== s2Norm[j]) continue;
      s1Matches[i] = s2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  // Find transpositions
  let k = 0;
  for (let i = 0; i < s1Norm.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1Norm[i] !== s2Norm[k]) transpositions++;
    k++;
  }
  
  // Jaro
  const jaro = (matches / s1Norm.length + matches / s2Norm.length + (matches - transpositions / 2) / matches) / 3;
  
  // Winkler prefix bonus
  let prefix = 0;
  const prefixLength = Math.min(4, Math.min(s1Norm.length, s2Norm.length));
  for (let i = 0; i < prefixLength; i++) {
    if (s1Norm[i] === s2Norm[i]) prefix++;
    else break;
  }
  
  return jaro + (prefix * 0.1 * (1 - jaro));
};

/**
 * Token Set Ratio (für Multi-Word Matching)
 */
export const tokenSetRatio = (str1, str2) => {
  const tokens1 = new Set(tokenize(str1));
  const tokens2 = new Set(tokenize(str2));
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  
  if (union.size === 0) return 0;
  return intersection.size / union.size;
};

/**
 * Prüft ob ein String ein Präfix/Abkürzung eines anderen ist
 * z.B. "SV Blau" ist Präfix von "SV Blau-Weiß-Rot"
 */
export const isPrefixMatch = (shortStr, longStr) => {
  if (!shortStr || !longStr) return false;
  
  const shortNorm = normalizeString(shortStr);
  const longNorm = normalizeString(longStr);
  
  // Prüfe ob shortStr ein Präfix von longStr ist
  if (longNorm.startsWith(shortNorm)) {
    // Zusätzlich: Prüfe ob der Rest nur aus Bindestrichen, Leerzeichen und Wörtern besteht
    const remainder = longNorm.substring(shortNorm.length).trim();
    // Wenn der Rest leer ist oder nur aus Bindestrichen/Leerzeichen besteht, ist es ein gutes Match
    if (remainder.length === 0 || /^[\s-]+$/.test(remainder)) {
      return true;
    }
    // Wenn der Rest mit Bindestrich beginnt und weitere Wörter enthält, ist es auch ein Match
    if (remainder.startsWith('-') && remainder.length > 1) {
      return true;
    }
  }
  
  return false;
};

/**
 * Kombinierter Similarity Score mit Präfix-Matching
 */
/**
 * Entfernt Länder-Flags aus Spielernamen (Format: "XXX Y Name" oder "Name XXX Y")
 * z.B. "Raoul NED N van Herwijnen" → "Raoul van Herwijnen"
 * z.B. "NED N van Herwijnen" → "van Herwijnen"
 */
export const removeCountryFlag = (name) => {
  if (!name) return name;
  // Entferne Länder-Flag-Muster: 3 Großbuchstaben + Leerzeichen + 1 Großbuchstaben + Leerzeichen
  // z.B. "NED N " oder " ITA N "
  return name.replace(/\b[A-Z]{3}\s+[A-Z]\s+/g, '').trim();
};

export const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  // ✅ NEU: Entferne Länder-Flags vor dem Vergleich
  const str1Clean = removeCountryFlag(str1);
  const str2Clean = removeCountryFlag(str2);
  
  if (normalizeString(str1Clean) === normalizeString(str2Clean)) return 1.0;
  
  // Prüfe Präfix-Matching (für abgekürzte Namen)
  // "SV Blau" sollte gut zu "SV Blau-Weiß-Rot" matchen
  const str1Norm = normalizeString(str1Clean);
  const str2Norm = normalizeString(str2Clean);
  
  // Wenn einer der Strings deutlich kürzer ist, prüfe Präfix-Match
  if (Math.abs(str1Norm.length - str2Norm.length) > 3) {
    const shorter = str1Norm.length < str2Norm.length ? str1Norm : str2Norm;
    const longer = str1Norm.length < str2Norm.length ? str2Norm : str1Norm;
    
    if (isPrefixMatch(shorter, longer)) {
      // Präfix-Match: Score basierend auf Länge des kürzeren Strings
      const prefixScore = shorter.length / longer.length;
      // Mindestens 0.75 für Präfix-Matches, aber nicht mehr als 0.95
      return Math.max(0.75, Math.min(0.95, prefixScore * 1.1));
    }
  }
  
  const jw = jaroWinkler(str1Clean, str2Clean);
  const tsr = tokenSetRatio(str1Clean, str2Clean);
  
  // Gewichtete Kombination
  return (jw * 0.6 + tsr * 0.4);
};

/**
 * ============================================================================
 * CLUB MATCHING
 * ============================================================================
 */
export const matchClub = async (clubName, options = {}) => {
  const { threshold = 0.92, context = null } = options;
  
  try {
    console.log('🔍 Matching Club:', clubName);
    
    // 1. Prüfe Alias-Mappings (falls Tabelle existiert)
    try {
      const { data: aliases, error: aliasError } = await supabase
        .from('alias_mappings')
        .select('normalized_name, mapped_to_id')
        .eq('entity_type', 'club')
        .ilike('raw_alias', clubName)
        .limit(1);
      
      if (!aliasError && aliases && aliases.length > 0) {
        const alias = aliases[0];
        const { data: club } = await supabase
          .from('club_info')
          .select('id, name, city, region')
          .eq('id', alias.mapped_to_id)
          .single();
        
        if (club) {
          console.log('✅ Found via alias:', club.name);
          return {
            match: club,
            score: 0.98,
            matchType: 'alias',
            confidence: 98
          };
        }
      }
    } catch (e) {
      // Tabelle existiert nicht → weitermachen
      console.log('ℹ️ alias_mappings table not available, skipping');
    }
    
    // 2. Exakte Übereinstimmung
    const { data: exactMatch, error: exactError } = await supabase
      .from('club_info')
      .select('id, name, city, region')
      .ilike('name', clubName)
      .maybeSingle();
    
    if (!exactError && exactMatch) {
      return {
        match: exactMatch,
        score: 1.0,
        matchType: 'exact',
        confidence: 100
      };
    }
    
    // 3. Fuzzy Matching mit allen Clubs
    const { data: allClubs, error: clubsError } = await supabase
      .from('club_info')
      .select('id, name, city, region');
    
    if (clubsError) throw clubsError;
    
    // Berechne Similarity für alle
    const matches = allClubs.map(club => ({
      club,
      score: calculateSimilarity(clubName, club.name),
      cityBonus: context?.city && club.city && 
                 normalizeString(context.city) === normalizeString(club.city) ? 0.05 : 0
    })).map(m => ({
      ...m,
      finalScore: Math.min(1.0, m.score + m.cityBonus)
    })).sort((a, b) => b.finalScore - a.finalScore);
    
    const bestMatch = matches[0];
    
    if (!bestMatch || bestMatch.finalScore < threshold) {
      return {
        match: null,
        score: bestMatch?.finalScore || 0,
        matchType: 'none',
        confidence: 0,
        alternatives: matches.slice(0, 5).map(m => ({
          id: m.club.id,
          name: m.club.name,
          city: m.club.city,
          score: m.finalScore
        }))
      };
    }
    
    return {
      match: bestMatch.club,
      score: bestMatch.finalScore,
      matchType: bestMatch.finalScore >= 0.92 ? 'auto' : 'fuzzy',
      confidence: Math.round(bestMatch.finalScore * 100),
      alternatives: matches.slice(1, 5).map(m => ({
        id: m.club.id,
        name: m.club.name,
        city: m.club.city,
        score: m.finalScore
      }))
    };
    
  } catch (error) {
    console.error('❌ Error matching club:', error);
    throw error;
  }
};

/**
 * ============================================================================
 * TEAM MATCHING
 * ============================================================================
 */
export const matchTeam = async (teamName, clubId, category, options = {}) => {
  const { threshold = 0.85, rawClubName = null } = options;
  
  try {
    console.log('🔍 Matching Team:', teamName, 'Club:', clubId, 'Category:', category);
    
    // 1. Normalisiere Team-Name - WICHTIG: Team-Name ist meist nur die Nummer (1, 2, 3, etc.)
    // "Herren 40 3" → team_name sollte "3" sein (nicht "Herren 40 3")
    // Extrahiere die Team-Nummer aus dem Team-Name
    let extractedTeamNumber = teamName.trim();
    
    // Wenn Team-Name "Herren 40 3" oder "Herren 40 1" ist, extrahiere nur die Nummer
    const teamNumberMatch = teamName.match(/(\d+)(?:\s*\(.*?\))?\s*$/); // Finde letzte Zahl vor (4er)
    if (teamNumberMatch) {
      extractedTeamNumber = teamNumberMatch[1]; // Nur die Nummer: "3", "1", etc.
    }
    
    // Entferne Klammern (4er), (6er)
    extractedTeamNumber = extractedTeamNumber.replace(/\s*\(.*?\)\s*/g, '').trim();
    
    console.log('🔍 Extracted team number:', extractedTeamNumber, 'from:', teamName);
    
    // 2. Suche Teams - erst nach club_name (club_id Spalte existiert möglicherweise nicht)
    let candidates = [];
    let resolvedClubName = rawClubName; // Lokale Variable statt Parameter-Überschreibung
    
    // Versuche zuerst nach club_id zu suchen (falls Spalte existiert)
    if (clubId) {
      try {
        // Lade Club-Name aus club_info (falls club_id vorhanden)
        const { data: clubInfo } = await supabase
          .from('club_info')
          .select('name')
          .eq('id', clubId)
          .maybeSingle();
        
        if (clubInfo && clubInfo.name) {
          resolvedClubName = clubInfo.name; // Nutze lokale Variable
        }
      } catch (e) {
        console.warn('⚠️ Could not load club info:', e);
      }
    }
    
    // Suche nach club_name (Haupt-Strategie, da club_id möglicherweise nicht in team_info existiert)
    // WICHTIG: league existiert NICHT in team_info, nur in team_seasons!
    if (resolvedClubName) {
      const { data: clubTeamsByName, error: nameError } = await supabase
        .from('team_info')
        .select('id, team_name, club_name, category')
        .ilike('club_name', `%${resolvedClubName}%`);
      
      if (!nameError && clubTeamsByName) {
        candidates = clubTeamsByName;
      } else if (nameError) {
        console.warn('⚠️ Error loading teams by club_name:', nameError);
      }
    }
    
    // Filtere nach Category (falls vorhanden) - PRIORITÄT 1
    if (category && candidates.length > 0) {
      const categoryMatch = candidates.filter(t => 
        normalizeString(t.category || '').includes(normalizeString(category))
      );
      if (categoryMatch.length > 0) {
        candidates = categoryMatch;
      }
    }
    
    // 3. Match-Logik: PRIORISIERE EXAKTE MATCHES
    const matches = candidates.map(team => {
      const teamNameNorm = normalizeString(team.team_name || '');
      const extractedNorm = normalizeString(extractedTeamNumber);
      
      // PRIORITÄT 1: Exakter Match von Team-Name UND Category
      if (teamNameNorm === extractedNorm && 
          category && 
          normalizeString(team.category || '') === normalizeString(category)) {
        return {
          team,
          score: 1.0, // Perfekter Match
          matchType: 'exact'
        };
      }
      
      // PRIORITÄT 2: Exakter Team-Name Match (ohne Category-Prüfung)
      if (teamNameNorm === extractedNorm) {
        return {
          team,
          score: 0.95, // Sehr guter Match
          matchType: 'exact_name'
        };
      }
      
      // PRIORITÄT 3: Fuzzy Match
      const fuzzyScore = calculateSimilarity(extractedNorm, teamNameNorm);
      
      // Bonus wenn Category exakt matcht
      const categoryBonus = category && 
                           normalizeString(team.category || '') === normalizeString(category) ? 0.15 : 0;
      
      // Bonus wenn Club-Name ähnlich ist
      const clubBonus = resolvedClubName && team.club_name &&
                       calculateSimilarity(normalizeString(resolvedClubName), normalizeString(team.club_name)) > 0.9 
                       ? 0.05 : 0;
      
      return {
        team,
        score: Math.min(0.9, fuzzyScore + categoryBonus + clubBonus), // Max 0.9 für Fuzzy
        matchType: 'fuzzy'
      };
    }).sort((a, b) => {
      // Sortiere: Exakte Matches zuerst, dann nach Score
      if (a.matchType === 'exact' && b.matchType !== 'exact') return -1;
      if (a.matchType !== 'exact' && b.matchType === 'exact') return 1;
      if (a.matchType === 'exact_name' && b.matchType !== 'exact_name') return -1;
      if (a.matchType !== 'exact_name' && b.matchType === 'exact_name') return 1;
      return b.score - a.score;
    });
    
    const bestMatch = matches[0];
    
    if (!bestMatch || bestMatch.score < threshold) {
      return {
        match: null,
        score: bestMatch?.score || 0,
        matchType: 'none',
        confidence: 0,
        alternatives: matches.slice(0, 3).map(m => ({
          id: m.team.id,
          name: m.team.team_name,
          club_name: m.team.club_name,
          score: m.score
        }))
      };
    }
    
    return {
      match: bestMatch.team,
      score: bestMatch.score,
      matchType: bestMatch.score >= 0.92 ? 'auto' : 'fuzzy',
      confidence: Math.round(bestMatch.score * 100),
      alternatives: matches.slice(1, 3).map(m => ({
        id: m.team.id,
        name: m.team.team_name,
        club_name: m.team.club_name,
        score: m.score
      }))
    };
    
  } catch (error) {
    console.error('❌ Error matching team:', error);
    throw error;
  }
};

/**
 * ============================================================================
 * LEAGUE MATCHING
 * ============================================================================
 */
export const matchLeague = async (leagueString, category, group, options = {}) => {
  const { threshold = 0.80 } = options;
  
  try {
    console.log('🔍 Matching League:', leagueString, 'Category:', category, 'Group:', group);
    
    // Extrahiere Liga-Komponenten
    // Format: "Herren 40 1. Kreisliga Gr. 046"
    const leagueParts = {
      category: category || '', // "Herren 40"
      class: leagueString.match(/[\d]+\.?\s*[A-Za-z]+liga/i)?.[0] || '', // "1. Kreisliga"
      group: group || leagueString.match(/Gr\.\s*(\d+)/i)?.[1] || leagueString.match(/Gruppe\s*(\d+)/i)?.[1] || ''
    };
    
    // Suche in team_seasons nach ähnlichen Liga-Kombinationen (besser als team_info!)
    const { data: seasons, error: seasonsError } = await supabase
      .from('team_seasons')
      .select(`
        league,
        group_name,
        team_info!inner(category)
      `)
      .not('league', 'is', null)
      .eq('is_active', true);
    
    if (seasonsError) {
      // Fallback: team_info
      const { data: seasons, error: teamsError } = await supabase
        .from('team_seasons')
        .select('league, group_name, team_info(category)')
        .not('league', 'is', null);
      
      if (teamsError) throw teamsError;
      
      const leagueMatches = seasons
        .map(season => {
          const teamLeagueNorm = normalizeString(season.league || '');
          const inputLeagueNorm = normalizeString(leagueString);
          const score = calculateSimilarity(inputLeagueNorm, teamLeagueNorm);
          
          const groupBonus = leagueParts.group && season.group_name && 
                            normalizeString(leagueParts.group) === normalizeString(season.group_name) ? 0.15 : 0;
          const categoryBonus = category && season.team_info?.category &&
                               normalizeString(category) === normalizeString(season.team_info.category) ? 0.1 : 0;
          
          return {
            league: season.league,
            group: season.group_name,
            category: season.team_info?.category,
            score: Math.min(1.0, score + groupBonus + categoryBonus)
          };
        })
        .sort((a, b) => b.score - a.score);
      
      const bestMatch = leagueMatches[0];
      
      if (!bestMatch || bestMatch.score < threshold) {
        return {
          match: null,
          score: bestMatch?.score || 0,
          matchType: 'none',
          confidence: 0,
          leagueParts
        };
      }
      
      return {
        match: {
          league: bestMatch.league,
          group: bestMatch.group,
          category: bestMatch.category
        },
        score: bestMatch.score,
        matchType: bestMatch.score >= 0.92 ? 'auto' : 'fuzzy',
        confidence: Math.round(bestMatch.score * 100),
        leagueParts
      };
    }
    
    // Nutze team_seasons Daten
    const leagueMatches = seasons
      .map(season => {
        const teamLeagueNorm = normalizeString(season.league || '');
        const inputLeagueNorm = normalizeString(leagueString);
        const score = calculateSimilarity(inputLeagueNorm, teamLeagueNorm);
        
        const groupBonus = leagueParts.group && season.group_name && 
                          normalizeString(leagueParts.group) === normalizeString(season.group_name) ? 0.15 : 0;
        const categoryBonus = category && season.team_info?.category &&
                             normalizeString(category) === normalizeString(season.team_info.category) ? 0.1 : 0;
        
        return {
          league: season.league,
          group: season.group_name,
          category: season.team_info?.category,
          score: Math.min(1.0, score + groupBonus + categoryBonus)
        };
      })
      .sort((a, b) => b.score - a.score);
    
    const bestMatch = leagueMatches[0];
    
    if (!bestMatch || bestMatch.score < threshold) {
      return {
        match: null,
        score: bestMatch?.score || 0,
        matchType: 'none',
        confidence: 0,
        leagueParts
      };
    }
    
    return {
      match: {
        league: bestMatch.league,
        group: bestMatch.group,
        category: bestMatch.category
      },
      score: bestMatch.score,
      matchType: bestMatch.score >= 0.92 ? 'auto' : 'fuzzy',
      confidence: Math.round(bestMatch.score * 100),
      leagueParts
    };
    
  } catch (error) {
    console.error('❌ Error matching league:', error);
    throw error;
  }
};

/**
 * ============================================================================
 * VENUE MATCHING
 * ============================================================================
 */
export const matchVenue = async (venueName, options = {}) => {
  const { threshold = 0.85 } = options;
  
  try {
    // Venues können entweder:
    // 1. Club-Namen sein (z.B. "Marienburger SC")
    // 2. Eigene Venue-Einträge sein (falls Venue-Tabelle existiert)
    
    // Erst versuchen als Club zu matchen
    const clubMatch = await matchClub(venueName, { threshold: 0.90 });
    
    if (clubMatch.match && clubMatch.score >= 0.90) {
      return {
        match: {
          type: 'club',
          id: clubMatch.match.id,
          name: clubMatch.match.name
        },
        score: clubMatch.score,
        matchType: clubMatch.matchType,
        confidence: clubMatch.confidence
      };
    }
    
    // TODO: Venue-Tabelle prüfen falls vorhanden
    
    return {
      match: null,
      score: clubMatch.score,
      matchType: 'none',
      confidence: Math.round(clubMatch.score * 100)
    };
    
  } catch (error) {
    console.error('❌ Error matching venue:', error);
    throw error;
  }
};

/**
 * ============================================================================
 * PARSE & MATCH HELPER (für bestehende ImportTab Integration)
 * ============================================================================
 */

/**
 * Parse Input mit KI (ruft bestehenden Parser auf)
 */
export const parseMatchdayInput = async (text, userEmail = null) => {
  try {
    const response = await fetch('/api/import/parse-matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, userEmail })
    });
    
    if (!response.ok) {
      throw new Error('Parser-Fehler');
    }
    
    const result = await response.json();
    return result.data || result;
    
  } catch (error) {
    console.error('❌ Error parsing input:', error);
    throw error;
  }
};

/**
 * Erkenne und matche alle Entities aus geparsten Daten
 * Gibt ein Review-Objekt zurück (kein DB-Write!)
 */
export const analyzeParsedData = async (parsedData) => {
  try {
    const context = parsedData.team_info || {};
    const review = {
      club: null,
      team: null,
      league: null,
      season: parsedData.season || null,
      matches: []
    };
    
    // 1. Club Matching
    if (context.club_name) {
      const clubMatch = await matchClub(context.club_name, {
        context: { city: context.address, website: context.website }
      });
      
      review.club = {
        raw: context.club_name,
        matched: clubMatch.match,
        score: clubMatch.score,
        confidence: clubMatch.confidence,
        matchType: clubMatch.matchType,
        alternatives: clubMatch.alternatives || [],
        needsReview: clubMatch.score < 0.92
      };
    }
    
    // 2. Team Matching (wenn Club gefunden)
    if (review.club && review.club.matched && context.team_name) {
      // Hole club_id aus matched Club
      const clubId = review.club.matched.id;
      
      const teamMatch = await matchTeam(
        context.team_name,
        clubId,
        context.category,
        {
          rawClubName: context.club_name // Für besseres Matching
        }
      );
      
      review.team = {
        raw: context.team_name,
        matched: teamMatch.match,
        score: teamMatch.score,
        confidence: teamMatch.confidence,
        matchType: teamMatch.matchType,
        alternatives: teamMatch.alternatives || [],
        needsReview: teamMatch.score < 0.85,
        category: context.category
      };
    } else if (context.team_name && !review.club?.matched) {
      // Team-Name erkannt, aber kein Club-Match → muss manuell zugeordnet werden
      review.team = {
        raw: context.team_name,
        matched: null,
        score: 0,
        confidence: 0,
        matchType: 'none',
        alternatives: [],
        needsReview: true,
        category: context.category
      };
    }
    
    // 3. League Matching
    if (context.league) {
      const leagueMatch = await matchLeague(
        context.league,
        context.category,
        context.group || null
      );
      
      review.league = {
        raw: context.league,
        normalized: leagueMatch.match?.league || context.league,
        group: leagueMatch.match?.group || context.group,
        score: leagueMatch.score,
        confidence: leagueMatch.confidence,
        matchType: leagueMatch.matchType,
        needsReview: leagueMatch.score < 0.80,
        leagueParts: leagueMatch.leagueParts
      };
    }
    
    // 4. Match Matching (für jeden Match)
    if (parsedData.matches && parsedData.matches.length > 0) {
      for (const match of parsedData.matches) {
        // Home Team
        const homeClubName = match.home_team?.replace(/\s+\d+$/, '') || '';
        const homeClubMatch = homeClubName ? await matchClub(homeClubName) : null;
        
        // Away Team
        const awayClubName = match.away_team?.replace(/\s+\d+$/, '') || '';
        const awayClubMatch = awayClubName ? await matchClub(awayClubName) : null;
        
        // Venue
        const venueMatch = match.venue ? await matchVenue(match.venue) : null;
        
        // Home Team (vollständig)
        let homeTeamMatch = null;
        if (homeClubMatch?.match) {
          const teamName = match.home_team?.match(/\d+$/)?.[0] || match.home_team;
          homeTeamMatch = await matchTeam(
            teamName,
            homeClubMatch.match.id,
            context.category
          );
        }
        
        // Away Team (vollständig)
        let awayTeamMatch = null;
        if (awayClubMatch?.match) {
          const teamName = match.away_team?.match(/\d+$/)?.[0] || match.away_team;
          awayTeamMatch = await matchTeam(
            teamName,
            awayClubMatch.match.id,
            context.category
          );
        }
        
        review.matches.push({
          raw: match,
          homeClub: homeClubMatch,
          awayClub: awayClubMatch,
          homeTeam: homeTeamMatch,
          awayTeam: awayTeamMatch,
          venue: venueMatch,
          needsReview: !homeClubMatch?.match || !awayClubMatch?.match || 
                      (homeClubMatch.score < 0.92) || (awayClubMatch.score < 0.92)
        });
      }
    }
    
    return review;
    
  } catch (error) {
    console.error('❌ Error analyzing parsed data:', error);
    throw error;
  }
};

/**
 * Export
 */
export const MatchdayImportService = {
  // Fuzzy Matching
  normalizeString,
  calculateSimilarity,
  matchClub,
  matchTeam,
  matchLeague,
  matchVenue,
  
  // Parse & Analyze
  parseMatchdayInput,
  analyzeParsedData
};

export default MatchdayImportService;


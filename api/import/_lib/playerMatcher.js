/**
 * Gemeinsame Spieler-Matching-Logik für nuLiga-Importe
 * 
 * Diese Utility-Funktionen werden von verschiedenen Import-APIs verwendet,
 * um Spieler aus nuLiga-Meldelisten mit players_unified zu matchen.
 */

/**
 * Normalisiert Namen für Vergleich (behandelt "Nachname, Vorname" und Titel)
 */
function normalizeNameForComparison(name) {
  if (!name) return '';
  
  // Entferne Titel (Dr., Prof., etc.)
  let normalized = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
  
  // Konvertiere "Nachname, Vorname" → "Vorname Nachname"
  const commaMatch = normalized.match(/^([^,]+),\s*(.+)$/);
  if (commaMatch) {
    normalized = `${commaMatch[2].trim()} ${commaMatch[1].trim()}`;
  }
  
  return normalized.toLowerCase().trim().replace(/\s+/g, ' ');
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
 * Führt Matching eines Spielers aus nuLiga-Roster mit players_unified durch
 * 
 * @param {object} supabase - Supabase Client
 * @param {object} rosterPlayer - Spieler aus nuLiga-Roster { name, tvmId, lk?, ... }
 * @param {array} playerCache - Optional: Vorher geladene Spieler-Liste für bessere Performance
 * @returns {Promise<object>} { playerId, confidence, matchType, hasUserAccount, allMatches? }
 */
async function matchPlayerToUnified(supabase, rosterPlayer, playerCache = null) {
  try {
    const rosterName = rosterPlayer.name;
    const normalizedRosterName = normalizeNameForComparison(rosterName);
    
    // PRIORITÄT 1: TVM-ID Match (höchste Priorität - eindeutig!)
    if (rosterPlayer.tvmId) {
      // Suche in Cache zuerst (schneller)
      if (playerCache) {
        const tvmMatches = playerCache.filter(p => 
          p.tvm_id === rosterPlayer.tvmId || 
          p.tvm_id_number === rosterPlayer.tvmId
        );
        
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
        return { 
          playerId: tvmMatch.id, 
          confidence: 100, 
          matchType: 'tvm_id',
          hasUserAccount: !!tvmMatch.user_id 
        };
      }
    }
    
    // PRIORITÄT 2: Exakte Namens-Übereinstimmung (mit Normalisierung)
    const normalizedForDb = normalizedRosterName; // Bereits normalisiert
    
    // Suche in Cache
    if (playerCache) {
      const exactMatches = playerCache
        .map(p => ({
          ...p,
          normalizedName: normalizeNameForComparison(p.name)
        }))
        .filter(p => 
          p.normalizedName === normalizedForDb ||
          p.name.toLowerCase() === rosterName.toLowerCase()
        );
      
      if (exactMatches.length > 0) {
        // PRIORITÄT: Bevorzuge Spieler MIT App-Account
        exactMatches.sort((a, b) => {
          if (a.user_id && !b.user_id) return -1;
          if (!a.user_id && b.user_id) return 1;
          return 0;
        });
        
        const exactMatch = exactMatches[0];
        return { 
          playerId: exactMatch.id, 
          confidence: 100, 
          matchType: 'exact',
          hasUserAccount: !!exactMatch.user_id 
        };
      }
    }
    
    // Fallback: DB-Query für exaktes Match
    const { data: exactMatches } = await supabase
      .from('players_unified')
      .select('id, name, current_lk, tvm_id_number, user_id, email')
      .ilike('name', normalizedRosterName)
      .limit(10);
    
    if (exactMatches && exactMatches.length > 0) {
      // PRIORITÄT: Bevorzuge Spieler MIT App-Account
      exactMatches.sort((a, b) => {
        if (a.user_id && !b.user_id) return -1;
        if (!a.user_id && b.user_id) return 1;
        return 0;
      });
      
      // Prüfe exakte Übereinstimmung mit normalisiertem Namen
      const exactMatch = exactMatches.find(p => 
        normalizeNameForComparison(p.name) === normalizedForDb ||
        p.name.toLowerCase() === rosterName.toLowerCase()
      );
      
      if (exactMatch) {
        return { 
          playerId: exactMatch.id, 
          confidence: 100, 
          matchType: 'exact',
          hasUserAccount: !!exactMatch.user_id 
        };
      }
    }
    
    // PRIORITÄT 3: Fuzzy-Matching (Name-Ähnlichkeit)
    // Lade alle Spieler (wenn nicht im Cache)
    let allPlayers = playerCache;
    if (!allPlayers) {
      const { data: playersData } = await supabase
        .from('players_unified')
        .select('id, name, current_lk, tvm_id_number, user_id, email')
        .limit(1000); // Begrenze für Performance
      
      allPlayers = playersData || [];
    }
    
    if (allPlayers.length === 0) {
      return { playerId: null, confidence: 0, matchType: 'none', hasUserAccount: false };
    }
    
    // Berechne Similarity für alle Spieler
    const matches = allPlayers
      .map(player => ({
        ...player,
        normalizedName: normalizeNameForComparison(player.name),
        similarity: calculateSimilarity(
          normalizeNameForComparison(player.name), 
          normalizedRosterName
        )
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
    return { playerId: null, confidence: 0, matchType: 'none', hasUserAccount: false };
    
  } catch (error) {
    console.error('[playerMatcher] ❌ Fehler beim Matching:', error);
    return { playerId: null, confidence: 0, matchType: 'error', hasUserAccount: false, error: error.message };
  }
}

/**
 * Batch-Matching für mehrere Spieler (optimiert für Performance)
 * 
 * @param {object} supabase - Supabase Client
 * @param {array} rosterPlayers - Array von Spielern aus nuLiga-Roster
 * @returns {Promise<array>} Array von Match-Ergebnissen
 */
async function matchPlayersBatch(supabase, rosterPlayers) {
  try {
    // Lade alle Spieler einmal (Cache für alle Matches)
    const { data: allPlayers } = await supabase
      .from('players_unified')
      .select('id, name, current_lk, tvm_id, tvm_id_number, user_id, email')
      .limit(1000);
    
    const playerCache = allPlayers || [];
    
    // Matche alle Spieler parallel
    const matchPromises = rosterPlayers.map(player => 
      matchPlayerToUnified(supabase, player, playerCache)
    );
    
    return await Promise.all(matchPromises);
    
  } catch (error) {
    console.error('[playerMatcher] ❌ Fehler beim Batch-Matching:', error);
    // Fallback: Rückgabe von "no match" für alle
    return rosterPlayers.map(() => ({ 
      playerId: null, 
      confidence: 0, 
      matchType: 'error',
      hasUserAccount: false 
    }));
  }
}

module.exports = {
  normalizeNameForComparison,
  calculateSimilarity,
  matchPlayerToUnified,
  matchPlayersBatch
};


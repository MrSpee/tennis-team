/**
 * LK-Utility-Funktionen
 * Unterstützt deutsche (13,6) und internationale (13.6) Eingabe
 */

/**
 * Entfernt Länderkürzel aus LK-String (z.B. "IRL 6" → "6")
 * Länderkürzel sind 3 Großbuchstaben gefolgt von Leerzeichen
 */
function removeCountryCodeFromLK(lkString) {
  if (!lkString) return lkString;
  // Entferne Länderkürzel-Muster: 3 Großbuchstaben + Leerzeichen am Anfang
  // z.B. "IRL 6" → "6", "NED 12.5" → "12.5"
  return String(lkString).replace(/^[A-Z]{3}\s+/i, '').trim();
}

/**
 * Normalisiert LK-Eingabe für Speicherung
 * Eingabe: "13,6", "13.6", "LK 13,6", "LK 13.6", "13.6", "IRL 6", "NED 12.5"
 * Ausgabe: "LK 13.6" (immer mit Punkt, mit "LK " Prefix)
 */
export function normalizeLK(input) {
  if (!input || input.trim() === '') return null;
  
  // ✅ NEU: Entferne Länderkürzel zuerst (z.B. "IRL 6" → "6")
  let cleaned = removeCountryCodeFromLK(input);
  
  // Entferne "LK " falls vorhanden
  cleaned = cleaned.replace(/LK\s*/i, '').trim();
  
  // Ersetze Komma durch Punkt
  cleaned = cleaned.replace(',', '.');
  
  // Entferne alle nicht-numerischen Zeichen außer Punkt und Minus
  // (für Fälle wie "IRL 6.5" oder "6.5 (alt)")
  cleaned = cleaned.replace(/[^\d.-]/g, '').trim();
  
  // Parse zu Number und validiere
  const number = parseFloat(cleaned);
  
  if (isNaN(number) || number < 1 || number > 25) {
    console.warn('⚠️ Ungültige LK:', input, '(bereinigt:', cleaned, ')');
    return null;
  }
  
  // Formatiere einheitlich: "LK 13.6"
  return `LK ${number.toFixed(1)}`;
}

/**
 * Parsed LK-String zu Nummer für Berechnungen
 * Eingabe: "LK 13.6", "13,6", "13.6", "IRL 6", "NED 12.5"
 * Ausgabe: 13.6 (Number)
 */
export function parseLK(lk) {
  if (!lk) return 25; // Default LK für Anfänger
  if (typeof lk === 'number') return lk;
  
  // ✅ NEU: Entferne Länderkürzel zuerst (z.B. "IRL 6" → "6")
  let cleaned = removeCountryCodeFromLK(lk);
  
  // Entferne "LK " und ersetze Komma durch Punkt
  cleaned = cleaned
    .replace(/LK\s*/i, '')
    .replace(',', '.')
    .trim();
  
  // Entferne alle nicht-numerischen Zeichen außer Punkt und Minus
  // (für Fälle wie "IRL 6.5" oder "6.5 (alt)")
  cleaned = cleaned.replace(/[^\d.-]/g, '').trim();
  
  const parsed = parseFloat(cleaned);
  
  // Validierung: LK muss zwischen 1 und 25 sein
  if (isNaN(parsed) || parsed < 1 || parsed > 25) {
    console.warn('⚠️ Ungültige LK beim Parsen:', lk, '(bereinigt:', cleaned, ') → Default 25');
    return 25;
  }
  
  return parsed;
}

/**
 * Formatiert LK-Nummer für Anzeige
 * Eingabe: 13.6
 * Ausgabe: "LK 13.6"
 */
export function formatLK(lkNumber) {
  if (!lkNumber || isNaN(lkNumber)) return null;
  
  // Eine Dezimalstelle
  return `LK ${Number(lkNumber).toFixed(1)}`;
}

/**
 * Validiert LK-Eingabe
 * Gibt zurück: { valid: boolean, normalized: string|null, error: string|null, warning: string|null }
 */
export function validateLK(input) {
  if (!input || input.trim() === '') {
    return { valid: true, normalized: null, error: null, warning: null }; // LK ist optional
  }
  
  try {
    const normalized = normalizeLK(input);
    
    if (!normalized) {
      return {
        valid: false,
        normalized: null,
        error: 'Ungültige LK. Format: "LK 13.6" oder "13.6" (Werte zwischen 1 und 25)',
        warning: null
      };
    }
    
    // Warnung für verdächtig niedrige oder hohe LK-Werte
    const lkValue = parseLK(normalized);
    let warning = null;
    
    if (lkValue < 7) {
      warning = `⚠️ Verdächtig niedrige LK: ${normalized}. Bitte prüfen, ob dies wirklich die LK ist oder möglicherweise die Position in der Meldeliste.`;
    } else if (lkValue > 20) {
      warning = `⚠️ Verdächtig hohe LK: ${normalized}. Bitte prüfen, ob dies korrekt ist.`;
    }
    
    return { valid: true, normalized, error: null, warning };
  } catch (error) {
    return {
      valid: false,
      normalized: null,
      error: 'Fehler beim Validieren der LK',
      warning: null
    };
  }
}

/**
 * Validiert LK gegen andere Spieler in der gleichen Mannschaft
 * Gibt zurück: { valid: boolean, normalized: string|null, error: string|null, warning: string|null }
 * @param {string} input - LK-Eingabe
 * @param {Array} teamPlayers - Array von Spielern in der gleichen Mannschaft mit { current_lk, name }
 */
export function validateLKAgainstTeam(input, teamPlayers = []) {
  const baseValidation = validateLK(input);
  
  if (!baseValidation.valid || !baseValidation.normalized) {
    return baseValidation;
  }
  
  if (!teamPlayers || teamPlayers.length === 0) {
    return baseValidation; // Keine Team-Daten verfügbar
  }
  
  const lkValue = parseLK(baseValidation.normalized);
  
  // Berechne LK-Range der Mannschaft
  const teamLKs = teamPlayers
    .map(p => {
      const lk = parseLK(p.current_lk || p.season_start_lk || p.ranking);
      return lk;
    })
    .filter(lk => lk >= 1 && lk <= 25); // Nur gültige LKs
  
  if (teamLKs.length === 0) {
    return baseValidation; // Keine gültigen LKs im Team
  }
  
  const minLK = Math.min(...teamLKs);
  const maxLK = Math.max(...teamLKs);
  const avgLK = teamLKs.reduce((sum, lk) => sum + lk, 0) / teamLKs.length;
  const range = maxLK - minLK;
  
  // Warnung wenn LK deutlich außerhalb der Team-Range liegt
  let warning = baseValidation.warning;
  
  // Prüfe ob LK außerhalb der Team-Range liegt (mit Toleranz)
  const tolerance = Math.max(2.0, range * 0.3); // Mindestens 2.0, oder 30% der Range
  
  if (lkValue < minLK - tolerance) {
    warning = `⚠️ LK ${baseValidation.normalized} ist deutlich besser als die anderen Spieler in der Mannschaft (Range: ${minLK.toFixed(1)} - ${maxLK.toFixed(1)}, Ø: ${avgLK.toFixed(1)}). Bitte prüfen, ob dies korrekt ist.`;
  } else if (lkValue > maxLK + tolerance) {
    warning = `⚠️ LK ${baseValidation.normalized} ist deutlich schlechter als die anderen Spieler in der Mannschaft (Range: ${minLK.toFixed(1)} - ${maxLK.toFixed(1)}, Ø: ${avgLK.toFixed(1)}). Bitte prüfen, ob dies korrekt ist.`;
  }
  
  return {
    ...baseValidation,
    warning
  };
}

/**
 * Berechnet LK-Änderung (Start → Aktuell)
 * Eingabe: startLK = "LK 14.0", currentLK = "LK 13.2"
 * Ausgabe: -0.8 (negative Zahl = Verbesserung, da LK gesunken ist!)
 * 
 * Logik: current - start
 * - Negativ = Verbesserung (LK ist gesunken, z.B. 12.6 → 12.2 = -0.4)
 * - Positiv = Verschlechterung (LK ist gestiegen, z.B. 12.2 → 12.6 = +0.4)
 */
export function calculateLKChange(startLK, currentLK) {
  const start = parseLK(startLK);
  const current = parseLK(currentLK);
  
  // Niedrigere LK = besser
  // current - start: Wenn LK sinkt (z.B. 12.6 → 12.2), ist das negativ = Verbesserung
  return current - start;
}

/**
 * Formatiert LK-Änderung für Anzeige
 * Eingabe: -0.8
 * Ausgabe: { text: "-0.8", icon: "▼", color: "green", label: "Verbesserung" }
 */
export function formatLKChange(change) {
  if (!change || Math.abs(change) < 0.1) {
    return {
      text: '0.0',
      icon: '■',
      color: 'gray',
      label: 'Keine Änderung'
    };
  }
  
  if (change < 0) {
    // Negative Änderung = Verbesserung (LK wurde niedriger)
    return {
      text: change.toFixed(1),
      icon: '▼',
      color: 'green',
      label: 'Verbesserung'
    };
  }
  
  // Positive Änderung = Verschlechterung (LK wurde höher)
  return {
    text: `+${change.toFixed(1)}`,
    icon: '▲',
    color: 'red',
    label: 'Verschlechterung'
  };
}

/**
 * Prüft, ob season_start_lk deutlich höher ist als current_lk
 * Dies kann passieren, wenn die Meldeliste eine falsche LK enthält
 * oder wenn ein Spieler Turniere gespielt hat, die nicht erfasst wurden
 * 
 * @param {string|null} seasonStartLK - season_start_lk Wert
 * @param {string|null} currentLK - current_lk Wert
 * @param {number} threshold - Mindest-Differenz für Warnung (Standard: 1.0)
 * @returns {Object} { needsCorrection: boolean, difference: number, correctedSeasonStartLK: string|null }
 */
export function checkSeasonStartLKInconsistency(seasonStartLK, currentLK, threshold = 1.0) {
  // Wenn keine Werte vorhanden, keine Korrektur nötig
  if (!seasonStartLK || !currentLK) {
    return {
      needsCorrection: false,
      difference: 0,
      correctedSeasonStartLK: null
    };
  }

  const seasonStart = parseLK(seasonStartLK);
  const current = parseLK(currentLK);
  const difference = seasonStart - current;

  // Wenn season_start_lk deutlich höher ist als current_lk, ist das verdächtig
  // (normalerweise sollte season_start_lk <= current_lk sein, da LK sich verbessern kann)
  if (difference > threshold) {
    // Korrigiere season_start_lk auf current_lk
    return {
      needsCorrection: true,
      difference: difference,
      correctedSeasonStartLK: formatLK(current)
    };
  }

  return {
    needsCorrection: false,
    difference: difference,
    correctedSeasonStartLK: null
  };
}

/**
 * Korrigiert season_start_lk für einen Spieler, wenn es deutlich höher ist als current_lk
 * 
 * @param {Object} player - Spieler-Objekt mit id, season_start_lk, current_lk
 * @param {Object} supabase - Supabase Client
 * @param {number} threshold - Mindest-Differenz für Korrektur (Standard: 1.0)
 * @returns {Promise<Object>} { corrected: boolean, oldValue: string, newValue: string, playerName: string }
 */
export async function correctSeasonStartLKIfNeeded(player, supabase, threshold = 1.0) {
  if (!player || !player.id) {
    return { corrected: false, error: 'Spieler-Daten fehlen' };
  }

  const check = checkSeasonStartLKInconsistency(
    player.season_start_lk,
    player.current_lk,
    threshold
  );

  if (!check.needsCorrection) {
    return { corrected: false };
  }

  try {
    const { error } = await supabase
      .from('players_unified')
      .update({
        season_start_lk: check.correctedSeasonStartLK,
        updated_at: new Date().toISOString()
      })
      .eq('id', player.id);

    if (error) {
      console.error('❌ Fehler beim Korrigieren von season_start_lk:', error);
      return { corrected: false, error: error.message };
    }

    console.log(`✅ season_start_lk korrigiert für ${player.name}: ${player.season_start_lk} → ${check.correctedSeasonStartLK} (Differenz: ${check.difference.toFixed(1)})`);

    return {
      corrected: true,
      oldValue: player.season_start_lk,
      newValue: check.correctedSeasonStartLK,
      playerName: player.name,
      difference: check.difference
    };
  } catch (error) {
    console.error('❌ Fehler beim Korrigieren von season_start_lk:', error);
    return { corrected: false, error: error.message };
  }
}

/**
 * Prüft und korrigiert season_start_lk für mehrere Spieler
 * 
 * @param {Array} players - Array von Spieler-Objekten
 * @param {Object} supabase - Supabase Client
 * @param {number} threshold - Mindest-Differenz für Korrektur (Standard: 1.0)
 * @returns {Promise<Array>} Array von Korrektur-Ergebnissen
 */
export async function correctSeasonStartLKForPlayers(players, supabase, threshold = 1.0) {
  if (!players || players.length === 0) {
    return [];
  }

  const results = [];

  for (const player of players) {
    const result = await correctSeasonStartLKIfNeeded(player, supabase, threshold);
    if (result.corrected) {
      results.push(result);
    }
  }

  if (results.length > 0) {
    console.log(`✅ ${results.length} Spieler mit inkonsistenter season_start_lk korrigiert`);
  }

  return results;
}




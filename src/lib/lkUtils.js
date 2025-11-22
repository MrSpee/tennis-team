/**
 * LK-Utility-Funktionen
 * Unterstützt deutsche (13,6) und internationale (13.6) Eingabe
 */

/**
 * Normalisiert LK-Eingabe für Speicherung
 * Eingabe: "13,6", "13.6", "LK 13,6", "LK 13.6", "13.6"
 * Ausgabe: "LK 13.6" (immer mit Punkt, mit "LK " Prefix)
 */
export function normalizeLK(input) {
  if (!input || input.trim() === '') return null;
  
  // Entferne "LK " falls vorhanden
  let cleaned = String(input).replace(/LK\s*/i, '').trim();
  
  // Ersetze Komma durch Punkt
  cleaned = cleaned.replace(',', '.');
  
  // Parse zu Number und validiere
  const number = parseFloat(cleaned);
  
  if (isNaN(number) || number < 1 || number > 25) {
    console.warn('⚠️ Ungültige LK:', input);
    return null;
  }
  
  // Formatiere einheitlich: "LK 13.6"
  return `LK ${number.toFixed(1)}`;
}

/**
 * Parsed LK-String zu Nummer für Berechnungen
 * Eingabe: "LK 13.6", "13,6", "13.6"
 * Ausgabe: 13.6 (Number)
 */
export function parseLK(lk) {
  if (!lk) return 25; // Default LK für Anfänger
  if (typeof lk === 'number') return lk;
  
  // Entferne "LK " und ersetze Komma durch Punkt
  const normalized = String(lk)
    .replace(/LK\s*/i, '')
    .replace(',', '.')
    .trim();
  
  const parsed = parseFloat(normalized);
  
  // Validierung: LK muss zwischen 1 und 25 sein
  if (isNaN(parsed) || parsed < 1 || parsed > 25) {
    console.warn('⚠️ Ungültige LK beim Parsen:', lk, '→ Default 25');
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




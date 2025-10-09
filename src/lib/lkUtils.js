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
 * Gibt zurück: { valid: boolean, normalized: string|null, error: string|null }
 */
export function validateLK(input) {
  if (!input || input.trim() === '') {
    return { valid: true, normalized: null, error: null }; // LK ist optional
  }
  
  try {
    const normalized = normalizeLK(input);
    
    if (!normalized) {
      return {
        valid: false,
        normalized: null,
        error: 'Ungültige LK. Format: "LK 13.6" oder "13.6" (Werte zwischen 1 und 25)'
      };
    }
    
    return { valid: true, normalized, error: null };
  } catch (error) {
    return {
      valid: false,
      normalized: null,
      error: 'Fehler beim Validieren der LK'
    };
  }
}

/**
 * Berechnet LK-Änderung (Start → Aktuell)
 * Eingabe: startLK = "LK 14.0", currentLK = "LK 13.2"
 * Ausgabe: -0.8 (negative Zahl = Verbesserung!)
 */
export function calculateLKChange(startLK, currentLK) {
  const start = parseLK(startLK);
  const current = parseLK(currentLK);
  
  // Niedrigere LK = besser, also Start - Current
  return start - current;
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


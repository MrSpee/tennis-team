/**
 * EINFACHES ROTATIONS-SYSTEM
 * 
 * Logik:
 * - Bei ≥5 Anmeldungen: Ein Spieler muss aussetzen
 * - Bei <5 Anmeldungen: Kein Aussetzer
 * - Rotation: 5 Spieler durchrotieren
 */

/**
 * Berechne wer aussetzen muss basierend auf einfacher Rotation
 * 
 * @param {object} training - Training Session
 * @param {array} attendance - Attendance Array
 * @param {number} currentRotationIndex - Aktuelle Position in Rotation (0-4)
 * @param {array} rotationList - Liste der 5 Spieler
 * @returns {object} - { setter: object|null, confirmedCount: number, shouldRotate: boolean }
 */
export const calculateSimpleRotation = (training, attendance, currentRotationIndex, rotationList) => {
  // Zähle confirmed-Anmeldungen
  const confirmedCount = attendance.filter(a => a.status === 'confirmed').length;
  
  // Bei ≥5: Jemand muss aussetzen
  // Bei <5: Niemand muss aussetzen
  const shouldSitOut = confirmedCount >= 5;
  
  // WICHTIG: Nur Spieler mit ID können aussetzen
  // Wenn der aktuelle Spieler keine ID hat, suche den nächsten Spieler mit ID
  let setter = null;
  if (shouldSitOut) {
    // Filtere nur Spieler mit ID aus der Rotation-Liste
    const playersWithId = rotationList.filter(p => p.id !== null && p.id !== undefined);
    
    if (playersWithId.length === 0) {
      // Keine Spieler mit ID in der Rotation-Liste
      setter = null;
    } else {
      // Finde den Index des aktuellen Spielers in der Liste der Spieler mit ID
      const currentPlayer = rotationList[currentRotationIndex];
      let effectiveIndex = playersWithId.findIndex(p => p.id === currentPlayer?.id);
      
      // Wenn der aktuelle Spieler keine ID hat, nimm den ersten Spieler mit ID
      if (effectiveIndex === -1) {
        effectiveIndex = 0;
      }
      
      setter = playersWithId[effectiveIndex];
    }
  }
  
  return {
    setter,
    confirmedCount,
    shouldRotate: shouldSitOut && setter !== null // Rotation nur bei ≥5 UND wenn ein Spieler mit ID gefunden wurde
  };
};

/**
 * Bestimme wer im Training spielen kann und wer aussetzen muss
 * 
 * @param {object} training - Training Session
 * @param {array} attendance - Attendance Array
 * @param {number} currentRotationIndex - Aktuelle Position in Rotation (0-4)
 * @param {array} rotationList - Liste der 5 Spieler
 * @returns {object} - { canPlay: array, waitlist: array, rotationIndex: number }
 */
export const calculateTrainingParticipants = (training, attendance, currentRotationIndex, rotationList) => {
  const { setter, confirmedCount, shouldRotate } = calculateSimpleRotation(
    training, 
    attendance, 
    currentRotationIndex, 
    rotationList
  );
  
  // WICHTIG: Verwende nur Spieler mit ID für die Rotation
  const playersWithId = rotationList.filter(p => p.id !== null && p.id !== undefined);
  const rotationSize = playersWithId.length || 5; // Fallback auf 5 wenn keine IDs gefunden
  
  // Nächster Rotation-Index (basierend auf tatsächlicher Anzahl Spieler mit ID)
  const nextIndex = shouldRotate ? ((currentRotationIndex + 1) % rotationSize) : currentRotationIndex;
  
  const confirmed = attendance.filter(a => a.status === 'confirmed');
  
  // Wenn Aussetzer feststeht: Er kommt auf Warteliste, alle anderen spielen
  if (setter) {
    const waitlist = confirmed.filter(a => a.player_id === setter.id);
    const canPlay = confirmed.filter(a => a.player_id !== setter.id);
    
    return {
      canPlay: canPlay.map(a => ({ ...a, position: 0 })),
      waitlist: waitlist.map(a => ({ ...a, position: 1 })),
      rotationIndex: nextIndex
    };
  }
  
  // Kein Aussetzer: Alle können spielen
  return {
    canPlay: confirmed.map(a => ({ ...a, position: 0 })),
    waitlist: [],
    rotationIndex: nextIndex
  };
};

export default {
  calculateSimpleRotation,
  calculateTrainingParticipants
};


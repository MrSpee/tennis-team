// Helper-Funktionen für Match-Berechnungen

export const calculateSetWinner = (home, guest, isChampionsTiebreak = false) => {
  if (isChampionsTiebreak) {
    if (home >= 10 && home >= guest + 2) return 'home';
    if (guest >= 10 && guest >= home + 2) return 'guest';
    return null;
  } else {
    // Tiebreak-Sieg: 7:6 oder 6:7
    if ((home === 7 && guest === 6) || (guest === 7 && home === 6)) {
      return home > guest ? 'home' : 'guest';
    }
    
    // Normaler Satzgewinn ohne Tiebreak: 7:5 oder besser
    if ((home === 7 && guest <= 5) || (guest === 7 && home <= 5)) {
      return home > guest ? 'home' : 'guest';
    }
    
    // Normaler Satz gewonnen (6:0, 6:1, 6:2, 6:3, 6:4)
    if (home >= 6 && home >= guest + 2) return 'home';
    if (guest >= 6 && guest >= home + 2) return 'guest';
    
    // Tiebreak wird gerade gespielt (6:6)
    if (home === 6 && guest === 6) return null;
    
    return null;
  }
};

export const calculateMatchWinner = (result) => {
  let homeSetsWon = 0;
  let guestSetsWon = 0;
  
  const sets = [
    { home: result.set1_home, guest: result.set1_guest },
    { home: result.set2_home, guest: result.set2_guest },
    { home: result.set3_home, guest: result.set3_guest }
  ];
  
  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    const home = parseInt(set.home) || 0;
    const guest = parseInt(set.guest) || 0;
    
    if (home === 0 && guest === 0) continue;
    
    const setWinner = calculateSetWinner(home, guest, i === 2);
    
    if (setWinner === 'home') homeSetsWon++;
    else if (setWinner === 'guest') guestSetsWon++;
  }
  
  if (homeSetsWon >= 2) return 'home';
  if (guestSetsWon >= 2) return 'guest';
  return null;
};


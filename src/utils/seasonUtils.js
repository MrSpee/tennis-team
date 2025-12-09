// Helper-Funktionen für Saison-Berechnungen

export const getCurrentSeason = (currentTime = new Date()) => {
  const currentMonth = currentTime.getMonth();
  const currentYear = currentTime.getFullYear();
  
  if (currentMonth >= 4 && currentMonth <= 7) {
    return { season: 'summer', display: `Sommer ${currentYear}` };
  } else {
    if (currentMonth >= 8) {
      const nextYear = currentYear + 1;
      return { season: 'winter', display: `Winter ${String(currentYear).slice(-2)}/${String(nextYear).slice(-2)}` };
    } else {
      const prevYear = currentYear - 1;
      return { season: 'winter', display: `Winter ${String(prevYear).slice(-2)}/${String(currentYear).slice(-2)}` };
    }
  }
};


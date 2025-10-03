import { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext();

export function useData() {
  return useContext(DataContext);
}

// Initial mock data
const initialMatches = [
  {
    id: 1,
    date: new Date(2025, 10, 10, 14, 0),
    opponent: 'TC Grün-Weiß München',
    location: 'Home',
    season: 'winter',
    playersNeeded: 4,
    availability: {}
  },
  {
    id: 2,
    date: new Date(2025, 10, 17, 10, 0),
    opponent: 'SV Rosenheim Tennis',
    location: 'Away',
    season: 'winter',
    playersNeeded: 4,
    availability: {}
  },
  {
    id: 3,
    date: new Date(2025, 10, 24, 14, 0),
    opponent: 'TSV Unterhaching',
    location: 'Home',
    season: 'winter',
    playersNeeded: 4,
    availability: {}
  }
];

const initialPlayers = [
  { id: 1, name: 'Max Müller', ranking: 'LK 8', points: 850 },
  { id: 2, name: 'Thomas Weber', ranking: 'LK 10', points: 720 },
  { id: 3, name: 'Stefan Schmidt', ranking: 'LK 9', points: 780 },
  { id: 4, name: 'Michael Wagner', ranking: 'LK 11', points: 650 },
  { id: 5, name: 'Andreas Becker', ranking: 'LK 9', points: 795 },
  { id: 6, name: 'Christian Fischer', ranking: 'LK 12', points: 580 },
  { id: 7, name: 'Martin Schulz', ranking: 'LK 10', points: 740 },
  { id: 8, name: 'Daniel Hofmann', ranking: 'LK 11', points: 670 },
  { id: 9, name: 'Sebastian Braun', ranking: 'LK 8', points: 830 },
  { id: 10, name: 'Florian Klein', ranking: 'LK 13', points: 520 },
  { id: 11, name: 'Johannes Wolf', ranking: 'LK 9', points: 760 },
  { id: 12, name: 'Markus Zimmermann', ranking: 'LK 10', points: 710 },
  { id: 13, name: 'Tobias Krüger', ranking: 'LK 12', points: 600 },
  { id: 14, name: 'Alexander Hartmann', ranking: 'LK 11', points: 680 }
];

const initialLeagueStandings = [
  { position: 1, team: 'TC Blau-Weiß Augsburg', matches: 8, wins: 7, losses: 1, points: 14 },
  { position: 2, team: 'Your Team', matches: 8, wins: 5, losses: 3, points: 10 },
  { position: 3, team: 'TC Grün-Weiß München', matches: 8, wins: 5, losses: 3, points: 10 },
  { position: 4, team: 'SV Rosenheim Tennis', matches: 8, wins: 4, losses: 4, points: 8 },
  { position: 5, team: 'TSV Unterhaching', matches: 8, wins: 3, losses: 5, points: 6 },
  { position: 6, team: 'TC Rot-Weiß Ingolstadt', matches: 8, wins: 0, losses: 8, points: 0 }
];

export function DataProvider({ children }) {
  const [matches, setMatches] = useState(() => {
    const stored = localStorage.getItem('matches');
    return stored ? JSON.parse(stored, (key, value) => {
      if (key === 'date') return new Date(value);
      return value;
    }) : initialMatches;
  });

  const [players, setPlayers] = useState(() => {
    const stored = localStorage.getItem('players');
    return stored ? JSON.parse(stored) : initialPlayers;
  });

  const [leagueStandings, setLeagueStandings] = useState(() => {
    const stored = localStorage.getItem('leagueStandings');
    return stored ? JSON.parse(stored) : initialLeagueStandings;
  });

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('matches', JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem('players', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem('leagueStandings', JSON.stringify(leagueStandings));
  }, [leagueStandings]);

  const addMatch = (match) => {
    const newMatch = {
      ...match,
      id: Date.now(),
      availability: {}
    };
    setMatches([...matches, newMatch]);
  };

  const updateMatchAvailability = (matchId, playerName, status, comment = '') => {
    setMatches(matches.map(match => {
      if (match.id === matchId) {
        return {
          ...match,
          availability: {
            ...match.availability,
            [playerName]: { status, comment, timestamp: new Date() }
          }
        };
      }
      return match;
    }));
  };

  const deleteMatch = (matchId) => {
    setMatches(matches.filter(match => match.id !== matchId));
  };

  const value = {
    matches,
    players,
    leagueStandings,
    addMatch,
    updateMatchAvailability,
    deleteMatch,
    setLeagueStandings
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

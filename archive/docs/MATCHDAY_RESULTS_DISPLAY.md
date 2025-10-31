# Match Results Display - Implementation Plan

## Problem
- Results werden aktuell mit Platzhaltern angezeigt ("Spieler 1", "Gegner 1")
- Keine Profilbilder, keine echten Namen, keine LK-Anzeige
- Design soll wie im Bild sein

## Lösung

### 1. State für Spieler-Daten
```javascript
const [playerData, setPlayerData] = useState({}); // playerId -> {name, current_lk, profile_image}
```

### 2. Lade Spieler-Daten wenn results geladen werden
```javascript
useEffect(() => {
  if (results.length > 0) {
    loadAllPlayerData();
  }
}, [results]);

const loadAllPlayerData = async () => {
  const allPlayerIds = new Set();
  results.forEach(r => {
    if (r.home_player1_id) allPlayerIds.add(r.home_player1_id);
    if (r.home_player2_id) allPlayerIds.add(r.home_player2_id);
    if (r.guest_player1_id) allPlayerIds.add(r.guest_player1_id);
    if (r.guest_player2_id) allPlayerIds.add(r.guest_player2_id);
  });

  const playerDataMap = {};
  await Promise.all(
    Array.from(allPlayerIds).map(async (id) => {
      const data = await loadPlayerData(id);
      if (data) playerDataMap[id] = data;
    })
  );
  
  setPlayerData(playerDataMap);
};
```

### 3. Neue renderMatchCard Funktion (nicht async)
```javascript
const renderMatchCard = (result) => {
  const isSingles = result.match_type === 'Einzel';
  const winner = result.winner;
  
  const player1 = playerData[result.home_player1_id] || {};
  const player2 = playerData[result.home_player2_id] || {};
  const player3 = playerData[result.guest_player1_id] || {};
  const player4 = playerData[result.guest_player2_id] || {};
  
  const getProfileImageSrc = (index) => {
    const images = ['/face1.jpg', '/face2.jpg', '/face3.jpg', '/face4.jpg', '/face5.jpg'];
    return images[index % images.length];
  };

  return (
    <div key={result.id || result.match_number} className="match-result-card" style={{...}}>
      {/* ... */}
    </div>
  );
};
```

### 4. Design wie im Bild
- Profilbild: 50x50px, rund, blauer Rand für Heim, roter für Gegner
- Name + LK in einer Zeile
- Scores rechts: Satz 1, 2, 3
- Visueller Trennstrich zwischen Teams

### 5. Fallback für Profilbilder
```javascript
onError={(e) => { e.target.src = getProfileImageSrc(0); }}
```

## Wichtig
- Funktion `renderMatchCard` darf NICHT async sein
- Alle Daten müssen VOR dem Render geladen werden (useEffect)
- Profilbilder aus `/public/` Ordner
- Länder-Flagge NICHT anzeigen (wie im Bild auch nicht)



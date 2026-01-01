# 🚀 Sofort-Tests für die neuen APIs (nach Deployment)

## ✅ Deine APIs sind jetzt live!

**Base-URL:** `https://tennis-team-gamma.vercel.app/api/import/`

---

## 🧪 TEST 1: Club-Info extrahieren

### Im Browser (F12 → Console):

```javascript
fetch('https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'club-info',
    clubPoolsUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154'
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ Club-Info:', data);
  console.log('Club-Name:', data.clubName);
  console.log('Club-Nummer:', data.clubNumber);
})
.catch(error => console.error('❌ Fehler:', error));
```

**Erwartetes Ergebnis:**
```json
{
  "success": true,
  "clubNumber": "36154",
  "clubName": "VKC Köln"
}
```

---

## 🧪 TEST 2: Teams auflisten

### Im Browser (F12 → Console):

```javascript
fetch('https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'teams',
    clubPoolsUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154',
    targetSeason: 'Winter 2025/2026'
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ Teams gefunden:', data.totalTeams);
  console.log('Teams-Liste:', data.teams);
  data.teams.forEach((team, index) => {
    console.log(`${index + 1}. ${team.contestType} - ${team.playerCount} Spieler`);
  });
})
.catch(error => console.error('❌ Fehler:', error));
```

**Erwartetes Ergebnis:**
- Liste aller Teams mit Spieleranzahl
- z.B. "Herren 40 - 12 Spieler", "Damen 1 - 8 Spieler", etc.

---

## 🧪 TEST 3: Meldelisten mit Matching-Review

**⚠️ Dieser Test dauert etwas länger (lädt alle Meldelisten)!**

### Im Browser (F12 → Console):

```javascript
fetch('https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'roster',
    clubPoolsUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154',
    targetSeason: 'Winter 2025/2026',
    apply: false
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ Meldelisten geladen');
  console.log('Teams:', data.teams.length);
  console.log('Matching-Ergebnisse:', data.matchingResults.length);
  
  // Zeige Statistiken pro Team
  data.matchingResults.forEach(teamResult => {
    const total = teamResult.matchingResults.length;
    const matched = teamResult.matchingResults.filter(m => m.matchResult.playerId).length;
    const withAccount = teamResult.matchingResults.filter(m => m.matchResult.hasUserAccount).length;
    
    console.log(`\n${teamResult.contestType}:`);
    console.log(`  Total: ${total} Spieler`);
    console.log(`  Gematcht: ${matched} (${withAccount} mit App-Account)`);
    console.log(`  Ungematcht: ${total - matched}`);
  });
})
.catch(error => console.error('❌ Fehler:', error));
```

**Erwartetes Ergebnis:**
- Detaillierte Matching-Statistiken für jedes Team
- Zeigt, welche Spieler gefunden wurden und welche mit App-Account

---

## 🧪 TEST 4: Gruppen aus Liga extrahieren

### Im Browser (F12 → Console):

```javascript
fetch('https://tennis-team-gamma.vercel.app/api/import/nuliga-matches-import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'league-groups',
    leagueUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=2',
    season: 'Winter 2025/26'
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ Gruppen gefunden:', data.totalGroups);
  console.log('Gruppen-Liste:', data.groups);
  data.groups.forEach((group, index) => {
    console.log(`${index + 1}. ${group.groupName} - ${group.category} (${group.matchCount} Matches)`);
  });
})
.catch(error => console.error('❌ Fehler:', error));
```

**Erwartetes Ergebnis:**
- Liste aller Gruppen in der Liga
- Mit Match-Anzahl und Kategorie

---

## 🧪 TEST 5: Gruppen-Details laden

### Im Browser (F12 → Console):

```javascript
fetch('https://tennis-team-gamma.vercel.app/api/import/nuliga-matches-import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'group-details',
    leagueUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=2',
    season: 'Winter 2025/26',
    groupId: '43',
    apply: false
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ Gruppen-Details:', data);
  console.log('Gruppe:', data.group.groupName);
  console.log('Matches:', data.matches);
  console.log('Tabellen:', data.standings);
})
.catch(error => console.error('❌ Fehler:', error));
```

**Erwartetes Ergebnis:**
- Detaillierte Informationen zu einer spezifischen Gruppe
- Anzahl Matches und Tabellen

---

## 🎯 Kompletter Test-Workflow

Kopiere diesen Code in die Console für einen vollständigen Test:

```javascript
// Test-Workflow: Club → Teams → Meldelisten
async function testCompleteWorkflow() {
  console.log('🚀 Starte Test-Workflow...\n');
  
  const clubPoolsUrl = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154';
  const season = 'Winter 2025/2026';
  const apiUrl = 'https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import';
  
  try {
    // Schritt 1: Club-Info
    console.log('📋 Schritt 1: Club-Info extrahieren...');
    const clubInfo = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'club-info', clubPoolsUrl })
    }).then(r => r.json());
    
    console.log('✅ Club gefunden:', clubInfo.clubName, `(${clubInfo.clubNumber})`);
    
    // Schritt 2: Teams auflisten
    console.log('\n📋 Schritt 2: Teams auflisten...');
    const teams = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'teams', clubPoolsUrl, targetSeason: season })
    }).then(r => r.json());
    
    console.log(`✅ ${teams.totalTeams} Teams gefunden:`);
    teams.teams.forEach(t => {
      console.log(`   - ${t.contestType}: ${t.playerCount} Spieler`);
    });
    
    // Schritt 3: Meldelisten (nur für erstes Team - schneller)
    if (teams.teams.length > 0) {
      console.log('\n📋 Schritt 3: Meldeliste für erstes Team laden...');
      const roster = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'roster', clubPoolsUrl, targetSeason: season, apply: false })
      }).then(r => r.json());
      
      if (roster.matchingResults && roster.matchingResults.length > 0) {
        const firstTeam = roster.matchingResults[0];
        const matched = firstTeam.matchingResults.filter(m => m.matchResult.playerId).length;
        console.log(`✅ Meldeliste geladen für "${firstTeam.contestType}":`);
        console.log(`   - ${firstTeam.matchingResults.length} Spieler insgesamt`);
        console.log(`   - ${matched} Spieler gematcht`);
      }
    }
    
    console.log('\n✅ Test-Workflow abgeschlossen!');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

// Starte den Test
testCompleteWorkflow();
```

---

## 🔍 Fehler-Diagnose

### Wenn du einen Fehler siehst:

1. **Prüfe die Console-Ausgabe** - gibt es einen roten Fehler-Text?

2. **Prüfe die Network-Tab:**
   - F12 → Tab "Network"
   - Sende die Request nochmal
   - Klicke auf die Request → Tab "Response"
   - Was steht in der Antwort?

3. **Häufige Fehler:**
   - **404:** API nicht gefunden → Prüfe die URL
   - **500:** Server-Fehler → Prüfe Vercel-Logs
   - **CORS:** Browser blockiert → Nutze Postman statt Browser

---

## 💡 Tipp: Nutze die Browser-Console

Die beste Methode für schnelle Tests:

1. Öffne Chrome/Firefox
2. Drücke **F12**
3. Gehe zum Tab **"Console"**
4. Kopiere einen der Test-Codes oben
5. Drücke **Enter**
6. Schaue dir das Ergebnis an

Die Console zeigt dir:
- ✅ Erfolgreiche Antworten (grün/weiß)
- ❌ Fehler (rot)
- 📊 Alle Daten strukturiert

---

## 📞 Hilfe

Wenn etwas nicht funktioniert:
- Prüfe die Vercel-Logs (https://vercel.com/dashboard)
- Prüfe die Console-Ausgabe im Browser
- Stelle sicher, dass die nuLiga-URLs erreichbar sind


# 🧪 Quick Test: Club-Name DB-Implementierung

## ✅ Copy-Paste Test

**Browser Console (F12):**

```javascript
fetch('https://tennis-team-gamma.vercel.app/api/import/parse-club-rosters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clubPoolsUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154',
    targetSeason: 'Winter 2025/2026',
    apply: false
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ Response:', data);
  console.log('📊 Club-Daten:', {
    clubNumber: data.clubNumber,
    clubName: data.clubName,  // <-- SOLLTE JETZT AUS DB KOMMEN!
    teamsCount: data.teams?.length || 0
  });
  
  if (data.clubName) {
    alert(`✅ SUCCESS! Club-Name: "${data.clubName}" (Club-Nr: ${data.clubNumber})`);
  } else {
    alert(`⚠️ Club-Name ist null (Club-Nr: ${data.clubNumber})`);
  }
})
.catch(error => {
  console.error('❌ FEHLER:', error);
  alert('Fehler: ' + error.message);
});
```

---

## ✅ Erwartung

**Wenn Club in DB vorhanden:**
```json
{
  "clubNumber": "36154",
  "clubName": "VKC Köln",  // ✅ AUS DB!
  ...
}
```

**Wenn Club NICHT in DB:**
```json
{
  "clubNumber": "36154",
  "clubName": null,  // ⚠️ Oder HTML-geparster Name
  ...
}
```

---

## 📝 Postman (Alternative)

**URL:** `POST https://tennis-team-gamma.vercel.app/api/import/parse-club-rosters`

**Body:**
```json
{
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026",
  "apply": false
}
```


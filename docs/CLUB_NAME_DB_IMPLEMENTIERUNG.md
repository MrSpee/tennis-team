# 🔧 Club-Name: Datenbank-Abgleich implementieren

## Problem

Aktuell wird `clubName` nicht korrekt zurückgegeben (ist `null`), obwohl:
1. ✅ Club-Name auf nuLiga vorhanden ist: "VKC Köln"
2. ✅ Club-Nummer wird korrekt extrahiert: "36154"

## Lösung: Datenbank-Abgleich

**Strategie:** Club-Name über Club-Nummer aus Datenbank laden

---

## Implementierung

### Schritt 1: Funktion zum Laden aus DB

Füge diese Funktion hinzu (z.B. in `parse-club-rosters.js`):

```javascript
/**
 * Lädt Club-Name aus Datenbank über Club-Nummer
 * @param {Object} supabase - Supabase Client
 * @param {string} clubNumber - Club-Nummer (z.B. "36154")
 * @returns {Promise<string|null>} Club-Name oder null
 */
async function getClubNameFromDatabase(supabase, clubNumber) {
  try {
    if (!clubNumber) {
      return null;
    }

    const { data, error } = await supabase
      .from('club_info')
      .select('name')
      .eq('club_number', clubNumber)
      .single();

    if (error) {
      // Club nicht gefunden ist OK (kein Fehler)
      if (error.code === 'PGRST116') {
        console.log(`[parse-club-rosters] ℹ️ Club ${clubNumber} nicht in DB gefunden`);
        return null;
      }
      console.warn(`[parse-club-rosters] ⚠️ Fehler beim Laden von Club-Name:`, error);
      return null;
    }

    if (data?.name) {
      console.log(`[parse-club-rosters] ✅ Club-Name aus DB geladen: "${data.name}" (Club-Nr: ${clubNumber})`);
      return data.name;
    }

    return null;
  } catch (error) {
    console.error(`[parse-club-rosters] ❌ Fehler beim Laden von Club-Name aus DB:`, error);
    return null;
  }
}
```

### Schritt 2: In Handler verwenden

**In der `handler` Funktion, nach `parseClubPoolsPage`:**

```javascript
// Aktueller Code (Zeile ~430):
const { clubNumber, clubName: parsedClubName, teams } = await parseClubPoolsPage(clubPoolsUrl, targetSeason);

// NEU: Club-Name aus DB laden
let clubName = parsedClubName; // Fallback: Aus HTML geparster Name

if (clubNumber) {
  const dbClubName = await getClubNameFromDatabase(supabase, clubNumber);
  if (dbClubName) {
    clubName = dbClubName; // DB-Name hat Priorität
  }
}

// Weiter verwenden wie bisher
return withCors(res, 200, {
  success: true,
  clubNumber,
  clubName, // Jetzt mit DB-Name!
  teams,
  matchingResults: allMatchingResults
});
```

---

## Wo einfügen?

### Option 1: In `handler` Funktion (nach parseClubPoolsPage)

**Datei:** `api/import/parse-club-rosters.js`  
**Zeile:** ~430 (nach `parseClubPoolsPage` Aufruf)

**Code:**
```javascript
const { clubNumber, clubName: parsedClubName, teams } = await parseClubPoolsPage(clubPoolsUrl, targetSeason);

// NEU: Club-Name aus DB laden
let clubName = parsedClubName;
if (clubNumber) {
  const dbClubName = await getClubNameFromDatabase(supabase, clubNumber);
  if (dbClubName) {
    clubName = dbClubName;
  }
}
```

### Option 2: In `parseClubPoolsPage` Funktion selbst

**Datei:** `api/import/parse-club-rosters.js`  
**Zeile:** ~37 (in `parseClubPoolsPage`)

**ABER:** Problem: `supabase` Client muss übergeben werden!

**Code:**
```javascript
async function parseClubPoolsPage(clubPoolsUrl, targetSeason, supabase = null) {
  // ...
  const clubNumber = extractClubNumber(clubPoolsUrl);
  
  // NEU: Club-Name aus DB laden
  let clubName = null;
  if (supabase && clubNumber) {
    clubName = await getClubNameFromDatabase(supabase, clubNumber);
  }
  
  // Fallback: HTML-Parsing (wenn nicht in DB)
  if (!clubName) {
    // ... existierender HTML-Parsing-Code ...
  }
  
  return { clubNumber, clubName, teams };
}
```

**Empfehlung:** Option 1 (in Handler) - einfacher, keine Signatur-Änderung nötig

---

## Datenbank-Schema

**Tabelle:** `club_info`  
**Spalte:** `club_number` (String)  
**Spalte:** `name` (String)

**Query:**
```sql
SELECT name FROM club_info WHERE club_number = '36154';
```

---

## Fallback-Strategie

**Priorität:**
1. ✅ **Datenbank** (höchste Priorität)
2. ⚠️ HTML-Parsing (Fallback, wenn nicht in DB)

**Vorteil:**
- DB ist Single Source of Truth
- Konsistenter Name überall
- Schneller (kein HTML-Parsing nötig)
- Zuverlässiger

---

## Testing

**Test-Szenario:**
1. Club-Nummer: "36154"
2. Erwartung: Club-Name "VKC Köln" aus DB
3. Falls nicht in DB: `null` oder HTML-Parsing

**Test-Query:**
```sql
-- Prüfe ob Club in DB existiert
SELECT name, club_number FROM club_info WHERE club_number = '36154';
```

---

## Vorteile dieser Lösung

1. ✅ **Zuverlässig:** DB ist Single Source of Truth
2. ✅ **Schnell:** Kein HTML-Parsing nötig (meist)
3. ✅ **Konsistent:** Gleicher Name überall (DB überall)
4. ✅ **Einfach:** Nur eine zusätzliche DB-Query
5. ✅ **Robust:** Funktioniert auch wenn HTML sich ändert

---

## Nachteile

1. ⚠️ **Abhängig von DB:** Falls Club nicht in DB, muss HTML-Parsing funktionieren
2. ⚠️ **Club muss in DB sein:** Muss vorher importiert werden

**Lösung:** HTML-Parsing als Fallback beibehalten


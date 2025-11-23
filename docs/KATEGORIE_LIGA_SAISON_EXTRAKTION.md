# Kategorie, Liga und Saison Extraktion - Detaillierte Erklärung

## Übersicht

Die Funktion `deriveGroupMeta()` extrahiert aus dem nuLiga Header-Text drei wichtige Informationen:
1. **Kategorie** (z.B. "Herren 30", "Herren", "Damen 40")
2. **Liga** (z.B. "1. Kreisliga 4-er", "Mittelrheinliga 4-er")
3. **Saison** (z.B. "Winter 2025/26")

## Beispiel-Header-Text

```
"TVM Winter 2025/2026 Herren Mittelrheinliga 4-er Gr. 001"
```

## Extraktions-Logik im Detail

### 1. KATEGORIE-Extraktion

Die Kategorie wird in **mehreren Schritten** extrahiert, mit fallback-Mechanismen:

#### Schritt 1: Aus `groupLink` (von Übersichtsseite)
```javascript
if (groupLink.category && groupLink.category.trim()) {
  category = groupLink.category.trim();
}
```
- Wenn die Kategorie bereits auf der Übersichtsseite erkannt wurde, wird sie verwendet
- Beispiel: "Herren 30" oder "Herren"

#### Schritt 2: Pattern 1 - Am Anfang des Headers
```javascript
const categoryMatch1 = headerText.match(/^(Herren\s+\d+|Damen\s+\d+)/i);
```
- Sucht nach "Herren 30" oder "Damen 40" **am Anfang** des Textes
- Beispiel: `"Herren 30 1. Kreisliga 4-er Gr. 046"` → `"Herren 30"`

#### Schritt 3: Pattern 2 - Vor "Gr."
```javascript
const categoryMatch2 = headerText.match(/(Herren\s+\d+|Damen\s+\d+).*?Gr\./i);
```
- Sucht nach "Herren 30" oder "Damen 40" **irgendwo im Text**, aber **vor "Gr."**
- Beispiel: `"TVM Winter 2025/2026 Herren 30 1. Kreisliga Gr. 046"` → `"Herren 30"`

#### Schritt 4: Pattern 3 - "Herren/Damen" + Zahl irgendwo
```javascript
const categoryMatch3 = headerText.match(/(Herren|Damen)\s+(\d+)/i);
```
- Sucht nach "Herren" oder "Damen" gefolgt von **einer Zahl** (irgendwo im Text)
- Beispiel: `"TVM Winter 2025/2026 Herren 30 1. Kreisliga Gr. 046"` → `"Herren 30"`

#### Schritt 5: Pattern 4 - "Herren/Damen" + Text (ohne Zahl)
```javascript
const categoryMatch4 = headerText.match(/\b(Herren|Damen)\s+(?!\d+)([A-Za-z]+)/i);
```
- Sucht nach "Herren" oder "Damen" gefolgt von **Text** (aber **nicht** einer Zahl)
- Spezielle Behandlung für Ligen ohne Altersklasse: "Mittelrheinliga", "Verbandsliga", etc.
- Beispiel: `"TVM Winter 2025/2026 Herren Mittelrheinliga 4-er Gr. 001"` → `"Herren"`

#### Schritt 6: Pattern 5 - "Herren/Damen" allein
```javascript
const categoryMatch5 = headerText.match(/\b(Herren|Damen)\b(?!\s+\d+)(?!\s+[A-Za-z]+)/i);
```
- Sucht nach "Herren" oder "Damen" **allein** (ohne Zahl, ohne Liga-Typ)
- Beispiel: `"TVM Winter 2025/2026 Herren Gr. 001"` → `"Herren"`

#### Fallback
```javascript
if (!category) {
  category = 'Unbekannte Kategorie';
}
```

---

### 2. LIGA-Extraktion

Die Liga wird **nach** der Kategorie extrahiert, da sie zwischen Kategorie und "Gr." steht:

```javascript
const leagueMatch = headerText.match(/Herren\s+\d+\s+(.*?)\s+Gr\./i) || 
                    headerText.match(/Damen\s+\d+\s+(.*?)\s+Gr\./i) ||
                    headerText.match(/(.*?)\s+Gr\.\s*\d+/i);
const league = leagueMatch ? leagueMatch[1].trim() : 'Unbekannte Liga';
```

#### Pattern 1: "Herren 30 [LIGA] Gr."
```javascript
/Herren\s+\d+\s+(.*?)\s+Gr\./i
```
- Sucht nach "Herren" + Zahl + **alles dazwischen** + "Gr."
- Beispiel: `"Herren 30 1. Kreisliga 4-er Gr. 046"` → `"1. Kreisliga 4-er"`

#### Pattern 2: "Damen 40 [LIGA] Gr."
```javascript
/Damen\s+\d+\s+(.*?)\s+Gr\./i
```
- Gleiche Logik für Damen
- Beispiel: `"Damen 40 2. Bezirksliga Gr. 054"` → `"2. Bezirksliga"`

#### Pattern 3: Fallback - Alles vor "Gr."
```javascript
/(.*?)\s+Gr\.\s*\d+/i
```
- Wenn Pattern 1 und 2 nicht greifen, nimm **alles vor "Gr."**
- **PROBLEM:** Das kann auch Saison und Kategorie enthalten!
- Beispiel: `"TVM Winter 2025/2026 Herren Mittelrheinliga 4-er Gr. 001"` → `"TVM Winter 2025/2026 Herren Mittelrheinliga 4-er"` ❌

#### Problem mit Pattern 3

Pattern 3 ist zu breit und kann falsche Ergebnisse liefern:
- `"TVM Winter 2025/2026 Herren Mittelrheinliga 4-er Gr. 001"` 
- → Pattern 3 würde `"TVM Winter 2025/2026 Herren Mittelrheinliga 4-er"` extrahieren
- → Sollte aber nur `"Mittelrheinliga 4-er"` sein

---

### 3. SAISON-Extraktion

Die Saison wird aus dem Header-Element extrahiert:

```javascript
const seasonFromHeader = extractSeasonFromHeader(headerElement);
const season = seasonFromHeader || seasonLabel;
```

#### `extractSeasonFromHeader()` Funktion

```javascript
const seasonMatch = normalized.match(/\b(Winter|Sommer|Herbst|Frühjahr|Fruehjahr)\s+\d{4}(?:\/\d{2,4})?/i);
```

- Sucht nach: "Winter", "Sommer", "Herbst" oder "Frühjahr" gefolgt von Jahr
- Unterstützt: "Winter 2025", "Winter 2025/26", "Winter 2025/2026"
- Beispiel: `"TVM Winter 2025/2026 Herren Mittelrheinliga 4-er Gr. 001"` → `"Winter 2025/26"`

#### `normalizeSeasonLabel()` Funktion

Normalisiert die Saison zu einem einheitlichen Format:
- `"Winter 2025"` → `"Winter 2025"`
- `"Winter 2025/26"` → `"Winter 2025/26"`
- `"Winter 2025/2026"` → `"Winter 2025/26"` (kürzt auf 2 Stellen)

---

## Beispiel-Parsing

### Beispiel 1: Standard-Format
**Input:** `"TVM Winter 2025/2026 Herren 30 1. Kreisliga 4-er Gr. 046"`

1. **Kategorie:** Pattern 2 findet `"Herren 30"` (vor "Gr.")
2. **Liga:** Pattern 1 findet `"1. Kreisliga 4-er"` (zwischen "Herren 30" und "Gr.")
3. **Saison:** `extractSeasonFromHeader()` findet `"Winter 2025/26"`

**Ergebnis:**
- Kategorie: `"Herren 30"`
- Liga: `"1. Kreisliga 4-er"`
- Saison: `"Winter 2025/26"`

### Beispiel 2: Mittelrheinliga (ohne Altersklasse)
**Input:** `"TVM Winter 2025/2026 Herren Mittelrheinliga 4-er Gr. 001"`

1. **Kategorie:** Pattern 4 findet `"Herren"` (ohne Zahl, gefolgt von "Mittelrheinliga")
2. **Liga:** Pattern 3 findet `"TVM Winter 2025/2026 Herren Mittelrheinliga 4-er"` ❌ (zu viel!)
3. **Saison:** `extractSeasonFromHeader()` findet `"Winter 2025/26"`

**Ergebnis:**
- Kategorie: `"Herren"` ✅
- Liga: `"TVM Winter 2025/2026 Herren Mittelrheinliga 4-er"` ❌ (sollte `"Mittelrheinliga 4-er"` sein)
- Saison: `"Winter 2025/26"` ✅

---

## Probleme und Verbesserungsvorschläge

### Problem 1: Liga-Extraktion bei Ligen ohne Altersklasse

**Aktuell:** Pattern 3 ist zu breit und extrahiert zu viel.

**Lösung:** Pattern 3 sollte verbessert werden:
```javascript
// Besser: Entferne Saison und Kategorie vorher
let leagueText = headerText;
// Entferne Saison-Pattern
leagueText = leagueText.replace(/\b(Winter|Sommer|Herbst|Frühjahr|Fruehjahr)\s+\d{4}(?:\/\d{2,4})?\s*/i, '');
// Entferne Kategorie-Pattern
if (category) {
  leagueText = leagueText.replace(new RegExp(`\\b${category}\\s+`, 'i'), '');
}
// Dann extrahiere Liga vor "Gr."
const leagueMatch = leagueText.match(/(.*?)\s+Gr\./i);
```

### Problem 2: Kategorie-Extraktion aus Übersichtsseite

Die Kategorie wird auch auf der Übersichtsseite extrahiert (`fetchGroupLinks`), aber die Patterns dort sind ähnlich und könnten verbessert werden.

---

## Zusammenfassung

1. **Kategorie:** Wird in 6 Schritten extrahiert (mit Fallbacks)
2. **Liga:** Wird zwischen Kategorie und "Gr." extrahiert (3 Patterns, Pattern 3 ist problematisch)
3. **Saison:** Wird mit Regex-Pattern extrahiert und normalisiert

**Hauptproblem:** Liga-Extraktion funktioniert nicht gut bei Ligen ohne Altersklasse (z.B. "Mittelrheinliga").


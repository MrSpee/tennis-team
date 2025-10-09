# IMPORT-TAB IMPLEMENTIERUNGSPLAN
**Match-Import mit OpenAI GPT-4o**

---

## 📋 **Übersicht**

### Ziel:
Automatischer Import von Match-Daten aus TVM-Meldelisten mit KI-Unterstützung, um manuelle Dateneingabe zu minimieren.

### Scope:
- **Phase 1**: Match-Import (Text/URL/Screenshot)
- **Phase 2** (später): Spieler-Import mit Fuzzy-Matching

---

## 🏗️ **Architektur-Entscheidungen**

### **Option A: Backend mit Node.js/Express** (Empfohlen)
**Vorteile:**
- ✅ OpenAI API-Key bleibt serverseitig sicher
- ✅ Rate Limiting & Caching möglich
- ✅ Bessere Fehlerbehandlung
- ✅ Kann später für Webhooks/Cron-Jobs genutzt werden

**Nachteile:**
- ❌ Zusätzlicher Deploy-Aufwand (Vercel Functions oder separater Server)
- ❌ Mehr Komplexität

### **Option B: Direkt im Frontend** (Schnellere Entwicklung)
**Vorteile:**
- ✅ Schneller zu entwickeln
- ✅ Keine Backend-Infrastruktur nötig

**Nachteile:**
- ❌ API-Key muss im Frontend exponiert werden (unsicher!)
- ❌ Keine Rate Limiting Kontrolle
- ❌ Schlechtere Error-Behandlung

### **Empfehlung: Option A mit Vercel Serverless Functions**
- Frontend: React (bestehend)
- Backend: Vercel Serverless Functions (bereits vorhanden durch `vercel.json`)
- OpenAI: API über Backend-Proxy

---

## 📁 **Projekt-Struktur**

```
tennis-team/
├── api/                          # Vercel Serverless Functions
│   └── import/
│       ├── parse-matches.js      # POST /api/import/parse-matches
│       └── parse-players.js      # POST /api/import/parse-players
├── src/
│   └── components/
│       ├── ImportTab.jsx         # Neues Component für Import-UI
│       └── SuperAdminDashboard.jsx
├── .env                          # OPENAI_API_KEY (git-ignored)
└── vercel.json                   # Vercel Config
```

---

## 🔧 **Phase 1: Planung & Vorbereitung**

### 1.1 Anforderungen definieren
- [ ] Welche Match-Daten müssen extrahiert werden?
  - Datum & Uhrzeit
  - Gegner (Vereinsname)
  - Heim/Auswärts
  - Venue (Adresse)
  - Liga & Gruppe (optional)
  - Saison
- [ ] Input-Formate unterstützen:
  - ✅ Text (Copy/Paste)
  - ✅ TVM-URL
  - ⏳ Screenshot/Bild (GPT-4 Vision)
- [ ] Output-Format definieren (JSON Schema)

### 1.2 OpenAI Integration
- [ ] API-Key besorgen (falls noch nicht vorhanden)
- [ ] Kosten kalkulieren:
  - GPT-4o: ~$5 / 1M input tokens, ~$15 / 1M output tokens
  - Beispiel: 500 Token Input + 200 Token Output = ~$0.006 pro Import
  - Budget: $10/Monat = ~1600 Imports

### 1.3 Technische Entscheidungen
- [x] Backend: Vercel Serverless Functions
- [x] Frontend: React Component
- [x] Datenbank: Supabase (bestehend)
- [ ] Error Handling: Try-Catch + User Feedback
- [ ] Rate Limiting: Max 20 Imports/Stunde pro User

---

## 🛠️ **Phase 2: Backend-Setup**

### 2.1 Vercel Function erstellen
```javascript
// api/import/parse-matches.js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { rawText, teamId, season } = req.body;
    
    // OpenAI Prompt
    const prompt = `...`; // Siehe Phase 3
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Du bist ein Experte für Tennis-Match-Daten." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    
    return res.status(200).json({
      success: true,
      matches: result.matches,
      usage: response.usage
    });
    
  } catch (error) {
    console.error('Error parsing matches:', error);
    return res.status(500).json({ 
      error: 'Failed to parse matches',
      message: error.message 
    });
  }
}
```

### 2.2 Environment Setup
```bash
# .env (lokal & Vercel)
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...
SUPABASE_KEY=...
```

### 2.3 Dependencies
```bash
npm install openai
```

---

## 🤖 **Phase 3: OpenAI Prompt Engineering**

### 3.1 Match-Extraktion Prompt
```javascript
const prompt = `
Extrahiere alle Tennis-Match-Informationen aus dem folgenden Text einer TVM-Meldeliste.

INPUT:
${rawText}

KONTEXT:
- Team ID: ${teamId}
- Saison: ${season}
- Format: Medenspiele (6 Matches pro Spieltag)

AUFGABE:
Extrahiere ALLE Matches und gib sie im folgenden JSON-Format zurück:

{
  "matches": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "opponent": "Vereinsname (exakt wie im Text)",
      "location": "Home" oder "Away",
      "venue": "Spielstätte mit Adresse (falls vorhanden)",
      "league": "Liga-Name (z.B. Kreisliga A)",
      "group": "Gruppe (z.B. Gruppe 1)",
      "round": "Spieltag-Nummer (falls erkennbar)",
      "notes": "Zusätzliche Infos (optional)"
    }
  ]
}

WICHTIG:
- Datum muss im Format YYYY-MM-DD sein
- Uhrzeit im Format HH:MM (24h)
- location: "Home" wenn unser Team zu Hause spielt, "Away" wenn auswärts
- Wenn Datum fehlt: null
- Wenn Uhrzeit fehlt: "00:00"
- Gegner-Name exakt übernehmen (nicht abkürzen)
`;
```

### 3.2 Response Schema Validierung
```javascript
const matchSchema = {
  date: 'string|null',      // YYYY-MM-DD
  time: 'string',           // HH:MM
  opponent: 'string',
  location: 'string',       // "Home" | "Away"
  venue: 'string|null',
  league: 'string|null',
  group: 'string|null',
  round: 'number|null',
  notes: 'string|null'
};
```

---

## 🎨 **Phase 4: Frontend UI**

### 4.1 Import-Tab Component
```jsx
// src/components/ImportTab.jsx
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ImportTab() {
  const [importMode, setImportMode] = useState('text'); // 'text' | 'url' | 'image'
  const [rawInput, setRawInput] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [parsedMatches, setParsedMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleParse = async () => {
    // API Call zu /api/import/parse-matches
  };

  const handleImport = async () => {
    // Batch-Insert in Supabase
  };

  return (
    <div className="import-container">
      {/* Input Section */}
      {/* Preview Section */}
      {/* Action Buttons */}
    </div>
  );
}
```

### 4.2 UI-Komponenten
1. **Input-Bereich:**
   - Tab-Navigation: Text / URL / Screenshot
   - Textarea für Text-Input (groß, min. 10 Zeilen)
   - Team-Auswahl Dropdown
   - Saison-Auswahl
   - "Analysieren" Button

2. **Preview-Bereich:**
   - Tabelle mit erkannten Matches
   - Spalten: Datum, Uhrzeit, Gegner, Heim/Auswärts, Venue
   - Edit-Icons für manuelle Korrektur
   - Delete-Icons zum Entfernen
   - Duplikat-Warnung (gelber Badge)

3. **Action-Bereich:**
   - "Alle importieren" Button
   - "Abbrechen" Button
   - Success/Error Messages
   - Import-Statistik (X von Y erfolgreich)

---

## ✅ **Phase 5: Validierung & Review**

### 5.1 Frontend-Validierung
```javascript
const validateMatch = (match) => {
  const errors = [];
  
  // Datum-Validierung
  if (!match.date) {
    errors.push('Datum fehlt');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(match.date)) {
    errors.push('Ungültiges Datumsformat');
  }
  
  // Gegner-Validierung
  if (!match.opponent || match.opponent.trim().length < 3) {
    errors.push('Gegner-Name zu kurz');
  }
  
  // Location-Validierung
  if (!['Home', 'Away'].includes(match.location)) {
    errors.push('Ungültige Location');
  }
  
  return errors;
};
```

### 5.2 Duplikat-Erkennung
```javascript
const checkDuplicates = async (matches, teamId) => {
  const { data: existingMatches } = await supabase
    .from('matches')
    .select('id, match_date, opponent')
    .eq('team_id', teamId);
  
  return matches.map(match => ({
    ...match,
    isDuplicate: existingMatches.some(em => 
      em.match_date === match.date && 
      em.opponent === match.opponent
    )
  }));
};
```

---

## 💾 **Phase 6: Datenbank-Import**

### 6.1 Batch-Insert
```javascript
const importMatches = async (matches, teamId) => {
  const matchesToInsert = matches
    .filter(m => !m.isDuplicate)
    .map(m => ({
      team_id: teamId,
      match_date: `${m.date}T${m.time}:00`,
      opponent: m.opponent,
      location: m.location,
      venue: m.venue,
      season: m.season || 'winter',
      league_group: m.group,
      notes: m.notes,
      created_by_admin: true
    }));
  
  const { data, error } = await supabase
    .from('matches')
    .insert(matchesToInsert)
    .select();
  
  if (error) throw error;
  
  // Activity Log
  await supabase.rpc('log_activity', {
    p_action: 'import_matches',
    p_entity_type: 'match',
    p_details: { 
      count: data.length,
      team_id: teamId 
    }
  });
  
  return data;
};
```

---

## 🧪 **Phase 7: Testing**

### 7.1 Test-Szenarien
1. **Happy Path**: Standard TVM-Liste mit 5 Matches
2. **Fehlende Daten**: Liste ohne Uhrzeiten
3. **Duplikate**: Bereits existierende Matches
4. **Falsche Formate**: Ungültige Datumsangaben
5. **Lange Listen**: 20+ Matches auf einmal
6. **Sonderzeichen**: Vereinsnamen mit Umlauten

### 7.2 Testdaten
```
Beispiel TVM-Liste:
---
Medenspiele Winter 2025/26
Herren 40 - Kreisliga A

Spieltag 1
Sa, 15.11.2025, 14:00 Uhr
SV Rot-Gelb Sürth vs. TC Köln-Süd
Ort: Marienburger SC, Köln

Spieltag 2  
Sa, 22.11.2025, 14:00 Uhr
Rodenkirchener TC vs. SV Rot-Gelb Sürth
Ort: Rodenkirchener TC, Köln-Rodenkirchen
```

---

## 📊 **Erfolgs-Metriken**

- ⏱️ **Parsing-Zeit**: < 5 Sekunden pro Liste
- ✅ **Genauigkeit**: > 95% korrekt erkannte Matches
- 💰 **Kosten**: < $0.01 pro Import
- 👤 **UX**: < 3 Clicks vom Text bis zum Import

---

## 🚀 **Nächste Schritte**

1. ✅ TODO-Liste erstellt
2. 🔄 OpenAI API-Key bereitstellen
3. 🔄 Vercel Function erstellen
4. 🔄 Frontend-Component bauen
5. 🔄 Testen mit echten Daten

---

**Bereit zum Start!** Welche Phase möchtest du zuerst angehen?


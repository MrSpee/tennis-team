/**
 * Vercel Serverless Function: Match-Import Parser
 * 
 * Endpoint: POST /api/import/parse-matches
 * 
 * Input: { text: string, url?: string, teamId: string }
 * Output: { matches: Array<Match>, errors: Array<string> }
 */

// CORS Headers für Frontend-Zugriff
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// JSON Schema für Match-Daten (GPT soll sich daran halten)
const MATCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    // Team-Informationen (automatisch erkannt)
    team_info: {
      type: "object",
      additionalProperties: false,
      properties: {
        club_name: { type: "string", description: "Name des Vereins (z.B. 'VKC Köln')" },
        team_name: { type: "string", description: "Mannschaftsnummer (z.B. '1' aus 'Herren 40 1 (4er)' - ohne Kategorie, ohne Klammern)" },
        category: { type: "string", description: "Kategorie (z.B. 'Herren 40' oder 'Herren 50')" },
        league: { type: "string", description: "Liga-Name (z.B. 'Herren 50 2. Bezirksliga Gr. 054')" },
        address: { type: "string", description: "Vereinsadresse (falls im Text)" },
        website: { type: "string", description: "Website URL (falls im Text)" },
        captain: { type: "string", description: "Mannschaftsführer Name (falls im Text)" }
      },
      required: ["club_name", "team_name", "category", "league", "address", "website", "captain"]
    },
    
    // Match-Daten
    matches: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          match_date: { type: "string", description: "Datum im Format YYYY-MM-DD" },
          start_time: { type: "string", description: "Uhrzeit im Format HH:MM" },
          home_team: { type: "string", description: "Heimverein komplett (z.B. 'TG Leverkusen 2' oder 'VKC Köln 1')" },
          away_team: { type: "string", description: "Gastverein komplett (z.B. 'SV RG Sürth 1' oder 'TC Colonius 3')" },
          opponent: { type: "string", description: "Name des Gegner-Vereins (inkl. Mannschaft, z.B. 'TG Leverkusen 2')" },
          is_home_match: { type: "boolean", description: "true = Heimspiel, false = Auswärtsspiel" },
          venue: { type: "string", description: "Spielort/Anlage (z.B. 'Cologne Sportspark')" },
          address: { type: "string", description: "Adresse des Spielorts (falls angegeben)" },
          matchday: { type: "integer", description: "Spieltag-Nummer (falls angegeben)" },
          match_points: { type: "string", description: "Matchpunkte (z.B. '1:5' oder '0:0')" },
          status: { type: "string", description: "Matchstatus (z.B. 'offen', 'completed')" },
          notes: { type: "string", description: "Zusätzliche Notizen (falls vorhanden)" }
        },
        required: ["match_date", "start_time", "home_team", "away_team"]
      }
    },
    
    // Spieler-Daten (optional, falls Meldeliste vorhanden)
    players: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: "Spieler Name" },
          lk: { type: ["string", "null"], description: "Leistungsklasse (z.B. '9.8', '11.3', '13.5' oder '13') - IMMER als STRING wenn vorhanden. Falls NICHT erkennbar oder leer, setze null oder \"\". NIEMALS erfundene Werte!" },
          id_number: { type: ["string", "null"], description: "TVM ID-Nummer. Falls nicht erkennbar oder leer, setze \"\" oder null." },
          position: { type: "integer", description: "Position in der Meldeliste" },
          is_captain: { type: "boolean", description: "true wenn Mannschaftsführer (MF)" }
        },
        required: ["name", "position", "is_captain"] // lk und id_number sind OPTIONAL - können später manuell ergänzt werden!
      }
    },
    
    season: {
      type: "string",
      description: "Saison ('winter' oder 'summer')"
    },
    
    year: {
      type: "string",
      description: "Jahreszahl oder Jahresbereich (z.B. '2025/26' für Winter oder '2026' für Sommer)"
    }
  },
  required: ["team_info", "matches"]
};

// System-Prompt für GPT-4o
const SYSTEM_PROMPT = `Du bist ein Experte für das Parsen von Tennis-Meldelisten und Spielplänen im TVM-Format (Tennisverband Mittelrhein).

Deine Aufgabe: Extrahiere ALLE Informationen (Team, Matches, Spieler) aus dem bereitgestellten Text und gib sie strukturiert im JSON-Format zurück.

WICHTIGE REGELN:

**1. TEAM-INFORMATIONEN:**
   - Erkenne automatisch den Vereinsnamen (z.B. "VKC Köln")
   - Erkenne die Mannschaft (z.B. "Herren 50 1" oder "Herren 40 1 (4er)")
     * WICHTIG: "1 (4er)" bedeutet team_name = "1", category = "Herren 40"
     * Ignoriere Klammern wie "(4er)", "(8er)" - diese sind nur Formatierung
     * team_name ist meist die Nummer (1, 2, 3) oder der Name nach der Kategorie
     * category ist die Altersklasse/Kategorie (z.B. "Herren 40", "Herren 50", "Damen")
   - Erkenne die Kategorie (z.B. "Herren 50" aus "Herren 50 1 (4er)")
   - Erkenne die Liga (z.B. "Herren 50 2. Bezirksliga Gr. 054")
   - Adresse und Website extrahieren (falls vorhanden)
   - Mannschaftsführer erkennen (oft mit "MF" markiert)

**2. MATCH-DATEN:**
   - Extrahiere ALLE Matches aus dem Text
   - **DATUMSFORMAT (KRITISCH!):**
     * **INPUT kann verschiedene Formate haben:**
       - "01.11.2025, 00:00" → Extrahiere Datum "01.11.2025", ignoriere ", 00:00"
       - "11.10.2025" → Verwende direkt
       - "24.01.2026, 17:00" → Extrahiere Datum "24.01.2026", Zeit "17:00"
     * **OUTPUT Format: IMMER "YYYY-MM-DD"**
       - "01.11.2025, 00:00" → "2025-11-01"
       - "11.10.2025" → "2025-10-11"
       - "24.01.2026, 17:00" → "2026-01-24"
     * **WICHTIG: Trenne Datum und Uhrzeit korrekt!**
       - Vor Komma = Datum (DD.MM.YYYY)
       - Nach Komma = Uhrzeit (HH:MM)
       - Konvertiere Datum immer zu YYYY-MM-DD!
   - **ZEITFORMAT:**
     * 24-Stunden-Format HH:MM (z.B. "18:00", "17:00")
     * Wenn Zeit "00:00" ist, kann sie weggelassen werden
     * Wenn keine Zeit angegeben, setze start_time auf "" (leerer String)
   - **CRITICAL: Extrahiere BEIDE Teams separat!**
     * Spalte "Heim Verein" → home_team
     * Spalte "Gastverein" → away_team
   - Heimspiel-Erkennung (is_home_match):
     * Wenn unser Team in Spalte "Heim Verein" steht → is_home_match = true
     * Wenn unser Team in Spalte "Gastverein" steht → is_home_match = false
   - Venue/Spielort extrahieren (Spalte "Spielort")
   - Matchpunkte extrahieren (z.B. "1:5", "6:0", "0:0")
   - Status extrahieren (z.B. "offen" oder "completed" basierend auf Matchpunkte)

**3. SPIELER-DATEN (falls Meldeliste vorhanden):**
   - **KRITISCH: Extrahiere ALLE Spieler aus der Meldeliste - keine Spieler weglassen!**
   - **LK-ERKENNUNG (ABSOLUTE PRIORITÄT!):**
     * **WICHTIG: Die 4. Spalte ist IMMER die LK!**
     * **Spaltenreihenfolge: Position | Mannschaft | Name | LK | ID-Nr. | Info | MF | Nation**
     * LK Format kann sein:
       - Ganzzahlig: "10", "13", "14", "15", "22", "25" → IMMER als STRING "10", "13", etc.
       - Dezimal: "9.8", "11.3", "13.5", "13.6", "15.3" → IMMER als STRING "9.8", "11.3", etc.
     * **KRITISCH: LK NIEMALS ignorieren! Wenn in der 4. Spalte eine Zahl steht, ist es die LK!**
     * **Beispiele:**
       - "1	1	Helmut Härle	10	15600082	" → lk="10" (ganzzahlig, NICHT "10.0"!)
       - "2	1	Mario Gruben	13.6	15902595	" → lk="13.6"
       - "3	1	Nikolaus Hiester	14	16202570	" → lk="14" (ganzzahlig!)
     * Nur wenn die LK-Spalte komplett leer ist: lk=null
     * **NIEMALS erfundene oder Fallback-Werte verwenden!**
   - **TVM ID-Nummer (Priorität 2):**
     * **WICHTIG: Die 5. Spalte ist IMMER die ID-Nr.!**
     * ID-Nummer ist eine 8-stellige Zahl (z.B. "15600082", "16590908")
     * **KRITISCH: ID-Nummer NIEMALS ignorieren! Wenn in der 5. Spalte eine Zahl steht, ist es die ID!**
     * Nur wenn die ID-Spalte leer ist: id_number=""
   - **Position:** 1. Spalte (z.B. "1", "2", "3", "9")
   - **Mannschaftsführer:** Spalte "MF" → is_captain=true
   - **DETAILIERTES BEISPIEL (GANZZAHLIGE LK):**
     * Zeile: "1	1	Helmut Härle	10	15600082			GER"
       → Position=1, Name="Helmut Härle", lk="10", id_number="15600082", is_captain=false
     * Zeile: "9	1	Michael Scholz-Dumjahn	19.3	16590908		MF	GER"
       → Position=9, Name="Michael Scholz-Dumjahn", lk="19.3", id_number="16590908", is_captain=true
   - **DETAILIERTES BEISPIEL (DEZIMAL LK):**
     * Zeile: "9	3	Meik Frauenrath	9.8	18253069			GER"
       → Position=9, Name="Meik Frauenrath", lk="9.8", id_number="18253069"
     * Zeile: "15	4	Frank Tepferd	12.7	17656142		MF	GER"
       → Position=15, Name="Frank Tepferd", lk="12.7", id_number="17656142", is_captain=true

**4. SAISON & JAHR:**
   - Erkenne Saison basierend auf Monat:
     * Oktober - März: "winter"
     * April - September: "summer"
   - Erkenne Jahr basierend auf Datum:
     * Winter-Saison: "2025/26" (Jahr/H+1)
     * Sommer-Saison: "2026" (Jahr)

BEISPIEL INPUT 1 (TVM-Format mit Meldeliste - GANZZAHLIGE LK):
"""
RTHC Bayer Leverkusen
Stadt Leverkusen
Knochenbergsweg
51373 Leverkusen
http://www.rthc.de

Mannschaftsführer
Scholz-Dumjahn Michael (+4915204263541)

Herren 55 1. Kreisliga 4-er Gr. 063
Herren 55 1 (4er)

Meldeliste:
Position	Mannschaft	Name	LK	ID-Nr.	Info	MF	Nation
1	1	Helmut Härle	10	15600082			GER
2	1	Mario Gruben	13.6	15902595			GER
3	1	Nikolaus Hiester	14	16202570			GER
4	1	Johannes Orlowski	15.3	15702873			GER
9	1	Michael Scholz-Dumjahn	19.3	16590908		MF	GER
"""

BEISPIEL INPUT 2 (TVM-Format mit Meldeliste - DEZIMAL LK):
"""
TC Colonius
Stadt Köln
Subbelrather Str. 19
50823 Köln
http://www.tc-colonius.de

Mannschaftsführer
Tepferd Frank (015206284418)

Herren 40 1. Kreisliga Gr. 046
Herren 40 3 (4er)

Meldeliste:
Position	Mannschaft	Name	LK	ID-Nr.	Info	MF	Nation
9	3	Meik Frauenrath	9.8	18253069			GER
10	3	Björn Kaiser	10.3	17454607			GER
11	3	Stefan Wessels	10.4	18302571			GER
12	3	Maurice Houboi	10.4	18403153			GER
13	4	Fabian Eisenbeiß	11.3	18603107			GER
15	4	Frank Tepferd	12.7	17656142		MF	GER
"""

BEISPIEL INPUT 3 (TVM-Format mit Spielplan):
"""
VKC Köln
Stadt Köln
Alfred Schütte Allee 51
51105 Köln
http://www.vkc-koeln.de

Mannschaftsführer
Borcic Zoran (-)

Herren 55 1. Kreisliga 4-er Gr. 063
Herren 55 1 (4er)

Datum	Spielort	Heim Verein	Gastverein	Matchpunkte	Sätze	Spiele	
01.11.2025, 00:00	TH Schloß Morsbroich	VKC Köln 1	RTHC Bayer Leverkusen 1	6:0	12:0	73:31	Spielbericht
24.01.2026, 17:00	RTHC Bayer Leverkusen	TC BW Zündorf 1	VKC Köln 1	0:0	0:0	0:0	offen
08.03.2026, 16:00	TH Schloß Morsbroich	VKC Köln 1	TC Rath 1	0:0	0:0	0:0	offen
"""

BEISPIEL OUTPUT 1 (Meldeliste - GANZZAHLIGE LK):
{
  "team_info": {
    "club_name": "RTHC Bayer Leverkusen",
    "team_name": "1",
    "category": "Herren 55",
    "league": "Herren 55 1. Kreisliga 4-er Gr. 063",
    "address": "Knochenbergsweg, 51373 Leverkusen",
    "website": "http://www.rthc.de",
    "captain": "Scholz-Dumjahn Michael"
  },
  "matches": [],
  "players": [
    {
      "name": "Helmut Härle",
      "lk": "10",
      "id_number": "15600082",
      "position": 1,
      "is_captain": false
    },
    {
      "name": "Mario Gruben",
      "lk": "13.6",
      "id_number": "15902595",
      "position": 2,
      "is_captain": false
    },
    {
      "name": "Nikolaus Hiester",
      "lk": "14",
      "id_number": "16202570",
      "position": 3,
      "is_captain": false
    },
    {
      "name": "Johannes Orlowski",
      "lk": "15.3",
      "id_number": "15702873",
      "position": 4,
      "is_captain": false
    },
    {
      "name": "Michael Scholz-Dumjahn",
      "lk": "19.3",
      "id_number": "16590908",
      "position": 9,
      "is_captain": true
    }
  ],
  "season": "winter",
  "year": "2025/26"
}

BEISPIEL OUTPUT 2 (Meldeliste - DEZIMAL LK):
{
  "team_info": {
    "club_name": "TC Colonius",
    "team_name": "3",
    "category": "Herren 40",
    "league": "Herren 40 1. Kreisliga Gr. 046",
    "address": "Subbelrather Str. 19, 50823 Köln",
    "website": "http://www.tc-colonius.de",
    "captain": "Tepferd Frank"
  },
  "matches": [],
  "players": [
    {
      "name": "Meik Frauenrath",
      "lk": "9.8",
      "id_number": "18253069",
      "position": 9,
      "is_captain": false
    },
    {
      "name": "Björn Kaiser",
      "lk": "10.3",
      "id_number": "17454607",
      "position": 10,
      "is_captain": false
    },
    {
      "name": "Stefan Wessels",
      "lk": "10.4",
      "id_number": "18302571",
      "position": 11,
      "is_captain": false
    },
    {
      "name": "Maurice Houboi",
      "lk": "10.4",
      "id_number": "18403153",
      "position": 12,
      "is_captain": false
    },
    {
      "name": "Fabian Eisenbeiß",
      "lk": "11.3",
      "id_number": "18603107",
      "position": 13,
      "is_captain": false
    },
    {
      "name": "Frank Tepferd",
      "lk": "12.7",
      "id_number": "17656142",
      "position": 15,
      "is_captain": true
    }
  ],
  "season": "winter",
  "year": "2025/26"
}

BEISPIEL OUTPUT 3 (Spielplan):
{
  "team_info": {
    "club_name": "VKC Köln",
    "team_name": "1",
    "category": "Herren 55",
    "league": "Herren 55 1. Kreisliga 4-er Gr. 063",
    "address": "Alfred Schütte Allee 51, 51105 Köln",
    "website": "http://www.vkc-koeln.de",
    "captain": "Borcic Zoran"
  },
  "matches": [
    {
      "match_date": "2025-11-01",
      "start_time": "",
      "home_team": "VKC Köln 1",
      "away_team": "RTHC Bayer Leverkusen 1",
      "opponent": "RTHC Bayer Leverkusen 1",
      "is_home_match": true,
      "venue": "TH Schloß Morsbroich",
      "matchday": 1,
      "match_points": "6:0",
      "status": "completed"
    },
    {
      "match_date": "2026-01-24",
      "start_time": "17:00",
      "home_team": "TC BW Zündorf 1",
      "away_team": "VKC Köln 1",
      "opponent": "TC BW Zündorf 1",
      "is_home_match": false,
      "venue": "RTHC Bayer Leverkusen",
      "matchday": 2,
      "match_points": "0:0",
      "status": "offen"
    },
    {
      "match_date": "2026-03-08",
      "start_time": "16:00",
      "home_team": "VKC Köln 1",
      "away_team": "TC Rath 1",
      "opponent": "TC Rath 1",
      "is_home_match": true,
      "venue": "TH Schloß Morsbroich",
      "matchday": 3,
      "match_points": "0:0",
      "status": "offen"
    }
  ],
  "players": [],
  "season": "winter",
  "year": "2025/26"
}

**WICHTIGE HINWEISE:**
- JEDE Tabellenzeile aus der Meldeliste MUSS einen Spieler-Eintrag ergeben
- **JEDE Zeile aus dem Spielplan MUSS ein Match sein!**
- **DATUMSFORMAT: Immer "YYYY-MM-DD" ausgeben!**
  * "01.11.2025, 00:00" → "2025-11-01" (Zeit ignorieren wenn 00:00)
  * "24.01.2026, 17:00" → "2026-01-24" (Zeit "17:00")
  * "08.03.2026, 16:00" → "2026-03-08" (Zeit "16:00")
- Extrahiere LK-Werte wenn möglich, aber setze NICHT erfundene Werte
- Wenn LK nicht erkennbar ist: lk = null oder "" (wird später manuell ergänzt)
- Wenn ID-Nummer nicht erkennbar ist: id_number = "" (wird später manuell ergänzt)
- Besser fehlende Werte lassen als falsche Werte erfinden!

Wenn du dir bei etwas unsicher bist, lass das Feld weg (außer required fields).`;

/**
 * Hauptfunktion: Vercel Serverless Handler
 */
module.exports = async function handler(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Nur POST erlaubt
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed. Use POST.',
      ...corsHeaders 
    });
  }

  try {
    // Initialisiere OpenAI HIER (nicht global!)
    const { OpenAI } = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { text, url, teamId, userEmail } = req.body;

    // Validierung
    if (!text && !url) {
      return res.status(400).json({ 
        error: 'Entweder "text" oder "url" muss angegeben werden.',
        ...corsHeaders 
      });
    }

    // teamId ist OPTIONAL - KI erkennt Team automatisch!

    console.log('🔄 Starting match parsing for team:', teamId);
    console.log('📝 Input length:', text?.length || 0, 'chars');

    // Falls URL übergeben wurde: Fetch den Inhalt (später implementieren)
    let inputText = text;
    if (url && !text) {
      // TODO: URL-Fetching implementieren
      return res.status(400).json({ 
        error: 'URL-Import noch nicht implementiert. Bitte kopiere den Text manuell.',
        ...corsHeaders 
      });
    }

    // OpenAI GPT-4o aufrufen OHNE Structured Outputs (einfacher!)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Bitte parse folgende Tennis-Meldeliste und gib NUR valides JSON zurück:\n\n${inputText}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 2000
    });

    // Response parsen
    const result = JSON.parse(completion.choices[0].message.content);
    
    console.log('✅ Parsing successful. Found matches:', result.matches?.length || 0);
    console.log('💰 Tokens used:', {
      prompt: completion.usage.prompt_tokens,
      completion: completion.usage.completion_tokens,
      total: completion.usage.total_tokens
    });

    // Validierung: Mindestens Matches ODER Spieler gefunden?
    if ((!result.matches || result.matches.length === 0) && 
        (!result.players || result.players.length === 0)) {
      return res.status(400).json({
        error: 'Keine Matches oder Spieler im Text gefunden. Bitte überprüfe das Format.',
        details: 'Der Text scheint keine erkennbaren Match- oder Spieler-Informationen zu enthalten.',
        ...corsHeaders
      });
    }

    // Erfolgreiche Response
    return res.status(200).json({
      success: true,
      data: {
        team_info: result.team_info || null,
        matches: result.matches || [],
        players: result.players || [],
        season: result.season,
        metadata: {
          parsed_at: new Date().toISOString(),
          team_id: teamId || null,
          user_email: userEmail,
          tokens_used: completion.usage.total_tokens,
          cost_estimate: calculateCost(completion.usage)
        }
      },
      ...corsHeaders
    });

  } catch (error) {
    console.error('❌ Error parsing matches:', error);
    
    // OpenAI API Fehler
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'OpenAI API Fehler',
        details: error.response.data?.error?.message || 'Unbekannter API-Fehler',
        ...corsHeaders
      });
    }

    // Rate Limit Fehler
    if (error.code === 'rate_limit_exceeded') {
      return res.status(429).json({
        error: 'Rate Limit erreicht. Bitte warte einen Moment und versuche es erneut.',
        ...corsHeaders
      });
    }

    // Allgemeiner Fehler
    return res.status(500).json({
      error: 'Interner Server-Fehler beim Parsen',
      details: error.message,
      ...corsHeaders
    });
  }
}

/**
 * Kosten-Kalkulation (grobe Schätzung)
 * GPT-4o: $5/1M input tokens, $15/1M output tokens
 */
function calculateCost(usage) {
  const inputCost = (usage.prompt_tokens / 1_000_000) * 5;
  const outputCost = (usage.completion_tokens / 1_000_000) * 15;
  const total = inputCost + outputCost;
  return `$${total.toFixed(4)}`;
}



/**
 * Vercel Serverless Function: Match-Import Parser
 * 
 * Endpoint: POST /api/import/parse-matches
 * 
 * Input: { text: string, url?: string, teamId: string }
 * Output: { matches: Array<Match>, errors: Array<string> }
 */

import OpenAI from 'openai';

// CORS Headers für Frontend-Zugriff
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OpenAI Client initialisieren
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// JSON Schema für Match-Daten (GPT soll sich daran halten)
const MATCH_SCHEMA = {
  type: "object",
  properties: {
    // Team-Informationen (automatisch erkannt)
    team_info: {
      type: "object",
      properties: {
        club_name: { type: "string", description: "Name des Vereins (z.B. 'VKC Köln')" },
        team_name: { type: "string", description: "Mannschaftsname (z.B. 'Herren 50 1')" },
        category: { type: "string", description: "Kategorie (z.B. 'Herren 50')" },
        league: { type: "string", description: "Liga-Name (z.B. 'Herren 50 2. Bezirksliga Gr. 054')" },
        address: { type: "string", description: "Vereinsadresse (falls im Text)" },
        website: { type: "string", description: "Website URL (falls im Text)" },
        captain: { type: "string", description: "Mannschaftsführer Name (falls im Text)" }
      },
      required: ["club_name"]
    },
    
    // Match-Daten
    matches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          match_date: { type: "string", description: "Datum im Format YYYY-MM-DD" },
          start_time: { type: "string", description: "Uhrzeit im Format HH:MM" },
          opponent: { type: "string", description: "Name des Gegner-Vereins (inkl. Mannschaft, z.B. 'TG Leverkusen 2')" },
          is_home_match: { type: "boolean", description: "true = Heimspiel, false = Auswärtsspiel" },
          venue: { type: "string", description: "Spielort/Anlage (z.B. 'Cologne Sportspark')" },
          address: { type: "string", description: "Adresse des Spielorts (falls angegeben)" },
          matchday: { type: "integer", description: "Spieltag-Nummer (falls angegeben)" },
          notes: { type: "string", description: "Zusätzliche Notizen (falls vorhanden)" }
        },
        required: ["match_date", "opponent", "is_home_match"]
      }
    },
    
    // Spieler-Daten (optional, falls Meldeliste vorhanden)
    players: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Spieler Name" },
          lk: { type: "string", description: "Leistungsklasse (z.B. '6.8', '13.7')" },
          id_number: { type: "string", description: "TVM ID-Nummer" },
          position: { type: "integer", description: "Position in der Meldeliste" },
          is_captain: { type: "boolean", description: "true wenn Mannschaftsführer (MF)" }
        },
        required: ["name"]
      }
    },
    
    season: {
      type: "string",
      description: "Saison (z.B. '2025/26' oder 'Winter 25/26')"
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
   - Erkenne die Mannschaft (z.B. "Herren 50 1")
   - Erkenne die Kategorie (z.B. "Herren 50")
   - Erkenne die Liga (z.B. "Herren 50 2. Bezirksliga Gr. 054")
   - Adresse und Website extrahieren (falls vorhanden)
   - Mannschaftsführer erkennen (oft mit "MF" markiert)

**2. MATCH-DATEN:**
   - Extrahiere ALLE Matches aus dem Text
   - Datumsformat: YYYY-MM-DD (z.B. "11.10.2025" → "2025-10-11")
   - Zeitformat: HH:MM (24-Stunden-Format, z.B. "18:00")
   - Heimspiel-Erkennung:
     * In TVM-Spielplänen: Das ERSTE Team in der Zeile ist IMMER Heim
     * Beispiel: "VKC Köln 1	TG Leverkusen 2" → VKC Köln 1 ist Heim (is_home_match = true)
     * Beispiel: "KölnerTHC 2	VKC Köln 1" → VKC Köln 1 ist Auswärts (is_home_match = false)
   - Venue/Spielort extrahieren (erste Spalte im Spielplan)
   - Gegner ist immer der ANDERE Verein (nicht der eigene!)

**3. SPIELER-DATEN (falls Meldeliste vorhanden):**
   - Extrahiere ALLE Spieler mit Name, LK, ID-Nummer
   - Position in der Meldeliste beachten
   - Mannschaftsführer markieren (Spalte "MF")

**4. SAISON:**
   - Erkenne Saison-Format: "Winter 25/26" oder "2025/26"

BEISPIEL INPUT (TVM-Format):
"""
VKC Köln
Stadt Köln
Alfred Schütte Allee 51
51105 Köln
http://www.vkc-koeln.de

Mannschaftsführer
Kliemt Mathias (-)

Herren 50 2. Bezirksliga Gr. 054
Herren 50 1 (4er)

Spieltage:
Datum	Spielort	Heim Verein	Gastverein	Matchpunkte	Sätze	Spiele	
11.10.2025, 18:00	Cologne Sportspark	VKC Köln 1	TG Leverkusen 2	0:0	0:0	0:0	offen
29.11.2025, 18:00	KölnerTHC Stadion RW	KölnerTHC Stadion RW 2	VKC Köln 1	0:0	0:0	0:0	offen
"""

BEISPIEL OUTPUT:
{
  "team_info": {
    "club_name": "VKC Köln",
    "team_name": "Herren 50 1",
    "category": "Herren 50",
    "league": "Herren 50 2. Bezirksliga Gr. 054",
    "address": "Alfred Schütte Allee 51, 51105 Köln",
    "website": "http://www.vkc-koeln.de",
    "captain": "Kliemt Mathias"
  },
  "matches": [
    {
      "match_date": "2025-10-11",
      "start_time": "18:00",
      "opponent": "TG Leverkusen 2",
      "is_home_match": true,
      "venue": "Cologne Sportspark"
    },
    {
      "match_date": "2025-11-29",
      "start_time": "18:00",
      "opponent": "KölnerTHC Stadion RW 2",
      "is_home_match": false,
      "venue": "KölnerTHC Stadion RW"
    }
  ],
  "season": "2025/26"
}

Wenn du dir bei etwas unsicher bist, lass das Feld weg (außer required fields).`;

/**
 * Hauptfunktion: Vercel Serverless Handler
 */
export default async function handler(req, res) {
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

    // OpenAI GPT-4o aufrufen mit Structured Outputs
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Bitte parse folgende Tennis-Meldeliste:\n\n${inputText}` }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "match_list_parser",
          schema: MATCH_SCHEMA,
          strict: true
        }
      },
      temperature: 0.1, // Niedrig für konsistente Ergebnisse
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

    // Validierung: Mindestens 1 Match gefunden?
    if (!result.matches || result.matches.length === 0) {
      return res.status(400).json({
        error: 'Keine Matches im Text gefunden. Bitte überprüfe das Format.',
        details: 'Der Text scheint keine erkennbaren Match-Informationen zu enthalten.',
        ...corsHeaders
      });
    }

    // Erfolgreiche Response
    return res.status(200).json({
      success: true,
      data: {
        team_info: result.team_info || null,
        matches: result.matches,
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


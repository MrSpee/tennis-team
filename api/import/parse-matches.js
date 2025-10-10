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
    matches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          match_date: { type: "string", description: "Datum im Format YYYY-MM-DD" },
          start_time: { type: "string", description: "Uhrzeit im Format HH:MM" },
          opponent: { type: "string", description: "Name des Gegner-Vereins" },
          is_home_match: { type: "boolean", description: "true = Heimspiel, false = Auswärtsspiel" },
          venue: { type: "string", description: "Spielort/Anlage (falls angegeben)" },
          address: { type: "string", description: "Adresse des Spielorts (falls angegeben)" },
          league: { type: "string", description: "Liga-Name (z.B. 'Kreisliga A', falls angegeben)" },
          group_name: { type: "string", description: "Gruppenname (falls angegeben)" },
          matchday: { type: "integer", description: "Spieltag-Nummer (falls angegeben)" },
          notes: { type: "string", description: "Zusätzliche Notizen (falls vorhanden)" }
        },
        required: ["match_date", "opponent", "is_home_match"]
      }
    },
    season: {
      type: "string",
      description: "Saison (z.B. '2025/26', falls im Text erwähnt)"
    },
    category: {
      type: "string",
      description: "Kategorie/Altersklasse (z.B. 'Herren 40', falls im Text erwähnt)"
    }
  },
  required: ["matches"]
};

// System-Prompt für GPT-4o
const SYSTEM_PROMPT = `Du bist ein Experte für das Parsen von Tennis-Meldelisten im TVM-Format (Tennisverband Mittelrhein).

Deine Aufgabe: Extrahiere ALLE Match-Informationen aus dem bereitgestellten Text und gib sie im JSON-Format zurück.

WICHTIGE REGELN:
1. Extrahiere ALLE Matches aus dem Text, nicht nur das erste
2. Datumsformat: YYYY-MM-DD (z.B. "Sa, 15.11.2025" → "2025-11-15")
3. Zeitformat: HH:MM (24-Stunden-Format, z.B. "14:00")
4. Heimspiel-Erkennung:
   - Wenn "vs." oder "gegen" verwendet wird: Das Team VOR "vs." ist HEIM (is_home_match = true)
   - Wenn "bei" oder "@" verwendet wird: Das Team ist AUSWÄRTS (is_home_match = false)
   - Beispiel: "SV Sürth vs. TC Köln" → SV Sürth ist Heim
   - Beispiel: "SV Sürth bei TC Köln" → SV Sürth ist Auswärts
5. Wenn Spieltag-Nummer angegeben ist, extrahiere sie
6. Wenn Liga/Gruppe angegeben ist, extrahiere sie
7. Wenn Venue/Ort angegeben ist, extrahiere es
8. Saison: Suche nach "Winter 2025/26" oder ähnlichem
9. Kategorie: Suche nach "Herren 40", "Damen", etc.

BEISPIEL INPUT:
"""
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
"""

BEISPIEL OUTPUT:
{
  "matches": [
    {
      "match_date": "2025-11-15",
      "start_time": "14:00",
      "opponent": "TC Köln-Süd",
      "is_home_match": true,
      "venue": "Marienburger SC",
      "address": "Köln",
      "matchday": 1,
      "league": "Kreisliga A"
    },
    {
      "match_date": "2025-11-22",
      "start_time": "14:00",
      "opponent": "Rodenkirchener TC",
      "is_home_match": false,
      "venue": "Rodenkirchener TC",
      "address": "Köln-Rodenkirchen",
      "matchday": 2,
      "league": "Kreisliga A"
    }
  ],
  "season": "2025/26",
  "category": "Herren 40"
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

    if (!teamId) {
      return res.status(400).json({ 
        error: 'teamId ist erforderlich.',
        ...corsHeaders 
      });
    }

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
        matches: result.matches,
        season: result.season,
        category: result.category,
        metadata: {
          parsed_at: new Date().toISOString(),
          team_id: teamId,
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


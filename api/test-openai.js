/**
 * Test-Endpoint: OpenAI API Key Validierung
 * 
 * Endpoint: GET /api/test-openai
 * 
 * Testet ob der OpenAI API Key korrekt konfiguriert ist
 */

const OpenAI = require('openai').default;

module.exports = async function handler(req, res) {
  // Nur GET erlaubt
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed. Use GET.' 
    });
  }

  try {
    // 1. Prüfe ob API Key gesetzt ist
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'OPENAI_API_KEY ist nicht gesetzt!',
        hint: 'Gehe zu Vercel Dashboard → Settings → Environment Variables'
      });
    }

    // 2. API Key Format prüfen
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey.startsWith('sk-proj-') && !apiKey.startsWith('sk-')) {
      return res.status(500).json({
        success: false,
        error: 'OPENAI_API_KEY hat falsches Format!',
        details: `Key startet mit: ${apiKey.substring(0, 10)}...`,
        expected: 'Sollte mit "sk-proj-" oder "sk-" starten'
      });
    }

    // 3. OpenAI Client initialisieren
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // 4. Einfacher Test-Call (sehr billig)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Günstigeres Modell für Test
      messages: [
        { role: "user", content: "Antworte mit genau einem Wort: OK" }
      ],
      max_tokens: 10,
      temperature: 0
    });

    const response = completion.choices[0].message.content.trim();

    // 5. Erfolg!
    return res.status(200).json({
      success: true,
      message: '✅ OpenAI API Key funktioniert!',
      details: {
        api_key_prefix: apiKey.substring(0, 10) + '...',
        test_response: response,
        model_used: 'gpt-4o-mini',
        tokens_used: completion.usage.total_tokens,
        cost: `$${((completion.usage.total_tokens / 1_000_000) * 0.15).toFixed(6)}`
      }
    });

  } catch (error) {
    console.error('❌ OpenAI Test Error:', error);
    
    // API Key ungültig
    if (error.status === 401) {
      return res.status(401).json({
        success: false,
        error: '🔑 API Key ist ungültig!',
        details: error.message,
        hint: 'Prüfe ob der Key korrekt kopiert wurde (ohne Leerzeichen)'
      });
    }

    // Rate Limit
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        error: '⏱️ Rate Limit erreicht!',
        details: error.message
      });
    }

    // Allgemeiner Fehler
    return res.status(500).json({
      success: false,
      error: 'OpenAI API Fehler',
      details: error.message,
      status: error.status || 'unknown'
    });
  }
};


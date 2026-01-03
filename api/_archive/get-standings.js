/**
 * API Endpoint: GET /api/standings/get-standings
 * 
 * Gibt die aktuellen Standings für eine Gruppe zurück
 * 
 * Query Parameters:
 * - league: Liga-Name (z.B. "1. Bezirksliga")
 * - group_name: Gruppen-Name (z.B. "Gr. 043")
 * - season: Saison (z.B. "Winter 2025/26")
 */

const { createClient } = require('@supabase/supabase-js');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

module.exports = async function handler(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Nur GET erlaubt
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed. Use GET.',
      ...corsHeaders 
    });
  }

  try {
    const { league, group_name, season } = req.query;

    // Validierung
    if (!league || !group_name || !season) {
      return res.status(400).json({ 
        error: 'Fehlende Parameter. Benötigt: league, group_name, season',
        ...corsHeaders 
      });
    }

    // Supabase Client initialisieren
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        error: 'Supabase-Konfiguration fehlt',
        ...corsHeaders 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rufe SQL-Funktion auf
    const { data, error } = await supabase.rpc('compute_standings', {
      p_league: league,
      p_group_name: group_name,
      p_season: season
    });

    if (error) {
      console.error('Error calling compute_standings:', error);
      return res.status(500).json({ 
        error: 'Fehler beim Berechnen der Standings',
        details: error.message,
        ...corsHeaders 
      });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      meta: {
        league,
        group_name,
        season,
        team_count: data?.length || 0
      },
      ...corsHeaders
    });

  } catch (error) {
    console.error('Error in get-standings:', error);
    return res.status(500).json({ 
      error: 'Interner Server-Fehler',
      details: error.message,
      ...corsHeaders 
    });
  }
};


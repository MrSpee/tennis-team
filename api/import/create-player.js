const { createSupabaseClient } = require('../_lib/supabaseAdmin');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function withCors(res, status, payload) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.status(status).json(payload);
}

function sanitizeLk(lk) {
  if (!lk) return null;
  const normalized = String(lk).trim().replace(',', '.');
  const match = normalized.match(/^\d{1,2}(?:\.\d)?$/);
  return match ? normalized : null;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return withCors(res, 200, { ok: true });
  }

  if (req.method !== 'POST') {
    return withCors(res, 405, { success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const {
      name,
      lk,
      playerType = 'opponent',
      status = 'pending',
      teamId = null,
      importSource = 'nuliga_meeting_report'
    } = req.body || {};

    if (!name || !name.trim()) {
      return withCors(res, 400, { success: false, error: 'Name ist erforderlich.' });
    }

    const supabase = createSupabaseClient(true);
    const normalizedName = name.trim();

    const { data: existing, error: existingError } = await supabase
      .from('players_unified')
      .select('id, current_lk, player_type, status')
      .ilike('name', normalizedName)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing?.id) {
      return withCors(res, 200, {
        success: false,
        reason: 'exists',
        player: existing
      });
    }

    const payload = {
      name: normalizedName,
      player_type: playerType,
      is_active: false,
      status,
      import_source: importSource,
      current_lk: sanitizeLk(lk),
      season_start_lk: sanitizeLk(lk)
    };

    const { data: inserted, error: insertError } = await supabase
      .from('players_unified')
      .insert(payload)
      .select('id, name, current_lk, status, player_type')
      .single();

    if (insertError) {
      throw insertError;
    }

    if (teamId) {
      const { error: membershipError } = await supabase.from('team_memberships').insert({
        player_id: inserted.id,
        team_id: teamId,
        role: 'player',
        is_primary: false,
        season: null
      });

      if (membershipError) {
        console.warn('[create-player] Teamzuweisung fehlgeschlagen:', membershipError.message);
      }
    }

    return withCors(res, 200, {
      success: true,
      player: inserted
    });
  } catch (error) {
    console.error('[api/import/create-player] Fehler:', error);
    return withCors(res, 500, {
      success: false,
      error: error.message || 'Unbekannter Fehler beim Anlegen des Spielers.'
    });
  }
};


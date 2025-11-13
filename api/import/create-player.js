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

function splitName(fullName = '') {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: null, lastName: null };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
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
    const { firstName, lastName } = splitName(normalizedName);

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

    const safePlayerType = (playerType || 'opponent').toString().trim().slice(0, 20);
    const safeStatus = (status || 'pending').toString().trim().slice(0, 20);
    const safeImportSource = (importSource || 'nu_meeting').toString().trim().slice(0, 20);
    const sanitizedLk = sanitizeLk(lk);

    let resolvedTeamId = null;
    let resolvedClubId = null;
    let resolvedClubName = null;

    if (teamId) {
      const { data: teamRecord, error: teamError } = await supabase
        .from('team_info')
        .select('id, club_id, club_name')
        .eq('id', teamId)
        .maybeSingle();

      if (teamError) {
        console.warn('[create-player] Team-Lookup fehlgeschlagen:', teamError.message);
      } else if (teamRecord?.id) {
        resolvedTeamId = teamRecord.id;
        resolvedClubId = teamRecord.club_id || null;
        resolvedClubName = teamRecord.club_name || null;
      }
    }

    const infoPayload = {
      source: safeImportSource,
      first_name: firstName,
      last_name: lastName,
      lk: sanitizedLk,
      club_id: resolvedClubId,
      club_name: resolvedClubName
    };

    const payload = {
      name: normalizedName,
      player_type: safePlayerType,
      is_active: false,
      status: safeStatus,
      import_source: safeImportSource,
      current_lk: sanitizedLk,
      season_start_lk: sanitizedLk,
      primary_team_id: resolvedTeamId,
      info: JSON.stringify(infoPayload)
    };

    const { data: inserted, error: insertError } = await supabase
      .from('players_unified')
      .insert(payload)
      .select('id, name, current_lk, status, player_type')
      .single();

    if (insertError) {
      throw insertError;
    }

    if (resolvedTeamId) {
      const { error: membershipError } = await supabase.from('team_memberships').insert({
        player_id: inserted.id,
        team_id: resolvedTeamId,
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


import { createClient } from '@supabase/supabase-js';

// Supabase Konfiguration aus Umgebungsvariablen
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Prüfung ob Keys vorhanden sind
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase-Keys fehlen!');
  console.error('Bitte .env Datei erstellen mit:');
  console.error('VITE_SUPABASE_URL=ihre_url');
  console.error('VITE_SUPABASE_ANON_KEY=ihr_key');
  console.error('Siehe SUPABASE_SETUP.md für Details');
}

// Erstelle Supabase Client mit expliziten Timeouts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'supabase.auth.token'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'x-client-info': 'tennis-team-app'
    }
  },
  db: {
    schema: 'public'
  }
});

// Helper Funktionen

/**
 * Prüft ob Supabase korrekt konfiguriert ist
 */
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

/**
 * Gibt den aktuellen User zurück
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return user;
};

/**
 * Erstellt einen neuen User und Player-Eintrag
 * @deprecated - Use AuthContext.register() instead
 */
export const createPlayer = async (email, password, playerData) => {
  try {
    // 1. User erstellen in Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: playerData.name
        }
      }
    });

    if (authError) throw authError;

    // 2. Player-Eintrag erstellen in players_unified
    const { data: player, error: playerError } = await supabase
      .from('players_unified')
      .insert({
        user_id: authData.user.id,
        name: playerData.name,
        email: email,
        phone: playerData.phone || null,
        current_lk: playerData.ranking || null,
        season_start_lk: playerData.ranking || null,
        ranking: playerData.ranking || null,
        points: playerData.points || 0,
        player_type: 'app_user',
        is_active: true,
        status: 'active',
        onboarding_status: 'not_started'
      })
      .select()
      .single();

    if (playerError) throw playerError;

    return { user: authData.user, player };
  } catch (error) {
    console.error('Error creating player:', error);
    throw error;
  }
};

/**
 * Login mit Email/Passwort
 * @deprecated - Use AuthContext.login() instead
 */
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    console.error('Error signing in:', error);
    return { user: null, error };
  }

  // Player-Daten laden aus players_unified
  const { data: player } = await supabase
    .from('players_unified')
    .select('*')
    .eq('user_id', data.user.id)
    .eq('player_type', 'app_user')
    .maybeSingle();

  return { user: data.user, player, error: null };
};

/**
 * Logout
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
  }
  return { error };
};

/**
 * Prüft ob User Captain ist
 * @deprecated - Check player.role from AuthContext instead
 */
export const isCaptain = async (userId) => {
  const { data, error } = await supabase
    .from('players_unified')
    .select('id')
    .eq('user_id', userId)
    .eq('player_type', 'app_user')
    .maybeSingle();

  if (error || !data) return false;
  
  // Prüfe ob Spieler Captain-Rolle in einem Team hat
  const { data: membership } = await supabase
    .from('team_memberships')
    .select('role')
    .eq('player_id', data.id)
    .eq('role', 'captain')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  
  return !!membership;
};

export default supabase;


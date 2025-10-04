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

// Erstelle Supabase Client mit Fallback
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key', 
  {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
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

    // 2. Player-Eintrag erstellen
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        user_id: authData.user.id,
        name: playerData.name,
        email: email,
        phone: playerData.phone || null,
        ranking: playerData.ranking || null,
        points: playerData.points || 0,
        role: 'player'
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

  // Player-Daten laden
  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', data.user.id)
    .single();

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
 */
export const isCaptain = async (userId) => {
  const { data, error } = await supabase
    .from('players')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error) return false;
  return data?.role === 'captain';
};

export default supabase;


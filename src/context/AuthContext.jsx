import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true); // TRUE während Session geladen wird!
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Prüfe Supabase-Konfiguration
  const configured = isSupabaseConfigured();

  useEffect(() => {
    console.log('🔵 AuthContext - Supabase configured:', configured);
    
    if (!configured) {
      console.error('❌ Supabase nicht konfiguriert! Prüfe .env Datei');
      setLoading(false);
      setInitialCheckDone(true);
      return;
    }

    // Hole aktuelle Session beim App-Start (z.B. nach Refresh)
    const checkSession = async () => {
      try {
        console.log('🔵 Checking for existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
          setLoading(false);
          setInitialCheckDone(true);
          return;
        }

        if (session?.user) {
          console.log('✅ Session found! User:', session.user.email);
          setCurrentUser(session.user);
          setIsAuthenticated(true);
          await loadPlayerData(session.user.id);
        } else {
          console.log('✅ No session - user needs to login');
          setLoading(false);
        }
        
        setInitialCheckDone(true);
      } catch (error) {
        console.error('❌ Error checking session:', error);
        setLoading(false);
        setInitialCheckDone(true);
      }
    };

    checkSession();

    // Lausche auf Auth-Änderungen (z.B. Login/Logout in anderen Tabs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔵 Auth state change - Event:', event, 'Session:', session ? 'exists' : 'none');
        
        // Ignoriere den initialen SIGNED_IN event beim Laden
        if (!initialCheckDone) {
          console.log('⏳ Initial check not done yet, skipping auth state change');
          return;
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('🔵 User signed out - clearing state');
          setCurrentUser(null);
          setPlayer(null);
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('🔵 User signed in or token refreshed');
          if (session?.user) {
            setCurrentUser(session.user);
            setIsAuthenticated(true);
            await loadPlayerData(session.user.id);
          }
          return;
        }
        
        // Fallback: Session vorhanden
        if (session?.user) {
          console.log('🔵 Session exists, loading user data');
          setCurrentUser(session.user);
          setIsAuthenticated(true);
          await loadPlayerData(session.user.id);
        } else {
          console.log('🔵 No session, clearing state');
          setCurrentUser(null);
          setPlayer(null);
          setIsAuthenticated(false);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [configured, initialCheckDone]);

  // Lade Player-Daten aus Datenbank
  const loadPlayerData = async (userId) => {
    console.log('🔵 Loading player data for userId:', userId);
    
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      console.log('🔵 Player query result - data:', data ? 'Found' : 'Not found', 'error:', error);

      if (data) {
        console.log('✅ Player data loaded:', data.name, data.email);
        setPlayer(data);
      } else {
        console.warn('⚠️ No player data found - creating player entry');
        
        // Hole User-Daten aus Auth
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log('📝 Creating player entry for user:', user.email);
          
          // Erstelle Player-Eintrag
          const { data: newPlayer, error: insertError } = await supabase
            .from('players')
            .insert({
              user_id: user.id,
              email: user.email,
              name: user.user_metadata?.name || 'Neuer Spieler',
              phone: user.user_metadata?.phone || null,
              ranking: user.user_metadata?.ranking || null,
              role: 'player',
              points: 0,
              is_active: true
            })
            .select()
            .single();

          if (insertError) {
            console.error('❌ Error creating player:', insertError);
            setPlayer(null);
          } else {
            console.log('✅ Player created successfully:', newPlayer);
            setPlayer(newPlayer);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in loadPlayerData:', error);
      setPlayer(null);
    }
    
    // IMMER loading auf false setzen!
    setLoading(false);
  };

  /**
   * Login mit Email/Passwort
   */
  const login = async (email, password) => {
    try {
      console.log('🔵 Login attempt for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      console.log('✅ Login successful, user:', data.user.email);
      
      // Setze sofort authenticated
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      
      // Lade Player-Daten
      await loadPlayerData(data.user.id);

      return { success: true, needsProfile: false };
    } catch (error) {
      console.error('❌ Login error:', error);
      return { 
        success: false, 
        needsProfile: false,
        error: error.message 
      };
    }
  };

  /**
   * Registrierung: Neuer User (Player wird automatisch via Trigger erstellt)
   */
  const register = async (email, password, playerData) => {
    try {
      console.log('📝 Starting registration for:', email);
      
      // User erstellen - Player wird automatisch via Database Trigger erstellt!
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: playerData.name,
            phone: playerData.phone,
            ranking: playerData.ranking
          },
          emailRedirectTo: window.location.origin
        }
      });

      if (authError) throw authError;

      console.log('✅ Auth user created:', authData.user.id);
      console.log('✅ Player wird automatisch via Trigger erstellt');
      
      return { 
        success: true, 
        needsProfile: false,
        message: '✅ Registrierung erfolgreich! Sie können sich jetzt anmelden.'
      };
    } catch (error) {
      console.error('❌ Registration error:', error);
      return { 
        success: false,
        error: error.message 
      };
    }
  };

  /**
   * Profil aktualisieren - Sauber, nur Supabase
   */
  const updateProfile = async (profileData) => {
    if (!player?.id) {
      return { success: false, error: 'Kein Spieler-Profil vorhanden. Bitte neu einloggen.' };
    }

    try {
      const { data, error } = await supabase
        .from('players')
        .update({
          name: profileData.name,
          phone: profileData.phone || null,
          ranking: profileData.ranking || null
        })
        .eq('id', player.id)
        .select()
        .single();

      if (error) throw error;

      setPlayer(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  /**
   * Profil vervollständigen (für neue User)
   */
  const completeProfile = async (profileData) => {
    return await updateProfile(profileData);
  };

  /**
   * Logout - NUR Supabase, KEIN localStorage
   */
  const logout = async () => {
    console.log('🔵 Logout started');
    
    // State SOFORT zurücksetzen (für sofortige UI-Reaktion)
    setIsAuthenticated(false);
    setCurrentUser(null);
    setPlayer(null);
    setLoading(false);
    
    // Dann Supabase Session beenden
    try {
      await supabase.auth.signOut();
      console.log('✅ Supabase logout complete');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  const value = {
    isAuthenticated,
    currentUser,
    player,
    loading,
    configured,
    login,
    register,
    logout,
    updateProfile,
    completeProfile,
    isCaptain: player?.role === 'captain',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


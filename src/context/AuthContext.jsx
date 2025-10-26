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
  const [needsOnboarding, setNeedsOnboarding] = useState(false); // Spieler hat kein Team

  // Prüfe Supabase-Konfiguration
  const configured = isSupabaseConfigured();

  useEffect(() => {
    // Verhindere mehrfache Ausführung
    if (initialCheckDone) {
      return; // Weniger Logs
    }

    console.log('🔵 AuthContext - Supabase configured:', configured);
    
    // Prüfe zuerst lokale Daten (TEMPORÄR DEAKTIVIERT FÜR TESTING)
    const localPlayerData = localStorage.getItem('localPlayerData');
    const localOnboardingComplete = localStorage.getItem('localOnboardingComplete');
    
    // TEMPORÄR: Lokale Daten ignorieren für sauberes Testing
    if (false && localPlayerData && localOnboardingComplete === 'true') {
      console.log('🏠 LOCAL Player data found:', localPlayerData);
      try {
        const playerData = JSON.parse(localPlayerData);
        setPlayer(playerData);
        setIsAuthenticated(true);
        setCurrentUser({ id: playerData.id, email: playerData.email });
        setNeedsOnboarding(false);
        setLoading(false);
        setInitialCheckDone(true);
        return;
      } catch (error) {
        console.error('❌ Error parsing local player data:', error);
        // Fallback zu Supabase
      }
    }
    
    if (!configured) {
      console.error('❌ Supabase nicht konfiguriert! Prüfe Umgebungsvariablen');
      console.error('🔧 Für Vercel: Environment Variables in Dashboard setzen');
      console.error('🔧 Für lokal: .env Datei mit VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY erstellen');
      setLoading(false);
      setInitialCheckDone(true);
      return;
    }

    // Hole aktuelle Session beim App-Start (z.B. nach Refresh)
    const checkSession = async () => {
      try {
        console.log('🔵 Checking for existing session...');
        
        // Timeout für Session-Check um Hängen zu vermeiden
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );
        
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
        
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
        if (error.message === 'Session check timeout') {
          console.warn('⚠️ Session check timed out - continuing without session');
        }
        setLoading(false);
        setInitialCheckDone(true);
      }
    };

    checkSession();

    // Lausche auf Auth-Änderungen (z.B. Login/Logout in anderen Tabs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔵 Auth state change - Event:', event, 'Session:', session ? 'exists' : 'none');
        
        // Ignoriere den initialen SIGNED_IN und INITIAL_SESSION event beim Laden
        if (!initialCheckDone && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          console.log('⏳ Initial check not done yet, skipping auth state change:', event);
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

    return () => {
      subscription.unsubscribe();
    };
  }, [configured, initialCheckDone]);
  
  // Separater useEffect für Auth-Reload Listener
  useEffect(() => {
    const handleReloadAuth = async () => {
      console.log('🔄 Manual Auth reload triggered');
      if (currentUser?.id) {
        const { data, error } = await supabase
          .from('players_unified')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('player_type', 'app_user')
          .maybeSingle();
        
        if (data) {
          setPlayer(data);
          
          // Prüfe Teams
          const { data: playerTeams } = await supabase
            .from('team_memberships')
            .select('team_id')
            .eq('player_id', data.id)
            .eq('is_active', true)
            .limit(1);
          
          setNeedsOnboarding(!playerTeams || playerTeams.length === 0);
          console.log('✅ Auth reloaded, needsOnboarding:', !playerTeams || playerTeams.length === 0);
        }
      }
    };
    
    window.addEventListener('reloadAuth', handleReloadAuth);
    return () => window.removeEventListener('reloadAuth', handleReloadAuth);
  }, [currentUser]);

  // Lade Player-Daten aus Datenbank
  const loadPlayerData = async (userId) => {
    console.log('🔵 Loading player data for userId:', userId);
    
    try {
      const { data, error } = await supabase
        .from('players_unified')
        .select('*')
        .eq('user_id', userId)
        .eq('player_type', 'app_user')
        .maybeSingle();
      
      console.log('🔵 Player query result - data:', data ? 'Found' : 'Not found', 'error:', error);

      if (data) {
        console.log('✅ Player data loaded:', data.name, data.email);
        setPlayer(data);
        
        // Prüfe ob Spieler einem Team zugeordnet ist
        const { data: playerTeams, error: teamError } = await supabase
          .from('team_memberships')
          .select('team_id')
          .eq('player_id', data.id)
          .eq('is_active', true)
          .limit(1);

        if (!teamError && (!playerTeams || playerTeams.length === 0)) {
          console.log('⚠️ Player hat kein Team → Onboarding nötig');
          setNeedsOnboarding(true);
        } else {
          setNeedsOnboarding(false);
        }
        
        // Trigger Team-Reload Event für DataContext
        window.dispatchEvent(new CustomEvent('reloadTeams', { 
          detail: { playerId: data.id } 
        }));
      } else {
        console.warn('⚠️ No player data found - creating player entry');
        
        // Hole User-Daten aus Auth
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log('📝 Creating player entry for user:', user.email);
          
          // Bessere Namens-Generierung für neue Spieler
          let playerName = user.user_metadata?.name;
          console.log('🔵 Name from user_metadata:', playerName);
          
          if (!playerName) {
            // Extrahiere Namen aus E-Mail (vor dem @)
            const emailName = user.email?.split('@')[0];
            console.log('🔵 Email name extracted:', emailName);
            
            // Ersetze Punkte und Unterstriche mit Leerzeichen und kapitalisiere
            playerName = emailName?.replace(/[._]/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ') || 'Neuer Spieler';
            
            console.log('🔵 Generated player name:', playerName);
          }
          
          // Erstelle Player-Eintrag
          const { data: newPlayer, error: insertError } = await supabase
            .from('players_unified')
            .insert({
              user_id: user.id,
              email: user.email,
              name: playerName,
              phone: user.user_metadata?.phone || null,
              ranking: user.user_metadata?.ranking || null,
              points: 0,
              player_type: 'app_user',
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
            
            // Neuer Spieler hat kein Team → Onboarding nötig
            setNeedsOnboarding(true);
            console.log('⚠️ Neuer Spieler → Onboarding nötig');
            
            // Trigger Team-Reload Event für DataContext
            window.dispatchEvent(new CustomEvent('reloadTeams', { 
              detail: { playerId: newPlayer.id } 
            }));
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
      const { error } = await supabase
        .from('players_unified')
        .update({
          name: profileData.name,
          phone: profileData.phone || null,
          ranking: profileData.ranking || null,
          profile_image: profileData.profileImage || null,
          favorite_shot: profileData.favoriteShot || profileData.favorite_shot || null,
          tennis_motto: profileData.tennisMotto || profileData.tennis_motto || null,
          fun_fact: profileData.funFact || profileData.fun_fact || null,
          worst_tennis_memory: profileData.worstTennisMemory || profileData.worst_tennis_memory || null,
          best_tennis_memory: profileData.bestTennisMemory || profileData.best_tennis_memory || null,
          superstition: profileData.superstition || null,
          pre_match_routine: profileData.preMatchRoutine || profileData.pre_match_routine || null,
          favorite_opponent: profileData.favoriteOpponent || profileData.favorite_opponent || null,
          dream_match: profileData.dreamMatch || profileData.dream_match || null,
          birth_date: profileData.birthDate || profileData.birth_date || null,
          address: profileData.address || null,
          emergency_contact: profileData.emergencyContact || profileData.emergency_contact || null,
          emergency_phone: profileData.emergencyPhone || profileData.emergency_phone || null,
          notes: profileData.notes || null,
          current_lk: profileData.current_lk || null
        })
        .eq('id', player.id);

      if (error) throw error;

      // Update nur den lokalen Player-State (OHNE Reload von DB!)
      // Das verhindert, dass der letzte Character beim Tippen verloren geht
      setPlayer(prev => ({
        ...prev,
        name: profileData.name,
        phone: profileData.phone || null,
        ranking: profileData.ranking || null,
        profile_image: profileData.profileImage || null,
        favorite_shot: profileData.favoriteShot || profileData.favorite_shot || null,
        tennis_motto: profileData.tennisMotto || profileData.tennis_motto || null,
        fun_fact: profileData.funFact || profileData.fun_fact || null,
        worst_tennis_memory: profileData.worstTennisMemory || profileData.worst_tennis_memory || null,
        best_tennis_memory: profileData.bestTennisMemory || profileData.best_tennis_memory || null,
        superstition: profileData.superstition || null,
        pre_match_routine: profileData.preMatchRoutine || profileData.pre_match_routine || null,
        favorite_opponent: profileData.favoriteOpponent || profileData.favorite_opponent || null,
        dream_match: profileData.dreamMatch || profileData.dream_match || null,
        birth_date: profileData.birthDate || profileData.birth_date || null,
        address: profileData.address || null,
        emergency_contact: profileData.emergencyContact || profileData.emergency_contact || null,
        emergency_phone: profileData.emergencyPhone || profileData.emergency_phone || null,
        notes: profileData.notes || null,
        current_lk: profileData.current_lk || null,
        updated_at: new Date().toISOString()
      }));
      
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
   * Passwort-Reset per Email anfordern
   */
  const requestPasswordReset = async () => {
    console.log('🔵 Requesting password reset email...');
    
    if (!currentUser?.email) {
      console.error('❌ No user email found');
      return { success: false, error: 'Ups! Keine E-Mail-Adresse gefunden. Bitte melde dich nochmal an, dann klappt\'s! 🤔' };
    }

    try {
      // Sende Reset-Email über Supabase
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(currentUser.email, {
        redirectTo: `${window.location.origin}/password-reset`
      });
      
      if (resetError) {
        console.error('❌ Email reset error:', resetError);
        return { success: false, error: `Hmm, da ist was schiefgelaufen: ${resetError.message}. Versuch's nochmal oder frag den Captain! 🤷‍♂️` };
      }
      
      console.log('✅ Password reset email sent to:', currentUser.email);
      return { 
        success: true, 
        message: `🎉 Perfekt! Eine magische E-Mail ist auf dem Weg zu ${currentUser.email}. Schau mal in dein Postfach (und auch im Spam-Ordner, falls sie sich verirrt hat 😄) und folge den Anweisungen!`,
        email: currentUser.email
      };
    } catch (error) {
      console.error('❌ Email reset exception:', error);
      return { success: false, error: `Oops! Da ist ein Fehler aufgetreten: ${error.message}. Keine Panik, versuch's einfach nochmal! 😅` };
    }
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
    needsOnboarding,
    login,
    register,
    logout,
    updateProfile,
    completeProfile,
    requestPasswordReset,
    isCaptain: player?.role === 'captain',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


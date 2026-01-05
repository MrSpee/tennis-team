import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { LoggingService } from '../services/activityLogger';

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
      let timeoutId;
      
      try {
        console.log('🔵 Checking for existing session...');
        
        // Versuche zuerst, Session aus localStorage zu lesen (schneller)
        // Supabase speichert die Session in localStorage unter 'supabase.auth.token'
        try {
          const storedSession = localStorage.getItem('supabase.auth.token');
          if (storedSession) {
            console.log('🔵 Found stored session in localStorage');
            // Session existiert lokal, aber prüfe trotzdem mit Supabase (async im Hintergrund)
          }
        } catch (e) {
          // localStorage nicht verfügbar, kein Problem
        }
        
        // ✅ VERBESSERT: Timeout nach 5 Sekunden (statt 3) für langsamere Verbindungen
        const timeoutPromise = new Promise((resolve) => {
          timeoutId = setTimeout(() => {
            console.warn('⚠️ Session check timeout after 5s - continuing without session');
            resolve({ timeout: true });
          }, 5000); // Erhöht von 3s auf 5s
        });
        
        // Session-Check mit Timeout
        const sessionPromise = supabase.auth.getSession().then(result => {
          if (timeoutId) clearTimeout(timeoutId);
          return result;
        }).catch(err => {
          if (timeoutId) clearTimeout(timeoutId);
          console.error('❌ Session check error:', err);
          return { data: { session: null }, error: err };
        });
        
        // Race: Entweder Session-Ergebnis oder Timeout
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        
        // Wenn Timeout gewonnen hat, fahre ohne Session fort
        if (result && result.timeout) {
          console.warn('⚠️ Session check timed out - continuing without session');
          setLoading(false);
          setInitialCheckDone(true);
          return;
        }
        
        const { data: { session }, error } = result || { data: { session: null }, error: null };
        
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
        // Bei jedem Fehler einfach ohne Session fortfahren
        console.warn('⚠️ Continuing without session due to error');
        setLoading(false);
        setInitialCheckDone(true);
      } finally {
        // Cleanup: Stelle sicher, dass Timeout gelöscht wird
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
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
      // Hole ALLE Spieler für diesen User (könnte mehrere geben bei Bug)
      const { data: allPlayers, error: errorAll } = await supabase
        .from('players_unified')
        .select('*')
        .eq('user_id', userId)
        .eq('player_type', 'app_user');
      
      if (errorAll) throw errorAll;
      
      console.log(`🔵 Found ${allPlayers?.length || 0} players for userId:`, userId);

      if (!allPlayers || allPlayers.length === 0) {
        console.warn('⚠️ No player data found - User sollte über Onboarding gehen');
        setPlayer(null);
        setNeedsOnboarding(true);
        setLoading(false);
        return;
      }

      // Wenn mehrere Spieler: Wähle den mit 'completed' Onboarding, sonst den neuesten
      let selectedPlayer = null;
      
      if (allPlayers.length > 1) {
        console.warn(`⚠️ Multiple players found for userId ${userId}:`, allPlayers.map(p => ({ id: p.id, name: p.name, onboarding: p.onboarding_status })));
        
        // Priorität 1: Onboarding completed
        selectedPlayer = allPlayers.find(p => p.onboarding_status === 'completed');
        
        // Priorität 2: Neuester Eintrag
        if (!selectedPlayer) {
          selectedPlayer = allPlayers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        }
        
        console.log('✅ Selected player (of multiple):', selectedPlayer.name, selectedPlayer.id);
      } else {
        selectedPlayer = allPlayers[0];
        console.log('✅ Player data loaded:', selectedPlayer.name, selectedPlayer.email);
      }

      setPlayer(selectedPlayer);
      
      // Prüfe ob Spieler einem Team zugeordnet ist
      const { data: playerTeams, error: teamError } = await supabase
        .from('team_memberships')
        .select('team_id')
        .eq('player_id', selectedPlayer.id)
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
        detail: { playerId: selectedPlayer.id } 
      }));
    } catch (error) {
      console.error('❌ Error in loadPlayerData:', error);
      setPlayer(null);
      setNeedsOnboarding(true);
    }
    
    // IMMER loading auf false setzen!
    setLoading(false);
  };

  /**
   * Übersetze Supabase-Fehler in benutzerfreundliche deutsche Meldungen
   */
  const getLoginErrorMessage = (error) => {
    const errorMsg = error?.message?.toLowerCase() || '';
    const errorCode = error?.code?.toLowerCase() || '';
    
    // ✅ VERBESSERT: Prüfe auch error.code für bessere Erkennung
    // Falsche Credentials
    if (errorMsg.includes('invalid login credentials') || 
        errorMsg.includes('invalid email or password') ||
        errorCode === 'invalid_credentials' ||
        errorCode === 'invalid_grant') {
      return '🔒 E-Mail oder Passwort falsch. Prüfe deine Eingabe und versuche es nochmal!';
    }
    
    // Email nicht bestätigt
    if (errorMsg.includes('email not confirmed') ||
        errorMsg.includes('email_not_confirmed') ||
        errorCode === 'email_not_confirmed') {
      return '📧 Bitte bestätige zuerst deine E-Mail-Adresse!\n\nSchau in dein Postfach (auch im Spam-Ordner) und klicke auf den Bestätigungslink.';
    }
    
    // Zu viele Versuche
    if (errorMsg.includes('too many requests') || 
        errorMsg.includes('rate limit') ||
        errorCode === 'too_many_requests') {
      return '⏱️ Zu viele Versuche! Warte kurz (30 Sekunden) und probier es dann nochmal.';
    }
    
    // User existiert nicht
    if (errorMsg.includes('user not found') ||
        errorCode === 'user_not_found') {
      return '❓ Kein Account mit dieser E-Mail gefunden.\n\nRegistriere dich zuerst oder prüfe, ob du die richtige E-Mail-Adresse eingegeben hast.';
    }
    
    // Netzwerkfehler
    if (errorMsg.includes('fetch') || 
        errorMsg.includes('network') ||
        errorMsg.includes('failed to fetch') ||
        errorCode === 'network_error') {
      return '📡 Keine Verbindung zum Server!\n\nPrüfe deine Internetverbindung und versuche es erneut.';
    }
    
    // Timeout
    if (errorMsg.includes('timeout') || errorCode === 'timeout') {
      return '⏱️ Zeitüberschreitung!\n\nDie Verbindung dauert zu lange. Prüfe deine Internetverbindung und versuche es erneut.';
    }
    
    // Fallback: Ursprüngliche Fehlermeldung mit mehr Kontext
    return `Fehler beim Login: ${error.message || 'Unbekannter Fehler'}\n\nBitte versuche es erneut oder kontaktiere den Support.`;
  };

  /**
   * Prüfe ob Account temporär gesperrt ist (Brute-Force-Schutz)
   */
  const checkIfAccountLocked = async (email) => {
    const lockoutKey = `loginAttempts_${email}`;
    const lockoutData = localStorage.getItem(lockoutKey);
    
    if (!lockoutData) return { isLocked: false };
    
    try {
      const { attempts, lastAttempt, lockedUntil } = JSON.parse(lockoutData);
      
      // Prüfe ob Account noch gesperrt ist
      if (lockedUntil && new Date(lockedUntil) > new Date()) {
        const minutesLeft = Math.ceil((new Date(lockedUntil) - new Date()) / 60000);
        return { 
          isLocked: true, 
          minutesLeft,
          message: `🔒 Account temporär gesperrt! Zu viele fehlgeschlagene Versuche. Versuche es in ${minutesLeft} Minute(n) nochmal.`
        };
      }
      
      // Lockout abgelaufen - zurücksetzen
      if (lockedUntil && new Date(lockedUntil) <= new Date()) {
        localStorage.removeItem(lockoutKey);
        return { isLocked: false };
      }
      
      return { isLocked: false, attempts };
    } catch (error) {
      console.error('❌ Error checking lockout:', error);
      return { isLocked: false };
    }
  };
  
  /**
   * Registriere fehlgeschlagenen Login-Versuch
   */
  const recordFailedLogin = (email) => {
    const lockoutKey = `loginAttempts_${email}`;
    const lockoutData = localStorage.getItem(lockoutKey);
    
    const MAX_ATTEMPTS = 5; // Nach 5 Versuchen wird gesperrt
    const LOCKOUT_DURATION_MINUTES = 15; // 15 Minuten Sperre
    
    let attempts = 1;
    let lastAttempt = new Date().toISOString();
    
    if (lockoutData) {
      try {
        const data = JSON.parse(lockoutData);
        attempts = (data.attempts || 0) + 1;
      } catch (error) {
        console.error('❌ Error parsing lockout data:', error);
      }
    }
    
    // Nach MAX_ATTEMPTS wird Account gesperrt
    if (attempts >= MAX_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000).toISOString();
      localStorage.setItem(lockoutKey, JSON.stringify({ 
        attempts, 
        lastAttempt, 
        lockedUntil 
      }));
      
      console.warn(`⚠️ Account ${email} locked for ${LOCKOUT_DURATION_MINUTES} minutes after ${attempts} failed attempts`);
      
      return {
        isLocked: true,
        message: `🔒 Zu viele fehlgeschlagene Versuche! Account ist für ${LOCKOUT_DURATION_MINUTES} Minuten gesperrt.`
      };
    }
    
    // Speichere aktuelle Versuche
    localStorage.setItem(lockoutKey, JSON.stringify({ attempts, lastAttempt }));
    
    const remaining = MAX_ATTEMPTS - attempts;
    return {
      isLocked: false,
      remaining,
      message: remaining <= 2 ? `⚠️ Noch ${remaining} Versuch(e) übrig, dann wird der Account gesperrt!` : null
    };
  };
  
  /**
   * Lösche fehlgeschlagene Login-Versuche nach erfolgreichem Login
   */
  const clearFailedLogins = (email) => {
    const lockoutKey = `loginAttempts_${email}`;
    localStorage.removeItem(lockoutKey);
  };

  /**
   * Login mit Email/Passwort (mit Brute-Force-Schutz)
   */
  const login = async (email, password) => {
    try {
      console.log('🔵 Login attempt for:', email);
      
      // 1. PRÜFE OB ACCOUNT GESPERRT IST
      const lockCheck = await checkIfAccountLocked(email);
      if (lockCheck.isLocked) {
        return {
          success: false,
          needsProfile: false,
          error: lockCheck.message
        };
      }
      
      // 2. VERSUCH LOGIN
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // LOGIN FEHLGESCHLAGEN - Registriere fehlgeschlagenen Versuch
        const failedAttempt = recordFailedLogin(email);
        
        let errorMessage = getLoginErrorMessage(error);
        if (failedAttempt.message) {
          errorMessage += '\n\n' + failedAttempt.message;
        }
        
        throw { ...error, message: errorMessage };
      }

      // 3. LOGIN ERFOLGREICH - Lösche fehlgeschlagene Versuche
      clearFailedLogins(email);
      
      console.log('✅ Login successful, user:', data.user.email);
      
      // ✅ VERBESSERT: Setze authenticated State SOFORT (vor async Operationen)
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      
      // Log Login-Event (non-blocking)
      LoggingService.logLogin(data.user.email, 'email').catch(logError => {
        console.warn('⚠️ Could not log login:', logError);
      });
      
      // ✅ VERBESSERT: Lade Player-Daten und warte darauf, aber nicht blockierend
      try {
        await loadPlayerData(data.user.id);
        console.log('✅ Player data loaded after login');
      } catch (playerError) {
        console.error('⚠️ Error loading player data after login:', playerError);
        // Nicht kritisch - User ist trotzdem eingeloggt
      }

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
   * Übersetze Registrierungs-Fehler in benutzerfreundliche deutsche Meldungen
   */
  const getRegisterErrorMessage = (error) => {
    const errorMsg = error?.message?.toLowerCase() || '';
    
    // E-Mail bereits registriert
    if (errorMsg.includes('user already registered') || 
        errorMsg.includes('email already registered') ||
        errorMsg.includes('already been registered')) {
      return '📧 Diese E-Mail ist bereits registriert. Versuche dich anzumelden!';
    }
    
    // Schwaches Passwort
    if (errorMsg.includes('password') && (errorMsg.includes('weak') || errorMsg.includes('short'))) {
      return '🔒 Passwort ist zu schwach. Mindestens 6 Zeichen bitte!';
    }
    
    // Ungültige E-Mail
    if (errorMsg.includes('invalid email')) {
      return '✉️ Diese E-Mail-Adresse ist ungültig. Prüfe die Schreibweise!';
    }
    
    // Rate Limit
    if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
      return '⏱️ Zu viele Versuche! Warte kurz und probier es dann nochmal.';
    }
    
    // Fallback
    return `Registrierung fehlgeschlagen: ${error.message}`;
  };

  /**
   * Registrierung: Neuer User (Player wird automatisch via Trigger erstellt)
   */
  const register = async (email, password, playerData, consentData = {}) => {
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
            ranking: playerData.ranking,
            // ✅ Speichere Zustimmung in user metadata
            acceptedTerms: consentData.acceptedTerms || false,
            acceptedPrivacy: consentData.acceptedPrivacy || false,
            acceptedTermsDate: consentData.acceptedTermsDate || null,
            acceptedPrivacyDate: consentData.acceptedPrivacyDate || null
          },
          emailRedirectTo: window.location.origin
        }
      });

      if (authError) throw authError;

      console.log('✅ Auth user created:', authData.user.id);
      console.log('✅ Player wird automatisch via Trigger erstellt');
      console.log('✅ Zustimmung zu Nutzungsbedingungen und Datenschutz gespeichert');
      
      return { 
        success: true, 
        needsProfile: false,
        message: '✅ Registrierung erfolgreich! Sie können sich jetzt anmelden.'
      };
    } catch (error) {
      console.error('❌ Registration error:', error);
      return { 
        success: false,
        error: getRegisterErrorMessage(error)
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
    
    // Log Logout-Event (vor State-Clear)
    try {
      if (currentUser?.email) {
        await LoggingService.logLogout(currentUser.email);
      }
    } catch (logError) {
      console.warn('⚠️ Could not log logout:', logError);
    }
    
    // State SOFORT zurücksetzen (für sofortige UI-Reaktion)
    setIsAuthenticated(false);
    setCurrentUser(null);
    setPlayer(null);
    setLoading(false);
    
    // Dann Supabase Session beenden
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.log('⚠️ Logout warning:', error.message, '(ignored - state already cleared)');
      } else {
        console.log('✅ Supabase logout complete');
      }
    } catch (error) {
      // 403-Fehler sind normal wenn keine Session existiert - ignorieren
      console.log('⚠️ Logout warning:', error.message, '(ignored - state already cleared)');
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


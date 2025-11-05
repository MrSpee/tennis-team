import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { LoggingService } from '../services/activityLogger';
import PasswordReset from './PasswordReset';
import { Building2, Users, MapPin, Phone, Mail, Globe, Edit3 } from 'lucide-react';
import { normalizeLK } from '../lib/lkUtils';
import TeamSelector from './TeamSelector';
import PerformanceStats from './PerformanceStats';
import './Profile.css';
import './Dashboard.css';

function SupabaseProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSetup = searchParams.get('setup') === 'true';
  const playerName = searchParams.get('player'); // Name des Spielers, dessen Profil angezeigt werden soll
  const { currentUser, player, updateProfile, loading: authLoading } = useAuth();
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    profileImage: '',
    birth_date: '',
    // Tennis-Identity Felder
    current_lk: '',
    tennis_motto: '',
    favorite_shot: '',
    best_tennis_memory: '',
    worst_tennis_memory: '',
    favorite_opponent: '',
    dream_match: '',
    // Fun & Aberglaube
    fun_fact: '',
    superstition: '',
    pre_match_routine: '',
    // Kontakt & Notfall
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    // Notizen
    notes: ''
  });

  const [isEditing, setIsEditing] = useState(isSetup);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const [isViewingOtherPlayer, setIsViewingOtherPlayer] = useState(false);
  const [isLoadingOtherPlayer, setIsLoadingOtherPlayer] = useState(false);
  
  // ✅ NEU: Tab-Navigation
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'spielbilanz'); // 'spielbilanz' | 'teams' | 'tennismates' | 'details'
  
  // ✅ NEU: Performance-Daten (wie PlayerProfileSimple)
  const [performanceStats, setPerformanceStats] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  
  // 🎾 NEU: Social Stats (Tennismates)
  const [tennismatesList, setTennismatesList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [currentBucket, setCurrentBucket] = useState('profile-images');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  const [lastEditedField, setLastEditedField] = useState(null); // Welches Feld wurde zuletzt bearbeitet
  
  // Vereins-/Mannschafts-Daten
  const [playerTeams, setPlayerTeams] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [isEditingTeams, setIsEditingTeams] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  // REF: Verhindert Race Condition beim Tippen
  const isEditingRef = useRef(false);

  // Cleanup Timer beim Unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  // Helper: Inline Save Button direkt unter Feld
  const renderInlineSaveButton = (fieldName) => {
    if (isViewingOtherPlayer) return null;
    if (lastEditedField !== fieldName) return null;
    
    return (
      <div style={{
        marginTop: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem',
        background: isSaving 
          ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
          : hasUnsavedChanges 
          ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
          : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        borderRadius: '8px',
        animation: 'slideInDown 0.3s ease-out',
        color: 'white',
        fontSize: '0.875rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
          {isSaving ? (
            <>
              <span className="pulse" style={{ fontSize: '1.25rem' }}>💾</span>
              <span style={{ fontWeight: '600' }}>Speichert...</span>
            </>
          ) : hasUnsavedChanges ? (
            <>
              <span style={{ fontSize: '1.25rem' }}>⏳</span>
              <span style={{ fontWeight: '600' }}>Automatisches Speichern in 5 Sek...</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '1.25rem' }}>✅</span>
              <span style={{ fontWeight: '600' }}>Gespeichert!</span>
            </>
          )}
        </div>
        
        {hasUnsavedChanges && !isSaving && (
          <button
            onClick={handleAutoSave}
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              minHeight: '40px',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.25)';
            }}
          >
            💾 Jetzt speichern
          </button>
        )}
      </div>
    );
  };


  // Funktion zum Laden anderer Spieler-Profile
  const loadOtherPlayerProfile = async (playerName) => {
    if (!playerName) return;
    
    setIsLoadingOtherPlayer(true);
    setIsViewingOtherPlayer(true);
    
    try {
      const { data, error } = await supabase
        .from('players_unified')
        .select('*')
        .eq('name', playerName)
        .eq('player_type', 'app_user')
        .maybeSingle();
      
      if (error) {
        console.error('Error loading player profile:', error);
        setErrorMessage(`Spieler "${playerName}" nicht gefunden.`);
        return;
      }
      
      if (data) {
        console.log('🟢 Loading other player data:', data);
        setProfile({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          profileImage: data.profile_image || '',
        birth_date: data.birth_date || '',
        // Tennis-Identity
        current_lk: data.current_lk || '',
        tennis_motto: data.tennis_motto || '',
        favorite_shot: data.favorite_shot || '',
        best_tennis_memory: data.best_tennis_memory || '',
        worst_tennis_memory: data.worst_tennis_memory || '',
        favorite_opponent: data.favorite_opponent || '',
        dream_match: data.dream_match || '',
        // Fun & Aberglaube
        fun_fact: data.fun_fact || '',
          superstition: data.superstition || '',
        pre_match_routine: data.pre_match_routine || '',
        // Kontakt & Notfall
        address: data.address || '',
        emergency_contact: data.emergency_contact || '',
        emergency_phone: data.emergency_phone || '',
        // Notizen
        notes: data.notes || ''
        });
        setViewingPlayer(data);
      }
    } catch (error) {
      console.error('Error loading other player:', error);
      setErrorMessage('Fehler beim Laden des Spieler-Profils.');
    } finally {
      setIsLoadingOtherPlayer(false);
    }
  };

  // ✅ NEU: Lade Performance-Statistiken (kopiert von PlayerProfileSimple)
  const loadPerformanceStats = async (playerId) => {
    if (!playerId) return;
    
    setLoadingStats(true);
    
    try {
      const { data: results, error } = await supabase
        .from('match_results')
        .select(`
          *,
          matchday:matchdays(id, match_date, home_team_id, away_team_id, season, status,
            home_team:team_info!matchdays_home_team_id_fkey(club_name, team_name, category),
            away_team:team_info!matchdays_away_team_id_fkey(club_name, team_name, category))
        `)
        .or(`home_player_id.eq.${playerId},home_player1_id.eq.${playerId},home_player2_id.eq.${playerId},guest_player_id.eq.${playerId},guest_player1_id.eq.${playerId},guest_player2_id.eq.${playerId}`)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      const matchdayIds = [...new Set((results || []).map(r => r.matchday_id).filter(Boolean))];
      
      let allMatchdayResults = [];
      if (matchdayIds.length > 0) {
        const { data: fullResults } = await supabase
          .from('match_results')
          .select('*')
          .in('matchday_id', matchdayIds);
        allMatchdayResults = fullResults || [];
      }
      
      let einzelWins = 0, einzelLosses = 0, einzelDraws = 0;
      let doppelWins = 0, doppelLosses = 0, doppelDraws = 0;
      const matchesMap = new Map();
      
      (results || []).forEach(result => {
        const isInHomeTeam = result.home_player_id === playerId || result.home_player1_id === playerId || result.home_player2_id === playerId;
        let didWin = false, didLose = false, isDraw = false;
        
        if (result.winner) {
          if ((isInHomeTeam && result.winner === 'home') || (!isInHomeTeam && result.winner === 'guest')) didWin = true;
          else if ((isInHomeTeam && result.winner === 'guest') || (!isInHomeTeam && result.winner === 'home')) didLose = true;
          else if (result.winner === 'draw') isDraw = true;
        }
        
        if (result.match_type === 'Einzel') {
          if (didWin) einzelWins++;
          else if (didLose) einzelLosses++;
          else if (isDraw) einzelDraws++;
        } else if (result.match_type === 'Doppel') {
          if (didWin) doppelWins++;
          else if (didLose) doppelLosses++;
          else if (isDraw) doppelDraws++;
        }
        
        if (result.matchday && result.matchday.id) {
          if (!matchesMap.has(result.matchday.id)) {
            matchesMap.set(result.matchday.id, { matchday: result.matchday, results: [] });
          }
          matchesMap.get(result.matchday.id).results.push(result);
        }
      });
      
      const matchesArray = Array.from(matchesMap.values()).sort((a, b) => new Date(b.matchday.match_date) - new Date(a.matchday.match_date)).slice(0, 10);
      let teamWins = 0, teamLosses = 0, teamDraws = 0;
      
      const matchdaysWithStats = matchesArray.map(m => {
        const allResultsForThisMatch = allMatchdayResults.filter(r => r.matchday_id === m.matchday.id);
        let homeScore = 0, guestScore = 0;
        
        allResultsForThisMatch.forEach(r => {
          if (r.winner === 'home') homeScore++;
          else if (r.winner === 'guest') guestScore++;
        });
        
        const isHome = m.results.some(r => r.home_player_id === playerId || r.home_player1_id === playerId || r.home_player2_id === playerId);
        const ourScore = isHome ? homeScore : guestScore;
        const oppScore = isHome ? guestScore : homeScore;
        
        if (ourScore > oppScore) teamWins++;
        else if (ourScore < oppScore) teamLosses++;
        else if (ourScore === oppScore && ourScore > 0) teamDraws++;
        
        const opponent = isHome ? m.matchday.away_team : m.matchday.home_team;
        
        return {
          id: m.matchday.id,
          date: new Date(m.matchday.match_date),
          opponent: opponent ? `${opponent.club_name} ${opponent.team_name || ''} (${opponent.category})`.trim() : 'Unbekannt',
          location: isHome ? 'Home' : 'Away',
          ourScore,
          oppScore,
          total: allResultsForThisMatch.length,
          season: m.matchday.season
        };
      });
      
      setPerformanceStats({
        personal: {
          einzel: { wins: einzelWins, losses: einzelLosses, draws: einzelDraws, total: einzelWins + einzelLosses + einzelDraws, winRate: einzelWins + einzelLosses > 0 ? ((einzelWins / (einzelWins + einzelLosses)) * 100).toFixed(0) : 0 },
          doppel: { wins: doppelWins, losses: doppelLosses, draws: doppelDraws, total: doppelWins + doppelLosses + doppelDraws, winRate: doppelWins + doppelLosses > 0 ? ((doppelWins / (doppelWins + doppelLosses)) * 100).toFixed(0) : 0 },
          gesamt: { wins: einzelWins + doppelWins, losses: einzelLosses + doppelLosses, draws: einzelDraws + doppelDraws, total: einzelWins + einzelLosses + einzelDraws + doppelWins + doppelLosses + doppelDraws, winRate: einzelWins + einzelLosses + doppelWins + doppelLosses > 0 ? (((einzelWins + doppelWins) / (einzelWins + einzelLosses + doppelWins + doppelLosses)) * 100).toFixed(0) : 0 }
        },
        team: { wins: teamWins, losses: teamLosses, draws: teamDraws, total: teamWins + teamLosses + teamDraws, winRate: teamWins + teamLosses > 0 ? ((teamWins / (teamWins + teamLosses)) * 100).toFixed(0) : 0 }
      });
      
      setRecentMatches(matchdaysWithStats);
    } catch (error) {
      console.error('❌ Error loading performance stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    // Prüfe ob ein anderer Spieler angezeigt werden soll
    if (playerName && playerName !== player?.name) {
      loadOtherPlayerProfile(playerName);
      return;
    }
    
    // WICHTIG: Nicht überschreiben wenn User gerade tippt!
    // isEditingRef.current ist SOFORT gesetzt (synchron!)
    if (isEditingRef.current || hasUnsavedChanges || isSaving) {
      console.log('⏸️ Skipping profile reload - user is editing (ref:', isEditingRef.current, 'state:', hasUnsavedChanges, isSaving, ')');
      return;
    }
    
    // Normale Logik für eigenes Profil
    if (player) {
      console.log('🔵 Loading own player data:', player);
      setIsViewingOtherPlayer(false);
      
      // ✅ Lade Performance-Stats
      loadPerformanceStats(player.id);
      
      setProfile({
        name: player.name || '',
        email: player.email || currentUser?.email || '',
        phone: player.phone || '',
        profileImage: player.profile_image || '',
        birth_date: player.birth_date || '',
        // Tennis-Identity
        current_lk: player.current_lk || '',
        tennis_motto: player.tennis_motto || '',
        favorite_shot: player.favorite_shot || '',
        best_tennis_memory: player.best_tennis_memory || '',
        worst_tennis_memory: player.worst_tennis_memory || '',
        favorite_opponent: player.favorite_opponent || '',
        dream_match: player.dream_match || '',
        // Fun & Aberglaube
        fun_fact: player.fun_fact || '',
        superstition: player.superstition || '',
        pre_match_routine: player.pre_match_routine || '',
        // Kontakt & Notfall
        address: player.address || '',
        emergency_contact: player.emergency_contact || '',
        emergency_phone: player.emergency_phone || '',
        // Notizen
        notes: player.notes || ''
      });
    } else if (currentUser && !authLoading) {
      // Neuer User - initialisiere mit Auth-Daten
      console.log('🟡 New user, initializing with auth data:', currentUser);
      setProfile(prev => ({
        ...prev,
        email: currentUser.email || '',
        name: currentUser.user_metadata?.name || ''
      }));
    }
    
    // Lade Vereins-/Mannschafts-Daten wenn Player verfügbar
    if (player?.id) {
      loadPlayerTeamsAndClubs(player.id);
      // 🎾 Lade Tennismates beim initialen Load
      loadTennismates(player.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id, currentUser, authLoading, playerName]);

  // 🎾 Lade Tennismates-Daten
  const loadTennismates = async (playerId) => {
    if (!playerId) return;
    
    setLoadingSocial(true);
    
    try {
      console.log('🎾 Loading tennismates for player:', playerId);
      
      // Lade alle Follow-Beziehungen
      const { data: followData, error } = await supabase
        .from('player_followers')
        .select(`
          *,
          follower:players_unified!player_followers_follower_id_fkey(
            id,
            name,
            current_lk,
            season_start_lk,
            profile_image
          ),
          following:players_unified!player_followers_following_id_fkey(
            id,
            name,
            current_lk,
            season_start_lk,
            profile_image
          )
        `)
        .or(`follower_id.eq.${playerId},following_id.eq.${playerId}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Trenne Tennismates (folgen mir) und Following (ich folge)
      const tennismates = followData?.filter(f => f.following_id === playerId).map(f => ({
        ...f.follower,
        followedSince: f.created_at,
        isMutual: f.is_mutual
      })) || [];
      
      const following = followData?.filter(f => f.follower_id === playerId).map(f => ({
        ...f.following,
        followedSince: f.created_at,
        isMutual: f.is_mutual
      })) || [];
      
      setTennismatesList(tennismates);
      setFollowingList(following);
      
      console.log('✅ Tennismates loaded:', {
        tennismates: tennismates.length,
        following: following.length,
        mutual: tennismates.filter(t => t.isMutual).length,
        sampleTennismate: tennismates[0],
        sampleFollowing: following[0]
      });
      
    } catch (error) {
      console.error('❌ Error loading tennismates:', error);
    } finally {
      setLoadingSocial(false);
    }
  };

  // Lade Vereins- und Mannschafts-Daten für den Spieler
  const loadPlayerTeamsAndClubs = async (playerId) => {
    try {
      console.log('🔍 Loading teams and clubs for player:', playerId);
      
      // Schritt 1: Lade Player-Teams mit Team-Info
      const { data: teamsData, error: teamsError } = await supabase
        .from('team_memberships')
        .select(`
          *,
          team_info (
            id,
            team_name,
            club_name,
            category,
            region,
            tvm_link
          )
        `)
        .eq('player_id', playerId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false });

      if (teamsError) {
        console.error('Error loading player teams:', teamsError);
        return;
      }

      console.log('✅ Player teams loaded:', teamsData);
      
      // Schritt 2: Lade team_seasons für jedes Team separat
      const teamsWithSeasons = await Promise.all(
        teamsData.map(async (pt) => {
          const teamInfo = pt.team_info;
          console.log(`🔍 Loading seasons for team: ${teamInfo?.team_name} (ID: ${teamInfo?.id})`);
          
          // Lade team_seasons für dieses spezifische Team
          const { data: seasonsData, error: seasonsError } = await supabase
            .from('team_seasons')
            .select('*')
            .eq('team_id', teamInfo?.id)
            .order('is_active', { ascending: false });
          
          if (seasonsError) {
            console.error(`Error loading seasons for team ${teamInfo?.team_name}:`, seasonsError);
          } else {
            console.log(`✅ Seasons for ${teamInfo?.team_name}:`, seasonsData);
          }
          
          // Finde die aktuelle/aktive Season
          const currentSeason = seasonsData?.find(ts => ts.is_active) || seasonsData?.[0];
          
          console.log(`🔍 Processing team ${teamInfo?.team_name}:`, {
            seasonsData: seasonsData,
            currentSeason: currentSeason,
            is_active_seasons: seasonsData?.filter(ts => ts.is_active)
          });
          
          return {
            ...teamInfo,
            is_primary: pt.is_primary,
            role: pt.role,
            player_team_id: pt.id,
            // Echte Season-Daten aus team_seasons
            current_season: currentSeason?.season || 'Unbekannt',
            current_league: currentSeason?.league || 'Unbekannt',
            current_group: currentSeason?.group_name || '',
            team_size: currentSeason?.team_size || 4,
            season_year: currentSeason?.season ? 
              currentSeason.season.split(' ')[1]?.split('/')[0] || new Date().getFullYear() : 
              new Date().getFullYear()
          };
        })
      );
      
      const teams = teamsWithSeasons;
      
      console.log('✅ Transformed teams:', teams);
      
      // ⚠️ Check for teams without club_name
      const teamsWithoutClub = teams.filter(team => !team.club_name || team.club_name.trim() === '');
      if (teamsWithoutClub.length > 0) {
        console.warn('⚠️ TEAMS OHNE CLUB_NAME:', teamsWithoutClub);
        console.warn('⚠️ Führe DEBUG_ROBERT_TEAMS.sql aus um das Problem zu finden!');
      }
      
      setPlayerTeams(teams);

      // Extrahiere einzigartige Vereine (filtere Teams ohne club_name)
      const uniqueClubs = teams
        .filter(team => team.club_name && team.club_name.trim() !== '')  // ✅ Nur Teams mit club_name
        .reduce((acc, team) => {
          const clubName = team.club_name;
          if (!acc.find(club => club.name === clubName)) {
            acc.push({
              name: clubName,
              teams: teams.filter(t => t.club_name === clubName)
            });
          }
          return acc;
        }, []);

      setClubs(uniqueClubs);
      console.log('✅ Clubs extracted:', uniqueClubs);
      console.log('✅ State updated - playerTeams:', teams.length, 'clubs:', uniqueClubs.length);

    } catch (error) {
      console.error('❌ Error loading teams and clubs:', error);
    }
  };

  // Funktionen für Vereins-/Mannschafts-Management
  const handleEditTeam = (team) => {
    setEditingTeam(team);
    setIsEditingTeams(true);
  };

  const handleSaveTeamChanges = async (teamId, changes) => {
    try {
      console.log('💾 Saving team changes:', { teamId, changes });
      
      // Aktualisiere team_memberships Tabelle
      const { error } = await supabase
        .from('team_memberships')
        .update({
          role: changes.role,
          is_primary: changes.is_primary
        })
        .eq('id', teamId);

      if (error) throw error;

      // Lade Daten neu
      await loadPlayerTeamsAndClubs(player.id);
      setIsEditingTeams(false);
      setEditingTeam(null);
      
      console.log('✅ Team changes saved successfully');
    } catch (error) {
      console.error('❌ Error saving team changes:', error);
      alert('Fehler beim Speichern der Änderungen');
    }
  };

  const handleRemoveTeam = async (playerTeamId) => {
    if (!confirm('Bist du sicher, dass du diese Mannschaft verlassen möchtest?')) {
      return;
    }

    try {
      console.log('🗑️ Removing team:', playerTeamId);
      
      const { error } = await supabase
        .from('team_memberships')
        .update({ is_active: false })
        .eq('id', playerTeamId);

      if (error) throw error;

      // Lade Daten neu
      await loadPlayerTeamsAndClubs(player.id);
      
      console.log('✅ Team removed successfully');
    } catch (error) {
      console.error('❌ Error removing team:', error);
      alert('Fehler beim Verlassen der Mannschaft');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log('📝 Input changed:', name, '=', value);
    
    // SOFORT als "editing" markieren (synchron!)
    isEditingRef.current = true;
    
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Markiere welches Feld bearbeitet wird
    setLastEditedField(name);
    setHasUnsavedChanges(true);
    console.log('⚠️ Marked as unsaved, field:', name, '(ref set to true)');
    
    // Auto-Save nach 2 Sekunden Inaktivität
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      console.log('⏱️ Cleared previous timer');
    }
    
    console.log('⏱️ Setting new auto-save timer (5 seconds - increased for better UX)');
    const timer = setTimeout(() => {
      console.log('⏰ Timer fired! isViewingOtherPlayer:', isViewingOtherPlayer, 'isSetup:', isSetup);
      if (!isViewingOtherPlayer && !isSetup) {
        console.log('✅ Conditions met, calling handleAutoSave...');
        handleAutoSave();
      } else {
        console.log('❌ Conditions NOT met, skipping auto-save');
      }
    }, 5000); // Erhöht von 2000ms auf 5000ms - verhindert Buchstaben-Verlust
    
    setAutoSaveTimer(timer);
  };
  
  // Auto-Save Funktion
  const handleAutoSave = async () => {
    console.log('🔍 handleAutoSave called. hasUnsavedChanges:', hasUnsavedChanges);
    
    if (!hasUnsavedChanges) {
      console.log('⏭️ No unsaved changes, skipping save');
      return;
    }
    
    // WICHTIG: Alte Werte JETZT speichern (VOR dem Update!)
    // Sonst sind sie nach updateProfile schon aktualisiert
    const oldValues = {
      name: player?.name,
      phone: player?.phone,
      email: player?.email,
      birth_date: player?.birth_date,
      current_lk: player?.current_lk,
      tennis_motto: player?.tennis_motto,
      favorite_shot: player?.favorite_shot,
      best_tennis_memory: player?.best_tennis_memory,
      worst_tennis_memory: player?.worst_tennis_memory,
      favorite_opponent: player?.favorite_opponent,
      dream_match: player?.dream_match,
      fun_fact: player?.fun_fact,
      superstition: player?.superstition,
      pre_match_routine: player?.pre_match_routine,
      address: player?.address,
      emergency_contact: player?.emergency_contact,
      emergency_phone: player?.emergency_phone,
      notes: player?.notes
    };
    console.log('📸 Snapshot of old values taken');
    
    try {
      console.log('💾 Auto-saving profile...', profile);
      setIsSaving(true);
      
      // Normalisiere LK
      const normalizedLK = profile.current_lk ? normalizeLK(profile.current_lk) : null;
      console.log('🔢 Normalized LK:', normalizedLK);
      
      console.log('📤 Calling updateProfile...');
      
      // Helper: Trim strings, aber nur wenn sie nicht null/undefined sind
      const trimIfString = (val) => typeof val === 'string' ? val.trim() : val;
      
      const result = await updateProfile({
        name: trimIfString(profile.name),
        phone: trimIfString(profile.phone),
        email: trimIfString(profile.email),
        profileImage: profile.profileImage, // URLs nicht trimmen
        birth_date: profile.birth_date,
        current_lk: normalizedLK,
        tennis_motto: trimIfString(profile.tennis_motto),
        favorite_shot: trimIfString(profile.favorite_shot),
        best_tennis_memory: trimIfString(profile.best_tennis_memory),
        worst_tennis_memory: trimIfString(profile.worst_tennis_memory),
        favorite_opponent: trimIfString(profile.favorite_opponent),
        dream_match: trimIfString(profile.dream_match),
        fun_fact: trimIfString(profile.fun_fact),
        superstition: trimIfString(profile.superstition),
        pre_match_routine: trimIfString(profile.pre_match_routine),
        address: trimIfString(profile.address),
        emergency_contact: trimIfString(profile.emergency_contact),
        emergency_phone: trimIfString(profile.emergency_phone),
        notes: trimIfString(profile.notes)
      });
      
      console.log('📥 updateProfile result:', result);
      
      if (result.success) {
        console.log('✅ Save successful!');
        
        setHasUnsavedChanges(false);
        setSuccessMessage('✅ Gespeichert!');
        
        // WICHTIG: Editing-Flag erst NACH längerem Tick zurücksetzen
        // So kann der Player-State Update durchlaufen ohne dass useEffect triggert
        // ERHÖHT auf 500ms um sicherzustellen dass AuthContext.player zuerst updated wird
        setTimeout(() => {
          console.log('🔓 Releasing editing lock');
          isEditingRef.current = false;
        }, 500); // Erhöht von 100ms auf 500ms
        
        // Feld-Indikator nach 2 Sekunden ausblenden
        setTimeout(() => {
          setLastEditedField(null);
          setSuccessMessage('');
        }, 2000);
        
        // Logge ALLE Profil-Änderungen (verwende oldValues Snapshot!)
        const changes = {};
        const fieldsToTrack = {
          // Basis-Informationen
          name: { old: oldValues.name, new: profile.name },
          phone: { old: oldValues.phone, new: profile.phone },
          email: { old: oldValues.email, new: profile.email },
          birth_date: { old: oldValues.birth_date, new: profile.birth_date },
          // Tennis-Identity
          current_lk: { old: oldValues.current_lk, new: normalizedLK },
          tennis_motto: { old: oldValues.tennis_motto, new: profile.tennis_motto },
          favorite_shot: { old: oldValues.favorite_shot, new: profile.favorite_shot },
          best_tennis_memory: { old: oldValues.best_tennis_memory, new: profile.best_tennis_memory },
          worst_tennis_memory: { old: oldValues.worst_tennis_memory, new: profile.worst_tennis_memory },
          favorite_opponent: { old: oldValues.favorite_opponent, new: profile.favorite_opponent },
          dream_match: { old: oldValues.dream_match, new: profile.dream_match },
          // Fun & Aberglaube
          fun_fact: { old: oldValues.fun_fact, new: profile.fun_fact },
          superstition: { old: oldValues.superstition, new: profile.superstition },
          pre_match_routine: { old: oldValues.pre_match_routine, new: profile.pre_match_routine },
          // Kontakt & Notfall
          address: { old: oldValues.address, new: profile.address },
          emergency_contact: { old: oldValues.emergency_contact, new: profile.emergency_contact },
          emergency_phone: { old: oldValues.emergency_phone, new: profile.emergency_phone },
          // Notizen
          notes: { old: oldValues.notes, new: profile.notes }
        };
        
        Object.keys(fieldsToTrack).forEach(field => {
          const oldVal = fieldsToTrack[field].old || '';
          const newVal = fieldsToTrack[field].new || '';
          if (oldVal !== newVal) {
            changes[field] = { old: oldVal, new: newVal };
          }
        });
        
        if (Object.keys(changes).length > 0) {
          console.log('📝 Logging profile changes:', changes);
          await LoggingService.logProfileEdit(changes, player?.id);
        } else {
          console.log('ℹ️ No changes detected, skipping activity log');
        }
      } else {
        throw new Error(result.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('❌ Auto-save error:', error);
      setErrorMessage(`Fehler: ${error.message}`);
      
      // Auch im Fehlerfall: Lock freigeben
      setTimeout(() => {
        console.log('🔓 Releasing editing lock (error case)');
        isEditingRef.current = false;
      }, 100);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('📱 Mobile upload detected:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: file.lastModified,
      userAgent: navigator.userAgent
    });

    // Reset input nach Auswahl, damit dasselbe Bild erneut hochgeladen werden kann
    e.target.value = null;

    // Validiere Dateityp - iPhone kann verschiedene MIME-Types haben
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    const isValidType = validTypes.includes(file.type.toLowerCase()) || file.type.startsWith('image/');
    
    if (!isValidType) {
      setErrorMessage(`Dateityp nicht unterstützt: ${file.type}. Erlaubt: JPEG, PNG, GIF, WebP, HEIC`);
      return;
    }

    // Validiere Dateigröße (max 10MB für iPhone - HEIC-Dateien sind oft größer)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setErrorMessage(`Das Bild ist zu groß (${Math.round(file.size / 1024 / 1024)}MB). Maximal 10MB erlaubt.`);
      return;
    }

    setIsUploading(true);
    setErrorMessage('');

    // Upload-Versuch mit Fallback
    const uploadToBucket = async (bucketName) => {
      // iPhone-kompatible Dateinamen-Generierung
      let fileExt = file.name.split('.').pop()?.toLowerCase();
      
      // iPhone-spezifische Extensions handhaben
      if (file.type === 'image/heic' || file.type === 'image/heif') {
        fileExt = 'jpg'; // Konvertiere HEIC zu JPG für bessere Kompatibilität
      }
      
      // Fallback falls keine Extension
      if (!fileExt || fileExt === '') {
        if (file.type.includes('jpeg') || file.type.includes('jpg')) {
          fileExt = 'jpg';
        } else if (file.type.includes('png')) {
          fileExt = 'png';
        } else {
          fileExt = 'jpg'; // Standard
        }
      }
      
      // Sichere Dateinamen-Generierung (entferne Sonderzeichen)
      const safeFileName = `${currentUser.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = bucketName === 'profile-images' ? safeFileName : `profile-images/${safeFileName}`;

      console.log(`🔄 Uploading to ${bucketName}:`, { 
        originalFileName: file.name,
        safeFileName, 
        filePath, 
        fileSize: file.size,
        fileType: file.type,
        fileExt 
      });

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return data.publicUrl;
    };

    try {
      let publicUrl;
      
      // Versuche zuerst profile-images
      try {
        console.log('🔄 Attempting upload to profile-images bucket...');
        publicUrl = await uploadToBucket('profile-images');
        setCurrentBucket('profile-images');
      } catch (error) {
        console.warn('⚠️ profile-images failed, trying public bucket...', error.message);
        
        // Fallback zu public bucket
        try {
          publicUrl = await uploadToBucket('public');
          setCurrentBucket('public');
        } catch (publicError) {
          console.error('❌ Both buckets failed');
          throw new Error(`Upload fehlgeschlagen: ${error.message}. Fallback: ${publicError.message}`);
        }
      }

      console.log('✅ Upload successful, URL:', publicUrl);

      // Aktualisiere State
      setProfile(prev => ({
        ...prev,
        profileImage: publicUrl
      }));

      // Speichere SOFORT in die Datenbank
      try {
        console.log('💾 Saving image URL to database...');
        const result = await updateProfile({
          ...profile,
          profileImage: publicUrl
        });
        
        if (result.success) {
          console.log('✅ Image URL saved to database');
          setSuccessMessage(`Bild erfolgreich hochgeladen und gespeichert! (Bucket: ${currentBucket})`);
        } else {
          console.error('❌ Failed to save image URL:', result.error);
          setSuccessMessage(`Bild hochgeladen, aber Fehler beim Speichern: ${result.error}`);
        }
      } catch (saveError) {
        console.error('❌ Error saving image URL:', saveError);
        setSuccessMessage(`Bild hochgeladen, aber Fehler beim Speichern: ${saveError.message}`);
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      if (error.message.includes('Bucket not found') || error.message.includes('bucket not found')) {
        setErrorMessage('Storage-Bucket nicht gefunden. Prüfen Sie den Bucket-Namen.');
      } else if (error.message.includes('new row violates row-level security policy')) {
        setErrorMessage('RLS-Policy blockiert Upload. Versuchen Sie es mit einem anderen Bild.');
      } else if (error.message.includes('file size') || error.message.includes('too large')) {
        setErrorMessage('Datei zu groß. Versuchen Sie ein kleineres Bild oder komprimieren Sie es.');
      } else if (error.message.includes('network') || error.message.includes('timeout') || error.message.includes('fetch')) {
        setErrorMessage('Netzwerk-Fehler. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.');
      } else if (error.message.includes('unauthorized') || error.message.includes('403') || error.message.includes('401')) {
        setErrorMessage('Berechtigung verweigert. Bitte melden Sie sich erneut an.');
      } else if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
        setErrorMessage('CORS-Fehler. Versuchen Sie es mit einem anderen Browser oder Gerät.');
      } else {
        setErrorMessage(`Upload-Fehler: ${error.message}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Bei Setup: normaler Submit
    if (isSetup) {
    if (isViewingOtherPlayer) {
      setErrorMessage('Sie können nur Ihr eigenes Profil bearbeiten.');
      return;
    }
    
    if (!profile.name || profile.name.trim() === '') {
      setErrorMessage('❌ Bitte geben Sie Ihren Namen ein');
      return;
    }
    
      // Trigger Auto-Save
      await handleAutoSave();
      
      // Weiterleitung nach Setup
        setTimeout(() => {
          navigate('/');
        }, 1500);
    }
  };

  if (authLoading) {
    return (
      <div className="profile-container">
        <div className="loading">⏳ Lade Profil...</div>
      </div>
    );
  }

  return (
    <div className="dashboard container">
      {isSetup && (
        <div className="fade-in lk-card-full" style={{ marginBottom: '1rem' }}>
          <div className="formkurve-header">
            <div className="formkurve-title">🎉 Willkommen!</div>
          </div>
          <div className="season-content">
            <p style={{ margin: '0 0 0.5rem 0' }}>Bitte vervollständigen Sie Ihr Profil, um fortzufahren.</p>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>📝 Mindestens Ihr <strong>Name</strong> ist erforderlich.</p>
          </div>
        </div>
      )}
      
      {/* Kopfbereich im Dashboard-Stil */}
      <div className="fade-in" style={{ marginBottom: '1rem', paddingTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="hi">👤 {isSetup ? 'Profil einrichten' : 'Mein Profil'}</h1>
        {!isViewingOtherPlayer && (
            <button 
            className="btn-modern btn-modern-inactive"
              onClick={() => setShowPasswordReset(true)}
            >
              🔐 Passwort zurücksetzen
            </button>
        )}
      </div>
      
      {/* ✅ NEU: Tab-Navigation - RESPONSIVE */}
      {!isSetup && (
        <div className="fade-in" style={{ marginBottom: '1.5rem' }}>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: '0.5rem'
          }}>
            {/* Tab 1: Spielbilanz */}
            <button
              onClick={() => setActiveTab('spielbilanz')}
              style={{
                padding: '0.75rem 0.5rem',
                background: activeTab === 'spielbilanz' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'white',
                color: activeTab === 'spielbilanz' ? 'white' : '#1f2937',
                border: activeTab === 'spielbilanz' ? '2px solid #1e40af' : '2px solid #e5e7eb',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                borderBottom: activeTab === 'spielbilanz' ? '2px solid #3b82f6' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>📊</span>
              <span className="tab-label-desktop">Spielbilanz</span>
              <span className="tab-label-mobile">Bilanz</span>
            </button>
            
            {/* Tab 2: Teams */}
            <button
              onClick={() => setActiveTab('teams')}
              style={{
                padding: '0.75rem 0.5rem',
                background: activeTab === 'teams' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'white',
                color: activeTab === 'teams' ? 'white' : '#1f2937',
                border: activeTab === 'teams' ? '2px solid #6d28d9' : '2px solid #e5e7eb',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                borderBottom: activeTab === 'teams' ? '2px solid #8b5cf6' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>🏢</span>
              <span className="tab-label-desktop">Verein(e) & Teams</span>
              <span className="tab-label-mobile">Teams</span>
            </button>
            
            {/* Tab 3: Tennismates */}
            <button
              onClick={() => {
                setActiveTab('tennismates');
                if (player?.id) loadTennismates(player.id);
              }}
              style={{
                padding: '0.75rem 0.5rem',
                background: activeTab === 'tennismates' ? 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' : 'white',
                color: activeTab === 'tennismates' ? 'white' : '#1f2937',
                border: activeTab === 'tennismates' ? '2px solid #be185d' : '2px solid #e5e7eb',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                borderBottom: activeTab === 'tennismates' ? '2px solid #ec4899' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>🎾</span>
              <span className="tab-label-desktop">Tennismates</span>
              <span className="tab-label-mobile">Mates</span>
            </button>
            
            {/* Tab 4: Details */}
            <button
              onClick={() => setActiveTab('details')}
              style={{
                padding: '0.75rem 0.5rem',
                background: activeTab === 'details' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'white',
                color: activeTab === 'details' ? 'white' : '#1f2937',
                border: activeTab === 'details' ? '2px solid #047857' : '2px solid #e5e7eb',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                borderBottom: activeTab === 'details' ? '2px solid #10b981' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>👤</span>
              <span className="tab-label-desktop">Persönliche Details</span>
              <span className="tab-label-mobile">Profil</span>
            </button>
          </div>
        </div>
      )}



      {errorMessage && (
        <div className="error-message" style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          color: '#721c24'
        }}>
          {errorMessage}
        </div>
      )}

      {/* ✅ TAB 1: SPIELBILANZ */}
      {activeTab === 'spielbilanz' && !isSetup && (
        <div>
          {!loadingStats && performanceStats ? (
            <PerformanceStats 
              player={player} 
              performanceStats={performanceStats} 
              recentMatches={recentMatches} 
            />
          ) : loadingStats ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
              Lade Performance-Daten...
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎾</div>
              Keine Performance-Daten verfügbar
            </div>
          )}
        </div>
      )}
      
      {/* ✅ TAB 2: VEREIN(E) & TEAMS */}
      {activeTab === 'teams' && !isSetup && !isViewingOtherPlayer && (
        <div>
          {/* Übersicht: Meine Vereine & Teams */}
          {clubs.length > 0 && playerTeams.length > 0 && (
            <div className="fade-in lk-card-full" style={{ marginBottom: '1.5rem' }}>
              <div className="formkurve-header">
                <div className="formkurve-title">Meine Vereine & Mannschaften</div>
                <div className="match-count-badge">
                  {clubs.length} {clubs.length === 1 ? 'Verein' : 'Vereine'}
                </div>
              </div>
              
              <div className="season-content">
                {clubs.map(club => {
                  const clubTeams = playerTeams.filter(pt => 
                    (pt.team_info?.club_name || pt.club_name) === club.name
                  );
                  
                  return (
                    <div key={club.id} className="club-section" style={{ marginBottom: '1.5rem' }}>
                      {/* Club Header */}
                      <div className="club-header" style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '1rem',
                        padding: '0.75rem',
                        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                        borderRadius: '8px',
                        border: '1px solid #bae6fd'
                      }}>
                        <Building2 size={20} color="#0369a1" style={{ marginRight: '0.5rem' }} />
                        <h3 style={{ margin: 0, color: '#0369a1', fontSize: '1.1rem', fontWeight: 600 }}>
                          {club.name}
                        </h3>
                      </div>
                      
                      {/* Teams Grid */}
                      <div className="teams-grid" style={{
                        display: 'grid',
                        gap: '0.75rem',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'
                      }}>
                        {clubTeams.map(pt => {
                          const team = pt.team_info || pt;
                          const isPrimary = pt.is_primary;
                          
                          return (
                            <div
                              key={pt.id}
                              className="team-card"
                              style={{
                                padding: '1.5rem',
                                border: isPrimary ? '2px solid #f59e0b' : '2px solid #e5e7eb',
                                borderRadius: '12px',
                                background: isPrimary 
                                  ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                                  : 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s'
                              }}
                            >
                              {/* Team Header */}
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1rem',
                                flexWrap: 'wrap',
                                gap: '0.5rem'
                              }}>
                                <div style={{ flex: '1 1 200px' }}>
                                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#1f2937' }}>
                                    {team.category || 'Unbekannt'} {team.team_name || '?'}. Mannschaft
                                  </h4>
                                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280', fontWeight: 500 }}>
                                    {team.region || 'Mittelrhein'}
                                  </p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                  {isPrimary && (
                                    <span style={{
                                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                      color: 'white',
                                      padding: '0.375rem 0.75rem',
                                      borderRadius: '6px',
                                      fontSize: '0.8rem',
                                      fontWeight: 700,
                                      boxShadow: '0 2px 4px rgba(245,158,11,0.3)'
                                    }}>
                                      ⭐ Hauptmannschaft
                                    </span>
                                  )}
                                  <span style={{
                                    background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                                    color: 'white',
                                    padding: '0.375rem 0.75rem',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    boxShadow: '0 2px 4px rgba(107,114,128,0.3)'
                                  }}>
                                    🎾 {pt.role || 'Spieler'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Saison-Details */}
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                gap: '0.75rem',
                                marginBottom: '1rem',
                                padding: '1rem',
                                background: 'rgba(255, 255, 255, 0.6)',
                                borderRadius: '8px',
                                border: '1px solid rgba(0,0,0,0.05)'
                              }}>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>
                                    Liga
                                  </div>
                                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1f2937' }}>
                                    🏆 {pt.current_league || 'Unbekannt'}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>
                                    Gruppe
                                  </div>
                                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1f2937' }}>
                                    📋 {pt.current_group || '-'}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>
                                    Saison
                                  </div>
                                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1f2937' }}>
                                    📅 {pt.current_season || 'Winter 2025/26'}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>
                                    Team-Größe
                                  </div>
                                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1f2937' }}>
                                    👥 {pt.team_size || 4}er
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* TeamSelector (für Hinzufügen/Bearbeiten) */}
        <div className="fade-in lk-card-full" style={{ marginBottom: '1.5rem' }}>
          <TeamSelector onTeamsUpdated={() => {
            if (player) {
              loadPlayerTeamsAndClubs(player.id);
                window.dispatchEvent(new CustomEvent('reloadTeams', { detail: { playerId: player.id } }));
            }
          }} />
          </div>
        </div>
      )}

      {/* ✅ TAB 3: TENNISMATES */}
      {activeTab === 'tennismates' && !isSetup && !isViewingOtherPlayer && (
        <div>
          {/* Übersicht Stats */}
          <div className="fade-in lk-card-full" style={{ marginBottom: '1.5rem' }}>
            <div className="formkurve-header" style={{
              background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)'
            }}>
              <div className="formkurve-title" style={{ color: 'white' }}>
                🎾 Meine Tennismates
              </div>
              <div className="match-count-badge" style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}>
                {(() => {
                  // ✅ Berechne einzigartige Vernetzungen (keine Duplikate!)
                  const uniqueIds = new Set([
                    ...tennismatesList.map(t => t.id),
                    ...followingList.map(f => f.id)
                  ]);
                  const count = uniqueIds.size;
                  return `${count} ${count === 1 ? 'Vernetzung' : 'Vernetzungen'}`;
                })()}
              </div>
            </div>
            
            <div className="season-content">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                  border: '2px solid #10b981',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#059669' }}>
                    {tennismatesList.length}
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#047857', marginTop: '0.5rem' }}>
                    Tennismates
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>
                    folgen mir
                  </div>
                </div>
                
                <div style={{
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: '2px solid #3b82f6',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#2563eb' }}>
                    {followingList.length}
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e40af', marginTop: '0.5rem' }}>
                    Folge ich
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.25rem' }}>
                    anderen Spielern
                  </div>
                </div>
                
                <div style={{
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
                  border: '2px solid #ec4899',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#db2777' }}>
                    {tennismatesList.filter(t => t.isMutual).length}
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#9f1239', marginTop: '0.5rem' }}>
                    Freunde ❤️
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#db2777', marginTop: '0.25rem' }}>
                    gegenseitig
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Meine Tennismates (folgen mir) */}
          {tennismatesList.length > 0 && (
            <div className="fade-in lk-card-full" style={{ marginBottom: '1.5rem' }}>
              <div className="formkurve-header">
                <div className="formkurve-title">🎾 Meine Tennismates</div>
                <div className="match-count-badge">{tennismatesList.length}</div>
              </div>
              
              <div className="season-content">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1rem'
                }}>
                  {tennismatesList.map((mate) => (
                    <div
                      key={mate.id}
                      onClick={() => navigate(`/player/${encodeURIComponent(mate.name)}`)}
                      style={{
                        padding: '1.25rem',
                        background: mate.isMutual 
                          ? 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)'
                          : 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
                        border: mate.isMutual ? '2px solid #ec4899' : '2px solid #e5e7eb',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {mate.isMutual && (
                        <div style={{
                          position: 'absolute',
                          top: '0.75rem',
                          right: '0.75rem',
                          fontSize: '1.5rem'
                        }}>❤️</div>
                      )}
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '2rem',
                          flexShrink: 0
                        }}>
                          {mate.profile_image ? (
                            <img src={mate.profile_image} alt={mate.name} style={{
                              width: '100%',
                              height: '100%',
                              borderRadius: '50%',
                              objectFit: 'cover'
                            }} />
                          ) : (
                            '🎾'
                          )}
                        </div>
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: '700', color: '#1f2937' }}>
                            {mate.name}
                          </h4>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>
                            LK {mate.current_lk || mate.season_start_lk || '?'}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{
                        padding: '0.5rem',
                        background: 'rgba(243, 244, 246, 0.5)',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        textAlign: 'center'
                      }}>
                        Folgt dir seit {new Date(mate.followedSince).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Ich folge (Following) */}
          {followingList.length > 0 && (
            <div className="fade-in lk-card-full" style={{ marginBottom: '1.5rem' }}>
              <div className="formkurve-header">
                <div className="formkurve-title">👥 Ich folge</div>
                <div className="match-count-badge">{followingList.length}</div>
              </div>
              
              <div className="season-content">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1rem'
                }}>
                  {followingList.map((mate) => (
                    <div
                      key={mate.id}
                      onClick={() => navigate(`/player/${encodeURIComponent(mate.name)}`)}
                      style={{
                        padding: '1.25rem',
                        background: mate.isMutual 
                          ? 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)'
                          : 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
                        border: mate.isMutual ? '2px solid #ec4899' : '2px solid #e5e7eb',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {mate.isMutual && (
                        <div style={{
                          position: 'absolute',
                          top: '0.75rem',
                          right: '0.75rem',
                          fontSize: '1.5rem'
                        }}>❤️</div>
                      )}
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '2rem',
                          flexShrink: 0
                        }}>
                          {mate.profile_image ? (
                            <img src={mate.profile_image} alt={mate.name} style={{
                              width: '100%',
                              height: '100%',
                              borderRadius: '50%',
                              objectFit: 'cover'
                            }} />
                          ) : (
                            '🎾'
                          )}
                        </div>
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: '700', color: '#1f2937' }}>
                            {mate.name}
                          </h4>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>
                            LK {mate.current_lk || mate.season_start_lk || '?'}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{
                        padding: '0.5rem',
                        background: 'rgba(243, 244, 246, 0.5)',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        textAlign: 'center'
                      }}>
                        Du folgst seit {new Date(mate.followedSince).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Empty State */}
          {tennismatesList.length === 0 && followingList.length === 0 && !loadingSocial && (
            <div className="fade-in lk-card-full">
              <div className="season-content" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎾</div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                  Noch keine Tennismates
                </h3>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', color: '#6b7280', lineHeight: '1.6' }}>
                  Folge anderen Spielern um ihre Match-Ergebnisse zu verfolgen und vernetzt zu bleiben!
                </p>
                <button
                  onClick={() => navigate('/results')}
                  style={{
                    padding: '1rem 2rem',
                    background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                    color: 'white',
                    border: '2px solid #be185d',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '700',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  🔍 Spieler entdecken
                </button>
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {loadingSocial && (
            <div className="fade-in lk-card-full">
              <div className="season-content" style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                <p style={{ margin: 0, color: '#6b7280' }}>Lade Tennismates...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ✅ TAB 4: PERSÖNLICHE DETAILS */}
      {activeTab === 'details' && (
      <form onSubmit={handleSubmit} className="profile-form">
        {/* Profilbild */}
        <section className="profile-section">
          <h2>📸 Profilbild</h2>
          
          <div className="form-group">
            <div className="profile-image-container">
              {profile.profileImage ? (
                <img 
                  src={profile.profileImage} 
                  alt="Profilbild" 
                  className="profile-image-preview"
                />
              ) : (
                <div className="profile-image-placeholder">
                  🎾
                </div>
              )}
              
              {!isViewingOtherPlayer && (
                <label htmlFor="profileImage" className="upload-button">
                  {isUploading ? '⏳ Lädt hoch...' : '📷 Bild hochladen'}
                </label>
              )}
              
              <input
                type="file"
                id="profileImage"
                accept="image/*,image/heic,image/heif"
                onChange={handleImageUpload}
                disabled={isViewingOtherPlayer || isUploading}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </section>

        {/* Persönliche Informationen */}
        <section className="profile-section">
          <h2>📋 Persönliche Informationen</h2>
          
          <div className="form-group">
            <label htmlFor="name">👤 Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={profile.name}
              onChange={handleInputChange}
              disabled={isViewingOtherPlayer}
              required
              placeholder="Max Mustermann"
            />
            {renderInlineSaveButton('name')}
          </div>

          <div className="form-group">
            <label htmlFor="email">✉️ E-Mail *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={profile.email}
              onChange={handleInputChange}
              disabled={true} // Email kann nicht geändert werden (Supabase Auth)
              placeholder="beispiel@email.de"
            />
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              📧 E-Mail-Adresse ist mit Ihrem Account verknüpft und kann nicht geändert werden
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="birth_date">🎂 Geburtsdatum</label>
            <input
              type="date"
              id="birth_date"
              name="birth_date"
              value={profile.birth_date}
              onChange={handleInputChange}
              disabled={isViewingOtherPlayer}
            />
            {renderInlineSaveButton('birth_date')}
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              🎉 Optional - hilft uns dein Profil zu personalisieren
            </small>
          </div>
        </section>

        {/* Tennis-Identity */}
        <section className="profile-section">
          <h2>🎾 Meine Tennis-Story</h2>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Erzähl uns von deiner Tennis-Reise! Alle Felder sind optional.
          </p>
          
          {/* Aktuelle LK - prominent */}
          <div className="form-group">
            <label htmlFor="current_lk">🏆 Aktuelle Leistungsklasse</label>
            <input
              id="current_lk"
              name="current_lk"
              type="text"
              value={profile.current_lk}
              onChange={handleInputChange}
              disabled={isViewingOtherPlayer}
              placeholder="z.B. LK 12.3"
              style={{ 
                textAlign: 'center', 
                fontWeight: '700',
                fontSize: '1.2rem',
                color: '#3b82f6',
                background: '#f0f9ff',
                border: '2px solid #93c5fd'
              }}
            />
            {renderInlineSaveButton('current_lk')}
            <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem', textAlign: 'center' }}>
              💡 Deine LK findest du auf deiner{' '}
              <a 
                href="https://tvm-tennis.de/spielbetrieb/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#3b82f6', textDecoration: 'underline' }}
              >
                TVM-Profilseite
              </a>
            </small>
          </div>

          {/* Tennis-Motto */}
          <div className="form-group">
            <label htmlFor="tennis_motto">💭 Dein Tennis-Motto</label>
            <input
              id="tennis_motto"
              name="tennis_motto"
              type="text"
              value={profile.tennis_motto}
              onChange={handleInputChange}
              disabled={isViewingOtherPlayer}
              placeholder='z.B. "Nie aufgeben!", "One point at a time"'
              style={{ fontStyle: 'italic' }}
            />
            {renderInlineSaveButton('tennis_motto')}
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              💪 Dein persönlicher Schlachtruf auf dem Court
            </small>
          </div>

          {/* Lieblingsschlag */}
          <div className="form-group">
            <label htmlFor="favorite_shot">🎯 Dein Lieblingsschlag</label>
            <input
              id="favorite_shot"
              name="favorite_shot"
              type="text"
              value={profile.favorite_shot}
              onChange={handleInputChange}
              disabled={isViewingOtherPlayer}
              placeholder="z.B. Vorhand Longline, Inside-Out, Slice..."
            />
            {renderInlineSaveButton('favorite_shot')}
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              🎾 Der Schlag, der dir am meisten Spaß macht
            </small>
          </div>

          {/* Bester Moment */}
          <div className="form-group">
            <label htmlFor="best_tennis_memory">🌟 Dein bester Tennis-Moment</label>
            <textarea
              id="best_tennis_memory"
              name="best_tennis_memory"
              value={profile.best_tennis_memory}
              onChange={handleInputChange}
              disabled={isViewingOtherPlayer}
              placeholder="z.B. Mein erster Turniersieg 2023 gegen..."
              rows="3"
              style={{ resize: 'vertical' }}
            />
            {renderInlineSaveButton('best_tennis_memory')}
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              🏆 Die Erinnerung, die dich motiviert
            </small>
          </div>

          {/* Schlimmster Moment */}
          <div className="form-group">
            <label htmlFor="worst_tennis_memory">😅 Dein schlimmster Tennis-Moment</label>
            <textarea
              id="worst_tennis_memory"
              name="worst_tennis_memory"
              value={profile.worst_tennis_memory}
              onChange={handleInputChange}
              disabled={isViewingOtherPlayer}
              placeholder="z.B. Als ich 6:0, 5:0 führte und dann verlor..."
              rows="3"
              style={{ resize: 'vertical' }}
            />
            {renderInlineSaveButton('worst_tennis_memory')}
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              😬 Auch das gehört dazu - daraus lernen wir
            </small>
          </div>

          {/* Lieblingsgegner */}
          <div className="form-group">
            <label htmlFor="favorite_opponent">🤝 Dein Lieblingsgegner</label>
            <input
              id="favorite_opponent"
              name="favorite_opponent"
              type="text"
              value={profile.favorite_opponent}
              onChange={handleInputChange}
              disabled={isViewingOtherPlayer}
              placeholder="z.B. Mein bester Freund Max, immer spannend!"
            />
            {renderInlineSaveButton('favorite_opponent')}
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              🎾 Gegen wen spielst du am liebsten?
            </small>
          </div>

          {/* Traum-Match */}
          <div className="form-group">
            <label htmlFor="dream_match">💫 Dein Traum-Match</label>
            <input
              id="dream_match"
              name="dream_match"
              type="text"
              value={profile.dream_match}
              onChange={handleInputChange}
              disabled={isViewingOtherPlayer}
              placeholder="z.B. Gegen Roger Federer auf Wimbledon"
            />
            {renderInlineSaveButton('dream_match')}
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              ✨ Gegen wen würdest du gerne mal spielen?
            </small>
          </div>
        </section>

        {/* Fun & Aberglaube */}
        <section className="profile-section">
          <h2>🎭 Das macht mich aus</h2>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Zeig uns deine Persönlichkeit! Diese Infos lockern dein Profil auf.
          </p>

          {/* Fun Fact */}
          <div className="form-group">
            <label htmlFor="fun_fact">🎲 Fun Fact über dich</label>
            <textarea
              id="fun_fact"
              name="fun_fact"
              value={profile.fun_fact}
              onChange={handleInputChange}
              disabled={isViewingOtherPlayer}
              placeholder="z.B. Ich spiele seit meinem 5. Lebensjahr Tennis..."
              rows="3"
              style={{ resize: 'vertical' }}
            />
            {renderInlineSaveButton('fun_fact')}
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              🎉 Was die wenigsten über dich wissen
            </small>
          </div>

          {/* Aberglaube */}
          <div className="form-group">
            <label htmlFor="superstition">🍀 Dein Aberglaube</label>
            <input
              id="superstition"
              name="superstition"
              type="text"
              value={profile.superstition}
              onChange={handleInputChange}
              disabled={isViewingOtherPlayer}
              placeholder='z.B. "Immer mit dem rechten Fuß zuerst auf den Court"'
            />
            {renderInlineSaveButton('superstition')}
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              🔮 Hast du ein Glücksritual?
            </small>
          </div>

          {/* Pre-Match Routine */}
          <div className="form-group">
            <label htmlFor="pre_match_routine">🔄 Deine Pre-Match Routine</label>
            <textarea
              id="pre_match_routine"
              name="pre_match_routine"
              value={profile.pre_match_routine}
              onChange={handleInputChange}
              disabled={isViewingOtherPlayer}
              placeholder="z.B. 30 Min Aufwärmen, Musik hören, Banane essen..."
              rows="3"
              style={{ resize: 'vertical' }}
            />
            {renderInlineSaveButton('pre_match_routine')}
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              🎯 Wie bereitest du dich vor einem Match vor?
            </small>
          </div>
        </section>

        {/* Kontakt & Notfall */}
        <section className="profile-section">
          <h2>📞 Kontakt & Notfall</h2>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            🔒 Diese Daten sind nur für dein Team sichtbar
          </p>
          
          <div className="form-group">
            <label htmlFor="phone">📱 Telefonnummer</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={profile.phone}
              onChange={handleInputChange}
              disabled={isViewingOtherPlayer}
              placeholder="+49 123 456789"
            />
            {renderInlineSaveButton('phone')}
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              Für Team-Kommunikation und wichtige Updates
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="address">🏠 Adresse</label>
            <textarea
              id="address"
              name="address"
              value={profile.address}
              onChange={handleInputChange}
              disabled={isViewingOtherPlayer}
              placeholder="Musterstraße 123, 12345 Musterstadt"
              rows="2"
              style={{ resize: 'vertical' }}
            />
            {renderInlineSaveButton('address')}
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              Optional - für Fahrgemeinschaften
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="emergency_contact">🚨 Notfallkontakt</label>
            <input
              id="emergency_contact"
              name="emergency_contact"
              type="text"
              value={profile.emergency_contact}
              onChange={handleInputChange}
              disabled={isViewingOtherPlayer}
              placeholder="Name des Notfallkontakts"
            />
            {renderInlineSaveButton('emergency_contact')}
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              Name der Person, die im Notfall kontaktiert werden soll
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="emergency_phone">☎️ Notfall-Telefon</label>
            <input
              id="emergency_phone"
              name="emergency_phone"
              type="tel"
              value={profile.emergency_phone}
              onChange={handleInputChange}
              disabled={isViewingOtherPlayer}
              placeholder="+49 123 456789"
            />
            {renderInlineSaveButton('emergency_phone')}
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              Telefonnummer des Notfallkontakts
            </small>
          </div>
        </section>

        {/* Notizen */}
        <section className="profile-section">
          <h2>📝 Persönliche Notizen</h2>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Platz für deine eigenen Gedanken und Erinnerungen
          </p>
          
          <div className="form-group">
            <textarea
              id="notes"
              name="notes"
              value={profile.notes}
              onChange={handleInputChange}
              disabled={isViewingOtherPlayer}
              placeholder="Hier ist Platz für deine persönlichen Notizen..."
              rows="5"
              style={{ resize: 'vertical' }}
            />
            {renderInlineSaveButton('notes')}
          </div>
        </section>
        
        {clubs.length > 0 && (
        <section className="profile-section">
            <h2>🏢 Vereins-/Mannschafts-Zugehörigkeit</h2>
            
            <div className="lk-card-full" style={{ marginTop: '1rem' }}>
              <div className="formkurve-header">
                <div className="formkurve-title">Meine Vereine & Mannschaften</div>
                <div className="match-count-badge">
                  {clubs.length} {clubs.length === 1 ? 'Verein' : 'Vereine'}
          </div>
          </div>
          
              {/* Button: Mannschaft hinzufügen */}
              <div style={{ 
                padding: '1rem', 
                borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.9rem', 
                  color: '#6b7280' 
                }}>
                  Du kannst in mehreren Vereinen und bis zu 3 Mannschaften pro Verein spielen.
                </p>
                <button
                  onClick={() => alert('Team hinzufügen - Feature kommt bald! 🚀\n\nKontaktiere deinen Team-Captain, damit er dich hinzufügt.')}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.2s',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>➕</span>
                  Mannschaft hinzufügen
                </button>
              </div>

              <div className="season-content">
                {clubs.map((club, clubIndex) => (
                  <div key={clubIndex} className="club-section" style={{ marginBottom: '1.5rem' }}>
                    {/* Verein Header */}
                    <div className="club-header" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: '1rem',
                      padding: '0.75rem',
                      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                      borderRadius: '8px',
                      border: '1px solid #bae6fd'
                    }}>
                      <Building2 size={20} color="#0369a1" style={{ marginRight: '0.5rem' }} />
                      <h3 style={{ 
                        margin: 0, 
                        color: '#0369a1',
                        fontSize: '1.1rem',
                        fontWeight: '600'
                      }}>
                        {club.name}
                      </h3>
          </div>

                    {/* Mannschaften */}
                    <div className="teams-grid" style={{ 
                      display: 'grid', 
                      gap: '0.75rem',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'
                    }}>
                      {club.teams.map((team, teamIndex) => (
                        <div key={teamIndex} className="team-card" style={{
                          padding: '1.5rem',
                          border: '2px solid',
                          borderRadius: '12px',
                          background: team.is_primary 
                            ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' 
                            : 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
                          borderColor: team.is_primary ? '#f59e0b' : '#e5e7eb',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                          transition: 'all 0.2s ease'
                        }}>
                          {/* Team Header mit Badges */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '1rem',
                            flexWrap: 'wrap',
                            gap: '0.5rem'
                          }}>
                            <div style={{ flex: '1', minWidth: '200px' }}>
                              <h4 style={{ 
                                margin: 0, 
                                fontSize: '1.25rem',
                                fontWeight: '700',
                                color: '#1f2937',
                                marginBottom: '0.25rem'
                              }}>
                                {team.team_name || team.category}
                              </h4>
                              <p style={{ 
                                margin: 0, 
                                fontSize: '0.9rem',
                                color: '#6b7280',
                                fontWeight: '500'
                              }}>
                                {team.category} • {team.region}
                              </p>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              {team.is_primary && (
                                <span style={{
                                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                  color: 'white',
                                  padding: '0.375rem 0.75rem',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: '700',
                                  boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                                }}>
                                  ⭐ Hauptmannschaft
                                </span>
                              )}
                              
                              <span style={{
                                background: team.role === 'captain' 
                                  ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' 
                                  : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                                color: 'white',
                                padding: '0.375rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                boxShadow: team.role === 'captain' 
                                  ? '0 2px 4px rgba(220, 38, 38, 0.3)' 
                                  : '0 2px 4px rgba(107, 114, 128, 0.3)'
                              }}>
                                {team.role === 'captain' ? '🎯 Captain' : '🎾 Spieler'}
                              </span>
                            </div>
                          </div>
                              
                          {/* Liga- und Saison-Informationen */}
                          <div style={{ 
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                            gap: '0.75rem',
                            marginBottom: '1rem',
                            padding: '1rem',
                            background: 'rgba(255, 255, 255, 0.6)',
                            borderRadius: '8px',
                            border: '1px solid rgba(0, 0, 0, 0.05)'
                          }}>
                            {/* Liga */}
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ 
                                fontSize: '0.7rem', 
                                color: '#6b7280', 
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '0.25rem'
                              }}>
                                Liga
                              </div>
                              <div style={{ 
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                color: '#1f2937'
                              }}>
                                🏆 {team.current_league}
                              </div>
                            </div>

                            {/* Gruppe */}
                            {team.current_group && (
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ 
                                  fontSize: '0.7rem', 
                                  color: '#6b7280', 
                                  fontWeight: '600',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  marginBottom: '0.25rem'
                                }}>
                                  Gruppe
                                </div>
                                <div style={{ 
                                  fontSize: '0.95rem',
                                  fontWeight: '700',
                                  color: '#1f2937'
                                }}>
                                  📋 {team.current_group}
                                </div>
                              </div>
                            )}

                            {/* Saison */}
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ 
                                fontSize: '0.7rem', 
                                color: '#6b7280', 
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '0.25rem'
                              }}>
                                Saison
                              </div>
                              <div style={{ 
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                color: '#1f2937'
                              }}>
                                📅 {team.current_season}
                              </div>
                            </div>

                            {/* Team-Größe */}
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ 
                                fontSize: '0.7rem', 
                                color: '#6b7280', 
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '0.25rem'
                              }}>
                                Team
                              </div>
                              <div style={{ 
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                color: '#1f2937'
                              }}>
                                👥 {team.team_size} Spieler
                              </div>
                            </div>
                          </div>

                          {/* Team Details / TVM Link */}
                          {team.tvm_link && (
                            <div style={{ 
                              marginTop: '0.75rem',
                              paddingTop: '0.75rem',
                              borderTop: '1px solid rgba(0, 0, 0, 0.1)'
                            }}>
                              <a 
                                href={team.tvm_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ 
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  color: '#3b82f6',
                                  textDecoration: 'none',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  transition: 'color 0.2s'
                                }}
                              >
                                <Globe size={16} />
                                TVM-Spielbetrieb öffnen
                              </a>
                            </div>
                          )}

                          {/* Edit Buttons (nur bei eigenem Profil) */}
                          {!isViewingOtherPlayer && (
                            <div style={{ 
                              marginTop: '0.75rem', 
                              display: 'flex', 
                              gap: '0.5rem',
                              justifyContent: 'flex-end'
                            }}>
                              <button
                                onClick={() => handleEditTeam(team)}
                                style={{
                                  padding: '0.375rem 0.75rem',
                                  fontSize: '0.75rem',
                                  background: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <Edit3 size={14} />
                                Bearbeiten
                              </button>
                              
                              {!team.is_primary && (
                                <button
                                  onClick={() => handleRemoveTeam(team.player_team_id)}
                                  style={{
                                    padding: '0.375rem 0.75rem',
                                    fontSize: '0.75rem',
                                    background: '#dc2626',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Verlassen
                                </button>
                              )}
          </div>
                          )}
          </div>
                      ))}
          </div>
                  </div>
                ))}
              </div>
          </div>
        </section>
        )}

        {/* Setup-Button (nur bei Ersteinrichtung) */}
        {isSetup && (
          <div className="form-actions">
            <div className="form-actions-left">
              {successMessage && (
                <div className="success-message-inline">
                  {successMessage}
                </div>
              )}
            </div>
            <div className="form-actions-right">
              <button 
                type="submit" 
                className="btn-save"
                disabled={isSaving || !profile.name}
              >
                {isSaving ? '⏳ Speichert...' : '✅ Profil abschließen'}
              </button>
            </div>
          </div>
        )}
      </form>
      )}

      {/* Passwort-Reset-Modal */}
      {showPasswordReset && (
        <PasswordReset onClose={() => setShowPasswordReset(false)} />
      )}

      {/* Edit Team Modal */}
      {isEditingTeams && editingTeam && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
              Mannschaft bearbeiten: {editingTeam.team_name || editingTeam.category}
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Rolle:
              </label>
              <select 
                value={editingTeam.role}
                onChange={(e) => setEditingTeam({...editingTeam, role: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              >
                <option value="player">🎾 Spieler</option>
                <option value="captain">🎯 Captain</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={editingTeam.is_primary}
                  onChange={(e) => setEditingTeam({...editingTeam, is_primary: e.target.checked})}
                />
                <span style={{ fontWeight: '600' }}>
                  Hauptmannschaft (wird als primär angezeigt)
                </span>
              </label>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => {
                  setIsEditingTeams(false);
                  setEditingTeam(null);
                }}
                className="btn-modal-cancel"
              >
                Abbrechen
              </button>
              
              <button
                onClick={() => handleSaveTeamChanges(editingTeam.player_team_id, {
                  role: editingTeam.role,
                  is_primary: editingTeam.is_primary
                })}
                className="btn-modal-save"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupabaseProfile;

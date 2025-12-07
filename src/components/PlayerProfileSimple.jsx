import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Trophy, Heart, Edit3, Building2, Users, MapPin, Phone, Mail, Globe, UserPlus, UserMinus, UserX, Shield, Bell, BellOff } from 'lucide-react';
import './PlayerProfile.css';
import './Dashboard.css';

function PlayerProfileSimple() {
  const { playerName } = useParams();
  const navigate = useNavigate();
  const { currentUser, player: currentPlayer } = useAuth();
  
  const [player, setPlayer] = useState(null);
  const [playerTeams, setPlayerTeams] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isEditingTeams, setIsEditingTeams] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  
  // ✅ NEU: Performance-Daten
  const [performanceStats, setPerformanceStats] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [allPlayerResults, setAllPlayerResults] = useState([]); // Alle Match-Ergebnisse für Modals
  const [allMatchdayResults, setAllMatchdayResults] = useState([]); // Alle Matchday-Ergebnisse für Team-Details
  const [playerDataMap, setPlayerDataMap] = useState({}); // Spieler-Daten für Gegner-Anzeige
  const [firstLKDate, setFirstLKDate] = useState(null); // Datum der ersten LK-Erhebung
  
  // ✅ NEU: Anstehende Spiele
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loadingUpcomingMatches, setLoadingUpcomingMatches] = useState(false);
  
  // ✅ NEU: Accordion States (für Einzel/Doppel Details)
  const [expandedPersonalSection, setExpandedPersonalSection] = useState(null); // 'Einzel' oder 'Doppel' oder null
  
  // 🎯 SOCIAL FEATURES
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [tennismateCount, setTennismateCount] = useState(0);  // Tennismates = folgen mir
  const [followingCount, setFollowingCount] = useState(0);    // Following = ich folge ihnen
  const [isMutual, setIsMutual] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  useEffect(() => {
    // ProtectedRoute garantiert bereits, dass User eingeloggt ist
    if (playerName) {
    loadPlayerProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerName]);

  const loadPlayerProfile = async () => {
    if (!playerName) {
      setError('Kein Spieler angegeben');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // URL-decode den Spieler-Namen
      const decodedName = decodeURIComponent(playerName);
      console.log('🔍 Loading player profile for:', decodedName);
      
      // Erste versuche mit allen Feldern (auch inaktive Spieler!)
      let { data, error } = await supabase
        .from('players_unified')
        .select('*')
        .eq('name', decodedName)
        // WICHTIG: Entferne .eq('is_active', true) - auch inaktive Spieler können gefunden werden
        // wenn sie in Teams sind oder Ergebnisse haben
        .single();

      // Falls das fehlschlägt, versuche mit grundlegenden Feldern (auch inaktive!)
      if (error) {
        console.log('🔄 Trying with basic fields (including inactive players)...');
        const result = await supabase
          .from('players_unified')
          .select(`
            id,
            name,
            email,
            phone,
            ranking,
            points,
            current_lk,
            season_start_lk,
            player_type,
            is_active,
            user_id,
            created_at,
            updated_at
          `)
          .eq('name', decodedName)
          // WICHTIG: Entferne .eq('is_active', true) - auch inaktive Spieler können gefunden werden
          .single();
        
        data = result.data;
        error = result.error;
      }
      
      // Falls immer noch nicht gefunden, versuche auch mit ILIKE (für Varianten)
      if (error && error.code === 'PGRST116') {
        console.log('🔄 Trying with ILIKE search (case-insensitive)...');
        const result = await supabase
          .from('players_unified')
          .select('*')
          .ilike('name', decodedName)
          .limit(1)
          .maybeSingle();
        
        if (result.data) {
          data = result.data;
          error = null;
        }
      }

      console.log('🔍 Query result:', { data, error });

      if (error) {
        console.error('❌ Error loading player profile:', error);
        if (error.code === 'PGRST116') {
          setError(`Spieler "${decodedName}" nicht gefunden.`);
        } else {
          setError(`Fehler beim Laden: ${error.message}`);
        }
        return;
      }

      if (data) {
        console.log('✅ Player data loaded:', data);
        setPlayer(data);
        const _isOwnProfile = currentUser?.id === data.user_id;
        setIsOwnProfile(_isOwnProfile);
        
        // ✅ Lade Performance-Statistiken
        loadPerformanceStats(data.id);
        
        // ✅ Lade Social Features (nur für fremde Profile)
        if (!_isOwnProfile) {
          loadSocialFeatures(data.id);
        }
        
        // Lade Vereins- und Mannschafts-Daten
        await loadPlayerTeamsAndClubs(data.id);
      } else {
        setError(`Spieler "${decodedName}" nicht gefunden.`);
      }
    } catch (error) {
      console.error('❌ Error loading player:', error);
      setError('Fehler beim Laden des Spieler-Profils.');
    } finally {
      setLoading(false);
    }
  };
  
  // ✅ NEU: Lade Performance-Statistiken
  const loadPerformanceStats = async (playerId) => {
    if (!playerId) return;
    
    setLoadingStats(true);
    
    try {
      console.log('📊 Loading performance stats for player:', playerId);
      
      // Lade alle match_results für diesen Spieler
      const { data: results, error } = await supabase
        .from('match_results')
        .select(`
          *,
          matchday:matchdays(
            id,
            match_date,
            home_team_id,
            away_team_id,
            season,
            status,
            home_team:team_info!matchdays_home_team_id_fkey(club_name, team_name, category),
            away_team:team_info!matchdays_away_team_id_fkey(club_name, team_name, category)
          )
        `)
        .or(`home_player_id.eq.${playerId},home_player1_id.eq.${playerId},home_player2_id.eq.${playerId},guest_player_id.eq.${playerId},guest_player1_id.eq.${playerId},guest_player2_id.eq.${playerId}`)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      console.log('✅ Match results loaded (Raouls Spiele):', results?.length || 0);
      console.log('📋 Raw results:', results);
      
      // ✅ Speichere alle Ergebnisse für Modals
      setAllPlayerResults(results || []);
      
      // ✅ Lade Spieler-Daten für alle Gegner (für Modal-Anzeige)
      const allPlayerIds = new Set();
      (results || []).forEach(r => {
        if (r.home_player_id) allPlayerIds.add(r.home_player_id);
        if (r.guest_player_id) allPlayerIds.add(r.guest_player_id);
        if (r.home_player1_id) allPlayerIds.add(r.home_player1_id);
        if (r.home_player2_id) allPlayerIds.add(r.home_player2_id);
        if (r.guest_player1_id) allPlayerIds.add(r.guest_player1_id);
        if (r.guest_player2_id) allPlayerIds.add(r.guest_player2_id);
      });
      
      if (allPlayerIds.size > 0) {
        const playerDataMapTemp = {};
        await Promise.all(
          Array.from(allPlayerIds).map(async (id) => {
            try {
              const { data, error } = await supabase
                .from('players_unified')
                .select('id, name, current_lk, season_start_lk')
                .eq('id', id)
                .single();
              
              if (!error && data) {
                playerDataMapTemp[id] = data;
              }
            } catch (err) {
              console.error('Error loading player data:', err);
            }
          })
        );
        setPlayerDataMap(playerDataMapTemp);
      }
      
      // ✅ Ermittle Datum der ersten LK-Erhebung
      // Das ist entweder das Datum des ersten Matches oder das created_at Datum (wenn Spieler mit LK erstellt wurde)
      let firstDate = null;
      
      // 1. Prüfe das Datum des ersten Matches (sortiere nach match_date, nicht created_at)
      if (results && results.length > 0) {
        const matchDates = results
          .map(r => r.matchday?.match_date)
          .filter(Boolean)
          .map(d => new Date(d))
          .sort((a, b) => a.getTime() - b.getTime()); // Sortiere aufsteigend (ältestes zuerst)
        
        if (matchDates.length > 0) {
          firstDate = matchDates[0];
        }
      }
      
      // 2. Prüfe created_at Datum des Spielers (wenn LK beim Erstellen gesetzt war)
      // Hole Spieler-Daten, um created_at zu prüfen
      const { data: playerData } = await supabase
        .from('players_unified')
        .select('created_at, season_start_lk, current_lk')
        .eq('id', playerId)
        .single();
      
      if (playerData && playerData.created_at) {
        const createdDate = new Date(playerData.created_at);
        // Wenn created_at früher ist als das erste Match, oder kein Match vorhanden ist
        if (!firstDate || createdDate < firstDate) {
          // Nur verwenden, wenn beim Erstellen bereits eine LK gesetzt war
          if (playerData.season_start_lk || playerData.current_lk) {
            firstDate = createdDate;
          }
        }
      }
      
      setFirstLKDate(firstDate);
      
      // ✅ Hole ALLE Matchday-IDs wo Raoul gespielt hat
      const matchdayIds = [...new Set((results || []).map(r => r.matchday_id).filter(Boolean))];
      console.log('📋 Matchday IDs wo Raoul gespielt hat:', matchdayIds);
      
      // ✅ Lade ALLE Ergebnisse dieser Matchdays (für Team-Bilanz!)
      let allMatchdayResultsData = [];
      if (matchdayIds.length > 0) {
        const { data: fullResults, error: fullError } = await supabase
          .from('match_results')
          .select('*')
          .in('matchday_id', matchdayIds);
        
        if (!fullError) {
          allMatchdayResultsData = fullResults || [];
          console.log('✅ ALLE Ergebnisse geladen (für Team-Bilanz):', allMatchdayResultsData.length);
        }
      }
      
      // ✅ Speichere alle Matchday-Ergebnisse für Team-Details-Modal
      setAllMatchdayResults(allMatchdayResultsData);
      
      // ✅ Berechne PERSÖNLICHE Statistiken (nur Raouls Spiele!)
      let einzelWins = 0, einzelLosses = 0, einzelDraws = 0;
      let doppelWins = 0, doppelLosses = 0, doppelDraws = 0;
      
      const matchesMap = new Map(); // Für Mannschafts-Bilanz
      
      (results || []).forEach(result => {
        // Bestimme ob Spieler im Home oder Guest Team ist
        const isInHomeTeam = 
          result.home_player_id === playerId ||
          result.home_player1_id === playerId ||
          result.home_player2_id === playerId;
        
        // ✅ Bestimme Sieg/Niederlage (WICHTIG: winner ist 'home' oder 'guest', NICHT 'away'!)
        let didWin = false;
        let didLose = false;
        let isDraw = false;
        
        if (result.winner) {
          if ((isInHomeTeam && result.winner === 'home') || 
              (!isInHomeTeam && result.winner === 'guest')) {
            didWin = true;
          } else if ((isInHomeTeam && result.winner === 'guest') || 
                     (!isInHomeTeam && result.winner === 'home')) {
            didLose = true;
          } else if (result.winner === 'draw') {
            isDraw = true;
          }
        }
        
        console.log(`  🔍 Result: ${result.match_type}, isInHomeTeam: ${isInHomeTeam}, winner: ${result.winner}, didWin: ${didWin}, didLose: ${didLose}`);
        
        // ✅ Zähle nach Spiel-Typ (Einzel vs Doppel)
        if (result.match_type === 'Einzel') {
          if (didWin) einzelWins++;
          else if (didLose) einzelLosses++;
          else if (isDraw) einzelDraws++;
        } else if (result.match_type === 'Doppel') {
          if (didWin) doppelWins++;
          else if (didLose) doppelLosses++;
          else if (isDraw) doppelDraws++;
        }
        
        // Gruppiere nach Matchday (für Mannschafts-Bilanz)
        if (result.matchday && result.matchday.id) {
          if (!matchesMap.has(result.matchday.id)) {
            matchesMap.set(result.matchday.id, {
              matchday: result.matchday,
              results: []
            });
          }
          matchesMap.get(result.matchday.id).results.push(result);
        }
      });
      
      // Konvertiere zu Array und sortiere nach Datum (für Mannschafts-Spiele)
      const matchesArray = Array.from(matchesMap.values())
        .sort((a, b) => new Date(b.matchday.match_date) - new Date(a.matchday.match_date))
        .slice(0, 10); // Letzte 10 Matchdays
      
      // ✅ Berechne MANNSCHAFTS-Bilanz (Siege/Niederlagen der Matchdays)
      let teamWins = 0;
      let teamLosses = 0;
      let teamDraws = 0;
      
      const matchdaysWithStats = matchesArray.map((m, idx) => {
        console.log(`\n🏆 Processing Matchday ${idx + 1}:`, m.matchday.id);
        
        // ✅ Hole ALLE Ergebnisse dieses Matchdays (nicht nur Raouls!)
        const allResultsForThisMatch = allMatchdayResultsData.filter(r => r.matchday_id === m.matchday.id);
        
        console.log(`   Raouls Results: ${m.results.length}`);
        console.log(`   ALLE Results: ${allResultsForThisMatch.length}`);
        
        let homeScore = 0;
        let guestScore = 0;
        
        allResultsForThisMatch.forEach((r, rIdx) => {
          console.log(`   Result ${rIdx + 1}: match_type=${r.match_type}, winner=${r.winner}, status=${r.status}`);
          
          if (r.winner === 'home') {
            homeScore++;
            console.log(`     → HOME gewonnen (homeScore now ${homeScore})`);
          } else if (r.winner === 'guest') {
            guestScore++;
            console.log(`     → GUEST gewonnen (guestScore now ${guestScore})`);
          } else {
            console.log(`     → Kein Winner oder Draw`);
          }
        });
        
        // Bestimme ob Spieler im Home-Team war
        const isHome = m.results.some(r => 
          r.home_player_id === playerId ||
          r.home_player1_id === playerId ||
          r.home_player2_id === playerId
        );
        
        const ourScore = isHome ? homeScore : guestScore;
        const oppScore = isHome ? guestScore : homeScore;
        
        console.log(`   📊 FINAL: homeScore=${homeScore}, guestScore=${guestScore}`);
        console.log(`   📊 Spieler war im ${isHome ? 'HOME' : 'GUEST'} Team`);
        console.log(`   📊 ourScore=${ourScore}, oppScore=${oppScore}`);
        
        // Zähle Team-Ergebnis
        if (ourScore > oppScore) {
          teamWins++;
          console.log(`   ✅ TEAM-SIEG gezählt! (teamWins now ${teamWins})`);
        } else if (ourScore < oppScore) {
          teamLosses++;
          console.log(`   ❌ TEAM-NIEDERLAGE gezählt! (teamLosses now ${teamLosses})`);
        } else if (ourScore === oppScore && ourScore > 0) {
          teamDraws++;
          console.log(`   🤝 TEAM-REMIS gezählt! (teamDraws now ${teamDraws})`);
        } else {
          console.log(`   ⚠️  Nicht gezählt (beide 0)`);
        }
        
        const opponent = isHome ? m.matchday.away_team : m.matchday.home_team;
        
        return {
          id: m.matchday.id,
          date: new Date(m.matchday.match_date),
          opponent: opponent ? `${opponent.club_name} ${opponent.team_name || ''} (${opponent.category})`.trim() : 'Unbekannt',
          location: isHome ? 'Home' : 'Away',
          ourScore,
          oppScore,
          total: allResultsForThisMatch.length, // ✅ ALLE Ergebnisse
          season: m.matchday.season
        };
      });
      
      // ✅ Setze beide Statistiken
      setPerformanceStats({
        // Persönliche Stats
        personal: {
          einzel: {
            wins: einzelWins,
            losses: einzelLosses,
            draws: einzelDraws,
            total: einzelWins + einzelLosses + einzelDraws,
            winRate: einzelWins + einzelLosses > 0 ? ((einzelWins / (einzelWins + einzelLosses)) * 100).toFixed(0) : 0
          },
          doppel: {
            wins: doppelWins,
            losses: doppelLosses,
            draws: doppelDraws,
            total: doppelWins + doppelLosses + doppelDraws,
            winRate: doppelWins + doppelLosses > 0 ? ((doppelWins / (doppelWins + doppelLosses)) * 100).toFixed(0) : 0
          },
          gesamt: {
            wins: einzelWins + doppelWins,
            losses: einzelLosses + doppelLosses,
            draws: einzelDraws + doppelDraws,
            total: einzelWins + einzelLosses + einzelDraws + doppelWins + doppelLosses + doppelDraws,
            winRate: einzelWins + einzelLosses + doppelWins + doppelLosses > 0 ? 
              (((einzelWins + doppelWins) / (einzelWins + einzelLosses + doppelWins + doppelLosses)) * 100).toFixed(0) : 0
          }
        },
        // Mannschafts-Stats
        team: {
          wins: teamWins,
          losses: teamLosses,
          draws: teamDraws,
          total: teamWins + teamLosses + teamDraws,
          winRate: teamWins + teamLosses > 0 ? ((teamWins / (teamWins + teamLosses)) * 100).toFixed(0) : 0
        }
      });
      
      setRecentMatches(matchdaysWithStats);
      
      console.log('✅ Performance stats calculated:', {
        einzel: `${einzelWins}-${einzelLosses}`,
        doppel: `${doppelWins}-${doppelLosses}`,
        team: `${teamWins}-${teamLosses}`,
        recentMatches: matchdaysWithStats.length
      });
      
    } catch (error) {
      console.error('❌ Error loading performance stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };
  
  // 🎯 SOCIAL FEATURES LADEN
  const loadSocialFeatures = async (targetPlayerId) => {
    if (!currentPlayer?.id) return;
    
    try {
      console.log('👥 Loading social features for:', targetPlayerId);
      
      // 1. Tennismates & Following Count
      const { data: followData } = await supabase
        .from('player_followers')
        .select('id, follower_id, following_id, is_mutual')
        .or(`follower_id.eq.${targetPlayerId},following_id.eq.${targetPlayerId}`);
      
      const tennismates = followData?.filter(f => f.following_id === targetPlayerId) || [];
      const following = followData?.filter(f => f.follower_id === targetPlayerId) || [];
      
      setTennismateCount(tennismates.length);
      setFollowingCount(following.length);
      
      // 2. Check if current user follows target player
      const isCurrentUserFollowing = tennismates.some(f => f.follower_id === currentPlayer.id);
      setIsFollowing(isCurrentUserFollowing);
      
      // 3. Check if mutual
      const mutualFollow = followData?.find(
        f => f.follower_id === currentPlayer.id && 
             f.following_id === targetPlayerId && 
             f.is_mutual === true
      );
      setIsMutual(!!mutualFollow);
      
      // 4. Check if blocked
      const { data: blockData } = await supabase
        .from('player_blocks')
        .select('id')
        .or(`and(blocker_id.eq.${currentPlayer.id},blocked_id.eq.${targetPlayerId}),and(blocker_id.eq.${targetPlayerId},blocked_id.eq.${currentPlayer.id})`)
        .limit(1);
      
      setIsBlocked(blockData && blockData.length > 0);
      
      console.log('✅ Social features loaded:', {
        tennismates: tennismates.length,
        following: following.length,
        isFollowing: isCurrentUserFollowing,
        isMutual: !!mutualFollow,
        isBlocked: blockData && blockData.length > 0
      });
      
    } catch (error) {
      console.error('❌ Error loading social features:', error);
    }
  };
  
  // 🎯 FOLLOW/UNFOLLOW HANDLER
  const handleFollowToggle = async () => {
    if (!currentPlayer?.id || !player?.id || socialLoading) return;
    
    setSocialLoading(true);
    
    try {
      if (isFollowing) {
        // UNFOLLOW
        const { error } = await supabase
          .from('player_followers')
          .delete()
          .eq('follower_id', currentPlayer.id)
          .eq('following_id', player.id);
        
        if (error) throw error;
        
        setIsFollowing(false);
        setIsMutual(false);
        setTennismateCount(prev => Math.max(0, prev - 1));
        console.log('✅ Unfollowed:', player.name);
        
      } else {
        // FOLLOW
        const { error } = await supabase
          .from('player_followers')
          .insert({
            follower_id: currentPlayer.id,
            following_id: player.id
          });
        
        if (error) throw error;
        
        setIsFollowing(true);
        setTennismateCount(prev => prev + 1);
        console.log('✅ Followed:', player.name);
        
        // Reload um mutual zu checken
        setTimeout(() => loadSocialFeatures(player.id), 500);
      }
      
    } catch (error) {
      console.error('❌ Error toggling follow:', error);
      alert('Fehler beim Folgen/Entfolgen. Bitte versuche es erneut.');
    } finally {
      setSocialLoading(false);
    }
  };
  
  // 🎯 BLOCK HANDLER
  const handleBlock = async () => {
    if (!currentPlayer?.id || !player?.id || socialLoading) return;
    
    const confirmed = window.confirm(
      `Möchtest du ${player.name} wirklich blockieren?\n\n` +
      `Blockierte Spieler können:\n` +
      `• Dir nicht mehr folgen\n` +
      `• Dein Profil nicht mehr sehen (falls du es auf "Privat" stellst)\n\n` +
      `Bestehende Follows werden automatisch entfernt.`
    );
    
    if (!confirmed) return;
    
    setSocialLoading(true);
    
    try {
      const { error } = await supabase
        .from('player_blocks')
        .insert({
          blocker_id: currentPlayer.id,
          blocked_id: player.id,
          reason: 'User-initiated block'
        });
      
      if (error) throw error;
      
      setIsBlocked(true);
      setIsFollowing(false);
      setIsMutual(false);
      console.log('✅ Blocked:', player.name);
      alert(`${player.name} wurde blockiert.`);
      
    } catch (error) {
      console.error('❌ Error blocking user:', error);
      alert('Fehler beim Blockieren. Bitte versuche es erneut.');
    } finally {
      setSocialLoading(false);
    }
  };
  
  // 🎯 UNBLOCK HANDLER
  const handleUnblock = async () => {
    if (!currentPlayer?.id || !player?.id || socialLoading) return;
    
    const confirmed = window.confirm(
      `Möchtest du ${player.name} entblocken?\n\n` +
      `Nach dem Entblocken kann dieser Spieler dir wieder folgen.`
    );
    
    if (!confirmed) return;
    
    setSocialLoading(true);
    
    try {
      const { error } = await supabase
        .from('player_blocks')
        .delete()
        .eq('blocker_id', currentPlayer.id)
        .eq('blocked_id', player.id);
      
      if (error) throw error;
      
      setIsBlocked(false);
      console.log('✅ Unblocked:', player.name);
      alert(`${player.name} wurde entblockt.`);
      
    } catch (error) {
      console.error('❌ Error unblocking user:', error);
      alert('Fehler beim Entblocken. Bitte versuche es erneut.');
    } finally {
      setSocialLoading(false);
    }
  };

  // Lade Vereins- und Mannschafts-Daten für den Spieler
  const loadPlayerTeamsAndClubs = async (playerId) => {
    try {
      console.log('🔍 Loading teams and clubs for player:', playerId);
      
      // Lade Player-Teams mit Team-Info
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
            tvm_link,
            club_id
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
      
      // Transformiere die Daten (OHNE team_seasons - wie vorher!)
      // ✅ Filtere ungültige Memberships (team_id = NULL)
      const teams = teamsData
        .filter(pt => pt.team_info && pt.team_info.id)  // ✅ Nur wenn team_info existiert
        .map(pt => ({
          ...pt.team_info,
          is_primary: pt.is_primary,
          role: pt.role,
          team_membership_id: pt.id
        }));
      
      setPlayerTeams(teams);

      // Extrahiere einzigartige Vereine (filtere leere club_names)
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
      
      // ⚠️ Warning für Teams ohne club_name
      const teamsWithoutClub = teams.filter(team => !team.club_name || team.club_name.trim() === '');
      if (teamsWithoutClub.length > 0) {
        console.warn('⚠️ TEAMS OHNE CLUB_NAME:', teamsWithoutClub);
      }

      setClubs(uniqueClubs);
      console.log('✅ Clubs extracted:', uniqueClubs);
      
      // ✅ Lade anstehende Spiele für die Teams des Spielers
      if (teams.length > 0) {
        loadUpcomingMatches(teams.map(t => t.id));
      }
    } catch (error) {
      console.error('❌ Error loading teams and clubs:', error);
    }
  };
  
  // ✅ NEU: Lade anstehende Spiele für die Teams des Spielers
  const loadUpcomingMatches = async (teamIds) => {
    if (!teamIds || teamIds.length === 0) {
      setUpcomingMatches([]);
      return;
    }
    
    setLoadingUpcomingMatches(true);
    
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Lade sowohl zukünftige als auch vergangene Spiele (letzte 30 Tage)
      const { data: matchdays, error } = await supabase
        .from('matchdays')
        .select(`
          id,
          match_date,
          start_time,
          status,
          group_name,
          season,
          league,
          match_number,
          home_team_id,
          away_team_id,
          home_team:home_team_id(id, club_name, team_name, category),
          away_team:away_team_id(id, club_name, team_name, category),
          match_availability(
            id,
            player_id,
            status,
            comment
          )
        `)
        .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
        .gte('match_date', thirtyDaysAgo.toISOString().split('T')[0])
        .not('status', 'in', '("cancelled", "postponed")')
        .order('match_date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (error) {
        console.error('❌ Fehler beim Laden der Spiele:', error);
        setUpcomingMatches([]);
        return;
      }
      
      // Filtere abgesagte/verschobene Spiele aus
      const matches = (matchdays || []).filter(m => 
        m.status !== 'cancelled' && m.status !== 'postponed'
      );
      
      // Lade Match-Ergebnisse für diese Matchdays
      const matchdayIds = matches.map(m => m.id);
      let matchResultsMap = {};
      
      if (matchdayIds.length > 0) {
        const { data: allResults } = await supabase
          .from('match_results')
          .select('*')
          .in('matchday_id', matchdayIds);
        
        // Gruppiere Ergebnisse nach matchday_id
        (allResults || []).forEach(result => {
          if (!matchResultsMap[result.matchday_id]) {
            matchResultsMap[result.matchday_id] = [];
          }
          matchResultsMap[result.matchday_id].push(result);
        });
      }
      
      // Füge Ergebnisse zu jedem Matchday hinzu
      const matchesWithResults = matches.map(m => ({
        ...m,
        results: matchResultsMap[m.id] || [],
        hasResults: (matchResultsMap[m.id] || []).length > 0
      }));
      
      console.log('✅ Spiele geladen (zukünftige + vergangene):', matchesWithResults.length);
      setUpcomingMatches(matchesWithResults);
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der Spiele:', error);
      setUpcomingMatches([]);
    } finally {
      setLoadingUpcomingMatches(false);
    }
  };

  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return '';
    // Entferne alle Zeichen außer Zahlen
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    // Füge deutsche Vorwahl hinzu falls nicht vorhanden
    if (cleanPhone.startsWith('0')) {
      return '+49' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('+')) {
      return '+49' + cleanPhone;
    }
    return '+' + cleanPhone;
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
        .delete()
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

  if (loading) {
    return (
      <div className="dashboard container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Lade Spieler-Profil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard container">
        <div className="error-state">
          <div className="error-icon">😔</div>
          <h2>Spieler nicht gefunden</h2>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/matches')}
            className="btn btn-primary"
          >
            <ArrowLeft size={18} />
            Zurück zu den Matches
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard container">
      {/* Kopfbereich im Dashboard-Stil */}
      <div className="fade-in" style={{ marginBottom: '1rem', paddingTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            padding: '0.5rem 1rem',
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#1f2937',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.borderColor = '#e5e7eb';
          }}
        >
          <ArrowLeft size={18} />
          Zurück
        </button>
        <h1 className="hi" style={{ margin: 0 }}>{player?.name || 'Spieler-Profil'}</h1>
      </div>
      
      {/* ✅ NEU: 1. PERSÖNLICHE PERFORMANCE (WICHTIGER!) */}
      {!loadingStats && performanceStats && (
        <div className="fade-in" style={{ marginBottom: '1.5rem' }}>
          <div className="lk-card-full">
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              padding: '1.5rem',
              borderRadius: '12px 12px 0 0',
              color: 'white'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'white' }}>
                👤 Persönliche Performance
              </h2>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
                Deine Einzel- und Doppel-Ergebnisse
              </p>
            </div>
            
            <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0 0 12px 12px' }}>
              {/* LK */}
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '1.5rem 2rem',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: '3px solid #3b82f6',
                  borderRadius: '16px'
                }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#2563eb' }}>
                    {player.current_lk || 'LK ?'}
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e40af', marginTop: '0.5rem' }}>
                    AKTUELLE LEISTUNGSKLASSE
                  </div>
                  
                  {/* ✅ LK-Veränderung */}
                  {player.season_start_lk && player.current_lk && (() => {
                    const startLK = parseFloat((player.season_start_lk || '').replace('LK ', '').replace(',', '.'));
                    const currentLK = parseFloat((player.current_lk || '').replace('LK ', '').replace(',', '.'));
                    const diff = currentLK - startLK;
                    
                    if (Math.abs(diff) < 0.1) return null; // Keine Änderung
                    
                    return (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '0.5rem 1rem',
                        background: diff < 0 ? '#ecfdf5' : '#fee2e2',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: diff < 0 ? '#047857' : '#991b1b'
                      }}>
                        {diff < 0 ? '📈 Verbessert:' : '📉 Verschlechtert:'} {diff > 0 ? '+' : ''}{diff.toFixed(1)} seit Saison-Start
                      </div>
                    );
                  })()}
                </div>
                
                {/* Saison-Start LK */}
                {player.season_start_lk && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.75rem' }}>
                    📅 Saison-Start: {player.season_start_lk}
                  </div>
                )}
                
                {/* Datum der ersten LK-Erhebung */}
                {firstLKDate && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    📊 Daten werden seit {new Date(firstLKDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} erhoben
                  </div>
                )}
              </div>
              
              {/* Einzel Stats */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>
                    👤 Einzel
                  </h3>
                  {performanceStats.personal.einzel.total > 0 && (
                    <button
                      onClick={() => setExpandedPersonalSection(expandedPersonalSection === 'Einzel' ? null : 'Einzel')}
                      style={{
                        padding: '0.375rem 0.75rem',
                        background: expandedPersonalSection === 'Einzel' ? '#eff6ff' : 'transparent',
                        border: '1px solid #3b82f6',
                        borderRadius: '6px',
                        color: '#3b82f6',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {expandedPersonalSection === 'Einzel' ? '▼ Ausblenden' : '▶ Details anzeigen'}
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' }}>
                  <div style={{
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                    border: '2px solid #10b981',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                      {performanceStats.personal.einzel.wins}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#047857' }}>SIEGE</div>
                  </div>
                  <div style={{
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    border: '2px solid #ef4444',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
                      {performanceStats.personal.einzel.losses}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#991b1b' }}>NIEDERLAGEN</div>
                  </div>
                  <div style={{
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: '2px solid #f59e0b',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#d97706' }}>
                      {performanceStats.personal.einzel.winRate}%
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#92400e' }}>QUOTE</div>
                  </div>
                </div>
                
                {/* ✅ Accordion: Einzel Details */}
                {expandedPersonalSection === 'Einzel' && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}>
                    {allPlayerResults
                      .filter(r => r.match_type === 'Einzel')
                      .sort((a, b) => {
                        const dateA = a.matchday?.match_date ? new Date(a.matchday.match_date) : new Date(0);
                        const dateB = b.matchday?.match_date ? new Date(b.matchday.match_date) : new Date(0);
                        return dateB - dateA; // Neueste zuerst
                      })
                      .map((result, idx) => {
                        const isInHomeTeam = 
                          result.home_player_id === player?.id ||
                          result.home_player1_id === player?.id ||
                          result.home_player2_id === player?.id;
                        
                        const didWin = isInHomeTeam 
                          ? result.winner === 'home'
                          : result.winner === 'guest';
                        
                        // Lade Gegner-Daten
                        let opponentName = 'Unbekannt';
                        let opponentLK = null;
                        
                        const opponentId = isInHomeTeam ? result.guest_player_id : result.home_player_id;
                        const oppData = opponentId ? playerDataMap[opponentId] : null;
                        if (oppData) {
                          opponentName = oppData.name;
                          opponentLK = oppData.current_lk || oppData.season_start_lk;
                        }
                        
                        const matchDate = result.matchday?.match_date 
                          ? new Date(result.matchday.match_date).toLocaleDateString('de-DE', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric' 
                            })
                          : 'Unbekannt';
                        
                        const opponent = isInHomeTeam 
                          ? result.matchday?.away_team 
                          : result.matchday?.home_team;
                        
                        const opponentLabel = opponent 
                          ? `${opponent.club_name} ${opponent.team_name || ''} (${opponent.category})`.trim()
                          : 'Unbekannt';
                        
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '0.75rem',
                              background: didWin ? '#ecfdf5' : '#fee2e2',
                              border: `2px solid ${didWin ? '#10b981' : '#ef4444'}`,
                              borderRadius: '8px',
                              marginBottom: '0.5rem'
                            }}
                          >
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                              {opponentLabel}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                              📅 {matchDate} • vs. <strong>{opponentName}</strong> {opponentLK && `(LK ${opponentLK})`}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                background: 'white',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: didWin ? '#059669' : '#dc2626'
                              }}>
                                {didWin ? '✅ Sieg' : '❌ Niederlage'}
                              </span>
                              {result.set1_home !== null && result.set1_guest !== null && (
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'white',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  color: '#1f2937'
                                }}>
                                  {isInHomeTeam ? `${result.set1_home}:${result.set1_guest}` : `${result.set1_guest}:${result.set1_home}`}
                                </span>
                              )}
                              {result.set2_home !== null && result.set2_guest !== null && (
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'white',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  color: '#1f2937'
                                }}>
                                  {isInHomeTeam ? `${result.set2_home}:${result.set2_guest}` : `${result.set2_guest}:${result.set2_home}`}
                                </span>
                              )}
                              {result.set3_home !== null && result.set3_guest !== null && (
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'white',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  color: '#1f2937'
                                }}>
                                  {isInHomeTeam ? `${result.set3_home}:${result.set3_guest}` : `${result.set3_guest}:${result.set3_home}`}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    
                    {allPlayerResults.filter(r => r.match_type === 'Einzel').length === 0 && (
                      <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
                        Keine Einzel-Matches gefunden.
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Doppel Stats */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>
                    👥 Doppel
                  </h3>
                  {performanceStats.personal.doppel.total > 0 && (
                    <button
                      onClick={() => setExpandedPersonalSection(expandedPersonalSection === 'Doppel' ? null : 'Doppel')}
                      style={{
                        padding: '0.375rem 0.75rem',
                        background: expandedPersonalSection === 'Doppel' ? '#eff6ff' : 'transparent',
                        border: '1px solid #3b82f6',
                        borderRadius: '6px',
                        color: '#3b82f6',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {expandedPersonalSection === 'Doppel' ? '▼ Ausblenden' : '▶ Details anzeigen'}
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' }}>
                  <div style={{
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                    border: '2px solid #10b981',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                      {performanceStats.personal.doppel.wins}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#047857' }}>SIEGE</div>
                  </div>
                  <div style={{
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    border: '2px solid #ef4444',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
                      {performanceStats.personal.doppel.losses}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#991b1b' }}>NIEDERLAGEN</div>
                  </div>
                  <div style={{
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: '2px solid #f59e0b',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#d97706' }}>
                      {performanceStats.personal.doppel.winRate}%
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#92400e' }}>QUOTE</div>
                  </div>
                </div>
                
                {/* ✅ Accordion: Doppel Details */}
                {expandedPersonalSection === 'Doppel' && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}>
                    {allPlayerResults
                      .filter(r => r.match_type === 'Doppel')
                      .sort((a, b) => {
                        const dateA = a.matchday?.match_date ? new Date(a.matchday.match_date) : new Date(0);
                        const dateB = b.matchday?.match_date ? new Date(b.matchday.match_date) : new Date(0);
                        return dateB - dateA; // Neueste zuerst
                      })
                      .map((result, idx) => {
                        const isInHomeTeam = 
                          result.home_player_id === player?.id ||
                          result.home_player1_id === player?.id ||
                          result.home_player2_id === player?.id;
                        
                        const didWin = isInHomeTeam 
                          ? result.winner === 'home'
                          : result.winner === 'guest';
                        
                        // Lade Gegner-Daten
                        let opponentName = 'Unbekannt';
                        let opponentLK = null;
                        let partnerName = null;
                        let partnerLK = null;
                        
                        const opp1Id = isInHomeTeam ? result.guest_player1_id : result.home_player1_id;
                        const opp2Id = isInHomeTeam ? result.guest_player2_id : result.home_player2_id;
                        const opp1Data = opp1Id ? playerDataMap[opp1Id] : null;
                        const opp2Data = opp2Id ? playerDataMap[opp2Id] : null;
                        
                        if (opp1Data && opp2Data) {
                          opponentName = `${opp1Data.name} / ${opp2Data.name}`;
                          opponentLK = opp1Data.current_lk || opp1Data.season_start_lk;
                        } else if (opp1Data) {
                          opponentName = opp1Data.name;
                          opponentLK = opp1Data.current_lk || opp1Data.season_start_lk;
                        }
                        
                        // Partner
                        const partnerId = isInHomeTeam
                          ? (result.home_player1_id === player?.id ? result.home_player2_id : result.home_player1_id)
                          : (result.guest_player1_id === player?.id ? result.guest_player2_id : result.guest_player1_id);
                        const partnerData = partnerId ? playerDataMap[partnerId] : null;
                        if (partnerData) {
                          partnerName = partnerData.name;
                          partnerLK = partnerData.current_lk || partnerData.season_start_lk;
                        }
                        
                        const matchDate = result.matchday?.match_date 
                          ? new Date(result.matchday.match_date).toLocaleDateString('de-DE', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric' 
                            })
                          : 'Unbekannt';
                        
                        const opponent = isInHomeTeam 
                          ? result.matchday?.away_team 
                          : result.matchday?.home_team;
                        
                        const opponentLabel = opponent 
                          ? `${opponent.club_name} ${opponent.team_name || ''} (${opponent.category})`.trim()
                          : 'Unbekannt';
                        
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '0.75rem',
                              background: didWin ? '#ecfdf5' : '#fee2e2',
                              border: `2px solid ${didWin ? '#10b981' : '#ef4444'}`,
                              borderRadius: '8px',
                              marginBottom: '0.5rem'
                            }}
                          >
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                              {opponentLabel}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                              📅 {matchDate}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                              mit <strong>{partnerName || 'Partner'}</strong> {partnerLK && `(LK ${partnerLK})`} vs. <strong>{opponentName}</strong>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                background: 'white',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: didWin ? '#059669' : '#dc2626'
                              }}>
                                {didWin ? '✅ Sieg' : '❌ Niederlage'}
                              </span>
                              {result.set1_home !== null && result.set1_guest !== null && (
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'white',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  color: '#1f2937'
                                }}>
                                  {isInHomeTeam ? `${result.set1_home}:${result.set1_guest}` : `${result.set1_guest}:${result.set1_home}`}
                                </span>
                              )}
                              {result.set2_home !== null && result.set2_guest !== null && (
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'white',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  color: '#1f2937'
                                }}>
                                  {isInHomeTeam ? `${result.set2_home}:${result.set2_guest}` : `${result.set2_guest}:${result.set2_home}`}
                                </span>
                              )}
                              {result.set3_home !== null && result.set3_guest !== null && (
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'white',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  color: '#1f2937'
                                }}>
                                  {isInHomeTeam ? `${result.set3_home}:${result.set3_guest}` : `${result.set3_guest}:${result.set3_home}`}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    
                    {allPlayerResults.filter(r => r.match_type === 'Doppel').length === 0 && (
                      <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
                        Keine Doppel-Matches gefunden.
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Gesamt Persönlich */}
              <div style={{
                padding: '1rem',
                background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
                    {performanceStats.personal.gesamt.total}
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280' }}>GESAMT SPIELE</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#059669' }}>
                    {performanceStats.personal.gesamt.wins}
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#047857' }}>SIEGE</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#dc2626' }}>
                    {performanceStats.personal.gesamt.losses}
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#991b1b' }}>NIEDERLAGEN</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#d97706' }}>
                    {performanceStats.personal.gesamt.winRate}%
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#92400e' }}>QUOTE</div>
                </div>
              </div>
              
              {/* Keine Einzel-Matches Hinweis */}
              {performanceStats.personal.gesamt.total === 0 && (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  marginTop: '1rem'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎾</div>
                  Noch keine persönlichen Spiele in dieser Saison
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* ✅ NEU: Anstehende Spiele + Vergangene ohne vollständige Ergebnisse */}
      {!loadingUpcomingMatches && upcomingMatches.length > 0 && (
        <div className="fade-in" style={{ marginBottom: '1.5rem' }}>
          <div className="lk-card-full">
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              padding: '1.5rem',
              borderRadius: '12px 12px 0 0',
              color: 'white'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'white' }}>
                📅 Spiele
              </h2>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
                {upcomingMatches.length} {upcomingMatches.length === 1 ? 'Spiel' : 'Spiele'} (zukünftige + vergangene ohne vollständige Ergebnisse)
              </p>
            </div>
            
            <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0 0 12px 12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {upcomingMatches.map((match) => {
                  const isHomeTeam = playerTeams.some(t => t.id === match.home_team_id);
                  const playerTeam = isHomeTeam ? match.home_team : match.away_team;
                  const opponentTeam = isHomeTeam ? match.away_team : match.home_team;
                  
                  const matchDate = new Date(match.match_date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const matchDateOnly = new Date(matchDate);
                  matchDateOnly.setHours(0, 0, 0, 0);
                  const daysUntilMatch = Math.ceil((matchDateOnly - today) / (1000 * 60 * 60 * 24));
                  const isPast = daysUntilMatch < 0;
                  
                  // Prüfe Zu-/Absage des Spielers
                  const playerAvailability = match.match_availability?.find(
                    a => a.player_id === player?.id
                  );
                  
                  const opponentLabel = opponentTeam 
                    ? `${opponentTeam.club_name}${opponentTeam.team_name ? ` ${opponentTeam.team_name}` : ''}`.trim()
                    : 'Unbekannt';
                  
                  const teamLabel = playerTeam
                    ? `${playerTeam.club_name}${playerTeam.team_name ? ` ${playerTeam.team_name}` : ''}`.trim()
                    : 'Unbekannt';
                  
                  // Lade Spieler-Daten für Match-Ergebnisse
                  const playerResults = (match.results || []).filter(r => 
                    r.home_player_id === player?.id ||
                    r.home_player1_id === player?.id ||
                    r.home_player2_id === player?.id ||
                    r.guest_player_id === player?.id ||
                    r.guest_player1_id === player?.id ||
                    r.guest_player2_id === player?.id
                  );
                  
                  return (
                    <div
                      key={match.id}
                      style={{
                        padding: '1rem',
                        background: isPast ? '#fef3c7' : (daysUntilMatch <= 7 ? '#fef3c7' : '#f0fdf4'),
                        border: `2px solid ${isPast ? '#f59e0b' : (daysUntilMatch <= 7 ? '#f59e0b' : '#10b981')}`,
                        borderRadius: '8px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                            {teamLabel} vs. {opponentLabel}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                            📅 {matchDate.toLocaleDateString('de-DE', { 
                              weekday: 'long', 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric' 
                            })}
                            {match.start_time && ` · ${match.start_time} Uhr`}
                          </div>
                          {(match.group_name || match.league || playerTeam?.category) && (
                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                              {playerTeam?.category && <span style={{ color: '#3b82f6', fontWeight: '600' }}>{playerTeam.category}</span>}
                              {playerTeam?.category && (match.group_name || match.league) && <span style={{ margin: '0 0.25rem' }}>·</span>}
                              {match.group_name && <span style={{ color: '#10b981', fontWeight: '600' }}>{match.group_name}</span>}
                              {match.group_name && match.league && <span style={{ margin: '0 0.25rem' }}>·</span>}
                              {match.league && <span>{match.league}</span>}
                            </div>
                          )}
                          
                          {/* ✅ NEU: Zeige Match-Ergebnisse für vergangene Spiele */}
                          {isPast && playerResults.length > 0 && (
                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.7)', borderRadius: '6px', fontSize: '0.75rem' }}>
                              <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#1f2937' }}>Deine Ergebnisse:</div>
                              {playerResults.map((result, idx) => {
                                const isInHomeTeam = result.home_player_id === player?.id || result.home_player1_id === player?.id || result.home_player2_id === player?.id;
                                const didWin = isInHomeTeam ? result.winner === 'home' : result.winner === 'guest';
                                const scoreDisplay = result.set1_home != null && result.set1_guest != null
                                  ? `${result.set1_home}:${result.set1_guest}${result.set2_home != null && result.set2_guest != null ? `, ${result.set2_home}:${result.set2_guest}` : ''}${result.set3_home != null && result.set3_guest != null ? `, ${result.set3_home}:${result.set3_guest}` : ''}`
                                  : 'Kein Ergebnis';
                                
                                return (
                                  <div key={idx} style={{ marginBottom: '0.25rem', color: '#4b5563' }}>
                                    <span style={{ fontWeight: '600' }}>Match {result.match_number}</span> ({result.match_type}): {scoreDisplay} {didWin ? '✅' : result.winner ? '❌' : '⏳'}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                          {daysUntilMatch === 0 && !isPast && (
                            <>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                background: '#fef3c7',
                                border: '1px solid #f59e0b',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                color: '#92400e'
                              }}>
                                HEUTE
                              </span>
                              <button
                                onClick={() => navigate(`/live-results/${match.id}`)}
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  color: 'white',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                📊 Live-Ergebnisse
                              </button>
                            </>
                          )}
                          {/* ✅ NEU: Link zu Spieltag-Ergebnissen für vergangene Spiele */}
                          {isPast && (
                            <button
                              onClick={() => navigate(`/ergebnisse/${match.id}`)}
                              style={{
                                padding: '0.5rem 0.75rem',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              📊 Ergebnisse anzeigen
                            </button>
                          )}
                          {daysUntilMatch === 1 && (
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              background: '#fef3c7',
                              border: '1px solid #f59e0b',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              color: '#92400e'
                            }}>
                              MORGEN
                            </span>
                          )}
                          {daysUntilMatch > 1 && daysUntilMatch <= 7 && (
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              background: '#fef3c7',
                              border: '1px solid #f59e0b',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              color: '#92400e'
                            }}>
                              in {daysUntilMatch} Tagen
                            </span>
                          )}
                          {daysUntilMatch > 7 && (
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              background: '#d1fae5',
                              border: '1px solid #10b981',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              color: '#065f46'
                            }}>
                              in {daysUntilMatch} Tagen
                            </span>
                          )}
                          {playerAvailability && (
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              background: playerAvailability.status === 'available' ? '#d1fae5' : 
                                         playerAvailability.status === 'unavailable' ? '#fee2e2' : '#fef3c7',
                              border: `1px solid ${playerAvailability.status === 'available' ? '#10b981' : 
                                       playerAvailability.status === 'unavailable' ? '#ef4444' : '#f59e0b'}`,
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              color: playerAvailability.status === 'available' ? '#065f46' : 
                                     playerAvailability.status === 'unavailable' ? '#991b1b' : '#92400e'
                            }}>
                              {playerAvailability.status === 'available' ? '✅ Zusage' : 
                               playerAvailability.status === 'unavailable' ? '❌ Absage' : '❓ Unklar'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ✅ NEU: 2. MANNSCHAFTS-PERFORMANCE */}
      {!loadingStats && performanceStats && performanceStats.team.total > 0 && (
        <div className="fade-in" style={{ marginBottom: '1.5rem' }}>
          <div className="lk-card-full">
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              padding: '1.5rem',
              borderRadius: '12px 12px 0 0',
              color: 'white'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'white' }}>
                👥 Mannschafts-Bilanz
              </h2>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
                Team-Ergebnisse der letzten Medenspiele
              </p>
            </div>
            
            <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0 0 12px 12px' }}>
              {/* Team Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                  border: '2px solid #10b981',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#059669' }}>
                    {performanceStats.team.wins}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#047857', marginTop: '0.25rem' }}>
                    TEAM-SIEGE
                  </div>
                </div>
                
                <div style={{
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                  border: '2px solid #ef4444',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#dc2626' }}>
                    {performanceStats.team.losses}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#991b1b', marginTop: '0.25rem' }}>
                    TEAM-NIEDERLAGEN
                  </div>
                </div>
                
                <div style={{
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  border: '2px solid #f59e0b',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#d97706' }}>
                    {performanceStats.team.winRate}%
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#92400e', marginTop: '0.25rem' }}>
                    TEAM-QUOTE
                  </div>
                </div>
              </div>
              
              {/* Letzte Team-Matches */}
              {recentMatches.length > 0 && (
                <div>
                  <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>
                    🏆 Letzte {recentMatches.length} Medenspiele
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {recentMatches.map(match => {
                      const outcome = match.ourScore > match.oppScore ? 'win' : match.ourScore < match.oppScore ? 'loss' : 'draw';
                      
                      return (
                        <div
                          key={match.id}
                          onClick={() => navigate(`/ergebnisse/${match.id}`)}
                          style={{
                            padding: '0.75rem 1rem',
                            background: outcome === 'win' ? '#ecfdf5' : outcome === 'loss' ? '#fee2e2' : '#fef3c7',
                            border: `2px solid ${outcome === 'win' ? '#10b981' : outcome === 'loss' ? '#ef4444' : '#f59e0b'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.5rem'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                              {match.opponent}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                              {match.date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} • {match.location === 'Home' ? '🏠 Heim' : '✈️ Auswärts'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              padding: '0.25rem 0.75rem',
                              background: 'white',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              fontWeight: '700',
                              color: outcome === 'win' ? '#059669' : outcome === 'loss' ? '#dc2626' : '#d97706'
                            }}>
                              {match.ourScore}:{match.oppScore}
                            </div>
                            <div style={{ fontSize: '1.25rem' }}>
                              {outcome === 'win' ? '🎉' : outcome === 'loss' ? '😞' : '🤝'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero-Card mit Profilbild und Grundinfo */}
      <div className="fade-in lk-card-full">
        <div className="formkurve-header">
          <div className="formkurve-title">Spielerprofil</div>
          <div className="match-count-badge">
            {player.role === 'captain' ? '⭐ Captain' : '🎾 Spieler'}
          </div>
        </div>

        <div className="season-content">
          {/* Edit-Button (falls eigenes Profil) */}
          {isOwnProfile && (
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => navigate('/profile')}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Edit3 size={16} />
                Profil bearbeiten
              </button>
            </div>
          )}

          {/* Hero-Section */}
          <div className="profile-hero-modern">
            <div className="profile-image-large">
          {player.profile_image ? (
            <img 
              src={player.profile_image} 
              alt={`Profilbild von ${player.name}`}
              className="profile-image"
            />
          ) : (
                <div className="profile-image-placeholder-large">
              🎾
            </div>
          )}
        </div>
        
            <div className="profile-info-modern">
              <h2 className="player-name-large">{player.name}</h2>
              
              {/* LK-Badge */}
              <div className="player-lk-display">
                <span className="lk-chip">
                  {player.current_lk || player.season_start_lk || player.ranking || 'LK ?'}
                </span>
                {player.season_improvement !== null && player.season_improvement !== undefined && (
                  <span className={`improvement-badge-top ${player.season_improvement < -0.1 ? 'positive' : player.season_improvement > 0.1 ? 'negative' : 'neutral'}`}>
                    <span className="badge-icon">
                      {player.season_improvement < -0.1 ? '▼' : player.season_improvement > 0.1 ? '▲' : '■'}
                    </span>
                    <span className="badge-value">
                      {player.season_improvement > 0 ? '+' : ''}{player.season_improvement.toFixed(2)}
                    </span>
                  </span>
                )}
          </div>
          
              {/* Kontakt-Chips */}
              <div className="contact-chips">
            {player.phone && (
              <a 
                href={`https://wa.me/${formatPhoneForWhatsApp(player.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                    className="contact-chip whatsapp"
              >
                    <span className="chip-icon">📱</span>
                    <span className="chip-text">WhatsApp</span>
              </a>
            )}
            
            {player.email && (
              <a 
                href={`mailto:${player.email}`}
                    className="contact-chip email"
              >
                    <span className="chip-icon">📧</span>
                    <span className="chip-text">E-Mail</span>
              </a>
            )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🎯 KONTAKTAUFNAHME & SOCIAL CARD (nur für fremde Profile) */}
      {!isOwnProfile && (
        <div className="fade-in lk-card-full" style={{ marginTop: '1.5rem' }}>
          <div className="formkurve-header" style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            borderRadius: '12px 12px 0 0'
          }}>
            <div className="formkurve-title" style={{ color: 'white' }}>
              🤝 Vernetzung & Kontakt
            </div>
            <div className="match-count-badge" style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              {tennismateCount} Tennismates • {followingCount} folge ich
            </div>
          </div>
          
          <div className="season-content">
            {/* Status-Anzeige */}
            {isMutual && !isBlocked && (
              <div style={{
                padding: '1rem',
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                border: '2px solid #10b981',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <Heart size={24} style={{ color: '#10b981', fill: '#10b981' }} />
                <div>
                  <div style={{ fontWeight: '700', color: '#047857', fontSize: '1rem' }}>
                    🤝 Freunde
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#059669', marginTop: '0.25rem' }}>
                    Ihr folgt euch gegenseitig
                  </div>
                </div>
              </div>
            )}
            
            {isBlocked && (
              <div style={{
                padding: '1rem',
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                border: '2px solid #ef4444',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <Shield size={24} style={{ color: '#dc2626' }} />
                <div>
                  <div style={{ fontWeight: '700', color: '#dc2626', fontSize: '1rem' }}>
                    🚫 Blockiert
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#b91c1c', marginTop: '0.25rem' }}>
                    Du hast diesen Spieler blockiert
                  </div>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isBlocked ? '1fr' : '1fr 1fr',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              {!isBlocked ? (
                <>
                  {/* Follow/Unfollow Button */}
                  <button
                    onClick={handleFollowToggle}
                    disabled={socialLoading}
                    style={{
                      padding: '1rem 1.5rem',
                      background: isFollowing 
                        ? 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)' 
                        : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      color: isFollowing ? '#4b5563' : 'white',
                      border: isFollowing ? '2px solid #d1d5db' : '2px solid #6d28d9',
                      borderRadius: '12px',
                      cursor: socialLoading ? 'wait' : 'pointer',
                      fontSize: '1rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      transition: 'all 0.3s ease',
                      opacity: socialLoading ? 0.6 : 1
                    }}
                  >
                    {socialLoading ? (
                      <>⏳ Lädt...</>
                    ) : isFollowing ? (
                      <>
                        <UserMinus size={20} />
                        <span>Entfolgen</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={20} />
                        <span>Folgen</span>
                      </>
                    )}
                  </button>
                  
                  {/* Block Button */}
                  <button
                    onClick={handleBlock}
                    disabled={socialLoading}
                    style={{
                      padding: '1rem 1.5rem',
                      background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                      color: '#dc2626',
                      border: '2px solid #ef4444',
                      borderRadius: '12px',
                      cursor: socialLoading ? 'wait' : 'pointer',
                      fontSize: '1rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      transition: 'all 0.3s ease',
                      opacity: socialLoading ? 0.6 : 1
                    }}
                  >
                    {socialLoading ? (
                      <>⏳ Lädt...</>
                    ) : (
                      <>
                        <UserX size={20} />
                        <span>Blockieren</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                /* Unblock Button */
                <button
                  onClick={handleUnblock}
                  disabled={socialLoading}
                  style={{
                    padding: '1rem 1.5rem',
                    background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                    color: '#4b5563',
                    border: '2px solid #d1d5db',
                    borderRadius: '12px',
                    cursor: socialLoading ? 'wait' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    transition: 'all 0.3s ease',
                    opacity: socialLoading ? 0.6 : 1
                  }}
                >
                  {socialLoading ? (
                    <>⏳ Lädt...</>
                  ) : (
                    <>
                      <Shield size={20} />
                      <span>Blockierung aufheben</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            {/* Info-Text */}
            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              borderRadius: '12px',
              fontSize: '0.875rem',
              color: '#1e40af',
              lineHeight: '1.6'
            }}>
              <div style={{ fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bell size={16} />
                Warum folgen?
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                <li>Verfolge Match-Ergebnisse in Echtzeit</li>
                <li>Erhalte Benachrichtigungen bei wichtigen Spielen</li>
                <li>Siehe favorisierte Spieler in der Results-Seite</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Vereins-/Mannschafts-Zugehörigkeit Card */}
      {clubs.length > 0 && (
        <div className="fade-in lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">Vereins-/Mannschafts-Zugehörigkeit</div>
            <div className="match-count-badge">
              {clubs.length} {clubs.length === 1 ? 'Verein' : 'Vereine'}
            </div>
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
                      padding: '1rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: team.is_primary ? '#fef3c7' : '#f9fafb',
                      borderColor: team.is_primary ? '#f59e0b' : '#e5e7eb'
                    }}>
                      {/* Team Header */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        marginBottom: '0.75rem'
                      }}>
                        <div>
                          <h4 style={{ 
                            margin: 0, 
                            fontSize: '1rem',
                            fontWeight: '600',
                            color: '#1f2937'
                          }}>
                            {team.category || 'Unbekannt'} {team.team_name || '1'}. Mannschaft
                          </h4>
                          <p style={{ 
                            margin: '0.25rem 0 0 0', 
                            fontSize: '0.875rem',
                            color: '#6b7280'
                          }}>
                            {team.region || 'Mittelrhein'}
                          </p>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {team.is_primary && (
                            <span style={{
                              background: '#f59e0b',
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              Hauptmannschaft
                            </span>
                          )}
                          
                          <span style={{
                            background: team.role === 'captain' ? '#dc2626' : '#6b7280',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            {team.role === 'captain' ? '🎯 Captain' : '🎾 Spieler'}
                          </span>
                        </div>
                      </div>

                      {/* Team Details */}
                      <div className="team-details" style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                        {team.address && (
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <MapPin size={14} style={{ marginRight: '0.5rem' }} />
                            <span>{team.address}</span>
                          </div>
                        )}
                        
                        {team.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <Phone size={14} style={{ marginRight: '0.5rem' }} />
                            <a href={`tel:${team.phone}`} style={{ color: '#3b82f6' }}>
                              {team.phone}
                            </a>
                          </div>
                        )}
                        
                        {team.email && (
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <Mail size={14} style={{ marginRight: '0.5rem' }} />
                            <a href={`mailto:${team.email}`} style={{ color: '#3b82f6' }}>
                              {team.email}
                            </a>
                          </div>
                        )}
                        
                        {team.website && (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Globe size={14} style={{ marginRight: '0.5rem' }} />
                            <a 
                              href={team.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ color: '#3b82f6' }}
                            >
                              Website besuchen
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Edit Buttons (nur für eigenes Profil) */}
                      {isOwnProfile && (
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
                              onClick={() => handleRemoveTeam(team.team_membership_id)}
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
      )}

      {/* Tennis-Persönlichkeit Card */}
      {(player.favorite_shot || player.tennis_motto || player.fun_fact || player.superstition || player.pre_match_routine) && (
        <div className="fade-in lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">Tennis-Persönlichkeit</div>
            <div className="match-count-badge">💭</div>
          </div>
          
          <div className="season-content">
            <div className="personality-grid">
            {player.favorite_shot && (
                <div className="personality-card">
                  <div className="personality-icon">🎯</div>
                  <div className="personality-content">
                    <h4>Lieblingsschlag</h4>
                  <p>{player.favorite_shot}</p>
                </div>
              </div>
            )}
            
            {player.tennis_motto && (
                <div className="personality-card">
                  <div className="personality-icon">💭</div>
                  <div className="personality-content">
                    <h4>Tennis-Motto</h4>
                  <p>"{player.tennis_motto}"</p>
                </div>
              </div>
            )}
            
            {player.fun_fact && (
                <div className="personality-card">
                  <div className="personality-icon">😄</div>
                  <div className="personality-content">
                    <h4>Lustiger Fakt</h4>
                  <p>{player.fun_fact}</p>
                </div>
              </div>
            )}
            
            {player.superstition && (
                <div className="personality-card">
                  <div className="personality-icon">🔮</div>
                  <div className="personality-content">
                    <h4>Tennis-Aberglaube</h4>
                  <p>{player.superstition}</p>
                </div>
              </div>
            )}
            
            {player.pre_match_routine && (
                <div className="personality-card">
                  <div className="personality-icon">⚡</div>
                  <div className="personality-content">
                    <h4>Pre-Match Routine</h4>
                  <p>{player.pre_match_routine}</p>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* Tennis-Momente Card */}
      {(player.best_tennis_memory || player.worst_tennis_memory || player.favorite_opponent || player.dream_match) && (
        <div className="fade-in lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">Tennis-Momente</div>
            <div className="match-count-badge">🏆</div>
          </div>
          
          <div className="season-content">
          <div className="moments-grid">
            {player.best_tennis_memory && (
              <div className="moment-card positive">
                <div className="moment-icon">🏆</div>
                <div className="moment-content">
                    <h4>Bester Moment</h4>
                  <p>{player.best_tennis_memory}</p>
                </div>
              </div>
            )}
            
            {player.worst_tennis_memory && (
              <div className="moment-card funny">
                <div className="moment-icon">😅</div>
                <div className="moment-content">
                    <h4>Peinlichster Moment</h4>
                  <p>{player.worst_tennis_memory}</p>
                </div>
              </div>
            )}
            
            {player.favorite_opponent && (
              <div className="moment-card neutral">
                <div className="moment-icon">🤝</div>
                <div className="moment-content">
                    <h4>Lieblingsgegner</h4>
                  <p>{player.favorite_opponent}</p>
                </div>
              </div>
            )}
            
            {player.dream_match && (
              <div className="moment-card dream">
                <div className="moment-icon">🌟</div>
                <div className="moment-content">
                    <h4>Traum-Match</h4>
                  <p>{player.dream_match}</p>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* Fallback für Spieler ohne erweiterte Daten */}
      {!player.favorite_shot && !player.tennis_motto && !player.fun_fact && (
        <div className="fade-in lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">🎭 Geheimnisvoller Tennis-Spieler</div>
            <div className="match-count-badge">ℹ️</div>
          </div>
          <div className="season-content">
            <p style={{ margin: 0, lineHeight: '1.6' }}>
              Dieser Spieler hüllt sich noch in Schweigen! 🕵️‍♂️ Frag ihn doch mal nach seinem Lieblingsschlag oder seinem Tennis-Motto - er wird sich freuen! 😄
            </p>
          </div>
        </div>
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

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setIsEditingTeams(false);
                  setEditingTeam(null);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
              
              <button
                onClick={() => handleSaveTeamChanges(editingTeam.team_membership_id, {
                  role: editingTeam.role,
                  is_primary: editingTeam.is_primary
                })}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modals entfernt - jetzt Accordion für persönliche Matches, Navigation für Team-Matches */}
      
    </div>
  );
}

export default PlayerProfileSimple;

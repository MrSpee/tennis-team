import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Trophy, Heart, Edit3, Building2, Users, MapPin, Phone, Mail, Globe } from 'lucide-react';
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
      
      // Erste versuche mit allen Feldern
      let { data, error } = await supabase
        .from('players_unified')
        .select('*')
        .eq('name', decodedName)
        .eq('is_active', true)
        .eq('player_type', 'app_user')
        .single();

      // Falls das fehlschlägt, versuche mit grundlegenden Feldern
      if (error) {
        console.log('🔄 Trying with basic fields...');
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
          .eq('is_active', true)
          .eq('player_type', 'app_user')
          .single();
        
        data = result.data;
        error = result.error;
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
        setIsOwnProfile(currentUser?.id === data.user_id);
        
        // ✅ Lade Performance-Statistiken
        loadPerformanceStats(data.id);
        
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
      
      // ✅ Hole ALLE Matchday-IDs wo Raoul gespielt hat
      const matchdayIds = [...new Set((results || []).map(r => r.matchday_id).filter(Boolean))];
      console.log('📋 Matchday IDs wo Raoul gespielt hat:', matchdayIds);
      
      // ✅ Lade ALLE Ergebnisse dieser Matchdays (für Team-Bilanz!)
      let allMatchdayResults = [];
      if (matchdayIds.length > 0) {
        const { data: fullResults, error: fullError } = await supabase
          .from('match_results')
          .select('*')
          .in('matchday_id', matchdayIds);
        
        if (!fullError) {
          allMatchdayResults = fullResults || [];
          console.log('✅ ALLE Ergebnisse geladen (für Team-Bilanz):', allMatchdayResults.length);
        }
      }
      
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
        const allResultsForThisMatch = allMatchdayResults.filter(r => r.matchday_id === m.matchday.id);
        
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
      
      // Transformiere die Daten
      const teams = teamsData.map(pt => ({
        ...pt.team_info,
        is_primary: pt.is_primary,
        role: pt.role,
        team_membership_id: pt.id
      }));
      
      setPlayerTeams(teams);

      // Extrahiere einzigartige Vereine
      const uniqueClubs = teams.reduce((acc, team) => {
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

    } catch (error) {
      console.error('❌ Error loading teams and clubs:', error);
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
              </div>
              
              {/* Einzel Stats */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>
                  👤 Einzel
                </h3>
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
              </div>
              
              {/* Doppel Stats */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>
                  👥 Doppel
                </h3>
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
                          onClick={() => navigate(`/results?match=${match.id}`)}
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
          {/* Navigation */}
          <div className="profile-header" style={{ marginBottom: '1rem' }}>
        <button 
          onClick={() => navigate(-1)}
          className="back-button"
        >
          <ArrowLeft size={20} />
          Zurück
        </button>
        
        {isOwnProfile && (
          <button 
            onClick={() => navigate('/profile')}
            className="edit-button"
          >
            Profil bearbeiten
          </button>
        )}
      </div>

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
                            {team.team_name || team.category}
                          </h4>
                          <p style={{ 
                            margin: '0.25rem 0 0 0', 
                            fontSize: '0.875rem',
                            color: '#6b7280'
                          }}>
                            {team.category} • {team.region}
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
    </div>
  );
}

export default PlayerProfileSimple;

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
        .from('players')
        .select('*')
        .eq('name', decodedName)
        .eq('is_active', true)
        .single();

      // Falls das fehlschlägt, versuche mit grundlegenden Feldern
      if (error) {
        console.log('🔄 Trying with basic fields...');
        const result = await supabase
          .from('players')
          .select(`
            id,
            name,
            email,
            phone,
            ranking,
            points,
            role,
            is_active,
            user_id,
            created_at,
            updated_at
          `)
          .eq('name', decodedName)
          .eq('is_active', true)
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

  // Lade Vereins- und Mannschafts-Daten für den Spieler
  const loadPlayerTeamsAndClubs = async (playerId) => {
    try {
      console.log('🔍 Loading teams and clubs for player:', playerId);
      
      // Lade Player-Teams mit Team-Info
      const { data: teamsData, error: teamsError } = await supabase
        .from('player_teams')
        .select(`
          *,
          team_info (
            id,
            team_name,
            club_name,
            category,
            region,
            tvm_link,
            address,
            contact,
            phone,
            email,
            website,
            logo_url
          )
        `)
        .eq('player_id', playerId)
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
        player_team_id: pt.id
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
      
      // Aktualisiere player_teams Tabelle
      const { error } = await supabase
        .from('player_teams')
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
        .from('player_teams')
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
      <div className="fade-in" style={{ marginBottom: '1rem', paddingTop: '0.5rem' }}>
        <h1 className="hi">{player?.name || 'Spieler-Profil'}</h1>
      </div>

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
                onClick={() => handleSaveTeamChanges(editingTeam.player_team_id, {
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

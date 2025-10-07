import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Calendar, MapPin, Trophy, Heart } from 'lucide-react';
import './PlayerProfile.css';
import './Dashboard.css';

function PlayerProfile() {
  const { playerName } = useParams();
  const navigate = useNavigate();
  const { currentUser, player: currentPlayer } = useAuth();
  
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    loadPlayerProfile();
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
      
      const { data, error } = await supabase
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
          updated_at,
          profile_image,
          favorite_shot,
          tennis_motto,
          fun_fact,
          worst_tennis_memory,
          best_tennis_memory,
          superstition,
          pre_match_routine,
          favorite_opponent,
          dream_match,
          birth_date,
          address,
          emergency_contact,
          emergency_phone,
          notes
        `)
        .eq('name', decodedName)
        .eq('is_active', true)
        .single();

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

  const formatDate = (dateString) => {
    if (!dateString) return 'Nicht angegeben';
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

      {/* Persönliche Informationen Card (nur für eigenes Profil) */}
      {isOwnProfile && (player.birth_date || player.address || player.emergency_contact || player.emergency_phone) && (
        <div className="fade-in lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">Persönliche Informationen</div>
            <div className="match-count-badge">🔒</div>
          </div>
          
          <div className="season-content">
            <div className="personal-info-grid">
              {player.birth_date && (
                <div className="personal-info-row">
                  <Calendar size={16} />
                  <span>Geburtsdatum: {formatDate(player.birth_date)}</span>
                </div>
              )}
              
              {player.address && (
                <div className="personal-info-row">
                  <MapPin size={16} />
                  <span>Adresse: {player.address}</span>
                </div>
              )}
              
              {player.emergency_contact && (
                <div className="personal-info-row">
                  <span>Notfallkontakt: {player.emergency_contact}</span>
                </div>
              )}
              
              {player.emergency_phone && (
                <div className="personal-info-row">
                  <span>Notfalltelefon: {player.emergency_phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

export default PlayerProfile;

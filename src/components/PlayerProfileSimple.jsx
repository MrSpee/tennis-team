import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Trophy, Heart } from 'lucide-react';
import './PlayerProfile.css';

function PlayerProfileSimple() {
  const { playerName } = useParams();
  const navigate = useNavigate();
  const { currentUser, player: currentPlayer } = useAuth();
  
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    // Warte bis currentUser geladen ist, bevor wir das Profil laden
    if (playerName && currentUser) {
      loadPlayerProfile();
    }
  }, [playerName, currentUser]);

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
      <div className="player-profile-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Lade Spieler-Profil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="player-profile-container">
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
    <div className="player-profile-container">
      {/* Header mit Navigation */}
      <div className="profile-header">
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

      {/* Profil-Header mit Bild und Grundinfo */}
      <div className="profile-hero">
        <div className="profile-image-container">
          {player.profile_image ? (
            <img 
              src={player.profile_image} 
              alt={`Profilbild von ${player.name}`}
              className="profile-image"
            />
          ) : (
            <div className="profile-image-placeholder">
              🎾
            </div>
          )}
        </div>
        
        <div className="profile-basic-info">
          <h1 className="player-name">{player.name}</h1>
          <div className="player-rank">
            <Trophy size={18} />
            <span>{player.ranking || 'Noch kein Ranking'}</span>
          </div>
          
          {/* Kontaktdaten */}
          <div className="contact-info">
            {player.phone && (
              <a 
                href={`https://wa.me/${formatPhoneForWhatsApp(player.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-item whatsapp"
              >
                <span className="contact-icon">📱</span>
                <span className="contact-text">WhatsApp</span>
              </a>
            )}
            
            {player.email && (
              <a 
                href={`mailto:${player.email}`}
                className="contact-item email"
              >
                <span className="contact-icon">📧</span>
                <span className="contact-text">E-Mail</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tennis-Persönlichkeit - nur wenn Daten vorhanden */}
      {(player.favorite_shot || player.tennis_motto || player.fun_fact || player.superstition || player.pre_match_routine) && (
        <section className="profile-section">
          <h2 className="section-title">
            <Heart size={20} />
            Tennis-Persönlichkeit
          </h2>
          
          <div className="info-grid">
            {player.favorite_shot && (
              <div className="info-card">
                <div className="info-icon">🎯</div>
                <div className="info-content">
                  <h3>Lieblingsschlag</h3>
                  <p>{player.favorite_shot}</p>
                </div>
              </div>
            )}
            
            {player.tennis_motto && (
              <div className="info-card">
                <div className="info-icon">💭</div>
                <div className="info-content">
                  <h3>Tennis-Motto</h3>
                  <p>"{player.tennis_motto}"</p>
                </div>
              </div>
            )}
            
            {player.fun_fact && (
              <div className="info-card">
                <div className="info-icon">😄</div>
                <div className="info-content">
                  <h3>Lustiger Fakt</h3>
                  <p>{player.fun_fact}</p>
                </div>
              </div>
            )}
            
            {player.superstition && (
              <div className="info-card">
                <div className="info-icon">🔮</div>
                <div className="info-content">
                  <h3>Tennis-Aberglaube</h3>
                  <p>{player.superstition}</p>
                </div>
              </div>
            )}
            
            {player.pre_match_routine && (
              <div className="info-card">
                <div className="info-icon">⚡</div>
                <div className="info-content">
                  <h3>Pre-Match Routine</h3>
                  <p>{player.pre_match_routine}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Tennis-Momente - nur wenn Daten vorhanden */}
      {(player.best_tennis_memory || player.worst_tennis_memory || player.favorite_opponent || player.dream_match) && (
        <section className="profile-section">
          <h2 className="section-title">
            <Trophy size={20} />
            Tennis-Momente
          </h2>
          
          <div className="moments-grid">
            {player.best_tennis_memory && (
              <div className="moment-card positive">
                <div className="moment-icon">🏆</div>
                <div className="moment-content">
                  <h3>Bester Moment</h3>
                  <p>{player.best_tennis_memory}</p>
                </div>
              </div>
            )}
            
            {player.worst_tennis_memory && (
              <div className="moment-card funny">
                <div className="moment-icon">😅</div>
                <div className="moment-content">
                  <h3>Peinlichster Moment</h3>
                  <p>{player.worst_tennis_memory}</p>
                </div>
              </div>
            )}
            
            {player.favorite_opponent && (
              <div className="moment-card neutral">
                <div className="moment-icon">🤝</div>
                <div className="moment-content">
                  <h3>Lieblingsgegner</h3>
                  <p>{player.favorite_opponent}</p>
                </div>
              </div>
            )}
            
            {player.dream_match && (
              <div className="moment-card dream">
                <div className="moment-icon">🌟</div>
                <div className="moment-content">
                  <h3>Traum-Match</h3>
                  <p>{player.dream_match}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Fallback für Spieler ohne erweiterte Daten */}
      {!player.favorite_shot && !player.tennis_motto && !player.fun_fact && (
        <section className="profile-section">
          <div className="info-card">
            <div className="info-icon">ℹ️</div>
            <div className="info-content">
              <h3>🎭 Geheimnisvoller Tennis-Spieler</h3>
              <p>Dieser Spieler hüllt sich noch in Schweigen! 🕵️‍♂️ Frag ihn doch mal nach seinem Lieblingsschlag oder seinem Tennis-Motto - er wird sich freuen! 😄</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default PlayerProfileSimple;

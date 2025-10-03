import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import './Profile.css';

function SimpleProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSetup = searchParams.get('setup') === 'true';
  const { currentUser, completeProfile } = useAuth();
  const { updatePlayerProfile, getPlayerProfile } = useData();
  
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    ranking: ''
  });

  const [isEditing, setIsEditing] = useState(isSetup);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Lade existierendes Profil
    if (currentUser?.id) {
      const existingProfile = getPlayerProfile(currentUser.id);
      if (existingProfile) {
        setProfile({
          name: existingProfile.name || '',
          phone: existingProfile.mobile || existingProfile.phone || '',
          ranking: existingProfile.ranking || ''
        });
      } else {
        // Initialisiere mit aktuellem Namen
        setProfile(prev => ({
          ...prev,
          name: currentUser?.name || ''
        }));
      }
    }
  }, [currentUser, getPlayerProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validierung: Name ist Pflicht
    if (!profile.name || profile.name.trim() === '') {
      alert('❌ Bitte Namen eingeben');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const profileToSave = {
        ...profile,
        userId: currentUser?.id,
        mobile: profile.phone // Für Kompatibilität
      };
      
      // Bei Setup: Complete Profile zuerst
      if (isSetup || !currentUser?.isProfileComplete) {
        completeProfile({ name: profile.name });
      }
      
      // Speichere vollständiges Profil
      updatePlayerProfile(profileToSave);
      
      setSuccessMessage('✅ Profil gespeichert!');
      setIsEditing(false);
      
      // Bei Setup: Nach kurzer Pause zum Dashboard
      if (isSetup) {
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        // Sonst: Erfolgsmeldung nach 3 Sekunden ausblenden
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('❌ Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Daten zurücksetzen
    const existingProfile = getPlayerProfile(currentUser?.id);
    if (existingProfile) {
      setProfile({
        name: existingProfile.name || '',
        phone: existingProfile.mobile || existingProfile.phone || '',
        ranking: existingProfile.ranking || ''
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="profile-container">
      {isSetup && (
        <div className="welcome-message">
          <h2>🎉 Willkommen!</h2>
          <p>Vervollständige dein Profil</p>
        </div>
      )}
      
      <div className="profile-header">
        <h1>👤 {isSetup ? 'Profil einrichten' : 'Mein Profil'}</h1>
        {!isEditing && !isSetup && (
          <button 
            className="btn-edit"
            onClick={() => setIsEditing(true)}
          >
            ✏️ Bearbeiten
          </button>
        )}
      </div>

      {successMessage && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '8px',
          color: '#155724',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="profile-form">
        {/* Einfaches Profil - nur 3 Felder */}
        <section className="profile-section">
          <h2>📋 Deine Daten</h2>
          
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={profile.name}
              onChange={handleInputChange}
              disabled={!isEditing}
              required
              placeholder="Max Mustermann"
              style={{
                fontSize: '1.1rem',
                padding: '0.75rem'
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Telefon</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={profile.phone}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="+49 123 456789"
              style={{
                fontSize: '1rem',
                padding: '0.75rem'
              }}
            />
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              📱 Für Benachrichtigungen (optional)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="ranking">LK-Ranking</label>
            <input
              type="text"
              id="ranking"
              name="ranking"
              value={profile.ranking}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="z.B. LK 10"
              style={{
                fontSize: '1rem',
                padding: '0.75rem'
              }}
            />
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              🏆 Deine Leistungsklasse (optional)
            </small>
          </div>
        </section>

        {isEditing && (
          <div className="form-actions" style={{
            display: 'flex',
            gap: '1rem',
            marginTop: '2rem'
          }}>
            {!isSetup && (
              <button 
                type="button" 
                className="btn-cancel"
                onClick={handleCancel}
                disabled={isSaving}
                style={{
                  flex: 1,
                  padding: '1rem',
                  fontSize: '1rem',
                  backgroundColor: '#f0f0f0',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
            )}
            <button 
              type="submit" 
              className="btn-save"
              disabled={isSaving}
              style={{
                flex: 1,
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                backgroundColor: '#2ecc71',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {isSaving ? '⏳ Speichert...' : '💾 Speichern'}
            </button>
          </div>
        )}
      </form>

      {/* Hinweis */}
      {!isEditing && (
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          fontSize: '0.9rem',
          color: '#666'
        }}>
          <p><strong>💡 Tipp:</strong></p>
          <p>Deine Telefonnummer wird nur für Team-Benachrichtigungen verwendet und ist nicht öffentlich sichtbar.</p>
        </div>
      )}
    </div>
  );
}

export default SimpleProfile;


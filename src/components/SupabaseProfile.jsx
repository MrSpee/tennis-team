import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import './Profile.css';

function SupabaseProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSetup = searchParams.get('setup') === 'true';
  const { currentUser, player, updateProfile, loading: authLoading } = useAuth();
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    birthDate: '',
    ranking: '',
    emergencyContact: '',
    emergencyPhone: '',
    notes: ''
  });

  const [isEditing, setIsEditing] = useState(isSetup);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Lade Player-Daten aus Supabase
    if (player) {
      console.log('🔵 Loading player data:', player);
      setProfile({
        name: player.name || '',
        email: player.email || currentUser?.email || '',
        phone: player.phone || '',
        mobile: player.phone || '', // Alias
        address: '',
        birthDate: '',
        ranking: player.ranking || '',
        emergencyContact: '',
        emergencyPhone: '',
        notes: ''
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
  }, [player, currentUser, authLoading]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validierung
    if (!profile.name || profile.name.trim() === '') {
      setErrorMessage('❌ Bitte geben Sie Ihren Namen ein');
      return;
    }
    
    setIsSaving(true);
    setErrorMessage('');
    
    try {
      console.log('💾 Saving profile to Supabase:', profile);
      
      // Profil in Supabase speichern
      const result = await updateProfile({
        name: profile.name,
        phone: profile.phone || profile.mobile,
        ranking: profile.ranking,
        email: profile.email
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Speichern');
      }
      
      console.log('✅ Profile saved successfully');
      
      setSuccessMessage('✅ Profil erfolgreich gespeichert!');
      setIsEditing(false);
      
      // Bei Setup zum Dashboard weiterleiten
      if (isSetup) {
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      setErrorMessage(`❌ Fehler beim Speichern: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Daten zurücksetzen
    if (player) {
      setProfile({
        name: player.name || '',
        email: player.email || currentUser?.email || '',
        phone: player.phone || '',
        mobile: player.phone || '',
        address: '',
        birthDate: '',
        ranking: player.ranking || '',
        emergencyContact: '',
        emergencyPhone: '',
        notes: ''
      });
    }
    setIsEditing(false);
    setErrorMessage('');
  };

  if (authLoading) {
    return (
      <div className="profile-container">
        <div className="loading">⏳ Lade Profil...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {isSetup && (
        <div className="welcome-message">
          <h2>🎉 Willkommen!</h2>
          <p>Bitte vervollständigen Sie Ihr Profil, um fortzufahren.</p>
          <p className="hint-text">📝 Mindestens Ihr <strong>Name</strong> ist erforderlich.</p>
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
        <div className="success-message" style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '8px',
          color: '#155724'
        }}>
          {successMessage}
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

      <form onSubmit={handleSubmit} className="profile-form">
        {/* Persönliche Informationen */}
        <section className="profile-section">
          <h2>📋 Persönliche Informationen</h2>
          
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
              placeholder="Vor- und Nachname"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">E-Mail</label>
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
            <label htmlFor="ranking">LK-Ranking</label>
            <input
              type="text"
              id="ranking"
              name="ranking"
              value={profile.ranking}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="z.B. LK 10"
            />
          </div>
        </section>

        {/* Kontaktdaten */}
        <section className="profile-section">
          <h2>📞 Kontaktdaten</h2>
          
          <div className="form-group">
            <label htmlFor="mobile">Mobiltelefon</label>
            <input
              type="tel"
              id="mobile"
              name="mobile"
              value={profile.mobile}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="+49 123 456789"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Festnetz</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={profile.phone}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="+49 123 456789"
            />
          </div>
        </section>

        {/* Weitere Felder optional (später erweitern) */}
        <section className="profile-section">
          <h2>ℹ️ Weitere Informationen</h2>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Weitere Profil-Features (Adresse, Notfallkontakt, etc.) folgen in der nächsten Version.
          </p>
        </section>

        {isEditing && (
          <div className="form-actions">
            {!isSetup && (
              <button 
                type="button" 
                className="btn-cancel"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Abbrechen
              </button>
            )}
            <button 
              type="submit" 
              className="btn-save"
              disabled={isSaving}
            >
              {isSaving ? '⏳ Speichert...' : '💾 Speichern'}
            </button>
          </div>
        )}
      </form>

      {/* Debug Info (nur in Development) */}
      {import.meta.env.DEV && (
        <details style={{ marginTop: '2rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>🔍 Debug Info</summary>
          <pre style={{ fontSize: '0.75rem', overflow: 'auto' }}>
            {JSON.stringify({ 
              currentUser: currentUser?.email,
              player: player,
              profile: profile,
              isEditing,
              isSetup
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export default SupabaseProfile;


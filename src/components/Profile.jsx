import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import './Profile.css';

function Profile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSetup = searchParams.get('setup') === 'true';
  const { currentUser, completeProfile } = useAuth();
  const { updatePlayerProfile, getPlayerProfile } = useData();
  
  const [profile, setProfile] = useState({
    userId: '',
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

  const [isEditing, setIsEditing] = useState(isSetup); // Auto-edit mode for setup
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Load existing profile using user ID
    if (currentUser?.id) {
      const existingProfile = getPlayerProfile(currentUser.id);
      if (existingProfile) {
        setProfile(existingProfile);
      } else {
        // Initialize with current user name if available
        setProfile(prev => ({
          ...prev,
          name: currentUser?.name || '',
          userId: currentUser?.id || ''
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
    
    // Validate required fields
    if (!profile.name || profile.name.trim() === '') {
      alert('Bitte geben Sie Ihren Namen ein');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Ensure userId is set
      const profileToSave = {
        ...profile,
        userId: currentUser?.id || profile.userId
      };
      
      console.log('Saving profile:', profileToSave); // Debug
      
      // If it's first-time setup, complete auth profile first
      if (isSetup || !currentUser?.isProfileComplete) {
        const success = completeProfile({ name: profile.name });
        if (!success) {
          alert('Fehler beim Vervollständigen des Profils');
          return;
        }
      }
      
      // Save full profile
      updatePlayerProfile(profileToSave);
      
      // Verify it was saved
      setTimeout(() => {
        const saved = getPlayerProfile(currentUser?.id);
        console.log('Verified saved profile:', saved); // Debug
      }, 100);
      
      setSuccessMessage('✅ Profil erfolgreich gespeichert!');
      setIsEditing(false);
      
      // If it was setup, redirect to dashboard after a moment
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
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern des Profils');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    const existingProfile = getPlayerProfile(currentUser?.id);
    if (existingProfile) {
      setProfile(existingProfile);
    }
    setIsEditing(false);
  };

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
        <div className="success-message">
          {successMessage}
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
            <label htmlFor="birthDate">Geburtsdatum</label>
            <input
              type="date"
              id="birthDate"
              name="birthDate"
              value={profile.birthDate}
              onChange={handleInputChange}
              disabled={!isEditing}
            />
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
            <label htmlFor="email">E-Mail</label>
            <input
              type="email"
              id="email"
              name="email"
              value={profile.email}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="beispiel@email.de"
            />
          </div>

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

          <div className="form-group">
            <label htmlFor="address">Adresse</label>
            <textarea
              id="address"
              name="address"
              value={profile.address}
              onChange={handleInputChange}
              disabled={!isEditing}
              rows="3"
              placeholder="Straße, PLZ, Ort"
            />
          </div>
        </section>

        {/* Notfallkontakt */}
        <section className="profile-section">
          <h2>🚨 Notfallkontakt</h2>
          
          <div className="form-group">
            <label htmlFor="emergencyContact">Name</label>
            <input
              type="text"
              id="emergencyContact"
              name="emergencyContact"
              value={profile.emergencyContact}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="Name des Notfallkontakts"
            />
          </div>

          <div className="form-group">
            <label htmlFor="emergencyPhone">Telefonnummer</label>
            <input
              type="tel"
              id="emergencyPhone"
              name="emergencyPhone"
              value={profile.emergencyPhone}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="+49 123 456789"
            />
          </div>
        </section>

        {/* Zusätzliche Notizen */}
        <section className="profile-section">
          <h2>📝 Zusätzliche Informationen</h2>
          
          <div className="form-group">
            <label htmlFor="notes">Notizen</label>
            <textarea
              id="notes"
              name="notes"
              value={profile.notes}
              onChange={handleInputChange}
              disabled={!isEditing}
              rows="4"
              placeholder="Besondere Hinweise, Verfügbarkeit, etc."
            />
          </div>
        </section>

        {isEditing && (
          <div className="form-actions">
            <button 
              type="button" 
              className="btn-cancel"
              onClick={handleCancel}
            >
              Abbrechen
            </button>
            <button 
              type="submit" 
              className="btn-save"
              disabled={isSaving}
            >
              {isSaving ? 'Speichert...' : '💾 Speichern'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default Profile;


import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import './Profile.css';

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
    mobile: '',
    address: '',
    birthDate: '',
    ranking: '',
    emergencyContact: '',
    emergencyPhone: '',
    notes: '',
    profileImage: '',
    favoriteShot: '',
    tennisMotto: '',
    funFact: '',
    worstTennisMemory: '',
    bestTennisMemory: '',
    superstition: '',
    preMatchRoutine: '',
    favoriteOpponent: '',
    dreamMatch: ''
  });

  const [isEditing, setIsEditing] = useState(isSetup);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const [isViewingOtherPlayer, setIsViewingOtherPlayer] = useState(false);
  const [isLoadingOtherPlayer, setIsLoadingOtherPlayer] = useState(false);

  // Funktion zum Laden anderer Spieler-Profile
  const loadOtherPlayerProfile = async (playerName) => {
    if (!playerName) return;
    
    setIsLoadingOtherPlayer(true);
    setIsViewingOtherPlayer(true);
    
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('name', playerName)
        .single();
      
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
          mobile: data.phone || '',
          address: '',
          birthDate: '',
          ranking: data.ranking || '',
          emergencyContact: '',
          emergencyPhone: '',
          notes: '',
          profileImage: data.profileImage || '',
          favoriteShot: data.favoriteShot || '',
          tennisMotto: data.tennisMotto || '',
          funFact: data.funFact || '',
          worstTennisMemory: data.worstTennisMemory || '',
          bestTennisMemory: data.bestTennisMemory || '',
          superstition: data.superstition || '',
          preMatchRoutine: data.preMatchRoutine || '',
          favoriteOpponent: data.favoriteOpponent || '',
          dreamMatch: data.dreamMatch || ''
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

  useEffect(() => {
    // Prüfe ob ein anderer Spieler angezeigt werden soll
    if (playerName && playerName !== player?.name) {
      loadOtherPlayerProfile(playerName);
      return;
    }
    
    // Normale Logik für eigenes Profil
    if (player) {
      console.log('🔵 Loading own player data:', player);
      setIsViewingOtherPlayer(false);
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
        notes: '',
        profileImage: player.profileImage || '',
        favoriteShot: player.favoriteShot || '',
        tennisMotto: player.tennisMotto || '',
        funFact: player.funFact || '',
        worstTennisMemory: player.worstTennisMemory || '',
        bestTennisMemory: player.bestTennisMemory || '',
        superstition: player.superstition || '',
        preMatchRoutine: player.preMatchRoutine || '',
        favoriteOpponent: player.favoriteOpponent || '',
        dreamMatch: player.dreamMatch || ''
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
  }, [player, currentUser, authLoading, playerName]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validiere Dateityp
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Bitte wählen Sie eine gültige Bilddatei aus.');
      return;
    }

    // Validiere Dateigröße (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Das Bild ist zu groß. Maximal 5MB erlaubt.');
      return;
    }

    setIsUploading(true);
    setErrorMessage('');

    try {
      // Erstelle einen eindeutigen Dateinamen
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
      const filePath = `profile-images/${fileName}`;

      // Upload zu Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Hole die öffentliche URL
      const { data } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      setProfile(prev => ({
        ...prev,
        profileImage: data.publicUrl
      }));

      setSuccessMessage('Bild erfolgreich hochgeladen!');
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage('Fehler beim Hochladen des Bildes.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Nur für eigenes Profil erlauben
    if (isViewingOtherPlayer) {
      setErrorMessage('Sie können nur Ihr eigenes Profil bearbeiten.');
      return;
    }
    
    // Validierung
    if (!profile.name || profile.name.trim() === '') {
      setErrorMessage('❌ Bitte geben Sie Ihren Namen ein');
      return;
    }
    
    setIsSaving(true);
    setErrorMessage('');
    
    try {
      console.log('💾 Saving profile to Supabase:', profile);
      
      // Profil in Supabase speichern mit allen neuen Feldern
      const result = await updateProfile({
        name: profile.name,
        phone: profile.phone || profile.mobile,
        ranking: profile.ranking,
        email: profile.email,
        profileImage: profile.profileImage,
        favoriteShot: profile.favoriteShot,
        tennisMotto: profile.tennisMotto,
        funFact: profile.funFact,
        worstTennisMemory: profile.worstTennisMemory,
        bestTennisMemory: profile.bestTennisMemory,
        superstition: profile.superstition,
        preMatchRoutine: profile.preMatchRoutine,
        favoriteOpponent: profile.favoriteOpponent,
        dreamMatch: profile.dreamMatch
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
              
              {isEditing && (
                <label htmlFor="profileImage" className="upload-button">
                  {isUploading ? '⏳ Lädt hoch...' : '📷 Bild hochladen'}
                </label>
              )}
              
              <input
                type="file"
                id="profileImage"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={!isEditing || isUploading}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </section>

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

        {/* Tennis-Persönlichkeit */}
        <section className="profile-section">
          <h2>🎾 Tennis-Persönlichkeit</h2>
          
          <div className="form-group">
            <label htmlFor="favoriteShot">Lieblingsschlag</label>
            <input
              type="text"
              id="favoriteShot"
              name="favoriteShot"
              value={profile.favoriteShot}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="z.B. Vorhand Topspin, Rückhand Slice..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="tennisMotto">Tennis-Motto</label>
            <input
              type="text"
              id="tennisMotto"
              name="tennisMotto"
              value={profile.tennisMotto}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="z.B. 'Ball ins Feld, Punkt gewonnen!'"
            />
          </div>

          <div className="form-group">
            <label htmlFor="funFact">Lustiger Fakt über dich</label>
            <textarea
              id="funFact"
              name="funFact"
              value={profile.funFact}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="Erzähl uns etwas Lustiges über dich..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="superstition">Tennis-Aberglaube</label>
            <input
              type="text"
              id="superstition"
              name="superstition"
              value={profile.superstition}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="z.B. Immer mit dem linken Schuh beginnen..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="preMatchRoutine">Pre-Match Routine</label>
            <textarea
              id="preMatchRoutine"
              name="preMatchRoutine"
              value={profile.preMatchRoutine}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="Was machst du vor dem Spiel?"
              rows="2"
            />
          </div>
        </section>

        {/* Tennis-Momente */}
        <section className="profile-section">
          <h2>🏆 Tennis-Momente</h2>
          
          <div className="form-group">
            <label htmlFor="bestTennisMemory">Bester Tennis-Moment</label>
            <textarea
              id="bestTennisMemory"
              name="bestTennisMemory"
              value={profile.bestTennisMemory}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="Dein schönster Moment auf dem Platz..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="worstTennisMemory">Peinlichster Tennis-Moment</label>
            <textarea
              id="worstTennisMemory"
              name="worstTennisMemory"
              value={profile.worstTennisMemory}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="Der Moment, über den wir alle lachen können..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="favoriteOpponent">Lieblingsgegner</label>
            <input
              type="text"
              id="favoriteOpponent"
              name="favoriteOpponent"
              value={profile.favoriteOpponent}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="Mit wem spielst du am liebsten?"
            />
          </div>

          <div className="form-group">
            <label htmlFor="dreamMatch">Traum-Match</label>
            <input
              type="text"
              id="dreamMatch"
              name="dreamMatch"
              value={profile.dreamMatch}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="Gegen wen würdest du gerne spielen?"
            />
          </div>
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


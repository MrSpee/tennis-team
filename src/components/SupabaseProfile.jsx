import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { LoggingService } from '../services/activityLogger';
import PasswordReset from './PasswordReset';
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
    whatsappEnabled: false,
    profileImage: ''
  });

  const [isEditing, setIsEditing] = useState(isSetup);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const [isViewingOtherPlayer, setIsViewingOtherPlayer] = useState(false);
  const [isLoadingOtherPlayer, setIsLoadingOtherPlayer] = useState(false);
  const [currentBucket, setCurrentBucket] = useState('profile-images');
  const [showPasswordReset, setShowPasswordReset] = useState(false);

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
          whatsappEnabled: data.whatsapp_enabled || false,
          profileImage: data.profile_image || ''
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
        whatsappEnabled: player.whatsapp_enabled || false,
        profileImage: player.profile_image || ''
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

    console.log('📱 Mobile upload detected:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: file.lastModified,
      userAgent: navigator.userAgent
    });

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
      
      // Profil in Supabase speichern - nur die wichtigsten Felder
      const result = await updateProfile({
        name: profile.name,
        phone: profile.phone,
        whatsapp_enabled: profile.whatsappEnabled,
        email: profile.email,
        profileImage: profile.profileImage
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Speichern');
      }
      
      console.log('✅ Profile saved successfully');
      
      // Log Profil-Bearbeitung
      await LoggingService.logProfileEdit({
        name: profile.name,
        phone: profile.phone,
        whatsapp_enabled: profile.whatsappEnabled,
        email: profile.email,
        profileImage: profile.profileImage
      }, player?.id);
      
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
        whatsappEnabled: player.whatsapp_enabled || false,
        profileImage: player.profile_image || ''
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
        {!isEditing && !isSetup && !isViewingOtherPlayer && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              className="btn-modern btn-modern-inactive"
              onClick={() => setIsEditing(true)}
            >
              ✏️ Bearbeiten
            </button>
            <button 
              className="btn-modern btn-modern-inactive"
              onClick={() => setShowPasswordReset(true)}
            >
              🔐 Passwort zurücksetzen
            </button>
          </div>
        )}
      </div>


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
                accept="image/*,image/heic,image/heif"
                capture="environment"
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
            <label htmlFor="name">👤 Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={profile.name}
              onChange={handleInputChange}
              disabled={!isEditing}
              required
              placeholder="Max Mustermann"
            />
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
        </section>

        {/* WhatsApp Teaser */}
        <section className="profile-section">
          <h2>📱 WhatsApp Push-Benachrichtigungen</h2>
          
          <div style={{ 
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
            border: '2px solid #22c55e',
            borderRadius: '12px',
            marginBottom: '1rem'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{ 
                fontSize: '1.5rem',
                background: '#22c55e',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                📱
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#14532d' }}>
                  Verpasse nie wieder wichtige Updates!
                </h4>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#166534' }}>
                  Erhalte Push-Benachrichtigungen für dein Team
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#14532d'
              }}>
                <input
                  type="checkbox"
                  checked={profile.whatsappEnabled}
                  onChange={(e) => setProfile(prev => ({ ...prev, whatsappEnabled: e.target.checked }))}
                  disabled={!isEditing}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>🔔 Ja, ich möchte Push-Benachrichtigungen erhalten</span>
              </label>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#166534', lineHeight: '1.5' }}>
              <strong>Du erhältst Updates zu:</strong>
              <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
                <li>🏆 Neue Matchdays & Termine</li>
                <li>📈 LK-Updates & Rankings</li>
                <li>🎾 Trainingseinladungen</li>
                <li>📢 Team-News & Ankündigungen</li>
              </ul>
            </div>

            {profile.whatsappEnabled && (
              <div style={{ marginTop: '1rem' }}>
                <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#14532d' }}>
                  📱 WhatsApp-Nummer
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="+49 123 456789"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #22c55e',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    background: 'white'
                  }}
                />
              </div>
            )}
          </div>
        </section>


        {isEditing && (
          <div className="form-actions">
            <div className="form-actions-left">
              {successMessage && (
                <div className="success-message-inline">
                  {successMessage}
                </div>
              )}
            </div>
            <div className="form-actions-right">
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
          </div>
        )}
      </form>

      {/* Passwort-Reset-Modal */}
      {showPasswordReset && (
        <PasswordReset onClose={() => setShowPasswordReset(false)} />
      )}
    </div>
  );
}

export default SupabaseProfile;


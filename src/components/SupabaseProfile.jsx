import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { LoggingService } from '../services/activityLogger';
import PasswordReset from './PasswordReset';
import { Building2, Users, MapPin, Phone, Mail, Globe, Edit3 } from 'lucide-react';
import { normalizeLK } from '../lib/lkUtils';
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
    profileImage: '',
    birth_date: '',
    // Tennis-Identity Felder
    current_lk: '',
    tennis_motto: '',
    favorite_shot: '',
    best_tennis_memory: '',
    worst_tennis_memory: '',
    favorite_opponent: '',
    dream_match: '',
    // Fun & Aberglaube
    fun_fact: '',
    superstition: '',
    pre_match_routine: '',
    // Kontakt & Notfall
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    // Notizen
    notes: ''
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
  
  // Vereins-/Mannschafts-Daten
  const [playerTeams, setPlayerTeams] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [isEditingTeams, setIsEditingTeams] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

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
        profileImage: data.profile_image || '',
        birth_date: data.birth_date || '',
        // Tennis-Identity
        current_lk: data.current_lk || '',
        tennis_motto: data.tennis_motto || '',
        favorite_shot: data.favorite_shot || '',
        best_tennis_memory: data.best_tennis_memory || '',
        worst_tennis_memory: data.worst_tennis_memory || '',
        favorite_opponent: data.favorite_opponent || '',
        dream_match: data.dream_match || '',
        // Fun & Aberglaube
        fun_fact: data.fun_fact || '',
        superstition: data.superstition || '',
        pre_match_routine: data.pre_match_routine || '',
        // Kontakt & Notfall
        address: data.address || '',
        emergency_contact: data.emergency_contact || '',
        emergency_phone: data.emergency_phone || '',
        // Notizen
        notes: data.notes || ''
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
        profileImage: player.profile_image || '',
        birth_date: player.birth_date || '',
        // Tennis-Identity
        current_lk: player.current_lk || '',
        tennis_motto: player.tennis_motto || '',
        favorite_shot: player.favorite_shot || '',
        best_tennis_memory: player.best_tennis_memory || '',
        worst_tennis_memory: player.worst_tennis_memory || '',
        favorite_opponent: player.favorite_opponent || '',
        dream_match: player.dream_match || '',
        // Fun & Aberglaube
        fun_fact: player.fun_fact || '',
        superstition: player.superstition || '',
        pre_match_routine: player.pre_match_routine || '',
        // Kontakt & Notfall
        address: player.address || '',
        emergency_contact: player.emergency_contact || '',
        emergency_phone: player.emergency_phone || '',
        // Notizen
        notes: player.notes || ''
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
    
    // Lade Vereins-/Mannschafts-Daten wenn Player verfügbar
    if (player?.id) {
      loadPlayerTeamsAndClubs(player.id);
    }
  }, [player, currentUser, authLoading, playerName]);

  // Lade Vereins- und Mannschafts-Daten für den Spieler
  const loadPlayerTeamsAndClubs = async (playerId) => {
    try {
      console.log('🔍 Loading teams and clubs for player:', playerId);
      
      // Schritt 1: Lade Player-Teams mit Team-Info
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
            tvm_link
          )
        `)
        .eq('player_id', playerId)
        .order('is_primary', { ascending: false });

      if (teamsError) {
        console.error('Error loading player teams:', teamsError);
        return;
      }

      console.log('✅ Player teams loaded:', teamsData);
      
      // Schritt 2: Lade team_seasons für jedes Team separat
      const teamsWithSeasons = await Promise.all(
        teamsData.map(async (pt) => {
          const teamInfo = pt.team_info;
          console.log(`🔍 Loading seasons for team: ${teamInfo?.team_name} (ID: ${teamInfo?.id})`);
          
          // Lade team_seasons für dieses spezifische Team
          const { data: seasonsData, error: seasonsError } = await supabase
            .from('team_seasons')
            .select('*')
            .eq('team_id', teamInfo?.id)
            .order('is_active', { ascending: false });
          
          if (seasonsError) {
            console.error(`Error loading seasons for team ${teamInfo?.team_name}:`, seasonsError);
          } else {
            console.log(`✅ Seasons for ${teamInfo?.team_name}:`, seasonsData);
          }
          
          // Finde die aktuelle/aktive Season
          const currentSeason = seasonsData?.find(ts => ts.is_active) || seasonsData?.[0];
          
          console.log(`🔍 Processing team ${teamInfo?.team_name}:`, {
            seasonsData: seasonsData,
            currentSeason: currentSeason,
            is_active_seasons: seasonsData?.filter(ts => ts.is_active)
          });
          
          return {
            ...teamInfo,
            is_primary: pt.is_primary,
            role: pt.role,
            player_team_id: pt.id,
            // Echte Season-Daten aus team_seasons
            current_season: currentSeason?.season || 'Unbekannt',
            current_league: currentSeason?.league || 'Unbekannt',
            current_group: currentSeason?.group_name || '',
            team_size: currentSeason?.team_size || 4,
            season_year: currentSeason?.season ? 
              currentSeason.season.split(' ')[1]?.split('/')[0] || new Date().getFullYear() : 
              new Date().getFullYear()
          };
        })
      );
      
      const teams = teamsWithSeasons;
      
      console.log('✅ Transformed teams:', teams);
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
      console.log('✅ State updated - playerTeams:', teams.length, 'clubs:', uniqueClubs.length);

    } catch (error) {
      console.error('❌ Error loading teams and clubs:', error);
    }
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
      
      // Normalisiere LK vor dem Speichern (13,6 → LK 13.6)
      const normalizedLK = profile.current_lk ? normalizeLK(profile.current_lk) : null;
      
      // Profil in Supabase speichern - alle relevanten Felder
      const result = await updateProfile({
        name: profile.name,
        phone: profile.phone,
        email: profile.email,
        profileImage: profile.profileImage,
        birth_date: profile.birth_date,
        // Tennis-Identity
        current_lk: normalizedLK,
        tennis_motto: profile.tennis_motto,
        favorite_shot: profile.favorite_shot,
        best_tennis_memory: profile.best_tennis_memory,
        worst_tennis_memory: profile.worst_tennis_memory,
        favorite_opponent: profile.favorite_opponent,
        dream_match: profile.dream_match,
        // Fun & Aberglaube
        fun_fact: profile.fun_fact,
        superstition: profile.superstition,
        pre_match_routine: profile.pre_match_routine,
        // Kontakt & Notfall
        address: profile.address,
        emergency_contact: profile.emergency_contact,
        emergency_phone: profile.emergency_phone,
        // Notizen
        notes: profile.notes
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Speichern');
      }
      
      console.log('✅ Profile saved successfully');
      
      // Log Profil-Bearbeitung (nur wichtigste Felder)
      await LoggingService.logProfileEdit({
        name: profile.name,
        phone: profile.phone,
        email: profile.email,
        current_lk: profile.current_lk
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

          <div className="form-group">
            <label htmlFor="birth_date">🎂 Geburtsdatum</label>
            <input
              type="date"
              id="birth_date"
              name="birth_date"
              value={profile.birth_date}
              onChange={handleInputChange}
              disabled={!isEditing}
            />
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              🎉 Optional - hilft uns dein Profil zu personalisieren
            </small>
          </div>
        </section>

        {/* Tennis-Identity */}
        <section className="profile-section">
          <h2>🎾 Meine Tennis-Story</h2>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Erzähl uns von deiner Tennis-Reise! Alle Felder sind optional.
          </p>
          
          {/* Aktuelle LK - prominent */}
          <div className="form-group">
            <label htmlFor="current_lk">🏆 Aktuelle Leistungsklasse</label>
            <input
              id="current_lk"
              name="current_lk"
              type="text"
              value={profile.current_lk}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="z.B. LK 12.3"
              style={{ 
                textAlign: 'center', 
                fontWeight: '700',
                fontSize: '1.2rem',
                color: '#3b82f6',
                background: '#f0f9ff',
                border: '2px solid #93c5fd'
              }}
            />
            <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem', textAlign: 'center' }}>
              💡 Deine LK findest du auf deiner{' '}
              <a 
                href="https://tvm-tennis.de/spielbetrieb/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#3b82f6', textDecoration: 'underline' }}
              >
                TVM-Profilseite
              </a>
            </small>
          </div>

          {/* Tennis-Motto */}
          {(isEditing || profile.tennis_motto) && (
            <div className="form-group">
              <label htmlFor="tennis_motto">💭 Dein Tennis-Motto</label>
              <input
                id="tennis_motto"
                name="tennis_motto"
                type="text"
                value={profile.tennis_motto}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder='z.B. "Nie aufgeben!", "One point at a time"'
                style={{ fontStyle: 'italic' }}
              />
              <small style={{ color: '#666', fontSize: '0.85rem' }}>
                💪 Dein persönlicher Schlachtruf auf dem Court
              </small>
            </div>
          )}

          {/* Lieblingsschlag */}
          {(isEditing || profile.favorite_shot) && (
            <div className="form-group">
              <label htmlFor="favorite_shot">🎯 Dein Lieblingsschlag</label>
              <input
                id="favorite_shot"
                name="favorite_shot"
                type="text"
                value={profile.favorite_shot}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="z.B. Vorhand Longline, Inside-Out, Slice..."
              />
              <small style={{ color: '#666', fontSize: '0.85rem' }}>
                🎾 Der Schlag, der dir am meisten Spaß macht
              </small>
            </div>
          )}

          {/* Bester Moment */}
          {(isEditing || profile.best_tennis_memory) && (
            <div className="form-group">
              <label htmlFor="best_tennis_memory">🌟 Dein bester Tennis-Moment</label>
              <textarea
                id="best_tennis_memory"
                name="best_tennis_memory"
                value={profile.best_tennis_memory}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="z.B. Mein erster Turniersieg 2023 gegen..."
                rows="3"
                style={{ resize: 'vertical' }}
              />
              <small style={{ color: '#666', fontSize: '0.85rem' }}>
                🏆 Die Erinnerung, die dich motiviert
              </small>
            </div>
          )}

          {/* Schlimmster Moment */}
          {(isEditing || profile.worst_tennis_memory) && (
            <div className="form-group">
              <label htmlFor="worst_tennis_memory">😅 Dein schlimmster Tennis-Moment</label>
              <textarea
                id="worst_tennis_memory"
                name="worst_tennis_memory"
                value={profile.worst_tennis_memory}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="z.B. Als ich 6:0, 5:0 führte und dann verlor..."
                rows="3"
                style={{ resize: 'vertical' }}
              />
              <small style={{ color: '#666', fontSize: '0.85rem' }}>
                😬 Auch das gehört dazu - daraus lernen wir
              </small>
            </div>
          )}

          {/* Lieblingsgegner */}
          {(isEditing || profile.favorite_opponent) && (
            <div className="form-group">
              <label htmlFor="favorite_opponent">🤝 Dein Lieblingsgegner</label>
              <input
                id="favorite_opponent"
                name="favorite_opponent"
                type="text"
                value={profile.favorite_opponent}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="z.B. Mein bester Freund Max, immer spannend!"
              />
              <small style={{ color: '#666', fontSize: '0.85rem' }}>
                🎾 Gegen wen spielst du am liebsten?
              </small>
            </div>
          )}

          {/* Traum-Match */}
          {(isEditing || profile.dream_match) && (
            <div className="form-group">
              <label htmlFor="dream_match">💫 Dein Traum-Match</label>
              <input
                id="dream_match"
                name="dream_match"
                type="text"
                value={profile.dream_match}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="z.B. Gegen Roger Federer auf Wimbledon"
              />
              <small style={{ color: '#666', fontSize: '0.85rem' }}>
                ✨ Gegen wen würdest du gerne mal spielen?
              </small>
            </div>
          )}
        </section>

        {/* Fun & Aberglaube */}
        <section className="profile-section">
          <h2>🎭 Das macht mich aus</h2>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Zeig uns deine Persönlichkeit! Diese Infos lockern dein Profil auf.
          </p>

          {/* Fun Fact */}
          {(isEditing || profile.fun_fact) && (
            <div className="form-group">
              <label htmlFor="fun_fact">🎲 Fun Fact über dich</label>
              <textarea
                id="fun_fact"
                name="fun_fact"
                value={profile.fun_fact}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="z.B. Ich spiele seit meinem 5. Lebensjahr Tennis..."
                rows="3"
                style={{ resize: 'vertical' }}
              />
              <small style={{ color: '#666', fontSize: '0.85rem' }}>
                🎉 Was die wenigsten über dich wissen
              </small>
            </div>
          )}

          {/* Aberglaube */}
          {(isEditing || profile.superstition) && (
            <div className="form-group">
              <label htmlFor="superstition">🍀 Dein Aberglaube</label>
              <input
                id="superstition"
                name="superstition"
                type="text"
                value={profile.superstition}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder='z.B. "Immer mit dem rechten Fuß zuerst auf den Court"'
              />
              <small style={{ color: '#666', fontSize: '0.85rem' }}>
                🔮 Hast du ein Glücksritual?
              </small>
            </div>
          )}

          {/* Pre-Match Routine */}
          {(isEditing || profile.pre_match_routine) && (
            <div className="form-group">
              <label htmlFor="pre_match_routine">🔄 Deine Pre-Match Routine</label>
              <textarea
                id="pre_match_routine"
                name="pre_match_routine"
                value={profile.pre_match_routine}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="z.B. 30 Min Aufwärmen, Musik hören, Banane essen..."
                rows="3"
                style={{ resize: 'vertical' }}
              />
              <small style={{ color: '#666', fontSize: '0.85rem' }}>
                🎯 Wie bereitest du dich vor einem Match vor?
              </small>
            </div>
          )}
        </section>

        {/* Kontakt & Notfall */}
        <section className="profile-section">
          <h2>📞 Kontakt & Notfall</h2>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            🔒 Diese Daten sind nur für dein Team sichtbar
          </p>
          
          <div className="form-group">
            <label htmlFor="phone">📱 Telefonnummer</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={profile.phone}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="+49 123 456789"
            />
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              Für Team-Kommunikation und wichtige Updates
            </small>
          </div>

          {(isEditing || profile.address) && (
            <div className="form-group">
              <label htmlFor="address">🏠 Adresse</label>
              <textarea
                id="address"
                name="address"
                value={profile.address}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="Musterstraße 123, 12345 Musterstadt"
                rows="2"
                style={{ resize: 'vertical' }}
              />
              <small style={{ color: '#666', fontSize: '0.85rem' }}>
                Optional - für Fahrgemeinschaften
              </small>
            </div>
          )}

          {(isEditing || profile.emergency_contact) && (
            <div className="form-group">
              <label htmlFor="emergency_contact">🚨 Notfallkontakt</label>
              <input
                id="emergency_contact"
                name="emergency_contact"
                type="text"
                value={profile.emergency_contact}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="Name des Notfallkontakts"
              />
              <small style={{ color: '#666', fontSize: '0.85rem' }}>
                Name der Person, die im Notfall kontaktiert werden soll
              </small>
            </div>
          )}

          {(isEditing || profile.emergency_phone) && (
            <div className="form-group">
              <label htmlFor="emergency_phone">☎️ Notfall-Telefon</label>
              <input
                id="emergency_phone"
                name="emergency_phone"
                type="tel"
                value={profile.emergency_phone}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="+49 123 456789"
              />
              <small style={{ color: '#666', fontSize: '0.85rem' }}>
                Telefonnummer des Notfallkontakts
              </small>
            </div>
          )}
        </section>

        {/* Notizen */}
        {(isEditing || profile.notes) && (
          <section className="profile-section">
            <h2>📝 Persönliche Notizen</h2>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Platz für deine eigenen Gedanken und Erinnerungen
            </p>
            
            <div className="form-group">
              <textarea
                id="notes"
                name="notes"
                value={profile.notes}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="Hier ist Platz für deine persönlichen Notizen..."
                rows="5"
                style={{ resize: 'vertical' }}
              />
            </div>
          </section>
        )}
        
        {clubs.length > 0 && (
        <section className="profile-section">
            <h2>🏢 Vereins-/Mannschafts-Zugehörigkeit</h2>
            
            <div className="lk-card-full" style={{ marginTop: '1rem' }}>
              <div className="formkurve-header">
                <div className="formkurve-title">Meine Vereine & Mannschaften</div>
                <div className="match-count-badge">
                  {clubs.length} {clubs.length === 1 ? 'Verein' : 'Vereine'}
          </div>
          </div>
          
              {/* Button: Mannschaft hinzufügen */}
              <div style={{ 
                padding: '1rem', 
                borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.9rem', 
                  color: '#6b7280' 
                }}>
                  Du kannst in mehreren Vereinen und bis zu 3 Mannschaften pro Verein spielen.
                </p>
                <button
                  onClick={() => alert('Team hinzufügen - Feature kommt bald! 🚀\n\nKontaktiere deinen Team-Captain, damit er dich hinzufügt.')}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.2s',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>➕</span>
                  Mannschaft hinzufügen
                </button>
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
                          padding: '1.5rem',
                          border: '2px solid',
                          borderRadius: '12px',
                          background: team.is_primary 
                            ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' 
                            : 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
                          borderColor: team.is_primary ? '#f59e0b' : '#e5e7eb',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                          transition: 'all 0.2s ease'
                        }}>
                          {/* Team Header mit Badges */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '1rem',
                            flexWrap: 'wrap',
                            gap: '0.5rem'
                          }}>
                            <div style={{ flex: '1', minWidth: '200px' }}>
                              <h4 style={{ 
                                margin: 0, 
                                fontSize: '1.25rem',
                                fontWeight: '700',
                                color: '#1f2937',
                                marginBottom: '0.25rem'
                              }}>
                                {team.team_name || team.category}
                              </h4>
                              <p style={{ 
                                margin: 0, 
                                fontSize: '0.9rem',
                                color: '#6b7280',
                                fontWeight: '500'
                              }}>
                                {team.category} • {team.region}
                              </p>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              {team.is_primary && (
                                <span style={{
                                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                  color: 'white',
                                  padding: '0.375rem 0.75rem',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: '700',
                                  boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                                }}>
                                  ⭐ Hauptmannschaft
                                </span>
                              )}
                              
                              <span style={{
                                background: team.role === 'captain' 
                                  ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' 
                                  : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                                color: 'white',
                                padding: '0.375rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                boxShadow: team.role === 'captain' 
                                  ? '0 2px 4px rgba(220, 38, 38, 0.3)' 
                                  : '0 2px 4px rgba(107, 114, 128, 0.3)'
                              }}>
                                {team.role === 'captain' ? '🎯 Captain' : '🎾 Spieler'}
                              </span>
                            </div>
                          </div>
                              
                          {/* Liga- und Saison-Informationen */}
                          <div style={{ 
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                            gap: '0.75rem',
                            marginBottom: '1rem',
                            padding: '1rem',
                            background: 'rgba(255, 255, 255, 0.6)',
                            borderRadius: '8px',
                            border: '1px solid rgba(0, 0, 0, 0.05)'
                          }}>
                            {/* Liga */}
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ 
                                fontSize: '0.7rem', 
                                color: '#6b7280', 
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '0.25rem'
                              }}>
                                Liga
                              </div>
                              <div style={{ 
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                color: '#1f2937'
                              }}>
                                🏆 {team.current_league}
                              </div>
                            </div>

                            {/* Gruppe */}
                            {team.current_group && (
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ 
                                  fontSize: '0.7rem', 
                                  color: '#6b7280', 
                                  fontWeight: '600',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  marginBottom: '0.25rem'
                                }}>
                                  Gruppe
                                </div>
                                <div style={{ 
                                  fontSize: '0.95rem',
                                  fontWeight: '700',
                                  color: '#1f2937'
                                }}>
                                  📋 {team.current_group}
                                </div>
                              </div>
                            )}

                            {/* Saison */}
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ 
                                fontSize: '0.7rem', 
                                color: '#6b7280', 
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '0.25rem'
                              }}>
                                Saison
                              </div>
                              <div style={{ 
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                color: '#1f2937'
                              }}>
                                📅 {team.current_season}
                              </div>
                            </div>

                            {/* Team-Größe */}
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ 
                                fontSize: '0.7rem', 
                                color: '#6b7280', 
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '0.25rem'
                              }}>
                                Team
                              </div>
                              <div style={{ 
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                color: '#1f2937'
                              }}>
                                👥 {team.team_size} Spieler
                              </div>
                            </div>
                          </div>

                          {/* Team Details / TVM Link */}
                          {team.tvm_link && (
                            <div style={{ 
                              marginTop: '0.75rem',
                              paddingTop: '0.75rem',
                              borderTop: '1px solid rgba(0, 0, 0, 0.1)'
                            }}>
                              <a 
                                href={team.tvm_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ 
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  color: '#3b82f6',
                                  textDecoration: 'none',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  transition: 'color 0.2s'
                                }}
                              >
                                <Globe size={16} />
                                TVM-Spielbetrieb öffnen
                              </a>
                            </div>
                          )}

                          {/* Edit Buttons (nur wenn bearbeitbar) */}
                          {isEditing && (
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
        </section>
        )}

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

            <div className="modal-actions">
              <button
                onClick={() => {
                  setIsEditingTeams(false);
                  setEditingTeam(null);
                }}
                className="btn-modal-cancel"
              >
                Abbrechen
              </button>
              
              <button
                onClick={() => handleSaveTeamChanges(editingTeam.player_team_id, {
                  role: editingTeam.role,
                  is_primary: editingTeam.is_primary
                })}
                className="btn-modal-save"
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

export default SupabaseProfile;

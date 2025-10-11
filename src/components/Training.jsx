import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, Sun, Home, Share2, AlertCircle, CheckCircle, XCircle, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabaseClient';
import { LoggingService } from '../services/activityLogger';
import './Dashboard.css';

function Training() {
  const navigate = useNavigate();
  const { player, currentUser } = useAuth();
  const { players } = useData();
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'team', 'mine'
  const [respondingTo, setRespondingTo] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Neu: User Teams
  const [userTeams, setUserTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [importedPlayers, setImportedPlayers] = useState([]); // Importierte Spieler (ohne Email)
  const [importedPlayerEmails, setImportedPlayerEmails] = useState({}); // { playerId: email }
  const [importedPlayerSearch, setImportedPlayerSearch] = useState(''); // Suchfeld für importierte Spieler
  const [allImportedPlayers, setAllImportedPlayers] = useState([]); // Alle importierten Spieler (ungefiltered)
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    startTime: '17:00',
    endTime: '19:00',
    location: 'Draußen',
    venue: '',  // 🔧 KEIN Hardcoded Venue mehr!
    type: 'team',
    teamId: null, // Neu: Team-Zuordnung
    invitationMode: 'all_team_members', // Neu: 'all_team_members', 'selected_players'
    maxPlayers: 8,
    targetPlayers: 8,
    weatherDependent: true,
    needsSubstitute: false,
    isRecurring: false, // Wöchentlich wiederholen
    weekday: 3, // 3 = Mittwoch
    notes: '',
    invitedPlayers: [], // Player-IDs aus DB
    externalPlayers: [] // { name, lk, club }
  });

  // Lade Trainings und User Teams
  useEffect(() => {
    loadTrainings();
    loadUserTeams();
  }, [player]);

  // Lade importierte Spieler beim Öffnen des Formulars (für Privat-Training)
  useEffect(() => {
    if (showCreateForm && formData.type === 'private') {
      // Lade ALLE importierten Spieler (clubübergreifend)
      console.log('🔍 Loading ALL imported players (club-wide)');
      loadImportedPlayersForPrivateTraining();
    }
  }, [showCreateForm, formData.type]);

  // Filter importierte Spieler basierend auf Suche
  useEffect(() => {
    if (!importedPlayerSearch.trim()) {
      setImportedPlayers([]);
      return;
    }

    const searchLower = importedPlayerSearch.toLowerCase();
    const filtered = allImportedPlayers.filter(ip => 
      ip.name.toLowerCase().includes(searchLower)
    );

    console.log(`🔍 Filtered ${filtered.length} imported players for search: "${importedPlayerSearch}"`);
    setImportedPlayers(filtered);
  }, [importedPlayerSearch, allImportedPlayers]);

  // Lade Teams des Users
  const loadUserTeams = async () => {
    if (!player) return;
    
    try {
      console.log('🔍 Loading teams for player:', player.id);
      
      const { data, error } = await supabase
        .from('player_teams')
        .select(`
          *,
          team_info!inner (
            id,
            team_name,
            club_name,
            category
          )
        `)
        .eq('player_id', player.id);

      if (error) {
        console.error('❌ Error loading user teams:', error);
        throw error;
      }

      console.log('📊 Raw player_teams data:', data);

      if (!data || data.length === 0) {
        console.warn('⚠️ No teams found for player');
        setUserTeams([]);
        return;
      }

      const teams = data.map(pt => ({
        id: pt.team_info.id,
        name: pt.team_info.team_name,
        club: pt.team_info.club_name,
        category: pt.team_info.category,
        isPrimary: pt.is_primary
      }));

      console.log('✅ User teams loaded:', teams);
      setUserTeams(teams);

      // Setze primäres Team als Default
      const primaryTeam = teams.find(t => t.isPrimary);
      if (primaryTeam && !formData.teamId) {
        console.log('🎯 Setting primary team as default:', primaryTeam.id);
        setFormData(prev => ({ ...prev, teamId: primaryTeam.id }));
        loadTeamMembers(primaryTeam.id);
      }
    } catch (error) {
      console.error('❌ Fatal error loading user teams:', error);
    }
  };

  // Lade ALLE importierten Spieler (clubübergreifend für Privat-Training)
  const loadImportedPlayersForPrivateTraining = async () => {
    try {
      console.log('🔍 Querying ALL imported_players (no team filter)');
      
      const { data, error } = await supabase
        .from('imported_players')
        .select('id, name, import_lk, team_id')
        .eq('status', 'pending')
        .order('name', { ascending: true });

      if (error) {
        console.warn('⚠️ Could not load imported players:', error);
        setImportedPlayers([]);
        return;
      }

      console.log('📊 Raw imported_players data:', data);

      const importedMembers = (data || []).map(ip => ({
        id: ip.id,
        name: ip.name,
        email: null,
        currentLk: ip.import_lk,
        teamId: ip.team_id, // Behalte team_id für Info
        source: 'imported'
      }));

      console.log('✅ Imported players loaded for private training:', importedMembers.length, importedMembers);
      setAllImportedPlayers(importedMembers); // Speichere ALLE für Suche
      setImportedPlayers([]); // Zeige zunächst keine an (erst bei Suche)

    } catch (error) {
      console.error('❌ Error loading imported players:', error);
      setAllImportedPlayers([]);
      setImportedPlayers([]);
    }
  };

  // Lade Team-Mitglieder (registriert UND importiert)
  const loadTeamMembers = async (teamId) => {
    if (!teamId) return;
    
    try {
      // 1. Registrierte Spieler (mit Email)
      const { data: registeredData, error: registeredError } = await supabase
        .from('player_teams')
        .select(`
          *,
          player:player_id (
            id,
            name,
            email,
            current_lk
          )
        `)
        .eq('team_id', teamId);

      if (registeredError) throw registeredError;

      const registeredMembers = registeredData.map(pt => ({
        id: pt.player.id,
        name: pt.player.name,
        email: pt.player.email,
        currentLk: pt.player.current_lk,
        isPrimary: pt.is_primary,
        role: pt.role,
        source: 'registered'
      }));

      setTeamMembers(registeredMembers);

      // 2. Importierte Spieler (OHNE Email, warten auf Registrierung)
      const { data: importedData, error: importedError } = await supabase
        .from('imported_players')
        .select('id, name, import_lk, team_id')
        .eq('team_id', teamId)
        .eq('status', 'pending');

      if (importedError) {
        console.warn('⚠️ Could not load imported players:', importedError);
        setImportedPlayers([]);
        return;
      }

      const importedMembers = (importedData || []).map(ip => ({
        id: ip.id,
        name: ip.name,
        email: null, // Noch keine Email
        currentLk: ip.import_lk,
        source: 'imported'
      }));

      setImportedPlayers(importedMembers);

    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const loadTrainings = async () => {
    try {
      setLoading(true);
      
      // 🔒 FILTERUNG: Hole nur Team-IDs des Spielers
      const playerTeamIds = userTeams.map(t => t.id);
      
      if (playerTeamIds.length === 0) {
        console.log('⚠️ No teams found for player, no trainings to load');
        setTrainings([]);
        setLoading(false);
        return;
      }

      console.log('🔒 Loading trainings for player teams:', playerTeamIds);

      // Lade Trainings mit Teilnahme-Info (NUR für eigene Teams!)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('training_sessions')
        .select(`
          *,
          organizer:organizer_id (
            id,
            name,
            profile_image
          )
        `)
        .in('team_id', playerTeamIds)  // 🔒 FILTERUNG: Nur Trainings der eigenen Teams!
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true });

      if (sessionsError) throw sessionsError;
      
      console.log('✅ Trainings loaded (filtered by player teams):', sessionsData?.length || 0);

      // Lade alle Teilnahmen
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('training_attendance')
        .select('*');

      if (attendanceError) throw attendanceError;

      // Kombiniere Daten
      const trainingsWithAttendance = (sessionsData || []).map(session => {
        const attendance = (attendanceData || []).filter(a => a.session_id === session.id);
        const myAttendance = attendance.find(a => a.player_id === player?.id);
        
        const confirmed = attendance.filter(a => a.status === 'confirmed').length;
        const declined = attendance.filter(a => a.status === 'declined').length;
        const pending = players.filter(p => p.is_active).length - (confirmed + declined);

        return {
          ...session,
          attendance,
          myAttendance,
          stats: {
            confirmed,
            declined,
            pending
          }
        };
      });

      setTrainings(trainingsWithAttendance);
    } catch (error) {
      console.error('Error loading trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Privacy-Filter: Nur sichtbare Trainings
  const visibleTrainings = useMemo(() => {
    if (!player) return [];
    
    return trainings.filter(training => {
      // Team-Trainings: Alle Team-Mitglieder sehen
      if (training.type === 'team') return true;
      
      // Private Trainings mit "Spieler gesucht": Alle sehen
      if (training.type === 'private' && training.is_public && training.needs_substitute) {
        return true;
      }
      
      // Private Trainings: Nur wenn ich eingeladen bin
      if (training.invited_players?.includes(player.id)) return true;
      
      // Private Trainings: Nur wenn ich Organisator bin
      if (training.organizer_id === player.id) return true;
      
      // Sonst: Nicht sichtbar
      return false;
    });
  }, [trainings, player]);

  // Filtere sichtbare Trainings nach Tab-Auswahl
  const filteredTrainings = useMemo(() => {
    if (selectedFilter === 'all') return visibleTrainings;
    if (selectedFilter === 'mine') {
      // Nur meine privaten Trainings
      return visibleTrainings.filter(t => 
        t.type === 'private' && 
        (t.organizer_id === player?.id || t.invited_players?.includes(player?.id))
      );
    }
    if (selectedFilter === 'team') {
      // Nur Team-Trainings
      return visibleTrainings.filter(t => t.type === 'team');
    }
    return visibleTrainings;
  }, [visibleTrainings, selectedFilter, player]);

  // Gruppiere nach Zeitraum
  const groupedTrainings = useMemo(() => {
    const now = new Date();
    const thisWeekEnd = new Date(now);
    thisWeekEnd.setDate(now.getDate() + (7 - now.getDay()));
    
    const thisWeek = [];
    const nextWeek = [];
    const later = [];

    filteredTrainings.forEach(training => {
      const trainingDate = new Date(training.date);
      if (trainingDate <= thisWeekEnd) {
        thisWeek.push(training);
      } else if (trainingDate <= new Date(thisWeekEnd.getTime() + 7 * 24 * 60 * 60 * 1000)) {
        nextWeek.push(training);
      } else {
        later.push(training);
      }
    });

    return { thisWeek, nextWeek, later };
  }, [filteredTrainings]);

  // Training erstellen
  const handleCreateTraining = async (e) => {
    e.preventDefault();
    
    if (!player) {
      alert('Fehler: Kein Spieler-Profil gefunden');
      return;
    }

    console.log('🔵 Creating training with data:', formData);

    try {
      setIsCreating(true);

      // Validierung
      if (!formData.date) {
        alert('Bitte Datum auswählen');
        setIsCreating(false);
        return;
      }

      // Wenn wöchentlich wiederkehrend: Erstelle mehrere Trainings
      if (formData.isRecurring) {
        const trainingsToCreate = [];
        const startDate = new Date(formData.date);
        
        console.log(`🔵 Creating ${26} recurring trainings starting from ${startDate}`);
        
        // Erstelle Trainings für die nächsten 26 Wochen (6 Monate = halbe Saison)
        for (let i = 0; i < 26; i++) {
          const trainingDate = new Date(startDate);
          trainingDate.setDate(startDate.getDate() + (i * 7));
          
          const trainingData = {
            date: new Date(`${trainingDate.toISOString().split('T')[0]}T${formData.startTime}`).toISOString(),
            start_time: formData.startTime,
            end_time: formData.endTime,
            duration: calculateDuration(formData.startTime, formData.endTime),
            location: formData.location,
            venue: formData.venue || null,
            type: formData.type,
            team_id: formData.type === 'team' ? formData.teamId : null, // Neu: Team-Zuordnung
            invitation_mode: formData.type === 'team' ? formData.invitationMode : null, // Neu: Einladungs-Modus
            is_public: formData.type === 'team' ? true : formData.needsSubstitute,
            organizer_id: player.id,
            max_players: parseInt(formData.maxPlayers),
            target_players: parseInt(formData.targetPlayers),
            needs_substitute: formData.needsSubstitute || false,
            weather_dependent: formData.weatherDependent || false,
            title: formData.title || (formData.type === 'team' ? 'Team-Training' : 'Privates Training'),
            notes: formData.notes || null,
            invited_players: formData.invitedPlayers.length > 0 ? formData.invitedPlayers : null,
            external_players: formData.externalPlayers.length > 0 ? formData.externalPlayers : null,
            status: 'scheduled'
          };
          
          trainingsToCreate.push(trainingData);
        }

        console.log('🔵 Inserting trainings:', trainingsToCreate);

        const { error } = await supabase
          .from('training_sessions')
          .insert(trainingsToCreate);

        if (error) {
          console.error('❌ Error creating recurring trainings:', error);
          throw error;
        }

        console.log(`✅ ${trainingsToCreate.length} wiederkehrende Trainings erstellt`);
      } else {
        // Einzelnes Training
        const dateTime = new Date(`${formData.date}T${formData.startTime}`);

        const trainingData = {
          date: dateTime.toISOString(),
          start_time: formData.startTime,
          end_time: formData.endTime,
          duration: calculateDuration(formData.startTime, formData.endTime),
          location: formData.location,
          venue: formData.venue || null,
          type: formData.type,
          team_id: formData.type === 'team' ? formData.teamId : null, // Neu: Team-Zuordnung
          invitation_mode: formData.type === 'team' ? formData.invitationMode : null, // Neu: Einladungs-Modus
          is_public: formData.type === 'team' ? true : formData.needsSubstitute,
          organizer_id: player.id,
          max_players: parseInt(formData.maxPlayers),
          target_players: parseInt(formData.targetPlayers),
          needs_substitute: formData.needsSubstitute || false,
          weather_dependent: formData.weatherDependent || false,
          title: formData.title || (formData.type === 'team' ? 'Team-Training' : 'Privates Training'),
          notes: formData.notes || null,
          invited_players: formData.invitedPlayers.length > 0 ? formData.invitedPlayers : null,
          external_players: formData.externalPlayers.length > 0 ? formData.externalPlayers : null,
          status: 'scheduled'
        };

        console.log('🔵 Inserting single training:', trainingData);

        const { data, error } = await supabase
          .from('training_sessions')
          .insert(trainingData)
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating training:', error);
          throw error;
        }

        console.log('✅ Training erstellt:', data);
        
        // Log Training-Erstellung
        await LoggingService.logTrainingCreation(data);
      }

      // Reload trainings
      await loadTrainings();

      // Reset form und schließe
      setFormData({
        title: '',
        date: '',
        startTime: '17:00',
        endTime: '19:00',
        location: 'Draußen',
        venue: '',  // 🔧 Kein Hardcoded Venue
        type: 'team',
        maxPlayers: 8,
        targetPlayers: 8,
        weatherDependent: true,
        needsSubstitute: false,
        isRecurring: false,
        weekday: 3,
        notes: '',
        invitedPlayers: [],
        externalPlayers: []
      });
      setShowCreateForm(false);

      alert(formData.isRecurring 
        ? '✅ Wiederkehrende Trainings erfolgreich erstellt (26 Wochen / 6 Monate)!' 
        : '✅ Training erfolgreich erstellt!');
    } catch (error) {
      console.error('❌ Error creating training:', error);
      
      // Detaillierte Fehlermeldung
      let errorMsg = 'Fehler beim Erstellen';
      if (error.message.includes('permission') || error.message.includes('policy')) {
        errorMsg = 'Keine Berechtigung. Führe FIX_TRAINING_POLICIES.sql aus.';
      } else if (error.message.includes('null value')) {
        errorMsg = 'Fehlende Pflichtfelder. Bitte alle Felder ausfüllen.';
      } else if (error.code === '23505') {
        errorMsg = 'Dieses Training existiert bereits.';
      } else {
        errorMsg = `Fehler: ${error.message}`;
      }
      
      alert(`❌ ${errorMsg}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Berechne Dauer in Minuten
  const calculateDuration = (start, end) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  };

  // Zu-/Absage
  const handleResponse = async (sessionId, status) => {
    if (!player) return;

    try {
      setRespondingTo(sessionId);

      // Prüfe ob bereits geantwortet
      const training = trainings.find(t => t.id === sessionId);
      const existingResponse = training?.myAttendance;

      if (existingResponse) {
        // Update
        const { error } = await supabase
          .from('training_attendance')
          .update({
            status,
            response_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingResponse.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('training_attendance')
          .insert({
            session_id: sessionId,
            player_id: player.id,
            status,
            response_date: new Date().toISOString()
          });

        if (error) throw error;
        
        // Log Training-Zusage/Absage
        await LoggingService.logTrainingResponse(sessionId, status, player.id);
      }

      // Reload
      await loadTrainings();
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert('Fehler beim Speichern der Antwort');
    } finally {
      setRespondingTo(null);
    }
  };

  // WhatsApp Share
  const shareViaWhatsApp = (training) => {
    const date = new Date(training.date).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit'
    });
    const time = training.start_time?.slice(0, 5) || '';
    
    const message = `🎾 *Tennis-Training - Spieler gesucht!*\n\n` +
      `📅 ${date} um ${time} Uhr\n` +
      `📍 ${training.location} - ${training.venue}\n` +
      `👥 ${training.stats.confirmed}/${training.target_players} Zusagen\n\n` +
      `${training.notes || 'Wer hat Lust mitzumachen?'}\n\n` +
      `Anmelden in der App: ${window.location.origin}/training`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Formatiere Datum
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Formatiere Zeit
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.slice(0, 5);
  };

  // Status Badge
  const getStatusBadge = (training) => {
    const { confirmed } = training.stats;
    const { target_players, max_players, needs_substitute } = training;

    if (needs_substitute) {
      return { icon: <AlertCircle size={16} />, text: 'Spieler gesucht', color: '#f59e0b' };
    }
    if (confirmed >= target_players) {
      return { icon: <CheckCircle size={16} />, text: 'Vollständig', color: '#10b981' };
    }
    if (confirmed >= target_players - 2) {
      return { icon: <Users size={16} />, text: 'Fast voll', color: '#3b82f6' };
    }
    return { icon: <Users size={16} />, text: `${confirmed}/${target_players}`, color: '#6b7280' };
  };

  // Render Training Card
  const renderTrainingCard = (training) => {
    const status = getStatusBadge(training);
    const myResponse = training.myAttendance?.status;
    const isOrganizer = training.organizer_id === player?.id;
    const isPrivate = training.type === 'private';
    const totalParticipants = (training.invited_players?.length || 0) + (training.external_players?.length || 0);

    return (
      <div key={training.id} className="fade-in lk-card-full">
        {/* Header */}
        <div className="formkurve-header">
          <div className="formkurve-title">
            {isPrivate && !training.needs_substitute && '🔒 '}
            {training.needs_substitute && '🔔 '}
            {training.title || 'Training'}
          </div>
          <div 
            className="match-count-badge"
            style={{ backgroundColor: status.color }}
          >
            {status.icon}
            <span style={{ marginLeft: '0.35rem' }}>{status.text}</span>
          </div>
        </div>

        <div className="season-content">
          {/* Training Info */}
          <div style={{ marginBottom: '1rem' }}>
            {/* Datum & Zeit */}
            <div className="match-info-row">
              <Calendar size={18} color="#6b7280" />
              <span style={{ fontSize: '0.95rem', fontWeight: '600' }}>
                {formatDate(training.date)}
              </span>
            </div>

            <div className="match-info-row">
              <Clock size={18} color="#6b7280" />
              <span style={{ fontSize: '0.9rem' }}>
                {formatTime(training.start_time)} - {formatTime(training.end_time)} Uhr
                {training.duration && ` (${training.duration} Min.)`}
              </span>
            </div>

            {/* Location */}
            <div className="match-info-row">
              {training.location === 'Draußen' ? (
                <Sun size={18} color="#f59e0b" />
              ) : (
                <Home size={18} color="#3b82f6" />
              )}
              <span style={{ fontSize: '0.9rem' }}>
                <strong>{training.location}</strong>
                {training.venue && ` - ${training.venue}`}
              </span>
            </div>

            {/* Teilnehmer */}
            <div className="match-info-row">
              <Users size={18} color="#6b7280" />
              <span style={{ fontSize: '0.9rem' }}>
                {training.stats.confirmed}/{training.target_players} Zusagen
                {training.max_players !== training.target_players && ` (max. ${training.max_players})`}
              </span>
            </div>

            {/* Weather Warning - nur wenn nicht bereits in Notes */}
            {training.weather_dependent && training.location === 'Draußen' && !training.notes?.toLowerCase().includes('wetter') && (
              <div 
                style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: '#78350f',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <AlertCircle size={16} />
                <span>Wetterabhängig! Bei Regen fällt das Training aus.</span>
              </div>
            )}

            {/* Notes */}
            {training.notes && (
              <div 
                style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  background: training.notes.toLowerCase().includes('wetter') ? '#fef3c7' : '#f8fafc',
                  border: training.notes.toLowerCase().includes('wetter') ? '1px solid #fde68a' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: training.notes.toLowerCase().includes('wetter') ? '#78350f' : '#475569',
                  display: 'flex',
                  alignItems: training.notes.toLowerCase().includes('wetter') ? 'center' : 'flex-start',
                  gap: '0.5rem'
                }}
              >
                {training.notes.toLowerCase().includes('wetter') && <AlertCircle size={16} />}
                <span style={{ fontStyle: training.notes.toLowerCase().includes('wetter') ? 'normal' : 'italic' }}>
                  {training.notes}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Zusagen */}
            <button
              className={`btn-modern ${myResponse === 'confirmed' ? 'btn-modern-active' : 'btn-modern-inactive'}`}
              onClick={() => handleResponse(training.id, 'confirmed')}
              disabled={respondingTo === training.id}
              style={{
                flex: 1,
                background: myResponse === 'confirmed' ? 
                  'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined
              }}
            >
              <CheckCircle size={16} />
              Bin dabei!
            </button>

            {/* Absagen */}
            <button
              className={`btn-modern ${myResponse === 'declined' ? 'btn-modern-active' : 'btn-modern-inactive'}`}
              onClick={() => handleResponse(training.id, 'declined')}
              disabled={respondingTo === training.id}
              style={{
                flex: 1,
                background: myResponse === 'declined' ? 
                  'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : undefined
              }}
            >
              <XCircle size={16} />
              Kann nicht
            </button>

            {/* WhatsApp Share */}
            {(training.needs_substitute || training.type === 'private') && (
              <button
                className="btn-modern btn-modern-inactive"
                onClick={() => shareViaWhatsApp(training)}
                style={{ flex: '0 0 auto' }}
                title="In WhatsApp-Gruppe teilen"
              >
                <Share2 size={16} />
                Teilen
              </button>
            )}
          </div>

          {/* Teilnehmer-Liste */}
          {(training.stats.confirmed > 0 || (training.external_players && training.external_players.length > 0)) && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ 
                margin: '0 0 0.5rem 0', 
                fontSize: '0.85rem', 
                fontWeight: '700',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                ✅ Dabei ({training.stats.confirmed + (training.external_players?.length || 0)})
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {/* Interne Spieler (mit Zusage) */}
                {training.attendance
                  .filter(a => a.status === 'confirmed')
                  .map(a => {
                    const attendeePlayer = players.find(p => p.id === a.player_id);
                    return attendeePlayer ? (
                      <span 
                        key={a.id}
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: '#dcfce7',
                          border: '1px solid #bbf7d0',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          color: '#14532d'
                        }}
                      >
                        {attendeePlayer.name}
                      </span>
                    ) : null;
                  })}
                
                {/* Externe Spieler */}
                {training.external_players && training.external_players.map((ext, idx) => (
                  <span 
                    key={`ext-${idx}`}
                    style={{
                      padding: '0.5rem 0.75rem',
                      background: '#e0e7ff',
                      border: '1px solid #c7d2fe',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#3730a3',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    {ext.name}
                    {ext.lk && ` (${ext.lk})`}
                    {ext.club && (
                      <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                        • {ext.club}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dashboard container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Lade Trainings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard container">
      {/* Header */}
      <div className="fade-in" style={{ marginBottom: '1rem', paddingTop: '0.5rem' }}>
        <h1 className="hi">🎾 Training</h1>
      </div>

      {/* Filter & Create Button */}
      <div className="fade-in" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="sort-buttons-modern">
          <button
            className={`btn-modern ${selectedFilter === 'all' ? 'btn-modern-active' : 'btn-modern-inactive'}`}
            onClick={() => setSelectedFilter('all')}
          >
            <Calendar size={18} />
            Alle ({visibleTrainings.length})
          </button>
          <button
            className={`btn-modern ${selectedFilter === 'team' ? 'btn-modern-active' : 'btn-modern-inactive'}`}
            onClick={() => setSelectedFilter('team')}
          >
            <Users size={18} />
            Team-Training ({visibleTrainings.filter(t => t.type === 'team').length})
          </button>
          <button
            className={`btn-modern ${selectedFilter === 'mine' ? 'btn-modern-active' : 'btn-modern-inactive'}`}
            onClick={() => setSelectedFilter('mine')}
          >
            <Users size={18} />
            Meine Gruppen ({visibleTrainings.filter(t => t.type === 'private' && (t.organizer_id === player?.id || t.invited_players?.includes(player?.id))).length})
          </button>
        </div>
        
        {/* Create Training Button */}
        <button
          className="btn-modern btn-modern-active"
          onClick={() => setShowCreateForm(true)}
          style={{ flex: '0 0 auto' }}
        >
          <Plus size={18} />
          Training erstellen
        </button>
      </div>

      {/* Trainings-Liste */}
      {filteredTrainings.length === 0 ? (
        <div className="fade-in lk-card-full">
          <div className="season-content" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <Calendar size={64} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#6b7280' }}>
              Keine Trainings geplant
            </h3>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem' }}>
              Aktuell sind keine Trainings für {selectedFilter === 'team' ? 'Team-' : selectedFilter === 'mine' ? 'private ' : ''}Trainings geplant.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Diese Woche */}
          {groupedTrainings.thisWeek.length > 0 && (
            <div className="fade-in" style={{ marginBottom: '2rem' }}>
              <h2 style={{ 
                margin: '0 0 1rem 0', 
                fontSize: '1.1rem', 
                fontWeight: '700',
                color: '#374151'
              }}>
                📅 Diese Woche ({groupedTrainings.thisWeek.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {groupedTrainings.thisWeek.map(renderTrainingCard)}
              </div>
            </div>
          )}

          {/* Nächste Woche */}
          {groupedTrainings.nextWeek.length > 0 && (
            <div className="fade-in" style={{ marginBottom: '2rem' }}>
              <h2 style={{ 
                margin: '0 0 1rem 0', 
                fontSize: '1.1rem', 
                fontWeight: '700',
                color: '#374151'
              }}>
                📆 Nächste Woche ({groupedTrainings.nextWeek.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {groupedTrainings.nextWeek.map(renderTrainingCard)}
              </div>
            </div>
          )}

          {/* Später */}
          {groupedTrainings.later.length > 0 && (
            <div className="fade-in">
              <h2 style={{ 
                margin: '0 0 1rem 0', 
                fontSize: '1.1rem', 
                fontWeight: '700',
                color: '#374151'
              }}>
                🗓️ Später ({groupedTrainings.later.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {groupedTrainings.later.map(renderTrainingCard)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Training Modal/Form */}
      {showCreateForm && (
        <div 
          className="modal-overlay"
          onClick={() => setShowCreateForm(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '1.5rem'
            }}
          >
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: '700' }}>
              ➕ Training erstellen
            </h2>

            <form onSubmit={handleCreateTraining}>
              {/* Typ */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                  Training-Typ
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className={`btn-modern ${formData.type === 'team' ? 'btn-modern-active' : 'btn-modern-inactive'}`}
                    onClick={() => setFormData(prev => ({ ...prev, type: 'team', weatherDependent: true }))}
                    style={{ flex: 1 }}
                  >
                    <Users size={16} />
                    Team-Training
                  </button>
                  <button
                    type="button"
                    className={`btn-modern ${formData.type === 'private' ? 'btn-modern-active' : 'btn-modern-inactive'}`}
                    onClick={() => setFormData(prev => ({ ...prev, type: 'private', weatherDependent: false, location: 'Halle' }))}
                    style={{ flex: 1 }}
                  >
                    <Home size={16} />
                    Privat
                  </button>
                </div>
              </div>

              {/* Team-Auswahl (nur bei Team-Training) */}
              {formData.type === 'team' && (
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                    🏆 Team (für das trainiert wird)
                  </label>
                  {userTeams.length > 0 ? (
                    <>
                      <select
                        value={formData.teamId || ''}
                        onChange={(e) => {
                          const teamId = e.target.value;
                          setFormData(prev => ({ ...prev, teamId }));
                          loadTeamMembers(teamId);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          backgroundColor: 'white'
                        }}
                        required
                      >
                        <option value="">Bitte wählen...</option>
                        {userTeams.map(team => (
                          <option key={team.id} value={team.id}>
                            {team.club} - {team.name} ({team.category}, {team.league})
                          </option>
                        ))}
                      </select>
                      {formData.teamId && teamMembers.length > 0 && (
                        <p style={{ 
                          marginTop: '0.5rem', 
                          fontSize: '0.85rem', 
                          color: '#6b7280' 
                        }}>
                          👥 {teamMembers.length} Team-Mitglieder werden automatisch eingeladen
                        </p>
                      )}
                    </>
                  ) : (
                    <div style={{
                      padding: '1rem',
                      background: '#fef3c7',
                      borderRadius: '8px',
                      border: '1px solid #fbbf24'
                    }}>
                      <p style={{ margin: 0, color: '#92400e', fontSize: '0.9rem' }}>
                        ⚠️ Du bist aktuell keinem Team zugeordnet. Bitte wende dich an deinen Team Captain.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Titel */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                  Titel (optional)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={formData.type === 'team' ? 'Mannschaftstraining' : 'Privates Training'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {/* Wöchentlich wiederholen */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                    🔁 Wöchentlich wiederholen (6 Monate)
                  </span>
                </label>
              </div>

              {/* Wochentag (wenn wiederkehrend) */}
              {formData.isRecurring && (
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                    Wochentag *
                  </label>
                  <select
                    value={formData.weekday}
                    onChange={(e) => setFormData(prev => ({ ...prev, weekday: parseInt(e.target.value) }))}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="1">Montag</option>
                    <option value="2">Dienstag</option>
                    <option value="3">Mittwoch</option>
                    <option value="4">Donnerstag</option>
                    <option value="5">Freitag</option>
                    <option value="6">Samstag</option>
                    <option value="0">Sonntag</option>
                  </select>
                </div>
              )}

              {/* Datum (Startdatum bei wiederkehrend) */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                  {formData.isRecurring ? 'Startdatum (erster Termin) *' : 'Datum *'}
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                />
                {formData.isRecurring && (
                  <small style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                    💡 Es werden automatisch 26 Termine (6 Monate) erstellt
                  </small>
                )}
              </div>

              {/* Zeit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                    Von *
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                    Bis *
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                  Ort
                </label>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    className={`btn-modern ${formData.location === 'Draußen' ? 'btn-modern-active' : 'btn-modern-inactive'}`}
                    onClick={() => setFormData(prev => ({ ...prev, location: 'Draußen', venue: '', weatherDependent: true }))}
                    style={{ flex: 1 }}
                  >
                    <Sun size={16} />
                    Draußen
                  </button>
                  <button
                    type="button"
                    className={`btn-modern ${formData.location === 'Halle' ? 'btn-modern-active' : 'btn-modern-inactive'}`}
                    onClick={() => setFormData(prev => ({ ...prev, location: 'Halle', venue: '', weatherDependent: false }))}
                    style={{ flex: 1 }}
                  >
                    <Home size={16} />
                    Halle
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                  placeholder="Genaue Adresse/Halle"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {/* Teilnehmer-Anzahl */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                    Ideale Anzahl
                  </label>
                  <select
                    value={formData.targetPlayers}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetPlayers: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="2">2 Spieler</option>
                    <option value="4">4 Spieler</option>
                    <option value="6">6 Spieler</option>
                    <option value="8">8 Spieler</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                    Maximum
                  </label>
                  <select
                    value={formData.maxPlayers}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxPlayers: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="2">2 Spieler</option>
                    <option value="4">4 Spieler</option>
                    <option value="6">6 Spieler</option>
                    <option value="8">8 Spieler</option>
                    <option value="10">10 Spieler</option>
                    <option value="12">12 Spieler</option>
                  </select>
                </div>
              </div>

              {/* Private Training: Spieler einladen */}
              {formData.type === 'private' && (
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                    Mitspieler einladen
                  </label>
                  
                  {/* Interne Spieler (aus DB) - REGISTRIERT */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                      Aus deinem Team (registriert):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '200px', overflow: 'auto', padding: '0.5rem', background: '#f8fafc', borderRadius: '8px' }}>
                      {players.filter(p => p.is_active && p.id !== player?.id).map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              invitedPlayers: prev.invitedPlayers.includes(p.id)
                                ? prev.invitedPlayers.filter(id => id !== p.id)
                                : [...prev.invitedPlayers, p.id]
                            }));
                          }}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: formData.invitedPlayers.includes(p.id) ? '#10b981' : '#ffffff',
                            color: formData.invitedPlayers.includes(p.id) ? 'white' : '#374151',
                            border: formData.invitedPlayers.includes(p.id) ? 'none' : '2px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {formData.invitedPlayers.includes(p.id) && '✓ '}
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Importierte Spieler (OHNE Email) mit Suche */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#f59e0b', marginBottom: '0.5rem', fontWeight: '600' }}>
                      ⏳ Weitere Spieler suchen (warten auf Registrierung):
                    </div>
                    
                    {/* Suchfeld */}
                    <input
                      type="text"
                      placeholder="Name eingeben zum Suchen..."
                      value={importedPlayerSearch}
                      onChange={(e) => setImportedPlayerSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '2px solid #f59e0b',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        marginBottom: '0.5rem'
                      }}
                    />

                    {/* Gefundene Spieler */}
                    {importedPlayerSearch && (
                      <>
                        {importedPlayers.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflow: 'auto', padding: '0.5rem', background: '#fef3c7', borderRadius: '8px', border: '1px solid #f59e0b' }}>
                        {importedPlayers.map(ip => {
                          const isSelected = formData.invitedPlayers.includes(ip.id);
                          const hasEmail = importedPlayerEmails[ip.id];

                          return (
                            <div key={ip.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: isSelected ? '#10b981' : 'white', borderRadius: '6px', border: isSelected ? 'none' : '1px solid #e2e8f0' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    invitedPlayers: prev.invitedPlayers.includes(ip.id)
                                      ? prev.invitedPlayers.filter(id => id !== ip.id)
                                      : [...prev.invitedPlayers, ip.id]
                                  }));
                                }}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                              <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: '600', color: isSelected ? 'white' : '#374151' }}>
                                {ip.name} {ip.currentLk && `(LK ${ip.currentLk})`}
                              </span>
                              {isSelected && (
                                <input
                                  type="email"
                                  placeholder="Email eingeben..."
                                  value={importedPlayerEmails[ip.id] || ''}
                                  onChange={(e) => setImportedPlayerEmails(prev => ({ ...prev, [ip.id]: e.target.value }))}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    border: '1px solid white',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    width: '180px'
                                  }}
                                  required={isSelected}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                        ) : (
                          <div style={{ 
                            padding: '1rem', 
                            background: '#fef3c7', 
                            borderRadius: '8px', 
                            border: '1px solid #f59e0b',
                            textAlign: 'center',
                            color: '#92400e',
                            fontSize: '0.85rem'
                          }}>
                            🔍 Keine Spieler gefunden für "{importedPlayerSearch}"
                          </div>
                        )}
                      </>
                    )}

                    {/* Info-Text */}
                    {importedPlayers.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '0.5rem', fontStyle: 'italic' }}>
                        💡 Diese Spieler haben noch kein Konto. Du kannst ihnen manuell eine Einladung per Email schicken.
                      </div>
                    )}

                    {/* Hinweis wenn keine Suche */}
                    {!importedPlayerSearch && allImportedPlayers.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#92400e', fontStyle: 'italic' }}>
                        💡 {allImportedPlayers.length} Spieler verfügbar. Gib einen Namen ein, um zu suchen.
                      </div>
                    )}
                  </div>

                  {/* Externe Spieler */}
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                      Externe Spieler hinzufügen:
                    </div>
                    <ExternalPlayerInput 
                      externalPlayers={formData.externalPlayers}
                      onChange={(externals) => setFormData(prev => ({ ...prev, externalPlayers: externals }))}
                    />
                  </div>
                </div>
              )}

              {/* Spieler gesucht? */}
              {formData.type === 'private' && (
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.needsSubstitute}
                      onChange={(e) => setFormData(prev => ({ ...prev, needsSubstitute: e.target.checked }))}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                      🔔 Spieler gesucht (für alle sichtbar machen)
                    </span>
                  </label>
                </div>
              )}

              {/* Notizen */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                  Notizen (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Zusätzliche Informationen..."
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-modern btn-modern-inactive"
                  onClick={() => setShowCreateForm(false)}
                  disabled={isCreating}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="btn-modern btn-modern-active"
                  disabled={isCreating || !formData.date}
                >
                  {isCreating ? '⏳ Erstellt...' : '✅ Training erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Externe Spieler Input Component
function ExternalPlayerInput({ externalPlayers, onChange }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExternal, setNewExternal] = useState({ name: '', lk: '', club: '' });

  const handleAdd = () => {
    if (!newExternal.name.trim()) {
      alert('Bitte Namen eingeben');
      return;
    }
    
    onChange([...externalPlayers, { ...newExternal }]);
    setNewExternal({ name: '', lk: '', club: '' });
    setShowAddForm(false);
  };

  const handleRemove = (index) => {
    onChange(externalPlayers.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* Liste externe Spieler */}
      {externalPlayers.length > 0 && (
        <div style={{ marginBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {externalPlayers.map((ext, idx) => (
            <span
              key={idx}
              style={{
                padding: '0.5rem 0.75rem',
                background: '#e0e7ff',
                border: '1px solid #c7d2fe',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: '#3730a3',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {ext.name} {ext.lk && `(${ext.lk})`}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  lineHeight: 1,
                  padding: 0
                }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add Form */}
      {showAddForm ? (
        <div style={{ 
          padding: '1rem', 
          background: '#f8fafc', 
          border: '2px solid #e2e8f0', 
          borderRadius: '8px',
          marginBottom: '0.75rem'
        }}>
          <input
            type="text"
            value={newExternal.name}
            onChange={(e) => setNewExternal(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Name"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '0.85rem',
              marginBottom: '0.5rem'
            }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="text"
              value={newExternal.lk}
              onChange={(e) => setNewExternal(prev => ({ ...prev, lk: e.target.value }))}
              placeholder="LK (optional)"
              style={{
                padding: '0.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '0.85rem'
              }}
            />
            <input
              type="text"
              value={newExternal.club}
              onChange={(e) => setNewExternal(prev => ({ ...prev, club: e.target.value }))}
              placeholder="Verein (optional)"
              style={{
                padding: '0.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '0.85rem'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleAdd}
              style={{
                flex: 1,
                padding: '0.5rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ✓ Hinzufügen
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewExternal({ name: '', lk: '', club: '' });
              }}
              style={{
                flex: 1,
                padding: '0.5rem',
                background: '#ffffff',
                color: '#6b7280',
                border: '2px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn-modern btn-modern-inactive"
          onClick={() => setShowAddForm(true)}
          style={{ width: '100%' }}
        >
          <Plus size={16} />
          Externen Spieler hinzufügen
        </button>
      )}
    </div>
  );
}

export default Training;

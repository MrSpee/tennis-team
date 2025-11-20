import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Clock, Sun, Home, AlertCircle, CheckCircle, XCircle, Plus, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabaseClient';
import { LoggingService } from '../services/activityLogger';
import { calculateTrainingParticipants } from '../services/simpleRotationService';
import './Dashboard.css';

function Training() {
  const navigate = useNavigate();
  const { player } = useAuth();
  const { players } = useData();
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'team', 'mine'
  const [respondingTo, setRespondingTo] = useState(null);
  const [comment, setComment] = useState(''); // Kommentar für Zu-/Absage
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTraining, setEditingTraining] = useState(null); // Training zum Bearbeiten
  const [isDeleting, setIsDeleting] = useState(null); // Training-ID beim Löschen
  const [showInviteForm, setShowInviteForm] = useState(null); // Training-ID für Einladungsformular
  const [inviteMessage, setInviteMessage] = useState(''); // Editierbarer Einladungstext
  const [showHistory, setShowHistory] = useState(false); // Zeige Historie mit vergangenen Trainings
  const [pastTrainings, setPastTrainings] = useState([]); // Vergangene Trainings
  const [showMineDropdown, setShowMineDropdown] = useState(false); // Dropdown-Status für "Meine Trainingseinheiten"
  
  // Neu: User Teams
  const [userTeams, setUserTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [importedPlayers, setImportedPlayers] = useState([]); // Importierte Spieler (ohne Email)
  const [importedPlayerEmails, setImportedPlayerEmails] = useState({}); // { playerId: email }
  const [importedPlayerSearch, setImportedPlayerSearch] = useState(''); // Suchfeld für importierte Spieler
  const [allImportedPlayers, setAllImportedPlayers] = useState([]); // Alle importierten Spieler (ungefiltered)
  const [whatsappInviteSent, setWhatsappInviteSent] = useState({}); // { playerId: true/false } - Tracking für gesendete Einladungen
  
  // Round-Robin States
  const [rotationList, setRotationList] = useState([
    { name: 'Alexander Elwert', id: null },
    { name: 'Marc Stoppenbach', id: null },
    { name: 'Markus Wilwerscheid', id: null },
    { name: 'Chris Spee', id: null },
    { name: 'Raoul van Herwijnen', id: null }
  ]);
  
  // Lade Spieler-IDs für Rotation
  useEffect(() => {
    if (players && players.length > 0) {
      setRotationList(prev => {
        const updated = prev.map(rotPlayer => {
          const found = players.find(p => p.name === rotPlayer.name);
          return found ? { ...rotPlayer, id: found.id } : rotPlayer;
        });
        return updated;
      });
    }
  }, [players]); // eslint-disable-next-line react-hooks/exhaustive-deps
  
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

  // Lade Teams des Users (VOR dem useEffect!)
  const loadUserTeams = async () => {
    if (!player) return;
    
    try {
      console.log('🔍 Loading teams for player:', player.id);
      
      const { data, error } = await supabase
        .from('team_memberships')
        .select(`
          *,
          team_info!inner (
            id,
            team_name,
            club_name,
            category
          )
        `)
        .eq('player_id', player.id)
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error loading user teams:', error);
        throw error;
      }

      console.log('📊 Raw team_memberships data:', data);

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

  // Lade ALLE Spieler (clubübergreifend für Privat-Training)
  const loadImportedPlayersForPrivateTraining = useCallback(async () => {
    try {
      console.log('🔍 Loading ALL players for private training (registered + imported)');
      
      // 1. Lade ALLE Spieler aus players_unified (vereins-übergreifend)
      const { data: allPlayers, error: playersError } = await supabase
        .from('players_unified')
        .select('id, name, email, current_lk, phone, season_start_lk')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (playersError) {
        console.warn('⚠️ Could not load players:', playersError);
      }

      // 2. Keine separate imported_players Tabelle mehr - alle Spieler sind in players_unified

      console.log('📊 Raw data:', { players: allPlayers?.length });

      // 3. Kombiniere alle Spieler (ohne eigene ID)
      const allAvailablePlayers = (allPlayers || [])
        .filter(p => p.id !== player?.id) // Ausschluss des aktuellen Spielers
        .map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          currentLk: p.current_lk || p.season_start_lk,
          phone: p.phone,
          teamId: p.primary_team_id,
          source: 'registered'
        }));

      console.log('✅ All players loaded for private training:', {
        total: allAvailablePlayers.length
      });
      
      setAllImportedPlayers(allAvailablePlayers); // Speichere ALLE für Suche
      setImportedPlayers([]); // Zeige zunächst keine an (erst bei Suche)

    } catch (error) {
      console.error('❌ Error loading all players:', error);
      setAllImportedPlayers([]);
      setImportedPlayers([]);
    }
  }, [player]);

  // Lade Team-Mitglieder (registriert UND importiert)
  const loadTeamMembers = async (teamId) => {
    if (!teamId) return;
    
    try {
      // Lade Team-Mitglieder aus team_memberships
      const { data: teamMembersData, error: registeredError } = await supabase
        .from('team_memberships')
        .select(`
          *,
          player:player_id (
            id,
            name,
            email,
            current_lk,
            season_start_lk
          )
        `)
        .eq('team_id', teamId)
        .eq('is_active', true);

      if (registeredError) throw registeredError;

      const teamMembers = (teamMembersData || []).map(tm => ({
        id: tm.player.id,
        name: tm.player.name,
        email: tm.player.email,
        currentLk: tm.player.current_lk || tm.player.season_start_lk,
        isPrimary: tm.is_primary,
        role: tm.role,
        source: 'registered'
      }));

      setTeamMembers(teamMembers);
      setImportedPlayers([]); // Keine separate imported_players mehr

    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  // Lade Spieler mit Statistiken - ENTFERNT (vereinfacht)

  // Lade Trainings
  const loadTrainings = async () => {
    if (!userTeams) {
      console.log('⏭️ Skipping loadTrainings - userTeams not loaded yet');
      return;
    }
    
    try {
      setLoading(true);
      
      const playerTeamIds = userTeams.map(t => t.id);
      console.log('🔒 Loading trainings for player teams:', playerTeamIds);

      let teamTrainings = [];
      let teamError = null;
      
      if (playerTeamIds.length > 0) {
        const { data, error } = await supabase
          .from('training_sessions')
          .select(`*, organizer:organizer_id (id, name, profile_image)`)
          .in('team_id', playerTeamIds)
          .gte('date', new Date().toISOString())
          .order('date', { ascending: true });
        
        teamTrainings = data;
        teamError = error;
      }

      if (teamError) throw teamError;

      const { data: privateTrainings, error: privateError } = await supabase
        .from('training_sessions')
        .select(`*, organizer:organizer_id (id, name, profile_image)`)
        .is('team_id', null)
        .eq('type', 'private')
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true });

      if (privateError) throw privateError;

      const filteredPrivate = (privateTrainings || []).filter(pt => {
        const isOrganizer = pt.organizer_id === player?.id;
        const isInvited = pt.invited_players?.includes(player?.id);
        const isPublic = pt.is_public && pt.needs_substitute;
        return isOrganizer || isInvited || isPublic;
      });

      const sessionsData = [...(teamTrainings || []), ...(filteredPrivate || [])];

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('training_attendance')
        .select('*');

      if (attendanceError) throw attendanceError;

      const trainingsWithAttendance = (sessionsData || []).map(session => {
        const attendance = (attendanceData || []).filter(a => a.session_id === session.id);
        const myAttendance = attendance.find(a => a.player_id === player?.id);
        
        const confirmed = attendance.filter(a => a.status === 'confirmed').length;
        const declined = attendance.filter(a => a.status === 'declined').length;

        return {
          ...session,
          attendance,
          myAttendance,
          stats: { confirmed, declined, pending: 0 }
        };
      });

      setTrainings(trainingsWithAttendance);
    } catch (error) {
      console.error('Error loading trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Schließe Dropdown wenn außerhalb geklickt wird
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.mine-dropdown-container')) {
        setShowMineDropdown(false);
      }
    };

    if (showMineDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMineDropdown]);

  // Lade User Teams beim Mount
  useEffect(() => {
    if (player?.id) {
      loadUserTeams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  // Lade Trainings wenn userTeams geladen wurde (auch wenn leer)
  useEffect(() => {
    if (userTeams && player?.id) {
      loadTrainings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTeams, player]);

  // Lade importierte Spieler beim Öffnen des Formulars (für Privat-Training)
  useEffect(() => {
    if (showCreateForm && formData.type === 'private') {
      console.log('🔍 Loading ALL imported players (club-wide)');
      loadImportedPlayersForPrivateTraining();
    }
  }, [showCreateForm, formData.type, loadImportedPlayersForPrivateTraining]);

  // Filter ALLE Spieler basierend auf Suche (registriert + importiert)
  useEffect(() => {
    if (!importedPlayerSearch.trim()) {
      setImportedPlayers([]);
      return;
    }

    const searchLower = importedPlayerSearch.toLowerCase();
    const filtered = allImportedPlayers.filter(player => 
      player.name.toLowerCase().includes(searchLower) ||
      (player.currentLk && player.currentLk.toString().includes(searchLower))
    );

    console.log(`🔍 Filtered ${filtered.length} players for search: "${importedPlayerSearch}"`, {
      registered: filtered.filter(p => p.source === 'registered').length,
      imported: filtered.filter(p => p.source === 'imported').length
    });
    setImportedPlayers(filtered);
  }, [importedPlayerSearch, allImportedPlayers]);

  // Lade vergangene Trainings für Historie
  const loadPastTrainings = async () => {
    if (!player) return;
    
    try {
      const playerTeamIds = userTeams.map(t => t.id);
      
      let pastTeamTrainings = [];
      if (playerTeamIds.length > 0) {
        const { data } = await supabase
          .from('training_sessions')
          .select('*')
          .in('team_id', playerTeamIds)
          .lt('date', new Date().toISOString())
          .order('date', { ascending: false })
          .limit(20);
        
        pastTeamTrainings = data || [];
      }

      const { data: privatePast } = await supabase
        .from('training_sessions')
        .select('*')
        .is('team_id', null)
        .eq('type', 'private')
        .lt('date', new Date().toISOString())
        .order('date', { ascending: false })
        .limit(20);

      const filteredPrivatePast = (privatePast || []).filter(pt => {
        const isOrganizer = pt.organizer_id === player?.id;
        const isInvited = pt.invited_players?.includes(player?.id);
        return isOrganizer || isInvited;
      });

      const allPastTrainings = [...pastTeamTrainings, ...filteredPrivatePast];
      const pastIds = allPastTrainings.map(t => t.id);
      
      if (pastIds.length > 0) {
        const { data: attendanceData } = await supabase
          .from('training_attendance')
          .select('*')
          .in('session_id', pastIds);

        const pastWithAttendance = allPastTrainings.map(training => {
          const attendance = (attendanceData || []).filter(a => a.session_id === training.id);
          const myAttendance = attendance.find(a => a.player_id === player?.id);
          
          const confirmed = attendance.filter(a => a.status === 'confirmed').length;
          const declined = attendance.filter(a => a.status === 'declined').length;
          
          return {
            ...training,
            attendance,
            myAttendance,
            stats: {
              confirmed,
              declined,
              pending: 0
            }
          };
        });

        setPastTrainings(pastWithAttendance);
      }
    } catch (error) {
      console.error('Error loading past trainings:', error);
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

      // 🔒 BERECHTIGUNG: Vereinstraining nur für eigene Vereins-Mitglieder
      if (formData.type === 'team' && formData.teamId) {
        const isTeamMember = userTeams.some(team => team.id === formData.teamId);
        if (!isTeamMember) {
          alert('❌ Fehler: Du bist kein Mitglied dieses Teams. Du kannst nur Trainings für deine eigenen Teams erstellen.');
          setIsCreating(false);
          return;
        }
      }

      // 🔧 FIX: Trenne registrierte Spieler von importierten Spielern
      // Registrierte Spieler: Direkt in players Tabelle prüfen
      const registeredPlayerIds = formData.invitedPlayers.filter(id => 
        players.some(p => p.id === id)
      );

      // Importierte Spieler: Nur die, die NICHT in players sind
      const importedPlayerIds = formData.invitedPlayers.filter(id => 
        !players.some(p => p.id === id) && 
        allImportedPlayers.some(p => p.id === id && p.source === 'imported')
      );

      console.log('🔍 Registered players:', registeredPlayerIds);
      console.log('🔍 Imported players:', importedPlayerIds);

      // 🔧 FIX: Konvertiere importierte Spieler zu external_players
      const importedAsExternal = importedPlayerIds.map(id => {
        const importedPlayer = allImportedPlayers.find(p => p.id === id && p.source === 'imported');
        return {
          name: importedPlayer.name,
          lk: importedPlayer.currentLk || '',
          club: 'Wartet auf Registrierung',
          email: importedPlayer.email || null,
          phone: importedPlayer.phone || null,
          imported_player_id: id // Referenz behalten für späteres Merge
        };
      });

      console.log('📊 Invited players breakdown:', {
        registered: registeredPlayerIds.length,
        imported: importedAsExternal.length,
        external: formData.externalPlayers.length
      });

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
            team_id: formData.type === 'team' ? formData.teamId : null,
            invitation_mode: formData.type === 'team' ? formData.invitationMode : null,
            is_public: formData.type === 'team' ? true : formData.needsSubstitute,
            organizer_id: player.id,
            max_players: parseInt(formData.maxPlayers),
            target_players: parseInt(formData.targetPlayers),
            needs_substitute: formData.needsSubstitute || false,
            weather_dependent: formData.weatherDependent || false,
            title: formData.title || (formData.type === 'team' ? 'Team-Training' : 'Privates Training'),
            notes: formData.notes || null,
            invited_players: registeredPlayerIds.length > 0 ? registeredPlayerIds : null, // 🔧 FIX: Nur registrierte
            external_players: [...formData.externalPlayers, ...importedAsExternal].length > 0 
              ? [...formData.externalPlayers, ...importedAsExternal] 
              : null, // 🔧 FIX: Inkl. importierte mit Email
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

        // 🔧 FIX: Bei PRIVATEM wiederkehrendem Training → Auto-Create Attendance für eingeladene Spieler
        if (formData.type === 'private' && registeredPlayerIds.length > 0) {
          console.log('📧 Creating auto-attendance for recurring trainings...');
          
          // Hole die erstellten Training-IDs
          const { data: createdTrainings, error: fetchError } = await supabase
            .from('training_sessions')
            .select('id')
            .eq('organizer_id', player.id)
            .eq('title', formData.title || 'Privates Training')
            .order('created_at', { ascending: false })
            .limit(trainingsToCreate.length);

          if (fetchError) {
            console.warn('⚠️ Could not fetch created trainings:', fetchError);
          } else if (createdTrainings) {
            // Erstelle Attendance-Einträge für alle wiederkehrenden Trainings
            const allAttendanceEntries = [];
            createdTrainings.forEach(training => {
              registeredPlayerIds.forEach(playerId => {
                allAttendanceEntries.push({
                  session_id: training.id,
                  player_id: playerId,
                  status: 'pending',
                  response_date: null
                });
              });
            });

            const { error: attendanceError } = await supabase
              .from('training_attendance')
              .insert(allAttendanceEntries);

            if (attendanceError) {
              console.warn('⚠️ Could not create auto-attendance for recurring trainings:', attendanceError);
            } else {
              console.log(`✅ Auto-attendance created for ${allAttendanceEntries.length} recurring training entries`);
            }
          }
        }
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
          team_id: formData.type === 'team' ? formData.teamId : null,
          invitation_mode: formData.type === 'team' ? formData.invitationMode : null,
          is_public: formData.type === 'team' ? true : formData.needsSubstitute,
          organizer_id: player.id,
          max_players: parseInt(formData.maxPlayers),
          target_players: parseInt(formData.targetPlayers),
          needs_substitute: formData.needsSubstitute || false,
          weather_dependent: formData.weatherDependent || false,
          title: formData.title || (formData.type === 'team' ? 'Team-Training' : 'Privates Training'),
          notes: formData.notes || null,
          invited_players: registeredPlayerIds.length > 0 ? registeredPlayerIds : null, // 🔧 FIX: Nur registrierte
          external_players: [...formData.externalPlayers, ...importedAsExternal].length > 0 
            ? [...formData.externalPlayers, ...importedAsExternal] 
            : null, // 🔧 FIX: Inkl. importierte mit Email
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

        // 🔧 FIX: Bei Team-Training → Auto-Create Attendance für Team-Mitglieder
        if (formData.type === 'team' && formData.teamId && teamMembers.length > 0) {
          console.log('📧 Creating auto-attendance for team members...');
          
          const attendanceEntries = teamMembers.map(member => ({
            session_id: data.id,
            player_id: member.id,
            status: 'pending', // Alle starten als "pending"
            response_date: null
          }));

          const { error: attendanceError } = await supabase
            .from('training_attendance')
            .insert(attendanceEntries);

          if (attendanceError) {
            console.warn('⚠️ Could not create auto-attendance:', attendanceError);
          } else {
            console.log(`✅ Auto-attendance created for ${teamMembers.length} team members`);
          }
        }

        // 🔧 FIX: Bei PRIVATEM Training → Auto-Create Attendance für eingeladene Spieler
        if (formData.type === 'private' && registeredPlayerIds.length > 0) {
          console.log('📧 Creating auto-attendance for invited players...');
          
          const attendanceEntries = registeredPlayerIds.map(playerId => ({
            session_id: data.id,
            player_id: playerId,
            status: 'pending', // Alle starten als "pending"
            response_date: null
          }));

          const { error: attendanceError } = await supabase
            .from('training_attendance')
            .insert(attendanceEntries);

          if (attendanceError) {
            console.warn('⚠️ Could not create auto-attendance for invited players:', attendanceError);
          } else {
            console.log(`✅ Auto-attendance created for ${registeredPlayerIds.length} invited players`);
          }
        }
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
        teamId: userTeams.find(t => t.isPrimary)?.id || null,
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
      setImportedPlayerSearch(''); // 🔧 FIX: Reset Suche
      setImportedPlayerEmails({}); // 🔧 FIX: Reset Emails
      setWhatsappInviteSent({}); // 🔧 FIX: Reset WhatsApp-Status
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

  // Zu-/Absage mit Kommentar
  const handleResponse = async (sessionId, status) => {
    if (!player) return;

    try {
      setRespondingTo(sessionId);

      console.log('🔵 Setting training response:', { sessionId, status, comment });

      // Prüfe ob bereits geantwortet
      // WICHTIG: Suche direkt in der Datenbank, nicht nur in training.myAttendance
      // (kann sein, dass myAttendance nicht korrekt gesetzt ist)
      const { data: existingAttendance, error: checkError } = await supabase
        .from('training_attendance')
        .select('id, status')
        .eq('session_id', sessionId)
        .eq('player_id', player.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = "not found" (ok)
        console.error('❌ Error checking existing attendance:', checkError);
        throw new Error(`Fehler beim Prüfen: ${checkError.message}`);
      }

      if (existingAttendance) {
        // Update - WICHTIG: Verwende session_id UND player_id für Sicherheit
        const { error } = await supabase
          .from('training_attendance')
          .update({
            status,
            comment: comment || null,
            response_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('session_id', sessionId)
          .eq('player_id', player.id);

        if (error) {
          console.error('❌ Supabase Update Error:', error);
          throw new Error(`Update fehlgeschlagen: ${error.message}`);
        }
        
        console.log(`✅ Updated attendance: ${existingAttendance.id} → status: ${status}`);
      } else {
        // Insert
        const { error } = await supabase
          .from('training_attendance')
          .insert({
            session_id: sessionId,
            player_id: player.id,
            status,
            comment: comment || null,
            response_date: new Date().toISOString()
          });

        if (error) {
          console.error('❌ Supabase Insert Error:', error);
          throw new Error(`Speichern fehlgeschlagen: ${error.message}`);
        }
        
        // Log Training-Zusage/Absage
        try {
          // Mappe 'confirmed'/'declined' zu 'confirm'/'decline' für Logging
          const logStatus = status === 'confirmed' ? 'confirm' : 'decline';
          await LoggingService.logTrainingResponse(sessionId, logStatus, player.id);
        } catch (logError) {
          console.warn('⚠️ Logging failed (non-critical):', logError);
        }
      }

      console.log('✅ Training response saved successfully');

      // Reset & Reload
      setComment('');
      setRespondingTo(null);
      
      await loadTrainings();
      
      // 🔧 FIX: Nach Reload zurück zur Training-Card scrollen
      setTimeout(() => {
        const updatedTrainingCard = document.querySelector(`[data-training-id="${sessionId}"]`);
        if (updatedTrainingCard) {
          updatedTrainingCard.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
          
          // Zusätzlich: Training-Card kurz hervorheben
          updatedTrainingCard.style.transition = 'box-shadow 0.3s ease';
          updatedTrainingCard.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.3)';
          setTimeout(() => {
            updatedTrainingCard.style.boxShadow = '';
          }, 2000);
        }
      }, 150);
      
    } catch (error) {
      console.error('❌ Error updating attendance:', error);
      
      // 🔧 FIX: Detaillierte Fehlermeldung
      let errorMessage = 'Fehler beim Speichern der Antwort';
      
      if (error.message.includes('permission') || error.message.includes('policy')) {
        errorMessage = '❌ Keine Berechtigung. Bitte melde dich erneut an.';
      } else if (error.message.includes('null value')) {
        errorMessage = '❌ Fehlende Daten. Bitte versuche es erneut.';
      } else if (error.message.includes('duplicate key')) {
        errorMessage = '❌ Du hast bereits geantwortet.';
      } else if (error.message.includes('foreign key')) {
        errorMessage = '❌ Training nicht gefunden.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = '❌ Netzwerkfehler. Bitte prüfe deine Internetverbindung.';
      } else {
        errorMessage = `❌ ${error.message}`;
      }
      
      alert(errorMessage);
      setRespondingTo(null);
    }
  };


  // WhatsApp-Einladung für JEDEN Spieler (registriert oder importiert)
  const invitePlayerViaWhatsApp = (playerId, playerName, playerPhone = null) => {
    // Platzhirsch-Einladungstext (ohne Emojis wegen Encoding)
    const message = `*Hey Ballkuenstler!*\n\n` +
      `Die Zeiten von WhatsApp-Chaos und "Wer kommt heute?" sind vorbei\n\n` +
      `In der *Platzhirsch App* siehst du sofort, wer trainiert, wann gespielt wird und wie's um deine LK steht\n\n` +
      `Und das Beste: du kannst direkt deine Verfuegbarkeit fuer Medenspiele eintragen - keine Ausreden mehr!\n\n` +
      `Hier geht's in dein Revier: https://tennis-team-gamma.vercel.app/\n\n` +
      `*Werde Platzhirsch!*`;
    
    // Mit Telefonnummer → Direktlink, sonst nur Message
    const whatsappUrl = playerPhone 
      ? `https://wa.me/${playerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    
    // Markiere als "Einladung gesendet"
    setWhatsappInviteSent(prev => ({ ...prev, [playerId]: true }));
    
    console.log(`📱 WhatsApp-Einladung gesendet an ${playerName}${playerPhone ? ` (${playerPhone})` : ' (ohne Nummer)'}`);
  };

  // Training bearbeiten (nur Organisator)
  const handleEditTraining = (training) => {
    console.log('✏️ Editing training:', training);
    
    setEditingTraining(training);
    setFormData({
      title: training.title || '',
      date: training.date.split('T')[0],
      startTime: training.start_time || '17:00',
      endTime: training.end_time || '19:00',
      location: training.location,
      venue: training.venue || '',
      type: training.type,
      teamId: training.team_id,
      maxPlayers: training.max_players,
      targetPlayers: training.target_players,
      weatherDependent: training.weather_dependent,
      needsSubstitute: training.needs_substitute,
      isRecurring: false,
      notes: training.notes || '',
      invitedPlayers: training.invited_players || [],
      externalPlayers: training.external_players || []
    });
    setShowCreateForm(true);
  };

  // Training aktualisieren
  const handleUpdateTraining = async (e) => {
    e.preventDefault();
    
    if (!editingTraining) return;

    try {
      setIsCreating(true);

      const dateTime = new Date(`${formData.date}T${formData.startTime}`);

      const { error } = await supabase
        .from('training_sessions')
        .update({
          date: dateTime.toISOString(),
          start_time: formData.startTime,
          end_time: formData.endTime,
          duration: calculateDuration(formData.startTime, formData.endTime),
          location: formData.location,
          venue: formData.venue || null,
          max_players: parseInt(formData.maxPlayers),
          target_players: parseInt(formData.targetPlayers),
          weather_dependent: formData.weatherDependent,
          needs_substitute: formData.needsSubstitute,
          title: formData.title || null,
          notes: formData.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTraining.id);

      if (error) throw error;

      console.log('✅ Training updated');
      
      // Reload
      await loadTrainings();
      
      // Reset
      setEditingTraining(null);
      setShowCreateForm(false);
      
      alert('✅ Training erfolgreich aktualisiert!');
    } catch (error) {
      console.error('❌ Error updating training:', error);
      alert(`❌ Fehler beim Aktualisieren: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Training löschen (nur Organisator)
  const handleDeleteTraining = async (trainingId) => {
    if (!confirm('❌ Training wirklich löschen? Dies kann nicht rückgängig gemacht werden!')) {
      return;
    }

    try {
      setIsDeleting(trainingId);

      const { error } = await supabase
        .from('training_sessions')
        .delete()
        .eq('id', trainingId);

      if (error) throw error;

      console.log('✅ Training deleted:', trainingId);
      
      // Reload
      await loadTrainings();
      
      alert('✅ Training gelöscht!');
    } catch (error) {
      console.error('❌ Error deleting training:', error);
      alert(`❌ Fehler beim Löschen: ${error.message}`);
    } finally {
      setIsDeleting(null);
    }
  };


  // Generiere Standard-Einladungstext
  const generateDefaultInviteMessage = (training) => {
    return `Hi [],

wir haben einen freien Platz bei unserem Training! 🚀

📅 ${formatDate(training.date)} um ${formatTime(training.start_time)} Uhr
📍 ${training.location} - ${training.venue}

Schreib mir gerne, ob du dabei bist oder melde dich direkt in der App an:
https://tennis-team-gamma.vercel.app/

Wir sehen uns auf dem Platz! 🎾`;
  };
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

  // Status Badge - X/Y Format mit Farben
  const getStatusBadge = (confirmedCount, maxPlayers, hasWaitlist = false) => {
    const text = `${confirmedCount}/${maxPlayers}`;
    
    // Farbliche Indikation
    let color;
    if (confirmedCount > maxPlayers || hasWaitlist) {
      color = '#ef4444'; // Rot - ÜBERBUCHT! Achtung!
    } else if (confirmedCount === maxPlayers) {
      color = '#10b981'; // Grün - Voll
    } else if (confirmedCount >= maxPlayers - 1) {
      color = '#3b82f6'; // Blau - Fast voll
    } else if (confirmedCount >= maxPlayers / 2) {
      color = '#f59e0b'; // Gelb - Mittel
    } else {
      color = '#ef4444'; // Rot - Wenig
    }

    return { text, color };
  };

  // Berechne Rotation-Index für ein Training basierend auf allen Trainings vor ihm
  const calculateRotationIndexForTraining = (targetTraining, allTrainings) => {
    // Nur Trainings vor dem Ziel-Training
    const beforeTrainings = allTrainings.filter(t => new Date(t.date) < new Date(targetTraining.date));
    
    let currentIndex = 0;
    
    // Durchlaufe alle Trainings vor dem Ziel
    beforeTrainings.forEach(prevTraining => {
      const prevAttendance = prevTraining.attendance || [];
      const prevConfirmed = prevAttendance.filter(a => a.status === 'confirmed').length;
      
      // Bei ≥5 Anmeldungen: Rotation weiter
      if (prevConfirmed >= 5) {
        currentIndex = (currentIndex + 1) % 5;
      }
      // Bei <5: Index bleibt gleich
    });
    
    return currentIndex;
  };

  // Render Training Card
  const renderTrainingCard = (training) => {
    const attendance = training.attendance || [];
    
    // Berechne Rotation-Index für dieses Training
    const currentRotationIndex = calculateRotationIndexForTraining(training, trainings);
    
    // Verwende Simple-Rotation-Logik
    const { canPlay, waitlist } = calculateTrainingParticipants(
      training,
      attendance,
      currentRotationIndex,
      rotationList
    );
    
    // Bestätigte Anmeldungen zählen (inkl. Warteliste)
    const confirmedCount = attendance.filter(a => a.status === 'confirmed').length;
    
    const status = getStatusBadge(confirmedCount, training.max_players, waitlist.length > 0);
    const myResponse = training.myAttendance?.status;
    const isOrganizer = training.organizer_id === player?.id;
    
    // Mein Status
    const amIPlaying = canPlay.some(p => p.player_id === player?.id);
    const amIOnWaitlist = waitlist.some(p => p.player_id === player?.id);

    return (
      <div key={training.id} className="fade-in lk-card-full" data-training-id={training.id}>
        {/* Header */}
        <div className="formkurve-header">
          <div className="formkurve-title">
            {training.needs_substitute && '🔔 '}
            {training.title || 'Training'}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div 
              className="match-count-badge"
              style={{ 
                backgroundColor: status.color,
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: '700',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                whiteSpace: 'nowrap',
                boxShadow: waitlist.length > 0 ? '0 0 0 3px rgba(239, 68, 68, 0.3)' : 'none',
                border: waitlist.length > 0 ? '2px solid #dc2626' : 'none'
              }}
            >
              {waitlist.length > 0 && '⚠️ '}
              {confirmedCount}/{training.max_players}
              {waitlist.length > 0 && ` (+${waitlist.length} Warteliste)`}
            </div>
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

            {/* Kommentare der Spieler */}
            {training.attendance && training.attendance.some(a => a.comment) && (
              <div style={{ marginTop: '0.75rem' }}>
                {training.attendance
                  .filter(a => a.comment)
                  .map(a => {
                    const player = players.find(p => p.id === a.player_id);
                    if (!player) return null;
                    
                    return (
                      <div key={a.id} style={{
                        padding: '0.5rem 0.75rem',
                        background: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        marginBottom: '0.5rem'
                      }}>
                        <span style={{ fontWeight: '600', color: '#0369a1' }}>
                          💬 {player.name}:
                        </span>
                        <span style={{ color: '#0c4a6e', marginLeft: '0.5rem' }}>
                          &ldquo;{a.comment}&rdquo;
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}


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

          </div>

          {/* ZU-/ABSAGE FÜR ALLE - NEUES DESIGN MIT ROUND-ROBIN */}
          {(
            <div style={{ marginTop: '1rem' }}>
              {/* BEREITS GEANTWORTET? */}
              {myResponse ? (
                <div style={{ 
                  padding: '1rem',
                  background: myResponse === 'confirmed' 
                    ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                    : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                  border: `2px solid ${myResponse === 'confirmed' ? '#10b981' : '#ef4444'}`,
                  borderRadius: '12px',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Deine Antwort:
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: myResponse === 'confirmed' ? '#065f46' : '#991b1b', marginTop: '0.25rem' }}>
                        {myResponse === 'confirmed' 
                          ? (amIPlaying 
                              ? '✅ Du bist dabei!'
                              : amIOnWaitlist
                                ? '⏳ Du musst aussetzen'
                                : '✅ Bin dabei!')
                          : '❌ Kann nicht'}
                      </div>
                      
                      {amIOnWaitlist && myResponse === 'confirmed' && (
                        <div style={{ 
                          marginTop: '0.75rem', 
                          padding: '0.75rem', 
                          background: '#fef3c7', 
                          borderRadius: '6px',
                          fontSize: '0.85rem', 
                          color: '#78350f',
                          fontWeight: '600',
                          textAlign: 'center'
                        }}>
                          🎲 Du musst aussetzen (Rotation)
                        </div>
                      )}
                      
                      {training.myAttendance?.comment && (
                        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>
                          💬 &ldquo;{training.myAttendance.comment}&rdquo;
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Zum Kalender
                      </span>
                      <button 
                        style={{
                          width: '40px',
                          height: '40px',
                          background: '#10b981',
                          border: 'none',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        title="In Kalender speichern"
                        onClick={() => console.log('📅 Kalender-Speichern für Training:', training.id)}
                      >
                        <Download size={16} color="white" />
                      </button>
                    </div>
                  </div>
                  
                  {/* ÄNDERN BUTTON */}
                  <button
                    onClick={() => setRespondingTo(training.id)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: 'white',
                      color: '#6b7280',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      marginTop: '0.75rem'
                    }}
                  >
                    Antwort ändern
                  </button>
                </div>
              ) : (
                /* NOCH NICHT GEANTWORTET - MODERNER BUTTON */
                !respondingTo && (
                  <button
                    onClick={() => setRespondingTo(training.id)}
                    style={{
                      width: '100%',
                      padding: '1.25rem',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                      color: 'white',
                      border: 'none',
                      fontWeight: '700',
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 16px rgba(14, 165, 233, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.3)';
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>📅</span>
                    <span>Verfügbarkeit angeben</span>
                  </button>
                )
              )}

              {/* FORMULAR WENN GEÖFFNET */}
              {respondingTo === training.id && (
                <div style={{
                  padding: '1.25rem',
                  background: '#f9fafb',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  marginTop: '1rem'
                }}>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    color: '#374151',
                    marginBottom: '0.75rem'
                  }}>
                    Kannst du am {formatDate(training.date)} teilnehmen?
                  </div>
                  
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Optional: Kommentar (z.B. &lsquo;Komme eventuell 10 Min später&rsquo;)"
                    rows="2"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '0.875rem',
                      marginBottom: '0.75rem',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                  
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    marginBottom: '0.75rem'
                  }}>
                    <button
                      onClick={() => handleResponse(training.id, 'confirmed')}
                      style={{
                        padding: '1rem',
                        borderRadius: '10px',
                        border: '2px solid #10b981',
                        background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                        color: '#065f46',
                        fontWeight: '700',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 100%)';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      <CheckCircle size={20} />
                      <span>Bin dabei!</span>
                    </button>
                    <button
                      onClick={() => handleResponse(training.id, 'declined')}
                      style={{
                        padding: '1rem',
                        borderRadius: '10px',
                        border: '2px solid #ef4444',
                        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                        color: '#991b1b',
                        fontWeight: '700',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      <XCircle size={20} />
                      <span>Kann nicht</span>
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                      setRespondingTo(null);
                      setComment('');
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      color: '#6b7280',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      cursor: 'pointer'
                    }}
                  >
                    Abbrechen
                  </button>
                </div>
              )}
            </div>
          )}


          {/* KLARE STRUKTUR: DABEI - WARTELISTE - ABSAGE - AUSSTEHEND */}
          <div style={{ marginTop: '1rem' }}>
            
            {/* ✅ DABEI (mit Round-Robin Priorität) */}
            {canPlay.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ 
                  margin: '0 0 0.5rem 0', 
                  fontSize: '0.85rem', 
                  fontWeight: '700',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  ✅ Dabei ({canPlay.length}/{training.max_players})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {canPlay.map(a => {
                    const p = players.find(pl => pl.id === a.player_id);
                    if (!p) return null;
                    
                    return (
                      <span 
                        key={a.id}
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: '#dcfce7',
                          border: '1px solid #bbf7d0',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          color: '#14532d',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        {p.name} {p.current_lk && `(${p.current_lk})`}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* ⏳ WARTELISTE */}
            {waitlist.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ 
                  margin: '0 0 0.5rem 0', 
                  fontSize: '0.85rem', 
                  fontWeight: '700',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  ⏳ Warteliste ({waitlist.length})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {waitlist.map(a => {
                    const p = players.find(pl => pl.id === a.player_id);
                    if (!p) return null;
                    
                    return (
                      <span 
                        key={a.id}
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: '#fef3c7',
                          border: '1px solid #fbbf24',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          color: '#92400e',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        {p.name} {p.current_lk && `(${p.current_lk})`}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ❌ ABSAGE */}
            {training.attendance && training.attendance.some(a => a.status === 'declined') && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ 
                  margin: '0 0 0.5rem 0', 
                  fontSize: '0.85rem', 
                  fontWeight: '700',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  ❌ Absage ({training.attendance.filter(a => a.status === 'declined').length})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {training.attendance
                    .filter(a => a.status === 'declined')
                    .map(a => {
                      const player = players.find(p => p.id === a.player_id);
                      if (!player) return null;
                      
                      return (
                        <span 
                          key={a.id}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: '#fee2e2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            color: '#991b1b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          {player.name} {player.current_lk && `(${player.current_lk})`}
                        </span>
                      );
                    })}
                </div>
              </div>
            )}

            {/* ⏳ FEEDBACK STEHT AUS */}
            {training.attendance && training.attendance.some(a => {
              // WICHTIG: Nur echte "pending" Einträge anzeigen - KEINE "declined" oder "confirmed"!
              const status = a.status;
              return !status || status === 'pending';
            }) && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ 
                  margin: '0 0 0.5rem 0', 
                  fontSize: '0.85rem', 
                  fontWeight: '700',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  ⏳ Feedback steht aus ({training.attendance.filter(a => {
                    const status = a.status;
                    // WICHTIG: Nur echte "pending" Einträge zählen - KEINE "declined" oder "confirmed"!
                    return !status || status === 'pending';
                  }).length})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {training.attendance
                    .filter(a => {
                      const status = a.status;
                      // WICHTIG: Nur echte "pending" Einträge anzeigen - KEINE "declined" oder "confirmed"!
                      // Explizit "declined" und "confirmed" ausschließen
                      if (status === 'declined' || status === 'confirmed') {
                        return false;
                      }
                      return !status || status === 'pending';
                    })
                    .map(a => {
                      const player = players.find(p => p.id === a.player_id);
                      if (!player) return null;
                      
                      return (
                        <span 
                          key={a.id}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          {player.name} {player.current_lk && `(${player.current_lk})`}
                        </span>
                      );
                    })}
                </div>
              </div>
            )}

          </div>

          {/* WARTELISTE-LINK zu Übersicht */}
          {waitlist.length > 0 && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              <button
                className="btn-modern btn-modern-inactive"
                onClick={() => navigate('/round-robin')}
                style={{ 
                  width: '100%',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                  color: 'white',
                  fontSize: '0.85rem'
                }}
                title="Vollständigen Aussetzen-Plan anzeigen"
              >
                📊 Warteliste Übersicht ({waitlist.length} aussetzen)
              </button>
            </div>
          )}

          {/* ORGANISATOR-BUTTONS (ganz unten) */}
          {isOrganizer && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              {/* EINLADEN-Button mit Info oben */}
              <div style={{ marginBottom: '1rem' }}>
                <button
                  className="btn-modern btn-modern-inactive"
                  onClick={() => {
                    setShowInviteForm(training.id);
                    setInviteMessage(generateDefaultInviteMessage(training));
                  }}
                  style={{ 
                    width: '100%',
                    background: '#10b981',
                    color: 'white',
                    fontSize: '0.9rem',
                    padding: '0.75rem'
                  }}
                  title="Spieler einladen & WhatsApp senden"
                >
                  📱 Einladen & Teilen
                </button>
                <p style={{ 
                  margin: '0.5rem 0 0 0', 
                  fontSize: '0.8rem', 
                  color: '#6b7280',
                  fontStyle: 'italic',
                  textAlign: 'center'
                }}>
                  💰 Lade deine Tennisfreunde ein, wenn wir weniger als 4 Leute beim Training sind. Diese zahlen € 20 für die Teilnahme in unsere Team-Partykasse
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <button
                  className="btn-modern btn-modern-inactive"
                  onClick={() => handleEditTraining(training)}
                  style={{ 
                    flex: '1 1 auto',
                    background: '#f59e0b',
                    color: 'white',
                    fontSize: '0.85rem',
                    padding: '0.5rem 0.75rem'
                  }}
                  title="Training bearbeiten"
                >
                  ✏️ Bearbeiten
                </button>
                <button
                  className="btn-modern btn-modern-inactive"
                  onClick={() => handleDeleteTraining(training.id)}
                  disabled={isDeleting === training.id}
                  style={{ 
                    flex: '1 1 auto',
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '0.85rem',
                    padding: '0.5rem 0.75rem'
                  }}
                  title="Training löschen"
                >
                  🗑️ Löschen
                </button>
              </div>

              {/* EINLADUNGSFORMULAR */}
              {showInviteForm === training.id && (
                <div style={{
                  padding: '1.25rem',
                  background: '#f9fafb',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb'
                }}>
                  <h4 style={{ 
                    margin: '0 0 1rem 0', 
                    fontSize: '1rem', 
                    fontWeight: '700',
                    color: '#374151'
                  }}>
                    📱 Spieler einladen & WhatsApp senden
                  </h4>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                      📱 WhatsApp-Nachricht bearbeiten:
                    </div>
                    <textarea
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      placeholder="Deine persönliche Einladung..."
                      rows="8"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        lineHeight: '1.4'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setInviteMessage(generateDefaultInviteMessage(training))}
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: '#f3f4f6',
                          color: '#6b7280',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        🔄 Standard-Text laden
                      </button>
                      <button
                        type="button"
                        onClick={() => setInviteMessage('')}
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️ Leeren
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => {
                        // Verwende editierbaren Text oder Standard-Text
                        const message = inviteMessage.trim() || generateDefaultInviteMessage(training);
                        
                        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                        window.open(whatsappUrl, '_blank');
                        
                        // Schließe Formular
                        setShowInviteForm(null);
                        setInviteMessage(''); // Reset für nächstes Mal
                      }}
                      disabled={!inviteMessage.trim() && !generateDefaultInviteMessage(training)}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: '#25D366',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        opacity: (!inviteMessage.trim() && !generateDefaultInviteMessage(training)) ? 0.5 : 1
                      }}
                    >
                      📱 WhatsApp öffnen
                    </button>
                    <button
                      onClick={() => setShowInviteForm(null)}
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'white',
                        color: '#6b7280',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
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
          
          {/* Meine Trainingseinheiten mit Historie-Dropdown */}
          <div className="mine-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
            <button
              className={`btn-modern ${selectedFilter === 'mine' ? 'btn-modern-active' : 'btn-modern-inactive'}`}
              onClick={() => {
                setShowMineDropdown(!showMineDropdown);
                setSelectedFilter('mine');
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '2rem' }}
            >
              <Users size={18} />
              <span>Meine Trainingseinheiten ({visibleTrainings.filter(t => t.type === 'private' && (t.organizer_id === player?.id || t.invited_players?.includes(player?.id))).length})</span>
              <span style={{ 
                position: 'absolute', 
                right: '0.5rem',
                fontSize: '0.75rem',
                opacity: 0.7,
                transform: showMineDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}>
                ▼
              </span>
            </button>
            
            {/* Dropdown Menu */}
            {showMineDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '0.25rem',
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                minWidth: '200px'
              }}>
              <button
                onClick={() => {
                  setSelectedFilter('mine');
                  setShowHistory(false);
                  setShowMineDropdown(false);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  color: '#374151',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                <Calendar size={16} color="#3b82f6" />
                Aktuell anzeigen
              </button>
              <button
                onClick={() => {
                  setShowHistory(!showHistory);
                  setShowMineDropdown(false);
                  if (!showHistory && pastTrainings.length === 0) {
                    loadPastTrainings();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  background: showHistory ? '#eff6ff' : 'transparent',
                  textAlign: 'left',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  color: showHistory ? '#1e40af' : '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!showHistory) e.target.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  if (!showHistory) e.target.style.background = 'transparent';
                }}
              >
                <span>📜</span>
                Historie{pastTrainings.length > 0 ? ` (${pastTrainings.length})` : ''}
              </button>
            </div>
            )}
          </div>
        </div>
        
        {/* Create Training Button */}
        <button
          className="btn-modern btn-modern-active"
          onClick={() => {
            setEditingTraining(null); // Reset edit mode
            setShowCreateForm(true);
          }}
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
          {/* VERGANGENE TRAININGS (HISTORIE) */}
          {showHistory && (() => {
            // Filtere: Nur Trainings die VOR heute stattfanden
            const now = new Date();
            const trulyPastTrainings = pastTrainings.filter(t => {
              const trainingDate = new Date(t.date);
              return trainingDate < now;
            });

            return trulyPastTrainings.length > 0 ? (
              <div className="fade-in" style={{ marginBottom: '2rem' }}>
                <h2 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '1.1rem', 
                  fontWeight: '700',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  📜 Vergangene Trainings ({trulyPastTrainings.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {trulyPastTrainings.map(renderTrainingCard)}
                </div>
              </div>
            ) : null;
          })()}

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
              {editingTraining ? '✏️ Training bearbeiten' : '➕ Training erstellen'}
            </h2>

            <form onSubmit={editingTraining ? handleUpdateTraining : handleCreateTraining}>
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

              {/* Wöchentlich wiederholen (nur beim Erstellen, nicht beim Bearbeiten) */}
              {!editingTraining && (
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
              )}

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

                  {/* TRAININGSGRUPPEN-ÜBERSICHT (Ausgewählte Spieler) */}
                  {formData.invitedPlayers.length > 0 && (
                    <div style={{ 
                      marginBottom: '1rem',
                      padding: '1rem',
                      background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                      border: '2px solid #10b981',
                      borderRadius: '12px'
                    }}>
                      <div style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: '700', 
                        color: '#14532d',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        👥 Trainingsgruppe ({formData.invitedPlayers.length + formData.externalPlayers.length} Spieler)
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {/* Registrierte Spieler */}
                        {formData.invitedPlayers
                          .filter(id => !importedPlayers.some(ip => ip.id === id))
                          .map(playerId => {
                            const p = players.find(pl => pl.id === playerId);
                            if (!p) return null;
                            const wasSent = whatsappInviteSent[playerId];

                            return (
                              <div key={playerId} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem',
                                padding: '0.5rem',
                                background: 'white',
                                borderRadius: '6px',
                                border: '1px solid #bbf7d0'
                              }}>
                                <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: '600', color: '#14532d' }}>
                                  {p.name} {p.current_lk && `(${p.current_lk})`}
                                </span>
                                
                                {/* WhatsApp-Button */}
                                <button
                                  type="button"
                                  onClick={() => invitePlayerViaWhatsApp(p.id, p.name, p.phone)}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    background: wasSent ? '#6b7280' : '#25D366',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                  }}
                                  title={p.phone ? `WhatsApp an ${p.phone}` : 'WhatsApp öffnen'}
                                >
                                  📱 {wasSent ? '✓' : 'Einladen'}
                                </button>

                                {/* Entfernen */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      invitedPlayers: prev.invitedPlayers.filter(id => id !== playerId)
                                    }));
                                  }}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}

                        {/* Importierte Spieler */}
                        {formData.invitedPlayers
                          .filter(id => allImportedPlayers.some(ip => ip.id === id))
                          .map(playerId => {
                            const ip = allImportedPlayers.find(p => p.id === playerId);
                            if (!ip) return null;
                            const wasSent = whatsappInviteSent[playerId];

                            return (
                              <div key={playerId} style={{ 
                                display: 'flex', 
                                flexDirection: 'column',
                                gap: '0.5rem',
                                padding: '0.5rem',
                                background: 'white',
                                borderRadius: '6px',
                                border: '1px solid #bbf7d0'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: '600', color: '#14532d' }}>
                                    {ip.name} {ip.currentLk && `(LK ${ip.currentLk})`}
                                    <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#f59e0b' }}>⏳</span>
                                  </span>
                                  
                                  {/* WhatsApp-Button */}
                                  <button
                                    type="button"
                                    onClick={() => invitePlayerViaWhatsApp(ip.id, ip.name, null)}
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      background: wasSent ? '#6b7280' : '#25D366',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '0.7rem',
                                      fontWeight: '600',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    📱 {wasSent ? '✓' : 'Einladen'}
                                  </button>

                                  {/* Entfernen */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        invitedPlayers: prev.invitedPlayers.filter(id => id !== playerId)
                                      }));
                                      setImportedPlayerEmails(prev => {
                                        const updated = { ...prev };
                                        delete updated[playerId];
                                        return updated;
                                      });
                                    }}
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      background: '#ef4444',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '0.7rem',
                                      fontWeight: '600',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>

                                {/* Email-Eingabe (optional) */}
                                <input
                                  type="email"
                                  placeholder="Email eingeben (optional)..."
                                  value={importedPlayerEmails[playerId] || ''}
                                  onChange={(e) => setImportedPlayerEmails(prev => ({ ...prev, [playerId]: e.target.value }))}
                                  style={{
                                    padding: '0.5rem',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    width: '100%'
                                  }}
                                />
                              </div>
                            );
                          })}

                        {/* Externe Spieler */}
                        {formData.externalPlayers.map((ext, idx) => (
                          <div key={`ext-${idx}`} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            padding: '0.5rem',
                            background: 'white',
                            borderRadius: '6px',
                            border: '1px solid #bbf7d0'
                          }}>
                            <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: '600', color: '#14532d' }}>
                              {ext.name} {ext.lk && `(LK ${ext.lk})`}
                              {ext.club && <span style={{ fontSize: '0.75rem', opacity: 0.7 }}> • {ext.club}</span>}
                            </span>
                            
                            {/* Entfernen */}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  externalPlayers: prev.externalPlayers.filter((_, i) => i !== idx)
                                }));
                              }}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  
                  {/* ALLE VERFÜGBAREN SPIELER (vereins-übergreifend) */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#1e40af', marginBottom: '0.5rem', fontWeight: '600' }}>
                      🔍 Alle verfügbaren Spieler suchen ({allImportedPlayers.length} verfügbar):
                    </div>
                    
                    {/* Suchfeld */}
                    <input
                      type="text"
                      placeholder="Spielername oder LK eingeben zum Suchen ..."
                      value={importedPlayerSearch}
                      onChange={(e) => setImportedPlayerSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #3b82f6',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        marginBottom: '0.75rem'
                      }}
                    />

                    {/* Gefundene Spieler */}
                    {importedPlayerSearch && (
                      <>
                        {importedPlayers.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '300px', overflow: 'auto', padding: '0.75rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #3b82f6' }}>
                            {importedPlayers.map(player => {
                              const isInvited = formData.invitedPlayers.includes(player.id);

                              return (
                                <button
                                  key={player.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      invitedPlayers: prev.invitedPlayers.includes(player.id)
                                        ? prev.invitedPlayers.filter(id => id !== player.id)
                                        : [...prev.invitedPlayers, player.id]
                                    }));
                                  }}
                                  style={{
                                    padding: '0.5rem 0.75rem',
                                    background: isInvited ? '#3b82f6' : 'white',
                                    color: isInvited ? 'white' : '#374151',
                                    border: isInvited ? 'none' : '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                >
                                  {isInvited && '✓ '}
                                  {player.name} {player.currentLk && `(${player.currentLk})`}
                                  <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                                    {player.source === 'registered' ? '✅' : '⏳'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ 
                            padding: '1rem', 
                            background: '#eff6ff', 
                            borderRadius: '8px', 
                            border: '1px solid #3b82f6',
                            textAlign: 'center',
                            color: '#1e40af',
                            fontSize: '0.85rem'
                          }}>
                            🔍 Keine Spieler gefunden für &ldquo;{importedPlayerSearch}&rdquo;
                          </div>
                        )}
                      </>
                    )}

                    {/* Info-Text */}
                    {!importedPlayerSearch && allImportedPlayers.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#1e40af', fontStyle: 'italic', textAlign: 'center', padding: '0.5rem' }}>
                        💡 {allImportedPlayers.length} Spieler verfügbar. Gib einen Namen oder LK ein, um zu suchen.
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
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingTraining(null);
                  }}
                  disabled={isCreating}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="btn-modern btn-modern-active"
                  disabled={isCreating || !formData.date}
                >
                  {isCreating 
                    ? '⏳ Speichert...' 
                    : editingTraining 
                      ? '✅ Änderungen speichern' 
                      : '✅ Training erstellen'
                  }
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

// OnboardingFlow_Simplified.jsx
// Vereinfachte Version - nutzt nur players_unified

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import ClubAutocomplete from './ClubAutocomplete';
import { normalizeLK } from '../lib/lkUtils';
import LoggingService from '../services/activityLogger';
import './Dashboard.css';

function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  // const [availableTeams, setAvailableTeams] = useState([]);
  const [playerSearch, setPlayerSearch] = useState(''); // Umbenannt von importedPlayerSearch
  const [playerResults, setPlayerResults] = useState([]); // Umbenannt von importedPlayerResults
  const [selectedPlayer, setSelectedPlayer] = useState(null); // Umbenannt von selectedImportedPlayer
  const [onboardingStartTime] = useState(new Date());

  // Form Data
  const [formData, setFormData] = useState({
    selectedClubs: [],
    customTeams: [],
    availableTeams: [],
    showAddTeamForm: false,
    currentSeason: 'Winter 2025/26',
    newTeamClub: '',
    newTeamCategory: '',
    newTeamName: '',
    newTeamLeague: '',
    newTeamGroup: '',
    newTeamSize: '',
    name: '',
    phone: '',
    current_lk: '',
    whatsappEnabled: false
  });

  // Berechne aktuelle Saison basierend auf aktuellem Datum
  // WICHTIG: Format muss mit DataContext übereinstimmen ('Winter 2024/25')
  const getCurrentSeason = () => {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0=Jan, 11=Dez
    const currentYear = now.getFullYear();
    
    if (currentMonth >= 4 && currentMonth <= 7) {
      // Mai (4) bis August (7) = Sommer
      return `Sommer ${currentYear}`;
    } else {
      // September bis April = Winter (überspannt Jahreswechsel)
      if (currentMonth >= 8) {
        const nextYear = currentYear + 1;
        return `Winter ${currentYear}/${String(nextYear).slice(-2)}`;
      } else {
        const prevYear = currentYear - 1;
        return `Winter ${prevYear}/${String(currentYear).slice(-2)}`;
      }
    }
  };

  // Beim ersten Laden: Logge Onboarding-Start und setze aktuelle Saison
  useEffect(() => {
    const currentSeason = getCurrentSeason();
    setFormData(prev => ({ ...prev, currentSeason }));
    
    const logStart = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await LoggingService.logOnboardingStart(user.email);
      }
    };
    logStart();
  }, []);

  // Lade verfügbare Teams
  const loadAvailableTeams = async () => {
    try {
      const { error } = await supabase
        .from('team_info')
        .select('*')
        .order('club_name', { ascending: true });

      if (error) throw error;
      // setAvailableTeams(data || []);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  // 🔧 NEU: Suche in players_unified statt imported_players
  const searchPlayers = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      setPlayerResults([]);
      return;
    }

    try {
      console.log('🔍 Searching players in players_unified for:', searchTerm);
      
      const { data, error } = await supabase
        .from('players_unified')
        .select(`
          id,
          name,
          import_lk,
          current_lk,
          season_start_lk,
          tvm_id,
          primary_team_id,
          position,
          is_captain,
          status,
          onboarding_status,
          team_info!inner (
            club_name,
            team_name,
            category
          )
        `)
        .eq('status', 'pending') // Nur wartende Spieler (ehemalige imported_players)
        .eq('onboarding_status', 'not_started')
        .ilike('name', `%${searchTerm}%`)
        .order('name', { ascending: true })
        .limit(10);

      if (error) throw error;

      console.log('✅ Found players:', data?.length || 0);
      setPlayerResults(data || []);
      
      // Logge Suche
      if (data && data.length > 0) {
        await LoggingService.logImportedPlayerSearch(searchTerm, data.length);
      }
    } catch (error) {
      console.error('Error searching players:', error);
      setPlayerResults([]);
    }
  };

  // Lade Teams für die gewählten Vereine (mit Saison-Informationen)
  const loadTeamsForSelectedClubs = useCallback(async () => {
    try {
      console.log('🔍 STEP 2: Loading teams for clubs:', formData.selectedClubs);
      
      const { data, error } = await supabase
        .from('team_info')
        .select(`
          *,
          team_seasons (
            id,
            season,
            league,
            group_name,
            team_size,
            is_active
          )
        `)
        .in('club_name', formData.selectedClubs)
        .order('category', { ascending: true });

      if (error) throw error;
      
      console.log('📊 STEP 2: Raw teams data from DB:', data);
      
      const teamsWithActiveSeason = data?.map(team => {
        const activeSeason = team.team_seasons?.find(s => s.is_active) || team.team_seasons?.[0];
        
        return {
          ...team,
          season: activeSeason?.season || formData.currentSeason,
          league: activeSeason?.league || 'Unbekannt',
          group_name: activeSeason?.group_name || '',
          team_size: activeSeason?.team_size || 6,
          season_id: activeSeason?.id || null,
          all_seasons: team.team_seasons || []
        };
      }) || [];
      
      console.log('✅ STEP 2: Processed teams:', teamsWithActiveSeason.length);
      setFormData(prev => ({ ...prev, availableTeams: teamsWithActiveSeason }));
    } catch (error) {
      console.error('❌ STEP 2: Error loading teams for clubs:', error);
      setFormData(prev => ({ ...prev, availableTeams: [] }));
    }
  }, [formData.selectedClubs, formData.currentSeason]);

  // useEffects
  useEffect(() => {
    loadAvailableTeams();
  }, []);

  useEffect(() => {
    if (formData.selectedClubs.length > 0) {
      loadTeamsForSelectedClubs();
    }
  }, [formData.selectedClubs, loadTeamsForSelectedClubs]);

  // Gruppiere Teams nach Verein
  // const teamsByClub = availableTeams.reduce((acc, team) => {
  //   const club = team.club_name || 'Unbekannt';
  //   if (!acc[club]) acc[club] = [];
  //   acc[club].push(team);
  //   return acc;
  // }, {});

  // 🔧 NEU: Vereinfachte Onboarding-Abschluss-Logik
  const handleComplete = async () => {
    console.log('🔍 Debug formData:', formData);
    
    if (formData.customTeams.length === 0 || !formData.name) {
      alert('Bitte fülle alle Pflichtfelder aus');
      return;
    }

    try {
      setLoading(true);
      console.log('🚀 Starting simplified SUPABASE onboarding completion...');

      const onboardingDuration = Math.round((new Date() - onboardingStartTime) / 1000);

      // 1️⃣ Hole aktuelle User-ID aus Supabase Auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Kein User gefunden. Bitte melde dich an.');
      }

      console.log('👤 Current user:', user.email, user.id);

      // 2️⃣ Wenn Spieler ausgewählt: Update in players_unified
      let finalPlayerId = null;
      
      if (selectedPlayer) {
        console.log('🔗 Updating selected player:', selectedPlayer.id);
        
        // Normalisiere LK vor dem Speichern
        const normalizedLK = formData.current_lk ? normalizeLK(formData.current_lk) : null;
        
        const { data: playerData, error: playerError } = await supabase
          .from('players_unified')
          .update({
            user_id: user.id, // 🔧 FIX: Verknüpfe Spieler mit User-Account
            name: formData.name,
            email: user.email,
            phone: formData.phone || null,
            current_lk: normalizedLK,
            season_start_lk: normalizedLK,
            ranking: normalizedLK,
            status: 'active', // Spieler wird aktiv
            onboarding_status: 'completed', // Onboarding abgeschlossen
            onboarded_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedPlayer.id)
          .select()
          .single();

        if (playerError) {
          console.error('❌ Error updating player:', playerError);
          throw new Error('Fehler beim Speichern der Profildaten');
        }

        console.log('✅ Player profile updated:', playerData);
        finalPlayerId = playerData.id;

        // 📊 Logge Smart-Match-Auswahl
        await LoggingService.logImportedPlayerSelection(selectedPlayer, true);

      } else {
        // 3️⃣ Neuer Spieler: Prüfe ob bereits ein Eintrag existiert
        console.log('🆕 Creating/updating player in players_unified');
        
        const normalizedLK = formData.current_lk ? normalizeLK(formData.current_lk) : null;
        
        // 🔧 Prüfe zuerst, ob bereits ein Eintrag für diesen User existiert
        const { data: existingPlayer } = await supabase
          .from('players_unified')
          .select('id')
          .eq('user_id', user.id)
          .eq('player_type', 'app_user')
          .maybeSingle();

        let playerData;
        
        if (existingPlayer) {
          // Update existierenden Eintrag
          console.log('🔧 Updating existing player:', existingPlayer.id);
          const { data: updatedPlayer, error: updateError } = await supabase
            .from('players_unified')
            .update({
              name: formData.name,
              email: user.email,
              phone: formData.phone || null,
              current_lk: normalizedLK,
              season_start_lk: normalizedLK,
              ranking: normalizedLK,
              status: 'active',
              onboarding_status: 'completed',
              onboarded_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPlayer.id)
            .select()
            .single();

          if (updateError) {
            console.error('❌ Error updating player:', updateError);
            throw new Error('Fehler beim Aktualisieren des Spieler-Profils');
          }

          playerData = updatedPlayer;
          console.log('✅ Player updated:', playerData);
        } else {
          // Erstelle neuen Eintrag
          const { data: newPlayer, error: insertError } = await supabase
          .from('players_unified')
          .insert({
              user_id: user.id,
            name: formData.name,
            email: user.email,
            phone: formData.phone || null,
            current_lk: normalizedLK,
            season_start_lk: normalizedLK,
            ranking: normalizedLK,
            points: 0,
            player_type: 'app_user',
            status: 'active',
            onboarding_status: 'completed',
            onboarded_at: new Date().toISOString(),
            import_source: 'manual',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

          if (insertError) {
            console.error('❌ Error creating player:', insertError);
          throw new Error('Fehler beim Erstellen des Spieler-Profils');
        }

          playerData = newPlayer;
        console.log('✅ New player created:', playerData);
        }

        finalPlayerId = playerData.id;

        // 📊 Logge manuelle Dateneingabe
        await LoggingService.logManualDataEntry({
          name: formData.name,
          current_lk: formData.current_lk,
          phone: formData.phone
        });
      }

      // 4️⃣ Erstelle/aktualisiere Team-Memberships für alle gewählten Teams
      let teamsFromDB = 0;
      let teamsManual = 0;
      let primaryTeamId = null;
      
      for (let i = 0; i < formData.customTeams.length; i++) {
        const team = formData.customTeams[i];
        let teamId = team.id;
        
        console.log(`🔗 Linking player to team ${i + 1}/${formData.customTeams.length}:`, team);

        // Wenn Team ein custom_ Team ist, erstelle es zuerst in team_info
        if (team.id.startsWith('custom_')) {
          console.log('🆕 Creating new custom team in team_info');
          
          const { data: newTeam, error: createTeamError } = await supabase
            .from('team_info')
            .insert({
              club_name: team.club_name,
              team_name: team.team_name || team.category,
              category: team.category
            })
            .select()
            .single();

          if (createTeamError) {
            console.error('❌ Error creating custom team:', createTeamError);
            throw new Error(`Fehler beim Erstellen von Team ${team.category}`);
          }
          
          teamId = newTeam.id;
          console.log('✅ Custom team created with ID:', teamId);
          teamsManual++;
          await LoggingService.logManualTeamEntry(newTeam);

          // Erstelle auch team_seasons für custom Team
          if (team.league && team.league !== 'Unbekannt') {
            await supabase
              .from('team_seasons')
              .insert({
                team_id: teamId,
                season: formData.currentSeason,
                league: team.league,
                group_name: '',
                team_size: 6,
                is_active: true,
                created_at: new Date().toISOString()
              });
            console.log('✅ team_seasons created for custom team');
          }
        } else {
          teamsFromDB++;
          await LoggingService.logTeamSelectionFromDB(team);
        }
        
        // Merke primäres Team (erstes in der Liste)
        if (!primaryTeamId) {
          primaryTeamId = teamId;
        }

        // Upsert in team_memberships (ermöglicht Mehrfach-Teams)
        const membershipPayload = {
          player_id: finalPlayerId,
          team_id: teamId,
          season: formData.currentSeason,
          role: 'player',
          is_primary: i === 0,
          is_active: true,
          updated_at: new Date().toISOString()
        };

        const { error: membershipError } = await supabase
          .from('team_memberships')
          .upsert(membershipPayload, { onConflict: 'player_id,team_id,season' });

        if (membershipError) {
          console.error('❌ Error upserting team_membership:', membershipError);
          throw new Error(`Fehler beim Zuordnen zu Team ${team.category}`);
        }

        console.log(`✅ Team-Membership gespeichert für Team: ${team.category}`);
      }

      if (primaryTeamId) {
        console.log('✅ Updating primary_team_id for player:', primaryTeamId);
        const { error: primaryTeamError } = await supabase
          .from('players_unified')
          .update({ primary_team_id: primaryTeamId, updated_at: new Date().toISOString() })
          .eq('id', finalPlayerId);

        if (primaryTeamError) {
          console.error('❌ Error updating primary_team_id:', primaryTeamError);
          throw new Error('Fehler beim Verknüpfen mit deiner Mannschaft');
        }
      } else {
        console.warn('⚠️ Kein Team ausgewählt, primary_team_id bleibt unverändert');
      }

      console.log('✅ Team-Zuordnung abgeschlossen (team_memberships + primary_team_id)');

      // 5️⃣ Lösche LOCAL Storage
      localStorage.removeItem('localPlayerData');
      localStorage.removeItem('localOnboardingComplete');
      console.log('🗑️ Local storage cleared');

      // 6️⃣ Force Auth-Reload
      console.log('🔄 Triggering auth reload...');
      window.dispatchEvent(new Event('reloadAuth'));
      await new Promise(resolve => setTimeout(resolve, 500));

      // 7️⃣ Trigger Team-Reload Event
      console.log('🔄 Triggering teams reload...');
      window.dispatchEvent(new CustomEvent('reloadTeams', {
        detail: { playerId: finalPlayerId }
      }));
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('✅ Simplified SUPABASE Onboarding abgeschlossen');

      // 📊 Logge Onboarding-Abschluss
      await LoggingService.logOnboardingCompletion(
        selectedPlayer || { id: finalPlayerId, name: formData.name }, 
        {
          clubs_count: formData.selectedClubs.length,
          teams_count: formData.customTeams.length,
          teams_from_db: teamsFromDB,
          teams_manual: teamsManual,
          whatsapp_enabled: formData.whatsappEnabled,
          used_smart_match: !!selectedPlayer,
          imported_player_id: selectedPlayer?.id || null,
          imported_player_name: selectedPlayer?.name || null,
          duration_seconds: onboardingDuration
        }
      );

      console.log(`📊 Onboarding completed in ${onboardingDuration}s`);

      // 8️⃣ Weiterleitung zum Dashboard
      console.log('🔄 Navigating to dashboard with full reload...');
      window.location.href = '/';

    } catch (error) {
      console.error('❌ Error in simplified SUPABASE onboarding:', error);
      alert(`Fehler: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Rest der Komponente bleibt gleich...
  // (Die UI-Teile sind identisch, nur die Logik wurde vereinfacht)

  return (
    <div className="dashboard container" style={{ paddingTop: '2rem' }}>
      {/* Bounce Animation für Onboarding */}
      <style>
        {`
          @keyframes bounce {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }
        `}
      </style>

      {/* Progress Bar */}
      <div className="fade-in" style={{ marginBottom: '2rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          {[1, 2, 3, 4].map(step => (
            <div
              key={step}
              style={{
                flex: 1,
                height: '4px',
                background: currentStep >= step ? 
                  'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)' : 
                  '#e2e8f0',
                borderRadius: '2px',
                margin: '0 0.25rem',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#6b7280' }}>
          Schritt {currentStep} von 4
        </div>
      </div>

      {/* Step 1: Verein & Team auswählen */}
      {currentStep === 1 && (
        <div className="fade-in lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">🎾 Verein auswählen</div>
          </div>

          <div className="season-content">
            {/* Club Autocomplete */}
            <ClubAutocomplete
              value={formData.selectedClubs}
              onChange={(clubs) => setFormData(prev => ({ ...prev, selectedClubs: clubs }))}
              placeholder="Verein suchen (z.B. TC Köln, VKC, SV Rot-Gelb)..."
              allowMultiple={true}
            />

            {/* Rest der Step 1 UI bleibt gleich... */}
            {/* (Vereinsstatus, manuelle Vereinseingabe, etc.) */}

            {/* Next Button */}
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-modern btn-modern-active"
                onClick={async () => {
                  await LoggingService.logOnboardingStep(1, {
                    stepName: 'Vereinsauswahl',
                    clubs_selected: formData.selectedClubs.length,
                    clubs: formData.selectedClubs
                  });
                  setCurrentStep(2);
                }}
                disabled={formData.selectedClubs.length === 0}
                style={{ minWidth: '150px' }}
              >
                Weiter
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Mannschaften eingeben */}
      {currentStep === 2 && (
        <div className="fade-in lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">🏆 Mannschaften eingeben</div>
          </div>

          <div className="season-content">
            {/* Gewählte Teams anzeigen */}
            {formData.selectedClubs.length === 0 && (
              <div style={{
                padding: '1.5rem',
                background: '#fef3c7',
                border: '2px solid #f59e0b',
                borderRadius: '12px',
                marginBottom: '2rem',
                textAlign: 'center'
              }}>
                Bitte wähle zuerst einen Verein aus Schritt 1
              </div>
            )}

            {formData.selectedClubs.length > 0 && (
              <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
                  Wähle deine Mannschaften:
                </h3>

                {/* Verfügbare Teams ausgewählter Vereine */}
                {formData.availableTeams.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                    {formData.availableTeams.map((team) => {
                      const isSelected = formData.customTeams.some(t => t.id === team.id);
                      return (
                        <div
                          key={team.id}
                          onClick={() => {
                            if (isSelected) {
                              // Remove team
                              setFormData(prev => ({
                                ...prev,
                                customTeams: prev.customTeams.filter(t => t.id !== team.id)
                              }));
                            } else {
                              // Add team
                              setFormData(prev => ({
                                ...prev,
                                customTeams: [...prev.customTeams, {
                                  id: team.id,
                                  club_name: team.club_name,
                                  category: team.category,
                                  team_name: team.team_name,
                                  league: team.league,
                                  season: team.season
                                }]
                              }));
                            }
                          }}
                          style={{
                            padding: '1rem',
                            border: `2px solid ${isSelected ? '#10b981' : '#e2e8f0'}`,
                            borderRadius: '8px',
                            backgroundColor: isSelected ? '#f0fdf4' : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '1rem', color: isSelected ? '#065f46' : '#1f2937' }}>
                              {team.category || team.team_name}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                              {team.club_name} • {team.league || 'Unbekannt'}
                            </div>
                          </div>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: `2px solid ${isSelected ? '#10b981' : '#9ca3af'}`,
                            backgroundColor: isSelected ? '#10b981' : 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold'
                          }}>
                            {isSelected ? '✓' : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Separator */}
                {formData.availableTeams.length > 0 && (
                  <div style={{ 
                    margin: '2rem 0',
                    padding: '1rem',
                    background: '#f0f9ff',
                    border: '2px solid #0ea5e9',
                    borderRadius: '12px',
                    textAlign: 'center',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: '#0c4a6e'
                  }}>
                    ➕ Oder erstelle eine neue Mannschaft
                  </div>
                )}

                {/* Manuelle Team-Eingabe - immer anzeigen */}
                {formData.availableTeams.length === 0 && (
                  <div style={{
                    padding: '1.5rem',
                    background: '#fef3c7',
                    border: '2px solid #f59e0b',
                    borderRadius: '12px',
                    marginBottom: '2rem',
                    textAlign: 'center'
                  }}>
                    Keine Mannschaften für {formData.selectedClubs.join(', ')} gefunden
                    <br />
                    <strong>Erstelle deine Mannschaft:</strong>
                  </div>
                )}

                <div style={{
                  padding: '1.5rem',
                  background: 'white',
                  border: '2px solid #0ea5e9',
                  borderRadius: '12px',
                  marginBottom: '1rem'
                }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600' }}>
                    ➕ Neue Mannschaft erstellen
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
                        Mannschaft (z.B. Herren 30, Herren 50, Damen):
                      </label>
                      <input
                        type="text"
                        value={formData.newTeamCategory}
                        onChange={(e) => {
                          console.log('📝 STEP 2: Team category changed:', e.target.value);
                          setFormData(prev => ({ ...prev, newTeamCategory: e.target.value }));
                        }}
                        placeholder="z.B. Herren 30"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
                        Mannschaftsname (optional, z.B. &quot;1. Mannschaft&quot;):
                      </label>
                      <input
                        type="text"
                        value={formData.newTeamName}
                        onChange={(e) => setFormData(prev => ({ ...prev, newTeamName: e.target.value }))}
                        placeholder="z.B. 1 oder 1. Mannschaft"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '0.9rem'
                        }}
                      />
                      <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem', marginBottom: 0 }}>
                        Wird standardmäßig auf die Mannschaft gesetzt
                      </p>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
                        Liga (optional):
                      </label>
                      <input
                        type="text"
                        value={formData.newTeamLeague}
                        onChange={(e) => setFormData(prev => ({ ...prev, newTeamLeague: e.target.value }))}
                        placeholder="z.B. Kreisliga, Bezirksliga"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        console.log('🔵 STEP 2: Add team button clicked');
                        console.log('📝 STEP 2: newTeamCategory:', formData.newTeamCategory);
                        
                        if (formData.newTeamCategory.trim()) {
                          const newTeam = {
                            id: `custom_${Date.now()}`,
                            club_name: formData.selectedClubs[0],
                            category: formData.newTeamCategory,
                            team_name: formData.newTeamName.trim() || formData.newTeamCategory,
                            league: formData.newTeamLeague || 'Unbekannt',
                            season: formData.currentSeason,
                            isCustom: true
                          };
                          
                          console.log('➕ STEP 2: Adding new team:', newTeam);
                          
                          setFormData(prev => {
                            const updated = {
                              ...prev,
                              customTeams: [...prev.customTeams, newTeam],
                              newTeamCategory: '',
                              newTeamName: '',
                              newTeamLeague: ''
                            };
                            console.log('📊 STEP 2: Updated customTeams:', updated.customTeams);
                            return updated;
                          });
                        } else {
                          console.log('⚠️ STEP 2: Cannot add team - category is empty');
                        }
                      }}
                      disabled={!formData.newTeamCategory.trim()}
                      style={{
                        padding: '0.75rem',
                        background: formData.newTeamCategory.trim() ? '#0ea5e9' : '#cbd5e1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: formData.newTeamCategory.trim() ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={() => {
                        console.log('🖱️ STEP 2: Button hover - newTeamCategory:', formData.newTeamCategory);
                        console.log('🖱️ STEP 2: Button disabled?', !formData.newTeamCategory.trim());
                      }}
                    >
                      ➕ Mannschaft hinzufügen
                    </button>
                  </div>
                </div>

                {/* Anzeige gewählter Teams */}
                {formData.customTeams.length > 0 && (
                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '600' }}>
                      Ausgewählte Mannschaften ({formData.customTeams.length}):
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {formData.customTeams.map((team, index) => (
                        <div
                          key={team.id}
                          style={{
                            padding: '0.75rem',
                            background: index === 0 ? '#dcfce7' : '#f0f9ff',
                            border: `2px solid ${index === 0 ? '#10b981' : '#0ea5e9'}`,
                            borderRadius: '8px',
                            fontSize: '0.9rem'
                          }}
                        >
                          {index === 0 && '⭐ '}
                          {team.club_name} - {team.category || team.team_name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <button
                type="button"
                className="btn-modern btn-modern-inactive"
                onClick={() => setCurrentStep(1)}
                style={{ minWidth: '120px' }}
              >
                <ChevronLeft size={18} />
                Zurück
              </button>
              <button
                className="btn-modern btn-modern-active"
                onClick={async () => {
                  console.log('🔵 STEP 2: Weiter button clicked');
                  console.log('📊 STEP 2: formData.customTeams:', formData.customTeams);
                  console.log('📊 STEP 2: customTeams.length:', formData.customTeams.length);
                  
                  await LoggingService.logOnboardingStep(2, {
                    stepName: 'Mannschaftsauswahl',
                    teams_selected: formData.customTeams.length,
                    teams_from_db: formData.customTeams.filter(t => !t.id.startsWith('custom_')).length,
                    teams_manual: formData.customTeams.filter(t => t.id.startsWith('custom_')).length
                  });
                  
                  console.log('🔄 STEP 2: Moving to step 3');
                  setCurrentStep(3);
                }}
                disabled={formData.customTeams.length === 0}
                style={{ minWidth: '150px' }}
              >
                Weiter
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Persönliche Daten */}
      {currentStep === 3 && (
        <div className="fade-in lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">📋 Persönliche Daten</div>
          </div>

          <div className="season-content">
            {/* 🔧 NEU: Vereinfachte Spieler-Suche */}
            {!selectedPlayer && (
              <div style={{ 
                marginBottom: '2rem',
                padding: '2rem',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: '3px solid #f59e0b',
                borderRadius: '16px',
                boxShadow: '0 8px 16px rgba(245, 158, 11, 0.3)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ 
                    fontSize: '3rem',
                    animation: 'bounce 2s infinite'
                  }}>🎾</div>
                  <div>
                    <h4 style={{ 
                      margin: 0, 
                      fontSize: '1.3rem', 
                      fontWeight: '800', 
                      color: '#92400e',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      ⚡ WICHTIG: Profil-Turbo aktivieren!
                    </h4>
                    <p style={{ 
                      margin: '0.5rem 0 0 0', 
                      fontSize: '0.95rem', 
                      color: '#78350f',
                      fontWeight: '600',
                      lineHeight: '1.4'
                    }}>
                      🔍 <strong>ZUERST HIER SUCHEN:</strong> Viele Spieler sind bereits aus TVM-Meldelisten angelegt!
                      <br />
                      Wenn du dich findest, werden deine Daten automatisch übernommen. ⚡
                    </p>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="🔍 Deinen Namen eingeben (z.B. Max Mustermann)..."
                  value={playerSearch}
                  onChange={(e) => {
                    setPlayerSearch(e.target.value);
                    searchPlayers(e.target.value);
                  }}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: '3px solid #f59e0b',
                    borderRadius: '12px',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    background: 'white',
                    boxShadow: '0 4px 8px rgba(245, 158, 11, 0.2)',
                    transition: 'all 0.2s ease'
                  }}
                />

                {/* Suchergebnisse */}
                {playerResults.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: '0.5rem', fontWeight: '600' }}>
                      🎯 Treffer gefunden:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {playerResults.map((player) => (
                        <div
                          key={player.id}
                          onClick={async () => {
                            await LoggingService.logImportedPlayerSearch(
                              playerSearch,
                              playerResults.length,
                              player
                            );
                            
                            setSelectedPlayer(player);
                            setFormData(prev => ({
                              ...prev,
                              name: player.name,
                              current_lk: player.import_lk || player.current_lk || '',
                              customTeams: player.primary_team_id ? [{
                                id: player.primary_team_id,
                                club_name: player.team_info.club_name,
                                category: player.team_info.team_name || player.team_info.category,
                                season: formData.currentSeason,
                                league: 'Automatisch übernommen',
                                team_size: 6
                              }] : prev.customTeams
                            }));
                            setPlayerSearch('');
                            setPlayerResults([]);
                          }}
                          style={{
                            padding: '1rem',
                            background: 'white',
                            border: '2px solid #f59e0b',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ fontWeight: '700', color: '#92400e', marginBottom: '0.25rem' }}>
                            {player.name}
                            {player.is_captain && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>👑 MF</span>}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#78350f' }}>
                            {player.team_info.club_name} • {player.team_info.team_name || player.team_info.category}
                            {(player.import_lk || player.current_lk) && ` • LK ${player.import_lk || player.current_lk}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {playerSearch && playerResults.length === 0 && playerSearch.length >= 2 && (
                  <div style={{ 
                    marginTop: '1rem',
                    padding: '1.5rem',
                    background: 'white',
                    border: '2px solid #10b981',
                    borderRadius: '12px',
                    textAlign: 'center',
                    color: '#065f46',
                    fontSize: '0.95rem'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👍</div>
                    <strong>Kein Match gefunden?</strong>
                    <br />
                    Kein Problem – fülle einfach die Felder unten manuell aus!
                  </div>
                )}
              </div>
            )}

            {/* Bestätigung bei ausgewähltem Spieler */}
            {selectedPlayer && (
              <div style={{ 
                marginBottom: '2rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                border: '2px solid #22c55e',
                borderRadius: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '1.5rem' }}>✅</div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#14532d' }}>
                      Profil gefunden!
                    </h4>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#166534' }}>
                      Deine Daten wurden automatisch übernommen. Du kannst sie unten noch anpassen.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlayer(null);
                    setFormData(prev => ({
                      ...prev,
                      name: '',
                      current_lk: ''
                    }));
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'white',
                    color: '#166534',
                    border: '2px solid #22c55e',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Andere Auswahl
                </button>
              </div>
            )}

            {/* Persönliche Daten eingeben - immer anzeigen */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
                  Name:
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    console.log('📝 STEP 3: Name changed:', e.target.value);
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                  }}
                  placeholder="z.B. Max Mustermann"
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

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
                  Telefon (optional):
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+49 123 456789"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
                  Leistungsklasse (optional):
                </label>
                <input
                  type="text"
                  value={formData.current_lk}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_lk: e.target.value }))}
                  placeholder="z.B. LK 12.5"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                />
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Wenn du deine LK nicht kennst, kannst du sie später ändern
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <button
                type="button"
                className="btn-modern btn-modern-inactive"
                onClick={() => setCurrentStep(2)}
                style={{ minWidth: '120px' }}
              >
                <ChevronLeft size={18} />
                Zurück
              </button>
              <button
                className="btn-modern btn-modern-active"
                onClick={async () => {
                  await LoggingService.logOnboardingStep(3, {
                    stepName: 'Persönliche Daten',
                    has_name: !!formData.name,
                    has_lk: !!formData.current_lk,
                    has_phone: !!formData.phone,
                    used_smart_match: !!selectedPlayer,
                    imported_player_name: selectedPlayer?.name || null
                  });
                  setCurrentStep(4);
                }}
                disabled={!formData.name}
                style={{ minWidth: '150px' }}
              >
                Weiter
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: WhatsApp Teaser & Abschluss */}
      {currentStep === 4 && (
        <div className="fade-in lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">✅ Fast fertig!</div>
          </div>

          <div className="season-content">
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
                Zusammenfassung deiner Angaben:
              </h3>
              
              <div style={{ 
                padding: '1.5rem',
                background: '#f0f9ff',
                border: '2px solid #0ea5e9',
                borderRadius: '12px',
                marginBottom: '1.5rem'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <strong>👤 Name:</strong> {formData.name || 'Nicht angegeben'}
                </div>
                {formData.phone && (
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>📞 Telefon:</strong> {formData.phone}
                  </div>
                )}
                {formData.current_lk && (
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>🎾 Leistungsklasse:</strong> {formData.current_lk}
                  </div>
                )}
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>🏆 Teams ({formData.customTeams.length}):</strong>
                </div>
                <div style={{ marginLeft: '1rem' }}>
                  {formData.customTeams.map((team, index) => (
                    <div key={team.id} style={{ marginBottom: '0.5rem' }}>
                      {index === 0 && '⭐ '}
                      {team.club_name} - {team.category || team.team_name}
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ 
                padding: '1rem',
                background: '#fef3c7',
                border: '2px solid #f59e0b',
                borderRadius: '12px',
                fontSize: '0.9rem'
              }}>
                📝 Klicke auf &quot;Profil erstellen&quot; um deine Registrierung abzuschließen.
              </div>
            </div>

            {/* Navigation */}
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <button
                type="button"
                className="btn-modern btn-modern-inactive"
                onClick={() => setCurrentStep(3)}
                disabled={loading}
                style={{ minWidth: '120px' }}
              >
                <ChevronLeft size={18} />
                Zurück
              </button>
              <button
                className="btn-modern btn-modern-active"
                onClick={() => {
                  console.log('🔵 STEP 4: Profil erstellen clicked');
                  console.log('📊 STEP 4: formData.name:', formData.name);
                  console.log('📊 STEP 4: customTeams.length:', formData.customTeams.length);
                  handleComplete();
                }}
                disabled={loading || !formData.name || formData.customTeams.length === 0}
                style={{ minWidth: '200px' }}
              >
                {loading ? '⏳ Speichert...' : '✅ Profil erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OnboardingFlow;

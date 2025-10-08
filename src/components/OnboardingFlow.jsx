import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import ClubAutocomplete from './ClubAutocomplete';
import './Dashboard.css';

function OnboardingFlow() {
  const navigate = useNavigate();
  const { } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [availableTeams, setAvailableTeams] = useState([]);

  // Form Data
  const [formData, setFormData] = useState({
    selectedClubs: [], // Array für mehrere Vereine
    customTeams: [], // Array für selbst eingegebene Teams
    availableTeams: [], // Teams aus der Datenbank für gewählte Vereine
    showAddTeamForm: false, // Zeigt das manuelle Eingabeformular
    currentSeason: 'Winter 2025/26', // Aktuelle Saison
    newTeamClub: '', // Verein für neue Mannschaft
    newTeamCategory: '', // Mannschaftskategorie
    newTeamLeague: '', // Liga
    newTeamGroup: '', // Gruppe
    newTeamSize: '', // Teamgröße
    name: '',
    phone: '',
    whatsappEnabled: false
  });

  // Lade verfügbare Teams
  useEffect(() => {
    loadAvailableTeams();
  }, []);

  // Lade Teams für gewählte Vereine
  useEffect(() => {
    if (formData.selectedClubs.length > 0) {
      loadTeamsForSelectedClubs();
    }
  }, [formData.selectedClubs, loadTeamsForSelectedClubs]);

  const loadAvailableTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('team_info')
        .select('*')
        .order('club_name', { ascending: true });

      if (error) throw error;

      setAvailableTeams(data || []);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  // Lade Teams für die gewählten Vereine (mit Saison-Informationen)
  const loadTeamsForSelectedClubs = async () => {
    try {
      console.log('🔍 Loading teams for clubs:', formData.selectedClubs);
      
      // JOIN team_info mit team_seasons um vollständige Informationen zu bekommen
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
      
      console.log('✅ Found teams with seasons:', data);
      
      // Transformiere die Daten, um nur aktive Saisons anzuzeigen
      const teamsWithActiveSeason = data?.map(team => {
        // Finde die aktive Saison oder nehme die erste
        const activeSeason = team.team_seasons?.find(s => s.is_active) || team.team_seasons?.[0];
        
        return {
          ...team,
          season: activeSeason?.season || formData.currentSeason,
          league: activeSeason?.league || 'Unbekannt',
          group_name: activeSeason?.group_name || '',
          team_size: activeSeason?.team_size || 6,
          season_id: activeSeason?.id || null,
          all_seasons: team.team_seasons || [] // Speichere alle Saisons für spätere Auswahl
        };
      }) || [];
      
      setFormData(prev => ({ ...prev, availableTeams: teamsWithActiveSeason }));
    } catch (error) {
      console.error('Error loading teams for clubs:', error);
      setFormData(prev => ({ ...prev, availableTeams: [] }));
    }
  };

  // Gruppiere Teams nach Verein
  const teamsByClub = availableTeams.reduce((acc, team) => {
    const club = team.club_name || 'Unbekannt';
    if (!acc[club]) acc[club] = [];
    acc[club].push(team);
    return acc;
  }, {});

  console.log('🏢 teamsByClub structure:', teamsByClub);
  console.log('🎯 Selected club:', formData.selectedClub);
  console.log('🏆 Available teams for club:', formData.selectedClub ? teamsByClub[formData.selectedClub] : 'No club selected');

  // Schritt abschließen - LOKALE SPEICHERUNG FÜR TESTS
  const handleComplete = async () => {
    console.log('🔍 Debug formData:', formData);
    
    if (formData.customTeams.length === 0 || !formData.name) {
      alert('Bitte fülle alle Pflichtfelder aus');
      return;
    }

    try {
      setLoading(true);
      console.log('🚀 Starting LOCAL onboarding completion...');
      console.log('📊 Custom teams:', formData.customTeams);

      // LOKALE SPEICHERUNG - Simuliere erfolgreiche Registrierung
      const playerData = {
        id: `local_player_${Date.now()}`, // Temporäre lokale ID
        name: formData.name,
        phone: formData.phone,
        whatsapp_enabled: formData.whatsappEnabled,
        email: 'test@example.com', // Placeholder
        current_lk: 'LK 15.0', // Placeholder
        created_at: new Date().toISOString(),
        // Multi-Team-Zuordnung
        clubs: formData.selectedClubs,
        teams: formData.customTeams.map((team) => ({
          id: team.id,
          club_name: team.club_name,
          category: team.category,
          league: team.league,
          team_size: team.team_size,
          group_name: team.group_name,
          role: 'home' // Vereinfacht: alle Teams als Heimverein
        }))
      };

      // Speichere in localStorage
      localStorage.setItem('localPlayerData', JSON.stringify(playerData));
      localStorage.setItem('localOnboardingComplete', 'true');
      
      console.log('✅ LOCAL Profile saved:', playerData);
      console.log('✅ LOCAL Teams assigned:', playerData.teams);

      // Simuliere kurze Verzögerung
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('✅ LOCAL Onboarding abgeschlossen');

      // Weiterleitung zum Dashboard
      navigate('/dashboard');

    } catch (error) {
      console.error('❌ Error in LOCAL onboarding:', error);
      alert(`Fehler: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Debug-Funktion: Lokale Daten löschen
  const clearLocalData = () => {
    localStorage.removeItem('localPlayerData');
    localStorage.removeItem('localOnboardingComplete');
    console.log('🗑️ Local data cleared');
    alert('Lokale Daten gelöscht! Seite wird neu geladen.');
    window.location.reload();
  };

  return (
    <div className="dashboard container" style={{ paddingTop: '2rem' }}>
      {/* Debug Button */}
      <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
        <button
          onClick={clearLocalData}
          style={{
            padding: '0.5rem 1rem',
            background: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          🗑️ Lokale Daten löschen (Debug)
        </button>
      </div>

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


            {/* Heimverein/Gastspielerverein Toggle */}
            {formData.selectedClubs.length > 0 && (
              <div style={{ 
                marginTop: '1.5rem', 
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                border: '2px solid #0ea5e9',
                borderRadius: '16px'
              }}>
                <h4 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '1rem', 
                  fontWeight: '700', 
                  color: '#0c4a6e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  🏠 Vereinsstatus
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {formData.selectedClubs.map((clubName) => (
                    <div key={clubName} style={{ 
                      padding: '1rem',
                      background: 'white',
                      border: '1px solid #bae6fd',
                      borderRadius: '12px',
                      boxShadow: '0 2px 4px rgba(14, 165, 233, 0.1)'
                    }}>
                      <div style={{ 
                        fontSize: '1rem', 
                        fontWeight: '600',
                        color: '#0c4a6e',
                        marginBottom: '0.75rem'
                      }}>
                        {clubName}
                      </div>
                      <div style={{ 
                        fontSize: '0.9rem', 
                        color: '#0369a1',
                        marginBottom: '0.5rem'
                      }}>
                        Dies ist mein:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.75rem',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          transition: 'all 0.2s ease'
                        }}>
                          <input
                            type="radio"
                            name={`club-${index}`}
                            value="home"
                            defaultChecked={index === 0}
                            style={{ 
                              width: '18px', 
                              height: '18px',
                              accentColor: '#0ea5e9'
                            }}
                          />
                          <span style={{ 
                            fontWeight: '500',
                            color: '#0c4a6e'
                          }}>
                            🏠 Heimverein
                          </span>
                        </label>
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.75rem',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          transition: 'all 0.2s ease'
                        }}>
                          <input
                            type="radio"
                            name={`club-${index}`}
                            value="guest"
                            defaultChecked={index > 0}
                            style={{ 
                              width: '18px', 
                              height: '18px',
                              accentColor: '#0ea5e9'
                            }}
                          />
                          <span style={{ 
                            fontWeight: '500',
                            color: '#0c4a6e'
                          }}>
                            ✈️ Gastspieler-Verein
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manuelle Vereinseingabe */}
            <div style={{ 
              marginTop: '1.5rem',
              padding: '1.5rem',
              background: '#f8fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '12px'
            }}>
              <h4 style={{ 
                margin: '0 0 1rem 0', 
                fontSize: '1rem', 
                fontWeight: '700', 
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                ➕ Verein nicht gefunden?
              </h4>
              <p style={{ 
                margin: '0 0 1rem 0', 
                fontSize: '0.85rem', 
                color: '#6b7280',
                lineHeight: '1.4'
              }}>
                Du kannst auch einen Verein manuell hinzufügen. Dieser wird von einem Admin geprüft und verifiziert.
              </p>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  color: '#374151'
                }}>
                  Vereinsname *
                </label>
                <input
                  type="text"
                  placeholder="z.B. TC Rot-Weiss Köln"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                  }}
                  onBlur={(e) => {
                    const clubName = e.target.value.trim();
                    if (clubName && !formData.selectedClubs.includes(clubName)) {
                      setFormData(prev => ({ 
                        ...prev, 
                        selectedClubs: [...prev.selectedClubs, clubName] 
                      }));
                      e.target.value = '';
                    }
                  }}
                />
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#6b7280',
                fontStyle: 'italic',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
              </div>
            </div>

            {/* Next Button */}
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-modern btn-modern-active"
                onClick={() => setCurrentStep(2)}
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
            {/* Gewählte Vereine anzeigen */}
            {formData.selectedClubs.length > 0 && (
              <div style={{ 
                padding: '1rem', 
                background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                marginLeft: '1rem',
                marginRight: '1rem'
              }}>
                <div style={{ fontSize: '0.85rem', color: '#4338ca', marginBottom: '0.5rem' }}>
                  {formData.selectedClubs.length === 1 ? 'Dein Verein:' : 'Deine Vereine:'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {formData.selectedClubs.map((clubName) => (
                    <div key={clubName} style={{
                      padding: '0.25rem 0.75rem',
                      background: '#4338ca',
                      color: 'white',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      {clubName} {index === 0 ? '🏠' : '✈️'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mannschaft hinzufügen */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                Füge deine aktuellen Mannschaften hinzu:
              </h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                Aktuelle Saison: <strong>{formData.currentSeason}</strong>
              </p>
              
              {/* Vorhandene Teams aus der Datenbank */}
              {formData.availableTeams.length > 0 && (
                <div style={{ marginBottom: '1.5rem', marginLeft: '1rem', marginRight: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                    📋 Verfügbare Teams aus deinen Vereinen:
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {formData.availableTeams.map((team) => {
                      const isSelected = formData.customTeams.some(t => t.id === team.id);
                      return (
                        <div
                          key={team.id}
                          onClick={() => {
                            if (isSelected) {
                              // Team entfernen
                              setFormData(prev => ({
                                ...prev,
                                customTeams: prev.customTeams.filter(t => t.id !== team.id)
                              }));
                            } else {
                              // Team hinzufügen (mit Saison-Informationen aus der DB)
                              const newTeam = {
                                id: team.id,
                                season_id: team.season_id, // ID der team_seasons Tabelle
                                club_name: team.club_name,
                                category: team.category || team.team_name,
                                season: team.season || formData.currentSeason,
                                league: team.league || 'Unbekannt',
                                team_size: team.team_size || 6,
                                group_name: team.group_name || '',
                                all_seasons: team.all_seasons || [] // Alle verfügbaren Saisons
                              };
                              setFormData(prev => ({
                                ...prev,
                                customTeams: [...prev.customTeams, newTeam]
                              }));
                            }
                          }}
                          style={{
                            padding: '0.75rem',
                            background: isSelected ? 
                              'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)' : 
                              '#ffffff',
                            border: isSelected ? 
                              '2px solid #6366f1' : 
                              '2px solid #e2e8f0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ 
                              fontWeight: '600', 
                              fontSize: '0.9rem',
                              color: isSelected ? '#3730a3' : '#1f2937',
                              marginBottom: '0.25rem'
                            }}>
                              {team.category || team.team_name}
                            </div>
                            <div style={{ 
                              fontSize: '0.8rem', 
                              color: isSelected ? '#4338ca' : '#6b7280',
                              marginBottom: '0.25rem'
                            }}>
                              {team.club_name} • {team.season || formData.currentSeason}
                            </div>
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: isSelected ? '#6366f1' : '#9ca3af'
                            }}>
                              {team.league} {team.group_name && `• ${team.group_name}`} • {team.team_size} Spieler
                            </div>
                          </div>
                          {isSelected && (
                            <div style={{ 
                              width: '20px', 
                              height: '20px', 
                              background: '#10b981', 
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '0.75rem',
                              fontWeight: '700'
                            }}>
                              ✓
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Button zum Öffnen des manuellen Eingabeformulars */}
              <div style={{ marginLeft: '1rem', marginRight: '1rem', marginBottom: '1rem' }}>
                <p style={{ 
                  margin: '0 0 0.75rem 0', 
                  fontSize: '0.85rem', 
                  color: '#6b7280',
                  textAlign: 'center',
                  lineHeight: '1.4'
                }}>
                  💡 Möchtest du weitere Mannschaften aus deinem Verein hinzufügen?
                </p>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, showAddTeamForm: !prev.showAddTeamForm }))}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: formData.showAddTeamForm ? 
                      'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' : 
                      'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    width: '100%'
                  }}
                >
                  {formData.showAddTeamForm ? '✖️ Formular schließen' : '✏️ Team manuell hinzufügen'}
                </button>
              </div>

              {/* Manuelles Eingabeformular */}
              {formData.showAddTeamForm && (
                <div style={{ 
                  padding: '1.5rem',
                  background: '#f8fafc',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  marginBottom: '1rem',
                  marginLeft: '1rem',
                  marginRight: '1rem'
                }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                    📝 Team-Details eingeben:
                  </h4>
                  
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {/* Verein */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>
                        🏢 Verein *
                      </label>
                      <select
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '0.95rem',
                          background: 'white'
                        }}
                        value={formData.newTeamClub}
                        onChange={(e) => setFormData(prev => ({ ...prev, newTeamClub: e.target.value }))}
                      >
                        <option value="">Verein auswählen...</option>
                        {formData.selectedClubs.map(club => (
                          <option key={club} value={club}>{club}</option>
                        ))}
                      </select>
                    </div>

                    {/* Mannschaftskategorie */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>
                        👥 Mannschaftskategorie *
                      </label>
                      <input
                        type="text"
                        placeholder="z.B. Herren, Herren 30, Damen, Mixed..."
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '0.95rem',
                          background: 'white'
                        }}
                        value={formData.newTeamCategory}
                        onChange={(e) => setFormData(prev => ({ ...prev, newTeamCategory: e.target.value }))}
                      />
                    </div>

                    {/* Liga */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>
                        🏆 Liga *
                      </label>
                      <input
                        type="text"
                        placeholder="z.B. Verbandsliga, Bezirksliga, Kreisliga..."
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '0.95rem',
                          background: 'white'
                        }}
                        value={formData.newTeamLeague}
                        onChange={(e) => setFormData(prev => ({ ...prev, newTeamLeague: e.target.value }))}
                      />
                    </div>

                    {/* Gruppe */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>
                        📋 Gruppe
                      </label>
                      <input
                        type="text"
                        placeholder="z.B. Gruppe A, Gr. 035, Staffel 1..."
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '0.95rem',
                          background: 'white'
                        }}
                        value={formData.newTeamGroup}
                        onChange={(e) => setFormData(prev => ({ ...prev, newTeamGroup: e.target.value }))}
                      />
                    </div>

                    {/* Teamgröße */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>
                        👥 Teamgröße *
                      </label>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          cursor: 'pointer',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          background: formData.newTeamSize === '4' ? '#e0f2fe' : 'transparent',
                          border: formData.newTeamSize === '4' ? '2px solid #0ea5e9' : '2px solid #e2e8f0',
                          flex: '1',
                          minWidth: '140px'
                        }}>
                          <input
                            type="radio"
                            name="teamSize"
                            value="4"
                            checked={formData.newTeamSize === '4'}
                            onChange={(e) => setFormData(prev => ({ ...prev, newTeamSize: e.target.value }))}
                            style={{ width: '18px', height: '18px' }}
                          />
                          <span style={{ fontWeight: '500' }}>4 Spieler</span>
                        </label>
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          cursor: 'pointer',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          background: formData.newTeamSize === '6' ? '#e0f2fe' : 'transparent',
                          border: formData.newTeamSize === '6' ? '2px solid #0ea5e9' : '2px solid #e2e8f0',
                          flex: '1',
                          minWidth: '140px'
                        }}>
                          <input
                            type="radio"
                            name="teamSize"
                            value="6"
                            checked={formData.newTeamSize === '6'}
                            onChange={(e) => setFormData(prev => ({ ...prev, newTeamSize: e.target.value }))}
                            style={{ width: '18px', height: '18px' }}
                          />
                          <span style={{ fontWeight: '500' }}>6 Spieler</span>
                        </label>
                      </div>
                    </div>

                    {/* TVM Link */}
                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flexWrap: 'wrap'
                    }}>
                      <span>💡</span>
                      <span>Nicht sicher? Finde dein Team hier:</span>
                      <a 
                        href="https://tvm-tennis.de/spielbetrieb/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.5rem',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        TVM
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 3h6v6"></path>
                          <path d="M10 14 21 3"></path>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        </svg>
                      </a>
                    </div>

                    {/* Hinzufügen Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.newTeamClub && formData.newTeamCategory && formData.newTeamLeague && formData.newTeamSize) {
                          const newTeam = {
                            id: `custom_${Date.now()}`,
                            club_name: formData.newTeamClub,
                            category: formData.newTeamCategory,
                            season: formData.currentSeason, // Aktuelle Saison
                            league: formData.newTeamLeague,
                            group_name: formData.newTeamGroup || '',
                            team_size: formData.newTeamSize
                          };
                          setFormData(prev => ({
                            ...prev,
                            customTeams: [...prev.customTeams, newTeam],
                            showAddTeamForm: false,
                            newTeamClub: '',
                            newTeamCategory: '',
                            newTeamLeague: '',
                            newTeamGroup: '',
                            newTeamSize: ''
                          }));
                        } else {
                          alert('Bitte fülle alle Pflichtfelder aus');
                        }
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      ➕ Mannschaft hinzufügen
                    </button>
                  </div>
                </div>
              )}

            </div>

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
                onClick={() => setCurrentStep(3)}
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
            {/* Gewählte Auswahl anzeigen */}
            {formData.selectedClubs.length > 0 && formData.customTeams.length > 0 && (
              <div style={{ 
                padding: '1rem', 
                background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                borderRadius: '12px',
                marginBottom: '1.5rem'
              }}>
                <div style={{ fontSize: '0.85rem', color: '#4338ca', marginBottom: '0.5rem' }}>
                  Deine Auswahl:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {formData.customTeams.map((team) => (
                    <div key={team.id} style={{ 
                      padding: '0.5rem',
                      background: 'rgba(67, 56, 202, 0.1)',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}>
                      <div style={{ fontWeight: '700', color: '#3730a3' }}>
                        {team.category}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#4338ca' }}>
                        {team.club_name} • {team.league} • {team.team_size} Spieler
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Name */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                👤 Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Vor- und Nachname"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            {/* Telefonnummer */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                📱 Telefonnummer
              </label>
              <input
                type="tel"
                placeholder="+49 123 456789"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  background: 'white'
                }}
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            {/* WhatsApp Teaser */}
            <div style={{ 
              marginBottom: '1.5rem',
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
              border: '2px solid #22c55e',
              borderRadius: '12px'
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
                    WhatsApp Push-Benachrichtigungen
                  </h4>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#166534' }}>
                    Verpasse nie wieder wichtige Updates!
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
                    checked={formData.whatsappEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, whatsappEnabled: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>🔔 Ja, ich möchte Push-Benachrichtigungen erhalten</span>
                </label>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#166534', lineHeight: 1.5 }}>
                <strong>Du erhältst Updates zu:</strong>
                <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
                  <li>🏆 Neue Matchdays & Termine</li>
                  <li>📈 LK-Updates & Rankings</li>
                  <li>🎾 Trainingseinladungen</li>
                  <li>📢 Team-News & Ankündigungen</li>
                </ul>
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
                onClick={() => setCurrentStep(4)}
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
            {/* Zusammenfassung */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ 
                margin: '0 0 1rem 0', 
                fontSize: '1.1rem', 
                fontWeight: '700',
                color: '#374151'
              }}>
                Deine Angaben:
              </h3>

              <div className="personality-grid">
                {/* Teams */}
                <div className="personality-card">
                  <div className="personality-icon">🏆</div>
                  <div className="personality-content">
                    <h4>Deine Teams</h4>
                    <div style={{ margin: 0 }}>
                      {formData.customTeams.map((team) => (
                        <div key={team.id} style={{ marginBottom: '0.5rem' }}>
                          <strong>{team.club_name}</strong><br />
                          {team.category} • {team.league}<br />
                          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                            {team.team_size} Spieler
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Spieler */}
                <div className="personality-card">
                  <div className="personality-icon">👤</div>
                  <div className="personality-content">
                    <h4>Deine Daten</h4>
                    <p style={{ margin: 0 }}>
                      <strong>{formData.name}</strong><br />
                      {formData.whatsappEnabled && formData.phone && (
                        <span style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginTop: '0.25rem' }}>
                          📱 {formData.phone}
                        </span>
                      )}
                      {formData.whatsappEnabled ? (
                        <span style={{ fontSize: '0.85rem', color: '#22c55e', fontWeight: '600', display: 'block', marginTop: '0.25rem' }}>
                          🔔 Push-Benachrichtigungen aktiviert
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '500', display: 'block', marginTop: '0.25rem' }}>
                          🔕 Push-Benachrichtigungen deaktiviert
                        </span>
                      )}
                    </p>
                  </div>
                </div>
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
                onClick={handleComplete}
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


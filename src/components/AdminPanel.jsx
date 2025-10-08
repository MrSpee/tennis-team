import { useState } from 'react';
import { Plus, Trash2, Calendar, MapPin, Users, Shield, Settings, Trophy, MessageCircle, Edit2, ExternalLink, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import MatchdayPlanner from './MatchdayPlanner';
import './AdminPanel.css';

function AdminPanel() {
  const { isCaptain } = useAuth();
  const { matches, teamInfo, players, addMatch, updateMatch, deleteMatch, updateTeamInfo, importHistoricalAvailabilityLogs } = useData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('planner'); // 'planner', 'matches', 'season', 'players', 'team'
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [logFilter, setLogFilter] = useState('all'); // Filter für Verfügbarkeits-Log
  const [logLimit, setLogLimit] = useState(50); // Anzahl der angezeigten Log-Einträge
  const [formData, setFormData] = useState({
    opponent: '',
    date: '',
    time: '',
    location: 'Home',
    venue: '', // Neue Spielstätte
    season: 'winter',
    playersNeeded: 4
  });
  // Aktuelle Saison bestimmen (gleiche Logik wie Dashboard)
  const getCurrentSeason = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let season = 'winter';
    let seasonYear = '';
    
    if (currentMonth >= 4 && currentMonth <= 7) {
      season = 'summer';
      seasonYear = String(currentYear);
    } else {
      season = 'winter';
      if (currentMonth >= 8) {
        const nextYear = currentYear + 1;
        seasonYear = `${String(currentYear).slice(-2)}/${String(nextYear).slice(-2)}`;
      } else {
        const prevYear = currentYear - 1;
        seasonYear = `${String(prevYear).slice(-2)}/${String(currentYear).slice(-2)}`;
      }
    }
    
    return { season, seasonYear };
  };

  const { season: currentSeason, seasonYear: currentSeasonYear } = getCurrentSeason();

  const [teamFormData, setTeamFormData] = useState({
    teamName: teamInfo?.teamName || '',
    clubName: teamInfo?.clubName || '',
    category: teamInfo?.category || 'Herren 40',
    league: teamInfo?.league || '1. Kreisliga',
    group: teamInfo?.group || 'Gruppe A',
    region: teamInfo?.region || 'Mittelrhein',
    tvmLink: teamInfo?.tvmLink || '',
    season: teamInfo?.season || currentSeason,
    seasonYear: teamInfo?.seasonYear || currentSeasonYear
  });

  if (!isCaptain) {
    return (
      <div className="admin-page container">
        <div className="access-denied card">
          <Shield size={48} color="var(--danger)" />
          <h2>Zugriff verweigert</h2>
          <p>Nur Team Captains haben Zugriff auf diesen Bereich.</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Zurück zur Startseite
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('📝 Creating match...');
    const dateTime = new Date(`${formData.date}T${formData.time}`);
    
    const result = await addMatch({
      opponent: formData.opponent,
      date: dateTime,
      location: formData.location,
      venue: formData.venue,
      season: formData.season,
      playersNeeded: parseInt(formData.playersNeeded)
    });

    if (result.success) {
      console.log('✅ Match created successfully');
      setFormData({
        opponent: '',
        date: '',
        time: '',
        location: 'Home',
        venue: '',
        season: 'winter',
        playersNeeded: 4
      });
      setShowAddForm(false);
      alert('✅ Spiel erfolgreich erstellt!');
    } else {
      console.error('❌ Error creating match:', result.error);
      alert('❌ Fehler beim Erstellen: ' + (result.error || 'Unbekannter Fehler'));
    }
  };

  const handleDelete = async (matchId) => {
    if (window.confirm('⚠️ Möchtest du dieses Spiel wirklich löschen?\n\nDies löscht auch alle Verfügbarkeits-Einträge und Ergebnisse!\n\nDieser Vorgang kann nicht rückgängig gemacht werden.')) {
      console.log('🗑️ AdminPanel - Deleting match:', matchId);
      
      const result = await deleteMatch(matchId);
      
      if (result.success) {
        console.log('✅ AdminPanel - Match deleted successfully');
        alert('✅ Spiel erfolgreich gelöscht!');
      } else {
        console.error('❌ AdminPanel - Delete failed:', result.error);
        alert('❌ Fehler beim Löschen:\n' + (result.error || 'Unbekannter Fehler'));
      }
    } else {
      console.log('❌ AdminPanel - Delete cancelled by user');
    }
  };

  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    console.log('📝 AdminPanel - Submitting team form:', teamFormData);
    console.log('📝 TVM Link:', teamFormData.tvmLink);
    
    const result = await updateTeamInfo(teamFormData);
    
    console.log('📝 Update result:', result);
    
    if (result.success) {
      setShowTeamSetup(false);
      alert('✅ Team-Informationen gespeichert!\n\nTVM-Link: ' + (teamFormData.tvmLink || 'Nicht gesetzt'));
    } else {
      console.error('❌ Error saving team info:', result.error);
      alert('❌ Fehler beim Speichern:\n' + (result.error || 'Unbekannter Fehler'));
    }
  };

  const upcomingMatches = matches
    .filter(m => m.date > new Date())
    .sort((a, b) => a.date - b.date);

  return (
    <div className="admin-page container">
      <header className="page-header fade-in">
        <div>
          <h1>Admin Panel</h1>
          <p>Spiele verwalten und Team organisieren</p>
        </div>
      </header>

      {/* Card-Tab Navigation */}
      <div className="admin-tabs fade-in" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div 
          className={`admin-tab-card ${activeTab === 'planner' ? 'active' : ''}`}
          onClick={() => setActiveTab('planner')}
          style={{
            background: activeTab === 'planner' ? 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)' : '#f8fafc',
            color: activeTab === 'planner' ? 'white' : '#374151',
            padding: '1.5rem',
            borderRadius: '12px',
            cursor: 'pointer',
            border: activeTab === 'planner' ? 'none' : '2px solid #e2e8f0',
            transition: 'all 0.3s ease',
            textAlign: 'center'
          }}
        >
          <Target size={24} style={{ marginBottom: '0.5rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
            Aufstellungs-Assistent
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.9 }}>
            {upcomingMatches.length} kommende Spiele
          </p>
        </div>

        <div 
          className={`admin-tab-card ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
          style={{
            background: activeTab === 'matches' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : '#f8fafc',
            color: activeTab === 'matches' ? 'white' : '#374151',
            padding: '1.5rem',
            borderRadius: '12px',
            cursor: 'pointer',
            border: activeTab === 'matches' ? 'none' : '2px solid #e2e8f0',
            transition: 'all 0.3s ease',
            textAlign: 'center'
          }}
        >
          <Calendar size={24} style={{ marginBottom: '0.5rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
            Spiele-Verwaltung
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.9 }}>
            {upcomingMatches.length} kommende Spiele
          </p>
        </div>

        <div 
          className={`admin-tab-card ${activeTab === 'season' ? 'active' : ''}`}
          onClick={() => setActiveTab('season')}
          style={{
            background: activeTab === 'season' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : '#f8fafc',
            color: activeTab === 'season' ? 'white' : '#374151',
            padding: '1.5rem',
            borderRadius: '12px',
            cursor: 'pointer',
            border: activeTab === 'season' ? 'none' : '2px solid #e2e8f0',
            transition: 'all 0.3s ease',
            textAlign: 'center'
          }}
        >
          <Calendar size={24} style={{ marginBottom: '0.5rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
            Saison-Verwaltung
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.9 }}>
            Winter/Sommer Saisons
          </p>
        </div>

        <div 
          className={`admin-tab-card ${activeTab === 'players' ? 'active' : ''}`}
          onClick={() => setActiveTab('players')}
          style={{
            background: activeTab === 'players' ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : '#f8fafc',
            color: activeTab === 'players' ? 'white' : '#374151',
            padding: '1.5rem',
            borderRadius: '12px',
            cursor: 'pointer',
            border: activeTab === 'players' ? 'none' : '2px solid #e2e8f0',
            transition: 'all 0.3s ease',
            textAlign: 'center'
          }}
        >
          <Users size={24} style={{ marginBottom: '0.5rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
            Spieler-Übersicht
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.9 }}>
            {players?.length || 0} Spieler
          </p>
        </div>

        <div 
          className={`admin-tab-card ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
          style={{
            background: activeTab === 'team' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#f8fafc',
            color: activeTab === 'team' ? 'white' : '#374151',
            padding: '1.5rem',
            borderRadius: '12px',
            cursor: 'pointer',
            border: activeTab === 'team' ? 'none' : '2px solid #e2e8f0',
            transition: 'all 0.3s ease',
            textAlign: 'center'
          }}
        >
          <Settings size={24} style={{ marginBottom: '0.5rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
            Team-Setup
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.9 }}>
            Liga & Konfiguration
          </p>
        </div>
      </div>

      {/* Saison-Verwaltung */}
      {activeTab === 'season' && (
        <div className="add-match-form fade-in card">
          <h2>📅 Saison-Verwaltung</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            Verwalte Saisons und erstelle neue Team-Setups für kommende Spielzeiten
          </p>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Aktuelle Saison</h3>
            <div style={{
              padding: '1rem',
              background: '#eff6ff',
              borderRadius: '8px',
              border: '2px solid #3b82f6'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '1.2rem', color: '#1e40af' }}>
                    {currentSeason === 'winter' ? '❄️' : '☀️'} {currentSeason === 'winter' ? `Winter ${currentSeasonYear}` : `Sommer ${currentSeasonYear}`}
                  </strong>
                  {teamInfo ? (
                    <div style={{ marginTop: '0.5rem', color: '#666' }}>
                      <div>{teamInfo.category} • {teamInfo.league}</div>
                      <div>{teamInfo.group}</div>
                    </div>
                  ) : (
                    <div style={{ marginTop: '0.5rem', color: '#ef4444' }}>
                      ⚠️ Noch kein Team-Setup für diese Saison
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setActiveTab('team');
                  }}
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {teamInfo ? '✏️ Bearbeiten' : '➕ Team-Setup erstellen'}
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Neue Saison erstellen</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '1rem'
            }}>
              {/* Kommende Saisons generieren */}
              {(() => {
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const seasons = [];

                // Generiere die nächsten 4 Saisons
                for (let i = 0; i < 4; i++) {
                  let season, seasonYear, displayName;
                  
                  if (currentMonth >= 4 && currentMonth <= 7) {
                    // Aktuell Sommer
                    if (i === 0) {
                      season = 'winter';
                      const nextYear = currentYear + 1;
                      seasonYear = `${String(currentYear).slice(-2)}/${String(nextYear).slice(-2)}`;
                      displayName = `Winter ${seasonYear}`;
                    } else if (i === 1) {
                      season = 'summer';
                      seasonYear = String(currentYear + 1);
                      displayName = `Sommer ${seasonYear}`;
                    } else if (i === 2) {
                      season = 'winter';
                      const year = currentYear + 1;
                      const nextYear = currentYear + 2;
                      seasonYear = `${String(year).slice(-2)}/${String(nextYear).slice(-2)}`;
                      displayName = `Winter ${seasonYear}`;
                    } else {
                      season = 'summer';
                      seasonYear = String(currentYear + 2);
                      displayName = `Sommer ${seasonYear}`;
                    }
                  } else {
                    // Aktuell Winter
                    if (i === 0) {
                      season = 'summer';
                      const year = currentMonth >= 8 ? currentYear + 1 : currentYear;
                      seasonYear = String(year);
                      displayName = `Sommer ${seasonYear}`;
                    } else if (i === 1) {
                      season = 'winter';
                      const year = currentMonth >= 8 ? currentYear + 1 : currentYear;
                      const nextYear = year + 1;
                      seasonYear = `${String(year).slice(-2)}/${String(nextYear).slice(-2)}`;
                      displayName = `Winter ${seasonYear}`;
                    } else if (i === 2) {
                      season = 'summer';
                      const year = currentMonth >= 8 ? currentYear + 2 : currentYear + 1;
                      seasonYear = String(year);
                      displayName = `Sommer ${seasonYear}`;
                    } else {
                      season = 'winter';
                      const year = currentMonth >= 8 ? currentYear + 2 : currentYear + 1;
                      const nextYear = year + 1;
                      seasonYear = `${String(year).slice(-2)}/${String(nextYear).slice(-2)}`;
                      displayName = `Winter ${seasonYear}`;
                    }
                  }

                  // Prüfe ob diese Saison bereits existiert (vereinfacht)
                  const isCurrentSeason = season === currentSeason && seasonYear === currentSeasonYear;
                  
                  if (!isCurrentSeason) {
                    seasons.push({ season, seasonYear, displayName });
                  }
                }

                return seasons.map((s) => (
                  <div
                    key={`${s.season}-${s.seasonYear}`}
                    style={{
                      padding: '1rem',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db'
                    }}
                  >
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      {s.season === 'winter' ? '❄️' : '☀️'} {s.displayName}
                    </div>
                    <button
                      onClick={() => {
                        // Setze die Saison im teamFormData
                        setTeamFormData({
                          ...teamFormData,
                          season: s.season,
                          seasonYear: s.seasonYear
                        });
                        setActiveTab('team');
                      }}
                      className="btn btn-success"
                      style={{ width: '100%', marginTop: '0.5rem' }}
                    >
                      ➕ Team-Setup erstellen
                    </button>
                  </div>
                ));
              })()}
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}>
            <strong style={{ color: '#92400e' }}>💡 Hinweis:</strong>
            <p style={{ color: '#92400e', fontSize: '0.9rem', marginTop: '0.5rem', marginBottom: 0 }}>
              Pro Saison können unterschiedliche Ligen, Gruppen und Spieler-Konstellationen eingestellt werden.
              Spiele und Verfügbarkeiten werden automatisch der jeweiligen Saison zugeordnet.
            </p>
          </div>
        </div>
      )}

      {/* Spiele-Verwaltung */}
      {/* Aufstellungs-Assistent Tab */}
      {activeTab === 'planner' && (
        <MatchdayPlanner />
      )}

      {activeTab === 'matches' && (
        <div className="matches-management-card fade-in card">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '2px solid #e2e8f0'
          }}>
            <h2 style={{ margin: 0 }}>🎾 Spiele-Verwaltung</h2>
            <button
              onClick={() => setActiveTab('add-match')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={18} />
              Neues Spiel
            </button>
          </div>
          
          {/* Kommende Spiele Liste */}
          <div className="upcoming-matches-section">
            <h3 style={{ marginBottom: '1rem', color: '#374151' }}>Kommende Spiele ({upcomingMatches.length})</h3>
            {upcomingMatches.length > 0 ? (
              <div className="admin-matches-list">
                {upcomingMatches.map(match => {
                  const availableCount = Object.values(match.availability || {})
                    .filter(av => av.status === 'available').length;
                  const totalResponses = Object.keys(match.availability || {}).length;
                  const totalPlayers = players.length;
                  const missingResponses = totalPlayers - totalResponses;

                  return (
                    <div key={match.id} className="match-card" style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <h4 style={{ margin: '0 0 0.25rem 0', color: '#1f2937' }}>
                            🎾 {match.opponent} {match.location === 'Home' ? '(H)' : '(A)'}
                          </h4>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            📅 {new Date(match.date).toLocaleDateString('de-DE')} um {match.time}
                            {match.venue && <span> • {match.venue}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => {
                              setEditingMatchId(match.id);
                              setEditFormData({
                                opponent: match.opponent,
                                date: match.date,
                                time: match.time,
                                location: match.location,
                                venue: match.venue || '',
                                season: match.season,
                                playersNeeded: match.playersNeeded
                              });
                            }}
                            className="btn btn-sm"
                            style={{ background: '#3b82f6', color: 'white', padding: '0.375rem 0.75rem' }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteMatch(match.id)}
                            className="btn btn-sm"
                            style={{ background: '#ef4444', color: 'white', padding: '0.375rem 0.75rem' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      <div style={{ 
                        background: '#f8fafc', 
                        padding: '0.75rem', 
                        borderRadius: '6px',
                        fontSize: '0.875rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span>✅ Verfügbar: <strong>{availableCount}</strong></span>
                          <span>👥 Benötigt: <strong>{match.playersNeeded}</strong></span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>📊 Rückmeldungen: <strong>{totalResponses}/{totalPlayers}</strong></span>
                          {missingResponses > 0 && (
                            <span style={{ color: '#f59e0b' }}>⚠️ {missingResponses} fehlen</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <Calendar size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>Keine kommenden Spiele geplant</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Neues Spiel hinzufügen */}
      {activeTab === 'add-match' && (
        <div className="add-match-form fade-in card">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '2px solid #e2e8f0'
          }}>
            <h2 style={{ margin: 0 }}>➕ Neues Spiel erstellen</h2>
            <button
              onClick={() => setActiveTab('matches')}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              ← Zurück
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="opponent">
                  <Users size={18} />
                  Gegner
                </label>
                <input
                  type="text"
                  id="opponent"
                  value={formData.opponent}
                  onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
                  placeholder="z.B. TC München-Ost"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="date">
                  <Calendar size={18} />
                  Datum
                </label>
                <input
                  type="date"
                  id="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="time">
                  <Calendar size={18} />
                  Uhrzeit
                </label>
                <input
                  type="time"
                  id="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="location">
                  <MapPin size={18} />
                  Heim / Auswärts
                </label>
                <select
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                >
                  <option value="Home">Heimspiel</option>
                  <option value="Away">Auswärtsspiel</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="venue">
                  <MapPin size={18} />
                  Spielstätte / Anlage
                </label>
                <input
                  type="text"
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="z.B. TC München-Ost, Musterstraße 10, München"
                />
                <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  💡 Vollständige Adresse für Google Maps Link
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="season">Saison</label>
                <select
                  id="season"
                  value={formData.season}
                  onChange={(e) => {
                    const playersNeeded = e.target.value === 'winter' ? 4 : 6;
                    setFormData({ ...formData, season: e.target.value, playersNeeded });
                  }}
                >
                  <option value="winter">Winter (4 Spieler)</option>
                  <option value="summer">Sommer (6 Spieler)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="playersNeeded">
                  <Users size={18} />
                  Spieler benötigt
                </label>
                <input
                  type="number"
                  id="playersNeeded"
                  value={formData.playersNeeded}
                  onChange={(e) => setFormData({ ...formData, playersNeeded: e.target.value })}
                  min="2"
                  max="10"
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                <Plus size={18} />
                Spiel erstellen
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('matches')}
                className="btn btn-secondary"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Team-Setup */}
      {activeTab === 'team' && (
        <div className="add-match-form fade-in card">
          <h2>⚙️ Team-Setup</h2>
          <p style={{ color: '#666', marginBottom: '0.5rem' }}>
            Konfiguriere deine Mannschaft und Liga-Zuordnung
          </p>
          <div style={{ 
            background: '#eff6ff', 
            padding: '0.75rem 1rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem',
            border: '1px solid #3b82f6'
          }}>
            <strong style={{ color: '#1e40af' }}>
              🏆 Saison: {teamFormData.season === 'winter' ? `❄️ Winter ${teamFormData.seasonYear}` : `☀️ Sommer ${teamFormData.seasonYear}`}
            </strong>
            <p style={{ fontSize: '0.85rem', color: '#1e40af', marginTop: '0.25rem', marginBottom: 0 }}>
              Die Team-Konfiguration gilt für diese Saison. In anderen Saisons können unterschiedliche Ligen/Gruppen gespielt werden.
            </p>
          </div>
          <form onSubmit={handleTeamSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="clubName">
                  <Shield size={18} />
                  Vereinsname
                </label>
                <input
                  type="text"
                  id="clubName"
                  value={teamFormData.clubName}
                  onChange={(e) => setTeamFormData({ ...teamFormData, clubName: e.target.value })}
                  placeholder="z.B. TC Musterhausen"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="teamName">
                  <Users size={18} />
                  Mannschaftsname (optional)
                </label>
                <input
                  type="text"
                  id="teamName"
                  value={teamFormData.teamName}
                  onChange={(e) => setTeamFormData({ ...teamFormData, teamName: e.target.value })}
                  placeholder="z.B. TC Musterhausen Herren 40"
                />
              </div>

              {/* Saison-Anzeige (readonly, automatisch gesetzt) */}
              <input type="hidden" name="season" value={teamFormData.season} />
              <input type="hidden" name="seasonYear" value={teamFormData.seasonYear} />

              <div className="form-group">
                <label htmlFor="category">
                  <Users size={18} />
                  Mannschaft / Kategorie *
                </label>
                <select
                  id="category"
                  value={teamFormData.category}
                  onChange={(e) => setTeamFormData({ ...teamFormData, category: e.target.value })}
                  required
                >
                  <optgroup label="Herren">
                    <option value="Herren">Herren</option>
                    <option value="Herren 30">Herren 30</option>
                    <option value="Herren 40">Herren 40</option>
                    <option value="Herren 50">Herren 50</option>
                    <option value="Herren 60">Herren 60</option>
                    <option value="Herren 70">Herren 70</option>
                  </optgroup>
                  <optgroup label="Damen">
                    <option value="Damen">Damen</option>
                    <option value="Damen 30">Damen 30</option>
                    <option value="Damen 40">Damen 40</option>
                    <option value="Damen 50">Damen 50</option>
                    <option value="Damen 60">Damen 60</option>
                  </optgroup>
                  <optgroup label="Jugend">
                    <option value="Junioren U18">Junioren U18</option>
                    <option value="Juniorinnen U18">Juniorinnen U18</option>
                    <option value="Junioren U15">Junioren U15</option>
                    <option value="Juniorinnen U15">Juniorinnen U15</option>
                    <option value="Junioren U12">Junioren U12</option>
                    <option value="Juniorinnen U12">Juniorinnen U12</option>
                  </optgroup>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="league">
                  <Trophy size={18} />
                  Liga / Klasse *
                </label>
                <select
                  id="league"
                  value={teamFormData.league}
                  onChange={(e) => setTeamFormData({ ...teamFormData, league: e.target.value })}
                  required
                >
                  <optgroup label="Verbandsligen">
                    <option value="Tennis-Bundesliga">Tennis-Bundesliga</option>
                    <option value="2. Bundesliga Nord">2. Bundesliga Nord</option>
                    <option value="Regionalliga West">Regionalliga West</option>
                    <option value="Verbandsliga">Verbandsliga</option>
                  </optgroup>
                  <optgroup label="Bezirksligen">
                    <option value="Bezirksoberliga">Bezirksoberliga</option>
                    <option value="Bezirksliga">Bezirksliga</option>
                  </optgroup>
                  <optgroup label="Kreisligen">
                    <option value="1. Kreisliga">1. Kreisliga</option>
                    <option value="2. Kreisliga">2. Kreisliga</option>
                    <option value="3. Kreisliga">3. Kreisliga</option>
                    <option value="4. Kreisliga">4. Kreisliga</option>
                  </optgroup>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="group">
                  <Users size={18} />
                  Gruppe
                </label>
                <input
                  type="text"
                  id="group"
                  value={teamFormData.group}
                  onChange={(e) => setTeamFormData({ ...teamFormData, group: e.target.value })}
                  placeholder="z.B. Gr. 046, Gruppe A, Staffel Nord"
                />
                <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  💡 Geben Sie Ihre Gruppennummer ein (z.B. Gr. 046)
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="region">
                  <MapPin size={18} />
                  Region / Verband
                </label>
                <select
                  id="region"
                  value={teamFormData.region}
                  onChange={(e) => setTeamFormData({ ...teamFormData, region: e.target.value })}
                >
                  <option value="Mittelrhein">Mittelrhein (TVM)</option>
                  <option value="Niederrhein">Niederrhein</option>
                  <option value="Westfalen">Westfalen</option>
                  <option value="Bayern">Bayern (BTV)</option>
                  <option value="Baden">Baden</option>
                  <option value="Württemberg">Württemberg</option>
                  <option value="Hessen">Hessen</option>
                  <option value="Rheinland-Pfalz">Rheinland-Pfalz</option>
                  <option value="Saarland">Saarland</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="tvmLink">
                  <ExternalLink size={18} />
                  TVM Spielbetrieb Link (optional)
                </label>
                <input
                  type="url"
                  id="tvmLink"
                  value={teamFormData.tvmLink}
                  onChange={(e) => setTeamFormData({ ...teamFormData, tvmLink: e.target.value })}
                  placeholder="https://tvm-tennis.de/spielbetrieb/mannschaft/..."
                />
                <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  🔗 Link zu eurer Mannschaft auf <a href="https://tvm-tennis.de/spielbetrieb/" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>tvm-tennis.de</a> (wird im Dashboard angezeigt)
                </small>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                <Settings size={18} />
                Team-Info speichern
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('season')}
                className="btn btn-secondary"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Spieler-Übersicht */}
      {activeTab === 'players' && (
        <div className="add-match-form fade-in card">
          <h2>👥 Spieler-Übersicht</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            Übersicht aller angemeldeten Spieler mit Kontaktdaten und Verfügbarkeits-Statistiken
          </p>
          
          {players && players.length > 0 ? (
            <div className="players-overview">
              <div className="players-stats" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '1rem', 
                marginBottom: '2rem' 
              }}>
                <div className="stat-card" style={{ 
                  background: '#f0f9ff', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  border: '1px solid #0ea5e9' 
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0ea5e9' }}>
                    {players.length}
                    </div>
                  <div style={{ color: '#0369a1' }}>Gesamt Spieler</div>
                    </div>
                <div className="stat-card" style={{ 
                  background: '#f0fdf4', 
                      padding: '1rem',
                      borderRadius: '8px',
                  border: '1px solid #22c55e' 
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e' }}>
                    {players.filter(p => p.is_active).length}
                        </div>
                  <div style={{ color: '#15803d' }}>Aktive Spieler</div>
                        </div>
                <div className="stat-card" style={{ 
                  background: '#fef3c7', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  border: '1px solid #f59e0b' 
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
                    {upcomingMatches.length}
                        </div>
                  <div style={{ color: '#d97706' }}>Kommende Spiele</div>
                        </div>
                        </div>

              <div className="players-table" style={{ 
                background: 'white', 
                borderRadius: '8px', 
                overflow: 'hidden', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
              }}>
                <div className="table-header" style={{ 
                  background: '#f8fafc', 
                  padding: '1rem', 
                  borderBottom: '1px solid #e2e8f0',
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
                  gap: '1rem',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  <div>👤 Name & E-Mail</div>
                  <div>📱 Telefon</div>
                  <div>🏆 Rang</div>
                  <div>📊 Verfügbar</div>
                  <div>📅 Letzte Aktivität</div>
                  <div>⚙️ Aktionen</div>
                      </div>
                
                {players.map(player => {
                  // Verfügbarkeits-Statistik für diesen Spieler aus Supabase-Daten
                  const playerAvailability = upcomingMatches.reduce((acc, match) => {
                    // Verwende die bereits transformierten Daten: match.availability[player.id]
                    const availability = match.availability?.[player.id];
                    if (availability?.status) {
                      console.log(`📊 ${player.name}: Match ${match.id} -> ${availability.status}`);
                      acc[availability.status] = (acc[availability.status] || 0) + 1;
                    }
                    return acc;
                  }, {});
                  
                  console.log(`🎯 ${player.name} Verfügbarkeit:`, playerAvailability);

                  const totalResponses = Object.values(playerAvailability).reduce((sum, count) => sum + count, 0);
                  const availableResponses = playerAvailability.available || 0;
                  const availabilityPercentage = upcomingMatches.length > 0 ? Math.round((availableResponses / upcomingMatches.length) * 100) : 0;
                  
                  // Zusätzliche Statistiken aus Supabase-Daten
                  const availableCount = playerAvailability.available || 0;
                  const unavailableCount = playerAvailability.unavailable || 0;
                  const noResponseCount = upcomingMatches.length - totalResponses;

                  // Format phone number for WhatsApp
                  const formatPhoneForWhatsApp = (phone) => {
                    if (!phone) return null;
                    return phone.replace(/\D/g, '');
                  };

                  const whatsappPhone = formatPhoneForWhatsApp(player.phone);
                            
                            return (
                    <div 
                      key={player.id || player.name} 
                      className="table-row" 
                        style={{
                        padding: '1rem', 
                        borderBottom: '1px solid #f1f5f9',
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
                        gap: '1rem',
                        alignItems: 'center'
                      }}
                    >
                      {/* Name & E-Mail */}
                      <div>
                        <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                          {player.name}
                      </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {player.email}
                    </div>
                  </div>

                      {/* Telefon */}
                        <div>
                        {player.phone ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ fontSize: '0.875rem' }}>{player.phone}</span>
                            {whatsappPhone && (
                              <a 
                                href={`https://wa.me/${whatsappPhone}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                  display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                  padding: '0.25rem 0.5rem',
                                      background: '#25D366',
                                      color: 'white',
                                      borderRadius: '4px',
                                      textDecoration: 'none',
                                      fontSize: '0.75rem',
                                  fontWeight: '500'
                                    }}
                                  >
                                <MessageCircle size={12} />
                                    WhatsApp
                                  </a>
                            )}
                      </div>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Nicht angegeben</span>
                        )}
                        </div>

                      {/* Rang */}
                        <div>
                                  <span style={{
                          background: '#f3f4f6', 
                          padding: '0.25rem 0.5rem', 
                                    borderRadius: '4px',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                                  }}>
                          {player.ranking || 'N/A'}
                                  </span>
                    </div>

                      {/* Verfügbarkeit */}
                        <div>
                        <div style={{ 
                          fontSize: '0.875rem', 
                          fontWeight: '600', 
                          marginBottom: '0.25rem',
                          color: availabilityPercentage >= 70 ? '#22c55e' : availabilityPercentage >= 40 ? '#f59e0b' : '#ef4444'
                        }}>
                          {availabilityPercentage}%
                    </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: '1.4' }}>
                          <div>✅ {availableCount} verfügbar</div>
                          <div>❌ {unavailableCount} nicht verfügbar</div>
                          {noResponseCount > 0 && (
                            <div style={{ color: '#9ca3af' }}>⏳ {noResponseCount} keine Rückmeldung</div>
                                )}
                    </div>
                  </div>

                      {/* Letzte Aktivität */}
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {player.updated_at ? new Date(player.updated_at).toLocaleDateString('de-DE') : 'N/A'}
                    </div>

                      {/* Aktionen */}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => navigate(`/player/${encodeURIComponent(player.name)}`)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <ExternalLink size={12} />
                          Profil
                        </button>
                    </div>
                    </div>
              );
            })}
                  </div>

              {/* Erweiterte Verfügbarkeits-Log für Captain/MF */}
              <div style={{ 
                marginTop: '1.5rem', 
                padding: '1.5rem', 
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
                borderRadius: '12px', 
                border: '1px solid #f59e0b' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, color: '#92400e', fontSize: '1.1rem' }}>📝 Verfügbarkeits-Log (Captain/MF)</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select 
                      onChange={(e) => setLogFilter(e.target.value)}
                      value={logFilter}
                      style={{
                        padding: '0.25rem 0.5rem',
                        border: '1px solid #d97706',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        background: 'white'
                      }}
                    >
                      <option value="all">Alle Änderungen</option>
                      <option value="available">Nur Zusagen</option>
                      <option value="unavailable">Nur Absagen</option>
                      <option value="today">Heute</option>
                      <option value="week">Diese Woche</option>
                    </select>
                    <button
                      onClick={() => setLogLimit(logLimit === 50 ? 200 : 50)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        border: '1px solid #d97706',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        background: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      {logLimit === 50 ? 'Alle anzeigen' : 'Weniger anzeigen'}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          console.log('🔄 Starting historical data import...');
                          const result = await importHistoricalAvailabilityLogs();
                          
                          if (result.success) {
                            alert(`✅ Import erfolgreich!\n\n${result.imported} neue Einträge importiert\nInsgesamt: ${result.total} Log-Einträge\n\nSeite wird neu geladen...`);
                            window.location.reload();
                          } else {
                            alert(`❌ Import fehlgeschlagen: ${result.error}`);
                          }
                        } catch (error) {
                          console.error('❌ Import error:', error);
                          alert(`❌ Fehler beim Import: ${error.message}`);
                        }
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        border: '1px solid #059669',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        background: '#f0fdf4',
                        color: '#059669',
                        cursor: 'pointer'
                      }}
                    >
                      📥 Historie importieren
                    </button>
                    <button
                      onClick={() => {
                        // Test-Log hinzufügen
                        const testLog = {
                          timestamp: new Date().toISOString(),
                          playerName: 'Test-Spieler',
                          playerId: 'test-id',
                          matchInfo: 'Test-Match (01.01.2025)',
                          matchId: 'test-match-id',
                          status: 'available',
                          comment: 'Test-Kommentar',
                          action: 'created'
                        };
                        const existingLogs = JSON.parse(localStorage.getItem('availability_logs') || '[]');
                        existingLogs.unshift(testLog);
                        localStorage.setItem('availability_logs', JSON.stringify(existingLogs));
                        console.log('🧪 Test-Log hinzugefügt:', testLog);
                        alert('Test-Log hinzugefügt! Seite wird neu geladen...');
                        window.location.reload();
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        border: '1px solid #dc2626',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        background: '#fef2f2',
                        color: '#dc2626',
                        cursor: 'pointer'
                      }}
                    >
                      🧪 Test-Log
                    </button>
                    </div>
                </div>
                
                      <div style={{
                  background: 'white', 
                        borderRadius: '8px',
                  padding: '1rem',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {(() => {
                    const allLogs = JSON.parse(localStorage.getItem('availability_logs') || '[]');
                    
                    // Debug: Zeige localStorage Status
                    console.log('🔍 AdminPanel - localStorage logs:', {
                      totalLogs: allLogs.length,
                      latestLog: allLogs[0],
                      localStorageKey: 'availability_logs'
                    });
                    
                    // Filter anwenden
                    let filteredLogs = allLogs;
                    
                    if (logFilter === 'available') {
                      filteredLogs = allLogs.filter(log => log.status === 'available');
                    } else if (logFilter === 'unavailable') {
                      filteredLogs = allLogs.filter(log => log.status === 'unavailable');
                    } else if (logFilter === 'today') {
                      const today = new Date().toDateString();
                      filteredLogs = allLogs.filter(log => new Date(log.timestamp).toDateString() === today);
                    } else if (logFilter === 'week') {
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      filteredLogs = allLogs.filter(log => new Date(log.timestamp) >= weekAgo);
                    }
                    
                    // Limit anwenden
                    const displayLogs = filteredLogs.slice(0, logLimit);
                    
                    return allLogs.length > 0 ? (
                      <div style={{ fontSize: '0.875rem' }}>
                        {/* Statistik-Header */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '0.5rem 0',
                          borderBottom: '2px solid #f59e0b',
                          marginBottom: '0.5rem',
                          fontWeight: '600',
                          color: '#92400e'
                        }}>
                          <span>📊 {filteredLogs.length} von {allLogs.length} Einträgen</span>
                          <span>
                            ✅ {filteredLogs.filter(log => log.status === 'available').length} Zusagen • 
                            ❌ {filteredLogs.filter(log => log.status === 'unavailable').length} Absagen
                          </span>
                        </div>
                        
                        {displayLogs.map((log, index) => (
                          <div key={index} style={{ 
                                display: 'flex',
                            justifyContent: 'space-between', 
                                alignItems: 'center',
                            padding: '0.75rem 0',
                            borderBottom: index < displayLogs.length - 1 ? '1px solid #f3f4f6' : 'none',
                            background: index % 2 === 0 ? '#fefefe' : 'transparent',
                            borderRadius: '4px',
                            margin: '0.125rem 0'
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <span style={{ fontWeight: '600', color: '#374151' }}>
                                  {log.playerName}
                                </span>
                                <span style={{ 
                                  color: log.status === 'available' ? '#059669' : '#dc2626',
                                  fontWeight: '500'
                                }}>
                                  {log.status === 'available' ? '✅ Zusage' : '❌ Absage'}
                                </span>
                                {log.action === 'updated' && (
                                  <span style={{ 
                                    background: '#fef3c7', 
                                    color: '#92400e', 
                                    padding: '0.125rem 0.25rem', 
                                    borderRadius: '3px',
                                    fontSize: '0.625rem',
                                    fontWeight: '500'
                                  }}>
                                    GEÄNDERT
                                  </span>
                                )}
                                {log.action === 'imported' && (
                                  <span style={{ 
                                    background: '#dbeafe', 
                                    color: '#1e40af', 
                                    padding: '0.125rem 0.25rem', 
                                    borderRadius: '3px',
                                    fontSize: '0.625rem',
                                    fontWeight: '500'
                                  }}>
                                    IMPORTIERT
                                  </span>
                                )}
                              </div>
                              <div style={{ color: '#6b7280', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                                🎾 {log.matchInfo}
                              </div>
                              {log.comment && (
                                <div style={{ 
                                  color: '#6b7280', 
                                  fontSize: '0.75rem', 
                                  background: '#f9fafb',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '3px',
                                  border: '1px solid #e5e7eb'
                                }}>
                                  💬 {log.comment}
                                </div>
                              )}
                            </div>
                            <div style={{ color: '#9ca3af', fontSize: '0.75rem', textAlign: 'right', minWidth: '120px' }}>
                              {new Date(log.timestamp).toLocaleString('de-DE')}
                            </div>
                          </div>
                        ))}
                        
                        {filteredLogs.length > logLimit && (
                          <div style={{ 
                            textAlign: 'center', 
                            color: '#6b7280', 
                            marginTop: '0.5rem', 
                            fontSize: '0.75rem',
                            padding: '0.5rem',
                            background: '#f3f4f6',
                            borderRadius: '4px'
                          }}>
                            ... und {filteredLogs.length - logLimit} weitere Einträge
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
                        <div>Noch keine Verfügbarkeits-Änderungen geloggt</div>
                        <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                          Änderungen werden automatisch erfasst sobald Spieler ihre Verfügbarkeit setzen
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Team-Statistiken aus Supabase-Daten */}
                      <div style={{
                marginTop: '1.5rem', 
                padding: '1.5rem', 
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0' 
              }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1.1rem' }}>📈 Team-Statistiken (Live-Daten)</h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '1rem' 
                }}>
                  <div style={{ 
                    background: 'white', 
                    padding: '1rem', 
                        borderRadius: '8px',
                    border: '1px solid #e2e8f0' 
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6', marginBottom: '0.25rem' }}>
                      {Math.round(players.reduce((sum, p) => {
                        const playerAvailability = upcomingMatches.reduce((acc, match) => {
                          const availability = match.availability?.[p.id];
                          if (availability?.status) acc[availability.status] = (acc[availability.status] || 0) + 1;
                          return acc;
                        }, {});
                        const availableResponses = playerAvailability.available || 0;
                        return sum + (upcomingMatches.length > 0 ? (availableResponses / upcomingMatches.length) * 100 : 0);
                      }, 0) / players.length)}%
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Durchschnittliche Verfügbarkeit</div>
                  </div>
                  
                        <div style={{ 
                    background: 'white', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0' 
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e', marginBottom: '0.25rem' }}>
                      {players.filter(p => p.phone && p.ranking).length}
                        </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Vollständige Profile</div>
                  </div>
                  
                        <div style={{ 
                    background: 'white', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0' 
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b', marginBottom: '0.25rem' }}>
                      {players.filter(p => p.is_active).length}/{players.length}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Aktive Spieler</div>
                  </div>
                  
                  <div style={{ 
                                background: 'white',
                    padding: '1rem', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0' 
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '0.25rem' }}>
                      {upcomingMatches.reduce((sum, match) => {
                        return sum + Object.values(match.availability || {}).filter(av => av.status === 'available').length;
                      }, 0)}
                              </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Gesamt verfügbar</div>
                        </div>
                      </div>
                </div>
          </div>
        ) : (
            <div className="empty-state" style={{ 
              textAlign: 'center', 
              padding: '2rem', 
              color: '#6b7280' 
            }}>
              <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>Keine Spieler gefunden</p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

export default AdminPanel;

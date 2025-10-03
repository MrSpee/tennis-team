import { useState } from 'react';
import { Plus, Trash2, Calendar, MapPin, Users, Shield, Settings, Trophy, MessageCircle, Edit2, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import './AdminPanel.css';

function AdminPanel() {
  const { isCaptain } = useAuth();
  const { matches, teamInfo, players, addMatch, updateMatch, deleteMatch, updateTeamInfo } = useData();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTeamSetup, setShowTeamSetup] = useState(false);
  const [showSeasonManager, setShowSeasonManager] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
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
        <Shield size={32} color="var(--primary)" />
      </header>

      <div className="admin-actions fade-in">
        <button
          onClick={() => {
            setShowSeasonManager(!showSeasonManager);
            setShowTeamSetup(false);
            setShowAddForm(false);
          }}
          className="btn btn-info"
          style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }}
        >
          <Calendar size={20} />
          {showSeasonManager ? 'Schließen' : 'Saison-Verwaltung'}
        </button>
        <button
          onClick={() => {
            setShowTeamSetup(!showTeamSetup);
            setShowAddForm(false);
            setShowSeasonManager(false);
          }}
          className="btn btn-secondary"
        >
          <Settings size={20} />
          {showTeamSetup ? 'Schließen' : 'Team-Setup'}
        </button>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setShowTeamSetup(false);
            setShowSeasonManager(false);
          }}
          className="btn btn-primary"
        >
          <Plus size={20} />
          {showAddForm ? 'Abbrechen' : 'Neues Spiel hinzufügen'}
        </button>
      </div>

      {/* Saison-Verwaltung */}
      {showSeasonManager && (
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
                    setShowTeamSetup(true);
                    setShowSeasonManager(false);
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
                        setShowTeamSetup(true);
                        setShowSeasonManager(false);
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

      {showAddForm && (
        <div className="add-match-form fade-in card">
          <h2>Neues Spiel erstellen</h2>
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
                onClick={() => setShowAddForm(false)}
                className="btn btn-secondary"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {showTeamSetup && (
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
                onClick={() => setShowTeamSetup(false)}
                className="btn btn-secondary"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="matches-management fade-in">
        <h2>Kommende Spiele ({upcomingMatches.length})</h2>
        {upcomingMatches.length > 0 ? (
          <div className="admin-matches-list">
            {upcomingMatches.map(match => {
              const availableCount = Object.values(match.availability || {})
                .filter(a => a.status === 'available').length;
              const totalResponses = Object.keys(match.availability || {}).length;
              const totalPlayers = players.length; // Echte Spieleranzahl aus DB
              const missingResponses = totalPlayers - totalResponses; // Fehlende Rückmeldungen

              return (
                <div key={match.id} className="admin-match-card card">
                  <div className="admin-match-header">
                    <div>
                      <h3>{match.opponent}</h3>
                      <p className="match-meta">
                        {new Date(match.date).toLocaleDateString('de-DE', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })} um {new Date(match.date).toLocaleTimeString('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} Uhr
                      </p>
                      {match.venue && (
                        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                          📍 {match.venue}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          if (editingMatchId === match.id) {
                            setEditingMatchId(null);
                            setEditFormData({});
                          } else {
                            setEditingMatchId(match.id);
                            // Initialisiere Formular mit aktuellen Werten
                            setEditFormData({
                              opponent: match.opponent,
                              date: match.date.toISOString().split('T')[0],
                              time: match.date.toTimeString().slice(0, 5),
                              location: match.location,
                              venue: match.venue || ''
                            });
                          }
                        }}
                        className="btn-icon"
                        title="Spiel bearbeiten"
                        style={{
                          background: '#3b82f6',
                          color: 'white',
                          padding: '0.5rem',
                          borderRadius: '8px'
                        }}
                      >
                        {editingMatchId === match.id ? <Calendar size={18} /> : <Edit2 size={18} />}
                      </button>
                      <button
                        onClick={() => handleDelete(match.id)}
                        className="btn-icon btn-danger-icon"
                        title="Spiel löschen"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Edit-Formular */}
                  {editingMatchId === match.id && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '1rem',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>
                        ✏️ Spiel bearbeiten
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem', display: 'block' }}>
                            Gegner
                          </label>
                          <input
                            type="text"
                            value={editFormData.opponent || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, opponent: e.target.value })}
                            placeholder="Gegner-Name"
                            style={{ width: '100%', padding: '0.5rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem', display: 'block' }}>
                            Datum
                          </label>
                          <input
                            type="date"
                            value={editFormData.date || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem', display: 'block' }}>
                            Uhrzeit
                          </label>
                          <input
                            type="time"
                            value={editFormData.time || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem', display: 'block' }}>
                            Heim/Auswärts
                          </label>
                          <select
                            value={editFormData.location || 'Home'}
                            onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem' }}
                          >
                            <option value="Home">Heimspiel</option>
                            <option value="Away">Auswärtsspiel</option>
                          </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem', display: 'block' }}>
                            <MapPin size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                            Spielstätte
                          </label>
                          <input
                            type="text"
                            value={editFormData.venue || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, venue: e.target.value })}
                            placeholder="z.B. TC München-Ost, Ismaninger Str. 98, München"
                            style={{ width: '100%', padding: '0.5rem' }}
                          />
                          <small style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                            💡 Vollständige Adresse für Google Maps
                          </small>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <button
                          onClick={async () => {
                            console.log('📝 Updating match...');
                            
                            const dateTime = new Date(`${editFormData.date}T${editFormData.time}`);
                            
                            const result = await updateMatch(match.id, {
                              opponent: editFormData.opponent,
                              date: dateTime,
                              location: editFormData.location,
                              venue: editFormData.venue,
                              season: match.season,
                              playersNeeded: match.playersNeeded
                            });

                            if (result.success) {
                              alert('✅ Spiel erfolgreich aktualisiert!');
                              setEditingMatchId(null);
                              setEditFormData({});
                            } else {
                              alert('❌ Fehler beim Aktualisieren: ' + (result.error || 'Unbekannter Fehler'));
                            }
                          }}
                          className="btn btn-success"
                          style={{ flex: 1 }}
                        >
                          💾 Speichern
                        </button>
                        <button
                          onClick={() => {
                            setEditingMatchId(null);
                            setEditFormData({});
                          }}
                          className="btn btn-secondary"
                          style={{ flex: 1 }}
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="admin-match-info">
                    <div className="info-item">
                      <MapPin size={16} />
                      <span>{match.location === 'Home' ? 'Heimspiel' : 'Auswärtsspiel'}</span>
                    </div>
                    <div className="info-item">
                      <Users size={16} />
                      <span>{match.playersNeeded} Spieler benötigt</span>
                    </div>
                    <div className="info-item">
                      <span className={`season-indicator ${match.season}`}>
                        {match.season === 'winter' ? 'Winter' : 'Sommer'}
                      </span>
                    </div>
                  </div>

                  <div className="admin-match-stats">
                    <div className="stat-box">
                      <div className="stat-number">{availableCount}</div>
                      <div className="stat-text">Verfügbar</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-number">{totalResponses}</div>
                      <div className="stat-text">Antworten</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-number">{missingResponses}</div>
                      <div className="stat-text">Ausstehend</div>
                    </div>
                  </div>

                  {availableCount < match.playersNeeded && (
                    <div className="warning-banner">
                      ⚠️ Noch {match.playersNeeded - availableCount} Spieler fehlen!
                    </div>
                  )}

                  {/* Fehlende Rückmeldungen mit WhatsApp-Links */}
                  {(() => {
                    const respondedPlayerIds = Object.keys(match.availability || {});
                    const notRespondedPlayers = players.filter(p => 
                      !respondedPlayerIds.includes(p.id)
                    );
                    
                    return notRespondedPlayers.length > 0 && (
                      <div style={{
                        marginTop: '1rem',
                        padding: '0.75rem',
                        background: '#fff9e6',
                        borderRadius: '8px',
                        border: '1px solid #ffc107'
                      }}>
                        <div style={{ 
                          fontSize: '0.85rem', 
                          fontWeight: '600', 
                          marginBottom: '0.5rem',
                          color: '#856404'
                        }}>
                          📢 Fehlende Rückmeldungen ({notRespondedPlayers.length}):
                        </div>
                        <div style={{ 
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                          gap: '0.5rem'
                        }}>
                          {notRespondedPlayers.map(p => {
                            const phoneNumber = p.phone?.replace(/[^0-9+]/g, '');
                            const hasPhone = phoneNumber && phoneNumber.length > 5;
                            
                            return (
                              <div key={p.id} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '0.5rem',
                                background: 'white',
                                borderRadius: '6px',
                                gap: '0.35rem'
                              }}>
                                <span style={{ 
                                  fontSize: '0.8rem', 
                                  fontWeight: '500',
                                  textAlign: 'center',
                                  lineHeight: '1.2'
                                }}>
                                  {p.name}
                                </span>
                                {hasPhone ? (
                                  <a
                                    href={`https://wa.me/${phoneNumber}?text=${encodeURIComponent(`Hi ${p.name.split(' ')[0]}! 🎾\n\nKannst du bitte deine Verfügbarkeit angeben?\n\n📅 ${new Date(match.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} um ${new Date(match.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr\n🏟️ ${match.opponent}\n📍 ${match.location === 'Home' ? 'Heimspiel' : 'Auswärtsspiel'}\n\nDanke! 👍`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '0.25rem',
                                      width: '100%',
                                      padding: '0.35rem',
                                      background: '#25D366',
                                      color: 'white',
                                      borderRadius: '4px',
                                      textDecoration: 'none',
                                      fontSize: '0.75rem',
                                      fontWeight: '600'
                                    }}
                                  >
                                    <MessageCircle size={14} />
                                    WhatsApp
                                  </a>
                                ) : (
                                  <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.25rem',
                                    width: '100%',
                                    padding: '0.35rem',
                                    background: '#e5e7eb',
                                    color: '#9ca3af',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    cursor: 'not-allowed'
                                  }}>
                                    <MessageCircle size={14} style={{ opacity: 0.4 }} />
                                    Keine Nr.
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state card">
            <Calendar size={48} color="var(--gray-400)" />
            <p>Keine kommenden Spiele geplant</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;

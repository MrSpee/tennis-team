import { useState } from 'react';
import { Plus, Trash2, Calendar, MapPin, Users, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import './AdminPanel.css';

function AdminPanel() {
  const { isCaptain } = useAuth();
  const { matches, addMatch, deleteMatch } = useData();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    opponent: '',
    date: '',
    time: '',
    location: 'Home',
    season: 'winter',
    playersNeeded: 4
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const dateTime = new Date(`${formData.date}T${formData.time}`);
    
    addMatch({
      opponent: formData.opponent,
      date: dateTime,
      location: formData.location,
      season: formData.season,
      playersNeeded: parseInt(formData.playersNeeded)
    });

    setFormData({
      opponent: '',
      date: '',
      time: '',
      location: 'Home',
      season: 'winter',
      playersNeeded: 4
    });
    setShowAddForm(false);
  };

  const handleDelete = (matchId) => {
    if (window.confirm('Möchtest du dieses Spiel wirklich löschen?')) {
      deleteMatch(matchId);
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
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary"
        >
          <Plus size={20} />
          {showAddForm ? 'Abbrechen' : 'Neues Spiel hinzufügen'}
        </button>
      </div>

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
                  Ort
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

      <div className="matches-management fade-in">
        <h2>Kommende Spiele ({upcomingMatches.length})</h2>
        {upcomingMatches.length > 0 ? (
          <div className="admin-matches-list">
            {upcomingMatches.map(match => {
              const availableCount = Object.values(match.availability || {})
                .filter(a => a.status === 'available').length;
              const totalResponses = Object.keys(match.availability || {}).length;

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
                    </div>
                    <button
                      onClick={() => handleDelete(match.id)}
                      className="btn-icon btn-danger-icon"
                      title="Spiel löschen"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

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
                      <div className="stat-number">{14 - totalResponses}</div>
                      <div className="stat-text">Ausstehend</div>
                    </div>
                  </div>

                  {availableCount < match.playersNeeded && (
                    <div className="warning-banner">
                      ⚠️ Noch {match.playersNeeded - availableCount} Spieler fehlen!
                    </div>
                  )}
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

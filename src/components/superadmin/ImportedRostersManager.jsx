import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Edit2, Save, X, Search, Users, Loader, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import './ImportedRostersManager.css';

/**
 * Komponente zur Verwaltung importierter Meldelisten
 * Zeigt alle importierten Meldelisten an und ermöglicht Bearbeitung
 */
const ImportedRostersManager = () => {
  const [rosters, setRosters] = useState([]); // [{team_id, season, team_info, stats: {total, matched}}, ...]
  const [loading, setLoading] = useState(false);
  const [selectedRoster, setSelectedRoster] = useState(null); // {team_id, season}
  const [rosterEntries, setRosterEntries] = useState([]); // Alle Einträge der ausgewählten Meldeliste
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null); // ID des Eintrags der gerade bearbeitet wird
  const [editForm, setEditForm] = useState({ player_id: null, lk: '', tvm_id: '' });
  const [playerSearchResults, setPlayerSearchResults] = useState([]);
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [filterSeason, setFilterSeason] = useState('');
  const [filterClub, setFilterClub] = useState('');

  // Lade alle importierten Meldelisten
  useEffect(() => {
    loadRosters();
  }, []);

  // Lade Meldelisten-Einträge wenn eine Meldeliste ausgewählt wurde
  useEffect(() => {
    if (selectedRoster) {
      loadRosterEntries(selectedRoster.team_id, selectedRoster.season);
    }
  }, [selectedRoster]);

  const loadRosters = async () => {
    setLoading(true);
    try {
      // Lade alle Meldelisten mit Team-Info
      const { data, error } = await supabase
        .from('team_roster')
        .select(`
          team_id,
          season,
          player_id,
          team_info!inner(id, club_name, team_name, category, club_id)
        `);

      if (error) throw error;

      // Gruppiere nach team_id + season
      const rosterMap = new Map();
      data?.forEach(entry => {
        const key = `${entry.team_id}:${entry.season}`;
        if (!rosterMap.has(key)) {
          rosterMap.set(key, {
            team_id: entry.team_id,
            season: entry.season,
            team_info: entry.team_info,
            total: 0,
            matched: 0
          });
        }
        const roster = rosterMap.get(key);
        roster.total++;
        if (entry.player_id) {
          roster.matched++;
        }
      });

      const rostersList = Array.from(rosterMap.values()).sort((a, b) => {
        // Sortiere nach Club-Name, dann Team-Name, dann Saison
        if (a.team_info.club_name !== b.team_info.club_name) {
          return a.team_info.club_name.localeCompare(b.team_info.club_name);
        }
        if (a.team_info.team_name !== b.team_info.team_name) {
          return a.team_info.team_name.localeCompare(b.team_info.team_name);
        }
        return b.season.localeCompare(a.season);
      });

      setRosters(rostersList);
    } catch (err) {
      console.error('Error loading rosters:', err);
      alert('Fehler beim Laden der Meldelisten: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRosterEntries = async (teamId, season) => {
    setLoadingEntries(true);
    try {
      const { data, error } = await supabase
        .from('team_roster')
        .select(`
          *,
          players_unified(id, name, current_lk, tvm_id_number)
        `)
        .eq('team_id', teamId)
        .eq('season', season)
        .order('rank', { ascending: true });

      if (error) throw error;

      setRosterEntries(data || []);
    } catch (err) {
      console.error('Error loading roster entries:', err);
      alert('Fehler beim Laden der Meldelisten-Einträge: ' + err.message);
    } finally {
      setLoadingEntries(false);
    }
  };

  const searchPlayers = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      setPlayerSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('players_unified')
        .select('id, name, current_lk, tvm_id_number')
        .or(`name.ilike.%${searchTerm}%,tvm_id_number.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;

      setPlayerSearchResults(data || []);
    } catch (err) {
      console.error('Error searching players:', err);
    }
  };

  const startEdit = (entry) => {
    setEditingEntry(entry.id);
    setEditForm({
      player_id: entry.player_id || null,
      lk: entry.lk || '',
      tvm_id: entry.tvm_id || ''
    });
    setPlayerSearchTerm('');
    setPlayerSearchResults([]);
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setEditForm({ player_id: null, lk: '', tvm_id: '' });
    setPlayerSearchTerm('');
    setPlayerSearchResults([]);
  };

  const saveEdit = async (entryId) => {
    try {
      const { error } = await supabase
        .from('team_roster')
        .update({
          player_id: editForm.player_id || null,
          lk: editForm.lk || null,
          tvm_id: editForm.tvm_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', entryId);

      if (error) throw error;

      // Lade Einträge neu
      if (selectedRoster) {
        await loadRosterEntries(selectedRoster.team_id, selectedRoster.season);
      }
      await loadRosters(); // Aktualisiere Statistiken

      setEditingEntry(null);
      setEditForm({ player_id: null, lk: '', tvm_id: '' });
    } catch (err) {
      console.error('Error saving edit:', err);
      alert('Fehler beim Speichern: ' + err.message);
    }
  };

  const deleteEntry = async (entryId) => {
    if (!confirm('Möchtest du diesen Eintrag wirklich löschen?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('team_roster')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      // Lade Einträge neu
      if (selectedRoster) {
        await loadRosterEntries(selectedRoster.team_id, selectedRoster.season);
      }
      await loadRosters(); // Aktualisiere Statistiken
    } catch (err) {
      console.error('Error deleting entry:', err);
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  // Filter rosters
  const filteredRosters = rosters.filter(roster => {
    if (filterSeason && !roster.season.toLowerCase().includes(filterSeason.toLowerCase())) {
      return false;
    }
    if (filterClub && !roster.team_info.club_name.toLowerCase().includes(filterClub.toLowerCase())) {
      return false;
    }
    return true;
  });

  const uniqueSeasons = [...new Set(rosters.map(r => r.season))].sort().reverse();
  const uniqueClubs = [...new Set(rosters.map(r => r.team_info.club_name))].sort();

  return (
    <div className="imported-rosters-manager">
      <div className="manager-header">
        <h3>
          <Users size={20} />
          Importierte Meldelisten verwalten
        </h3>
        <button onClick={loadRosters} className="refresh-button">
          🔄 Aktualisieren
        </button>
      </div>

      {/* Filter */}
      <div className="roster-filters">
        <div className="filter-group">
          <label>Saison filtern:</label>
          <select value={filterSeason} onChange={(e) => setFilterSeason(e.target.value)}>
            <option value="">Alle Saisons</option>
            {uniqueSeasons.map(season => (
              <option key={season} value={season}>{season}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Verein filtern:</label>
          <select value={filterClub} onChange={(e) => setFilterClub(e.target.value)}>
            <option value="">Alle Vereine</option>
            {uniqueClubs.map(club => (
              <option key={club} value={club}>{club}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Rosters Liste */}
      {loading ? (
        <div className="loading-state">
          <Loader className="spinner" size={24} />
          <p>Lade Meldelisten...</p>
        </div>
      ) : (
        <div className="rosters-list">
          <table className="rosters-table">
            <thead>
              <tr>
                <th>Verein</th>
                <th>Team</th>
                <th>Kategorie</th>
                <th>Saison</th>
                <th>Spieler</th>
                <th>Gematcht</th>
                <th>Status</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredRosters.map((roster, idx) => {
                const matchPercentage = roster.total > 0 ? Math.round((roster.matched / roster.total) * 100) : 0;
                const isComplete = roster.matched === roster.total && roster.total > 0;
                
                return (
                  <tr key={`${roster.team_id}:${roster.season}`}>
                    <td>{roster.team_info.club_name}</td>
                    <td>{roster.team_info.team_name || '-'}</td>
                    <td>{roster.team_info.category || '-'}</td>
                    <td>{roster.season}</td>
                    <td>{roster.total}</td>
                    <td>
                      <span className={isComplete ? 'matched-complete' : 'matched-partial'}>
                        {roster.matched} ({matchPercentage}%)
                      </span>
                    </td>
                    <td>
                      {isComplete ? (
                        <span className="status-badge status-complete">
                          <CheckCircle size={14} />
                          Vollständig
                        </span>
                      ) : (
                        <span className="status-badge status-partial">
                          <AlertCircle size={14} />
                          Teilweise
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedRoster({ team_id: roster.team_id, season: roster.season, team_info: roster.team_info })}
                        className="edit-button"
                      >
                        <Edit2 size={14} />
                        Bearbeiten
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal für Roster-Einträge */}
      {selectedRoster && (
        <div className="roster-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                Meldeliste: {selectedRoster.team_info.club_name} - {selectedRoster.team_info.team_name || selectedRoster.team_info.category}
                <span style={{ marginLeft: '1rem', fontSize: '0.875rem', fontWeight: '400', color: '#6b7280' }}>
                  ({selectedRoster.season})
                </span>
              </h3>
              <button onClick={() => setSelectedRoster(null)} className="close-button">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {loadingEntries ? (
                <div className="loading-state">
                  <Loader className="spinner" size={24} />
                  <p>Lade Meldelisten-Einträge...</p>
                </div>
              ) : (
                <table className="entries-table">
                  <thead>
                    <tr>
                      <th>Rang</th>
                      <th>Name</th>
                      <th>LK</th>
                      <th>TVM-ID</th>
                      <th>Spieler (gematcht)</th>
                      <th>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterEntries.map((entry) => (
                      <tr key={entry.id} className={entry.player_id ? 'matched' : 'unmatched'}>
                        <td>{entry.rank}</td>
                        <td>{entry.player_name}</td>
                        <td>
                          {editingEntry === entry.id ? (
                            <input
                              type="text"
                              value={editForm.lk}
                              onChange={(e) => setEditForm({ ...editForm, lk: e.target.value })}
                              className="edit-input"
                            />
                          ) : (
                            entry.lk || '-'
                          )}
                        </td>
                        <td>
                          {editingEntry === entry.id ? (
                            <input
                              type="text"
                              value={editForm.tvm_id}
                              onChange={(e) => setEditForm({ ...editForm, tvm_id: e.target.value })}
                              className="edit-input"
                            />
                          ) : (
                            entry.tvm_id || '-'
                          )}
                        </td>
                        <td>
                          {editingEntry === entry.id ? (
                            <div className="player-search-container">
                              <input
                                type="text"
                                placeholder="Spieler suchen..."
                                value={playerSearchTerm}
                                onChange={(e) => {
                                  setPlayerSearchTerm(e.target.value);
                                  searchPlayers(e.target.value);
                                }}
                                className="player-search-input"
                              />
                              {playerSearchResults.length > 0 && (
                                <div className="player-search-results">
                                  {playerSearchResults.map((player) => (
                                    <div
                                      key={player.id}
                                      className="player-search-result"
                                      onClick={() => {
                                        setEditForm({ ...editForm, player_id: player.id });
                                        setPlayerSearchTerm(player.name);
                                        setPlayerSearchResults([]);
                                      }}
                                    >
                                      <div>{player.name}</div>
                                      <div className="player-meta">
                                        {player.current_lk && <span>LK: {player.current_lk}</span>}
                                        {player.tvm_id_number && <span>ID: {player.tvm_id_number}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {editForm.player_id && (
                                <div className="selected-player">
                                  Gewählt: {(() => {
                                    const player = playerSearchResults.find(p => p.id === editForm.player_id);
                                    const existingPlayer = entry.players_unified;
                                    return player?.name || existingPlayer?.name || 'Spieler-ID: ' + editForm.player_id;
                                  })()}
                                </div>
                              )}
                            </div>
                          ) : entry.players_unified ? (
                            <span className="matched-player">
                              <CheckCircle size={14} />
                              {entry.players_unified.name}
                            </span>
                          ) : (
                            <span className="unmatched-player">
                              <AlertCircle size={14} />
                              Nicht zugeordnet
                            </span>
                          )}
                        </td>
                        <td>
                          {editingEntry === entry.id ? (
                            <div className="edit-actions">
                              <button onClick={() => saveEdit(entry.id)} className="save-button">
                                <Save size={14} />
                                Speichern
                              </button>
                              <button onClick={cancelEdit} className="cancel-button">
                                <X size={14} />
                                Abbrechen
                              </button>
                            </div>
                          ) : (
                            <div className="entry-actions">
                              <button onClick={() => startEdit(entry)} className="edit-button">
                                <Edit2 size={14} />
                                Bearbeiten
                              </button>
                              <button onClick={() => deleteEntry(entry.id)} className="delete-button">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportedRostersManager;


import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Search, Link2, UserPlus, CheckCircle, XCircle, AlertCircle, Loader, Users, Building2, RefreshCw } from 'lucide-react';
import './RosterManagementTab.css';

const RosterManagementTab = () => {
  const [rosterEntries, setRosterEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [teams, setTeams] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [linkingPlayerId, setLinkingPlayerId] = useState(null);
  const [searchPlayerTerm, setSearchPlayerTerm] = useState('');
  const [playerSearchResults, setPlayerSearchResults] = useState([]);
  const [searchingPlayers, setSearchingPlayers] = useState(false);

  // Lade Meldelisten-Einträge
  useEffect(() => {
    loadRosterEntries();
    loadTeamsAndSeasons();
  }, []);

  const loadTeamsAndSeasons = async () => {
    try {
      // Lade Teams
      const { data: teamsData } = await supabase
        .from('team_info')
        .select('id, club_name, team_name, category')
        .order('club_name', { ascending: true });

      if (teamsData) {
        setTeams(teamsData);
      }

      // Lade einzigartige Saisons
      const { data: seasonsData } = await supabase
        .from('team_roster')
        .select('season')
        .order('season', { ascending: false });

      if (seasonsData) {
        const uniqueSeasons = [...new Set(seasonsData.map(s => s.season))];
        setSeasons(uniqueSeasons);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Teams/Seasons:', error);
    }
  };

  const loadRosterEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_roster')
        .select(`
          *,
          team_info!inner(
            id,
            club_name,
            team_name,
            category
          ),
          player:player_id(
            id,
            name,
            tvm_id_number,
            user_id,
            current_lk
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRosterEntries(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Meldelisten:', error);
    } finally {
      setLoading(false);
    }
  };

  // Suche nach Spielern für Verknüpfung
  const searchPlayers = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      setPlayerSearchResults([]);
      return;
    }

    setSearchingPlayers(true);
    try {
      const { data, error } = await supabase
        .from('players_unified')
        .select('id, name, tvm_id_number, user_id, current_lk, email')
        .or(`name.ilike.%${searchTerm}%,tvm_id_number.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setPlayerSearchResults(data || []);
    } catch (error) {
      console.error('Fehler bei Spieler-Suche:', error);
      setPlayerSearchResults([]);
    } finally {
      setSearchingPlayers(false);
    }
  };

  // Verknüpfe Spieler mit Meldelisten-Eintrag
  const linkPlayer = async (rosterEntryId, playerId) => {
    setLinkingPlayerId(rosterEntryId);
    try {
      const { error } = await supabase
        .from('team_roster')
        .update({ player_id: playerId })
        .eq('id', rosterEntryId);

      if (error) throw error;

      // Aktualisiere lokalen State
      setRosterEntries(prev => prev.map(entry => 
        entry.id === rosterEntryId 
          ? { ...entry, player_id: playerId, player: playerSearchResults.find(p => p.id === playerId) }
          : entry
      ));

      setLinkingPlayerId(null);
      setSearchPlayerTerm('');
      setPlayerSearchResults([]);
    } catch (error) {
      console.error('Fehler beim Verknüpfen:', error);
      alert('Fehler beim Verknüpfen des Spielers');
    } finally {
      setLinkingPlayerId(null);
    }
  };

  // Entferne Verknüpfung
  const unlinkPlayer = async (rosterEntryId) => {
    try {
      const { error } = await supabase
        .from('team_roster')
        .update({ player_id: null })
        .eq('id', rosterEntryId);

      if (error) throw error;

      setRosterEntries(prev => prev.map(entry => 
        entry.id === rosterEntryId 
          ? { ...entry, player_id: null, player: null }
          : entry
      ));
    } catch (error) {
      console.error('Fehler beim Entfernen der Verknüpfung:', error);
      alert('Fehler beim Entfernen der Verknüpfung');
    }
  };

  // Filtere Einträge
  const filteredEntries = rosterEntries.filter(entry => {
    const matchesSearch = !searchTerm || 
      entry.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tvm_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.player?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTeam = selectedTeam === 'all' || entry.team_id === selectedTeam;
    const matchesSeason = selectedSeason === 'all' || entry.season === selectedSeason;

    return matchesSearch && matchesTeam && matchesSeason;
  });

  // Statistiken
  const stats = {
    total: rosterEntries.length,
    linked: rosterEntries.filter(e => e.player_id).length,
    unlinked: rosterEntries.filter(e => !e.player_id).length,
    withUserAccount: rosterEntries.filter(e => e.player?.user_id).length
  };

  return (
    <div className="roster-management-tab">
      <div className="roster-header">
        <div className="roster-title-section">
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
            <Users size={24} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Meldelisten-Verwaltung
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Verwalte importierte Meldelisten-Spieler und verknüpfe sie mit bestehenden Profilen
          </p>
        </div>
        <button 
          onClick={loadRosterEntries}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={18} />
          Aktualisieren
        </button>
      </div>

      {/* Statistiken */}
      <div className="roster-stats">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Gesamt</div>
        </div>
        <div className="stat-card stat-success">
          <div className="stat-number">{stats.linked}</div>
          <div className="stat-label">Verknüpft</div>
        </div>
        <div className="stat-card stat-warning">
          <div className="stat-number">{stats.unlinked}</div>
          <div className="stat-label">Nicht verknüpft</div>
        </div>
        <div className="stat-card stat-info">
          <div className="stat-number">{stats.withUserAccount}</div>
          <div className="stat-label">Mit App-Account</div>
        </div>
      </div>

      {/* Filter */}
      <div className="roster-filters">
        <div className="filter-group">
          <Search size={18} style={{ color: '#6b7280' }} />
          <input
            type="text"
            placeholder="Suche nach Name, TVM-ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="filter-select"
        >
          <option value="all">Alle Teams</option>
          {teams.map(team => (
            <option key={team.id} value={team.id}>
              {team.club_name} {team.team_name} ({team.category})
            </option>
          ))}
        </select>
        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
          className="filter-select"
        >
          <option value="all">Alle Saisons</option>
          {seasons.map(season => (
            <option key={season} value={season}>{season}</option>
          ))}
        </select>
      </div>

      {/* Tabelle */}
      {loading ? (
        <div className="loading-placeholder">
          <Loader className="spinner" size={24} />
          Lade Meldelisten...
        </div>
      ) : (
        <div className="roster-table-container">
          <table className="roster-table">
            <thead>
              <tr>
                <th>Rang</th>
                <th>Importierter Name</th>
                <th>TVM-ID</th>
                <th>Team</th>
                <th>Saison</th>
                <th>Match-Status</th>
                <th>Verknüpfter Spieler</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                    Keine Einträge gefunden
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <RosterRow
                    key={entry.id}
                    entry={entry}
                    onLink={linkPlayer}
                    onUnlink={unlinkPlayer}
                    linkingPlayerId={linkingPlayerId}
                    searchPlayerTerm={searchPlayerTerm}
                    setSearchPlayerTerm={setSearchPlayerTerm}
                    playerSearchResults={playerSearchResults}
                    searchingPlayers={searchingPlayers}
                    onSearchPlayers={searchPlayers}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Einzelne Zeile mit Verknüpfungs-Logik
const RosterRow = ({ 
  entry, 
  onLink, 
  onUnlink, 
  linkingPlayerId,
  searchPlayerTerm,
  setSearchPlayerTerm,
  playerSearchResults,
  searchingPlayers,
  onSearchPlayers
}) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const isLinking = linkingPlayerId === entry.id;

  const handleSearchChange = (value) => {
    setSearchPlayerTerm(value);
    onSearchPlayers(value);
  };

  return (
    <>
      <tr className={entry.player_id ? 'row-linked' : 'row-unlinked'}>
        <td>{entry.rank}</td>
        <td>
          <strong>{entry.player_name}</strong>
          {entry.birth_year && (
            <span style={{ color: '#6b7280', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
              ({entry.birth_year})
            </span>
          )}
        </td>
        <td>{entry.tvm_id || '–'}</td>
        <td>
          <div style={{ fontSize: '0.875rem' }}>
            <div style={{ fontWeight: '600' }}>{entry.team_info?.club_name}</div>
            <div style={{ color: '#6b7280' }}>
              {entry.team_info?.team_name} ({entry.team_info?.category})
            </div>
          </div>
        </td>
        <td>{entry.season}</td>
        <td>
          {entry.player_id ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
              <CheckCircle size={16} />
              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Verknüpft</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>
              <AlertCircle size={16} />
              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Nicht verknüpft</span>
            </div>
          )}
        </td>
        <td>
          {entry.player ? (
            <div>
              <div style={{ fontWeight: '600' }}>{entry.player.name}</div>
              {entry.player.user_id && (
                <span style={{ fontSize: '0.75rem', color: '#10b981' }}>✓ App-Account</span>
              )}
              {entry.player.tvm_id_number && (
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  TVM-ID: {entry.player.tvm_id_number}
                </div>
              )}
            </div>
          ) : (
            <span style={{ color: '#9ca3af' }}>–</span>
          )}
        </td>
        <td>
          {entry.player_id ? (
            <button
              onClick={() => onUnlink(entry.id)}
              className="btn btn-sm btn-danger"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            >
              <XCircle size={14} style={{ marginRight: '0.25rem' }} />
              Entfernen
            </button>
          ) : (
            <button
              onClick={() => setShowLinkModal(true)}
              className="btn btn-sm btn-primary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              disabled={isLinking}
            >
              <Link2 size={14} style={{ marginRight: '0.25rem' }} />
              Verknüpfen
            </button>
          )}
        </td>
      </tr>

      {/* Link-Modal */}
      {showLinkModal && (
        <tr>
          <td colSpan="8" style={{ padding: '1rem', background: '#f9fafb', borderTop: 'none' }}>
            <div className="link-modal">
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Suche nach Spieler:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Name oder TVM-ID..."
                    value={searchPlayerTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="filter-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={() => setShowLinkModal(false)}
                    className="btn btn-secondary"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>

              {searchingPlayers && (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
                  <Loader className="spinner" size={18} />
                  Suche...
                </div>
              )}

              {playerSearchResults.length > 0 && (
                <div className="player-search-results">
                  {playerSearchResults.map(player => (
                    <div
                      key={player.id}
                      className="player-search-result-item"
                      onClick={() => {
                        onLink(entry.id, player.id);
                        setShowLinkModal(false);
                        setSearchPlayerTerm('');
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600' }}>{player.name}</div>
                        {player.tvm_id_number && (
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            TVM-ID: {player.tvm_id_number}
                          </div>
                        )}
                        {player.user_id && (
                          <span style={{ fontSize: '0.75rem', color: '#10b981' }}>✓ App-Account</span>
                        )}
                      </div>
                      <Link2 size={18} style={{ color: '#10b981' }} />
                    </div>
                  ))}
                </div>
              )}

              {searchPlayerTerm.length >= 2 && !searchingPlayers && playerSearchResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
                  Keine Spieler gefunden
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default RosterManagementTab;


import { Fragment } from 'react';

const PLAYER_STATUS_STYLES = {
  app_user: { label: 'App-Nutzer', icon: '📱', color: '#0f766e', background: '#ccfbf1', border: '#99f6e4' },
  external: { label: 'Externer Spieler', icon: '🌐', color: '#1d4ed8', background: '#dbeafe', border: '#bfdbfe' },
  opponent: { label: 'Gegner', icon: '🎾', color: '#92400e', background: '#fef3c7', border: '#fde68a' },
  default: { label: 'Unbekannt', icon: '❔', color: '#475569', background: '#e2e8f0', border: '#cbd5f5' }
};

const resolvePlayerStatus = (player) => {
  if (player?.user_id && player?.is_active !== false) {
    return PLAYER_STATUS_STYLES.app_user;
  }
  const type = player?.player_type;
  if (type && PLAYER_STATUS_STYLES[type]) {
    return PLAYER_STATUS_STYLES[type];
  }
  return PLAYER_STATUS_STYLES.default;
};

const formatDate = (value) => {
  if (!value) return '–';
  try {
    return new Date(value).toLocaleDateString('de-DE');
  } catch (error) {
    return '–';
  }
};

function PlayersTab({
  sortedPlayers,
  playerSearch,
  setPlayerSearch,
  playerSort,
  handlePlayerSort,
  selectedPlayerRow,
  setSelectedPlayerRow
}) {
  const renderSortButton = (column, label) => {
    const isActive = playerSort.column === column;
    const directionIcon = isActive ? (playerSort.direction === 'asc' ? '▲' : '▼') : '↕';
    return (
      <button
        type="button"
        className={`player-sort-button${isActive ? ' active' : ''}`}
        onClick={() => handlePlayerSort(column)}
      >
        <span>{label}</span>
        <span className="sort-indicator">{directionIcon}</span>
      </button>
    );
  };

  const deriveTeams = (player) => {
    if (player?.primary_team) {
      const info = player.primary_team;
      const label = `${info.club_name || 'Unbekannter Club'}${info.team_name ? ` • ${info.team_name}` : ''}`;
      return [label];
    }
    return [];
  };

  return (
    <div className="lk-card-full">
      <div className="formkurve-header">
        <div>
          <div className="formkurve-title">Spielerübersicht ({sortedPlayers.length})</div>
          <div className="formkurve-subtitle">Vereinsmitglieder, App-Nutzer & Gegner im Überblick</div>
        </div>
        <div className="formkurve-actions player-sort-controls">
          <input
            type="text"
            placeholder="Spieler suchen (Name oder E-Mail)"
            value={playerSearch}
            onChange={(e) => setPlayerSearch(e.target.value)}
          />
          <div className="player-sort-group">
            {renderSortButton('name', 'Name')}
            {renderSortButton('club', 'Verein')}
            {renderSortButton('lk', 'Beste LK')}
            {renderSortButton('status', 'Status')}
          </div>
        </div>
      </div>
      <div className="season-content">
        {sortedPlayers.length === 0 ? (
          <div className="placeholder">Keine Spieler gefunden.</div>
        ) : (
          <div className="table-responsive">
            <table className="lk-table player-directory-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Verein / Teams</th>
                  <th>Leistungsklasse</th>
                  <th>Registriert</th>
                  <th>Letzte Anmeldung</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player) => {
                  const status = resolvePlayerStatus(player);
                  const avatar =
                    player.profile_image || player.avatar_url || '/app-icon.jpg';
                  const teams = deriveTeams(player);
                  const registered = formatDate(player.created_at);
                  const resolvedLastLogin =
                    player.last_login_at ||
                    player.last_active_at ||
                    player.last_seen_at ||
                    player.last_sign_in_at ||
                    null;
                  const lastLogin = resolvedLastLogin ? formatDate(resolvedLastLogin) : 'Keine Anmeldung erfasst';
                  const isExpanded = selectedPlayerRow?.id === player.id;

                  return (
                    <Fragment key={player.id}>
                      <tr className="player-directory-row">
                        <td className="player-directory-cell player-directory-cell-name">
                          <div className="player-directory-person">
                            <img src={avatar} alt={player.name || 'Spieler'} />
                            <div>
                              <div className="player-directory-name">
                                <span>{player.name || 'Unbekannt'}</span>
                                {player.is_super_admin && <span className="player-tag admin">Admin</span>}
                                {player.is_active === false && <span className="player-tag inactive">Inaktiv</span>}
                                {player.user_id && player.is_active !== false && (
                                  <span className="player-tag linked">App-Nutzer</span>
                                )}
                              </div>
                              <div className="player-directory-email">{player.email || 'Keine E-Mail hinterlegt'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="player-directory-cell player-directory-cell-status">
                          <span
                            className="player-directory-status"
                            style={{
                              color: status.color,
                              background: status.background,
                              borderColor: status.border
                            }}
                          >
                            {status.icon} {status.label}
                          </span>
                        </td>
                        <td className="player-directory-cell player-directory-cell-teams">
                          {teams.length > 0 ? (
                            <div className="player-directory-teamlist">
                              {teams.map((label, idx) => (
                                <span key={idx} className="player-directory-teamchip">
                                  {label}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="player-directory-empty">Keinem Team zugeordnet</span>
                          )}
                        </td>
                        <td className="player-directory-cell">{player.current_lk ? `LK ${player.current_lk}` : '–'}</td>
                        <td className="player-directory-cell">{registered}</td>
                        <td className="player-directory-cell">{lastLogin}</td>
                        <td className="player-directory-cell player-directory-cell-actions">
                          <button
                            type="button"
                            className="btn-modern btn-player-details"
                            onClick={() => setSelectedPlayerRow((prev) => (prev?.id === player.id ? null : player))}
                          >
                            {isExpanded ? 'Schließen' : 'Details'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="player-directory-detail-row">
                          <td colSpan={7}>
                            <div className="player-directory-detail">
                              <div className="player-directory-detail-header">
                                <div>
                                  <div className="player-directory-detail-title">{player.name || 'Unbekannter Spieler'}</div>
                                  <div className="player-directory-detail-meta">
                                    Konto angelegt am {registered}
                                    {player.user_id ? ' · App-Zugang aktiv' : ' · Kein App-Zugang'}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="btn-modern btn-player-details"
                                  onClick={() => setSelectedPlayerRow(null)}
                                >
                                  Schließen
                                </button>
                              </div>
                              <div className="player-directory-detail-grid">
                                <div>
                                  <div className="player-directory-detail-label">E-Mail</div>
                                  <div className="player-directory-detail-value">
                                    {player.email || 'Keine E-Mail hinterlegt'}
                                  </div>
                                </div>
                                <div>
                                  <div className="player-directory-detail-label">Status</div>
                                  <div className="player-directory-detail-value">{status.label}</div>
                                </div>
                                <div>
                                  <div className="player-directory-detail-label">Letzte Anmeldung</div>
                                  <div className="player-directory-detail-value">{lastLogin}</div>
                                </div>
                                <div>
                                  <div className="player-directory-detail-label">Teams</div>
                                  <div className="player-directory-detail-value">
                                    {teams.length > 0 ? teams.join(', ') : 'Keinem Team zugeordnet'}
                                  </div>
                                </div>
                                <div>
                                  <div className="player-directory-detail-label">Interne ID</div>
                                  <div className="player-directory-detail-value">{player.id}</div>
                                </div>
                                <div>
                                  <div className="player-directory-detail-label">Zuletzt aktualisiert</div>
                                  <div className="player-directory-detail-value">
                                    {player.updated_at ? formatDate(player.updated_at) : 'Keine Daten'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayersTab;


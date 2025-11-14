import { Fragment } from 'react';
import MatchdayDetailCard from './MatchdayDetailCard';

const MATCHDAY_STATUS_STYLES = {
  scheduled: { label: 'Geplant', icon: '🗓️', color: '#1d4ed8', background: '#dbeafe' },
  completed: { label: 'Beendet', icon: '✅', color: '#16a34a', background: '#dcfce7' },
  cancelled: { label: 'Abgesagt', icon: '⛔', color: '#b91c1c', background: '#fee2e2' },
  postponed: { label: 'Verschoben', icon: '🕒', color: '#a16207', background: '#fef3c7' },
  default: { label: 'Unbekannt', icon: 'ℹ️', color: '#334155', background: '#e2e8f0' }
};

const formatCourtRange = (start, end) => {
  if (!start) return '–';
  if (end && end !== start) return `${start}–${end}`;
  return `${start}`;
};

const extractMatchNumber = (notes) => {
  if (!notes) return null;
  const match = notes.match(/match\s*#(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
};

const needsResultParser = (match) => {
  if (!match) return false;
  if (['cancelled', 'postponed'].includes(match.status)) return false;

  const hasNumericScore = match.home_score != null && match.away_score != null;
  const finalScore =
    typeof match.final_score === 'string'
      ? match.final_score.trim()
      : match.final_score;
  const hasFinalScore = Boolean(finalScore);

  if (hasNumericScore || hasFinalScore) return false;
  if (match.status === 'completed') return true;

  const isMatchInPast = (match) => {
    if (!match?.match_date) return false;
    const matchDate = new Date(match.match_date);
    if (Number.isNaN(matchDate.getTime())) return false;

    if (match.start_time && matchDate.getHours() === 0 && matchDate.getMinutes() === 0) {
      const [hoursString, minutesString] = match.start_time.split(':');
      const hours = Number.parseInt(hoursString, 10);
      const minutes = Number.parseInt(minutesString, 10);
      if (!Number.isNaN(hours)) {
        matchDate.setHours(hours);
        matchDate.setMinutes(Number.isNaN(minutes) ? 0 : minutes);
      }
    }

    return matchDate.getTime() < Date.now();
  };

  return match.status === 'scheduled' && isMatchInPast(match);
};

function MatchdaysTab({
  seasonMatchdays,
  matchesNeedingParser,
  parserGroupsNeedingUpdate,
  parserMessage,
  parserProcessing,
  matchParserStates,
  meetingDetails,
  selectedSeasonMatch,
  setSelectedSeasonMatch,
  deletingMatchdayId,
  teamById,
  matchResultsData,
  loadMatchResults,
  handleRunParserForAll,
  handleRunResultParser,
  handleDeleteMatchday,
  handleLoadMeetingDetails,
  handleCreateMissingPlayer,
  creatingPlayerKey
}) {
  const renderParserIndicator = ({ parserStatus, parserState, isParserRunning, shouldTriggerParser, matchStatus }) => {
    if (isParserRunning) {
      return (
        <span className="matchday-parser-indicator matchday-parser-indicator--running">⏳ Parser läuft…</span>
      );
    }
    if (parserStatus === 'success') {
      return (
        <span className="matchday-parser-indicator matchday-parser-indicator--ok">
          {parserState?.message || '✅ Aktualisiert'}
        </span>
      );
    }
    if (parserStatus === 'error') {
      return (
        <span
          className="matchday-parser-indicator matchday-parser-indicator--error"
          title={parserState?.message || 'Parser-Fehler'}
        >
          ⚠️ {parserState?.message || 'Fehler'}
        </span>
      );
    }
    if (shouldTriggerParser) {
      return (
        <span className="matchday-parser-indicator" title="Match abgeschlossen, Ergebnis fehlt – Parser starten">
          ⚠️ Ergebnis fehlt
        </span>
      );
    }
    if (matchStatus === 'completed') {
      return <span className="matchday-parser-indicator matchday-parser-indicator--ok">✅ vollständig</span>;
    }
    return <span className="matchday-parser-placeholder">–</span>;
  };

  return (
    <div className="lk-card-full matchday-board">
      <div className="formkurve-header">
        <div>
          <div className="formkurve-title">Matchdays · Winter 2025/26</div>
          <div className="formkurve-subtitle">
            {seasonMatchdays.length > 0
              ? `${seasonMatchdays.length} Spiel${seasonMatchdays.length === 1 ? '' : 'e'}`
              : 'Keine Matchdays gefunden'}
          </div>
        </div>
      </div>
      <div className="season-content">
        {parserMessage && (
          <div className={`parser-feedback parser-feedback--${parserMessage.type || 'success'}`}>
            {parserMessage.text}
          </div>
        )}
        {matchesNeedingParser.length > 0 && (
          <div className="matchday-parser-summary">
            <div className="matchday-parser-summary-info">
              <span className="matchday-parser-summary-icon">⚠️</span>
              <span>
                <strong>{matchesNeedingParser.length}</strong>{' '}
                {matchesNeedingParser.length === 1 ? 'Spiel ohne Ergebnis' : 'Spiele ohne Ergebnis'}
              </span>
              {parserGroupsNeedingUpdate.length > 0 && (
                <span className="matchday-parser-summary-groups">
                  Gruppen: {parserGroupsNeedingUpdate.join(', ')}
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn-modern btn-modern-inactive btn-parser-bulk"
              onClick={handleRunParserForAll}
              disabled={parserProcessing}
            >
              {parserProcessing ? 'Parser läuft…' : 'Alle aktualisieren'}
            </button>
          </div>
        )}
        {seasonMatchdays.length === 0 ? (
          <div className="placeholder">Für diese Saison wurden keine Matchdays gefunden.</div>
        ) : (
          <div className="table-responsive">
            <table className="lk-table matchday-table matchday-table-compact">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Datum</th>
                  <th>Match-Nr.</th>
                  <th>Heimteam</th>
                  <th>Gastteam</th>
                  <th>Austragungsort</th>
                  <th>Liga · Gruppe</th>
                  <th>Status</th>
                  <th>Ergebnis</th>
                  <th>Parser</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {seasonMatchdays.map((match, index) => {
                  const homeTeam = teamById.get(match.home_team_id);
                  const awayTeam = teamById.get(match.away_team_id);
                  const matchResultsCount = match.match_results_count || 0;
                  const dateObj = match.match_date
                    ? new Date(match.match_date)
                    : match.matchDateIso
                      ? new Date(match.matchDateIso)
                      : null;
                  const dateWeekday = dateObj ? dateObj.toLocaleDateString('de-DE', { weekday: 'short' }) : '–';
                  const dateValue = dateObj
                    ? dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : '–';
                  const startLabel = (match.start_time || match.startTime || '').slice(0, 5) || '–';
                  const matchNumber = match.match_number ?? extractMatchNumber(match.notes);
                  const homeLabel = homeTeam
                    ? `${homeTeam.club_name}${homeTeam.team_name ? ` ${homeTeam.team_name}` : ''}`
                    : 'Unbekannt';
                  const awayLabel = awayTeam
                    ? `${awayTeam.club_name}${awayTeam.team_name ? ` ${awayTeam.team_name}` : ''}`
                    : 'Unbekannt';
                  const scoreLabel =
                    match.final_score ||
                    (match.home_score != null && match.away_score != null
                      ? `${match.home_score}:${match.away_score}`
                      : '–');
                  const statusConfig = MATCHDAY_STATUS_STYLES[match.status] || MATCHDAY_STATUS_STYLES.default;
                  const shouldTriggerParser = needsResultParser(match);
                  const parserState = matchParserStates[match.id];
                  const parserStatus = parserState?.status;
                  const isParserRunning = parserStatus === 'running';
                  const meetingInfo = meetingDetails[match.id] || {};
                  const meetingData = meetingInfo.data;
                  const meetingLoading = meetingInfo.loading;
                  const meetingError = meetingInfo.error;
                  const meetingImporting = meetingInfo.importing;
                  const missingPlayers =
                    meetingInfo.missingPlayers !== undefined
                      ? meetingInfo.missingPlayers
                      : meetingData?.applyResult?.missingPlayers || [];
                  const isExpanded = selectedSeasonMatch?.id === match.id;

                  return (
                    <Fragment key={match.id}>
                      <tr className={`matchday-row${isExpanded ? ' matchday-row--expanded' : ''}`}>
                        <td>{index + 1}</td>
                        <td>
                          <div>{dateWeekday}</div>
                          <div>{dateValue}</div>
                          <div className="matchday-table-start">{startLabel}</div>
                        </td>
                        <td>{matchNumber ?? '–'}</td>
                        <td className="matchday-team-cell">{homeLabel}</td>
                        <td className="matchday-team-cell">{awayLabel}</td>
                        <td>
                          <div>{match.venue || '–'}</div>
                          {match.court_number && (
                            <div className="matchday-venue-courts">
                              Platz {formatCourtRange(match.court_number, match.court_number_end)}
                            </div>
                          )}
                        </td>
                        <td>
                          <div>{match.league || '–'}</div>
                          <div className="matchday-group">{match.group_name || '–'}</div>
                        </td>
                        <td>
                          <span
                            className="matchday-status-badge"
                            style={{ color: statusConfig.color, background: statusConfig.background }}
                          >
                            {statusConfig.icon} {statusConfig.label}
                          </span>
                        </td>
                        <td className="matchday-score">{scoreLabel}</td>
                        <td>
                          <div className="matchday-parser-cell">
                            {renderParserIndicator({
                              parserStatus,
                              parserState,
                              isParserRunning,
                              shouldTriggerParser,
                              matchStatus: match.status
                            })}
                            <div className="matchday-results-status">
                              <span
                                className={`matchday-results-tag ${
                                  matchResultsCount > 0 ? 'matchday-results-tag--ok' : 'matchday-results-tag--missing'
                                }`}
                                title={
                                  matchResultsCount > 0
                                    ? `${matchResultsCount} Einzelergebnisse gespeichert`
                                    : 'Noch keine Einzelergebnisse importiert'
                                }
                              >
                                {matchResultsCount > 0 ? `Ergebnisse (${matchResultsCount})` : 'Ergebnisse fehlen'}
                              </span>
                              {missingPlayers.length > 0 && (
                                <span
                                  className="matchday-results-missing"
                                  title="Spieler fehlen in players_unified. Im Detailbereich können sie angelegt werden."
                                >
                                  ⚠️ {missingPlayers.length} Spieler offen
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="matchday-table-actions">
                            {(shouldTriggerParser || parserStatus === 'error') && (
                              <button
                                type="button"
                                className="btn-modern btn-modern-increase btn-parser-run"
                                onClick={() => handleRunResultParser(match)}
                                disabled={parserProcessing || isParserRunning}
                              >
                                {isParserRunning ? 'Läuft…' : 'Parser'}
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-modern btn-modern-danger btn-matchday-delete"
                              onClick={() => handleDeleteMatchday(match)}
                              disabled={deletingMatchdayId === match.id}
                            >
                              {deletingMatchdayId === match.id ? 'Lösche…' : 'Löschen'}
                            </button>
                            <button
                              type="button"
                              className="btn-modern btn-modern-inactive btn-matchday-details"
                              onClick={() =>
                                setSelectedSeasonMatch((prev) =>
                                  prev?.id === match.id ? null : { ...match, __listIndex: index + 1 }
                                )
                              }
                            >
                              {isExpanded ? 'Schließen' : 'Details'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="matchday-detail-row">
                          <td colSpan={11}>
                            <MatchdayDetailCard
                              match={match}
                              matchResultsCount={matchResultsCount}
                              shouldTriggerParser={shouldTriggerParser}
                              parserState={parserState}
                              meetingData={meetingDetails[match.id]?.data}
                              meetingError={meetingDetails[match.id]?.error}
                              meetingLoading={meetingDetails[match.id]?.loading}
                              meetingImporting={meetingDetails[match.id]?.importing}
                              missingPlayers={
                                meetingDetails[match.id]?.missingPlayers !== undefined
                                  ? meetingDetails[match.id].missingPlayers
                                  : meetingDetails[match.id]?.data?.applyResult?.missingPlayers || []
                              }
                              homeTeam={homeTeam}
                              awayTeam={awayTeam}
                              matchResultsData={matchResultsData[match.id]}
                              loadMatchResults={loadMatchResults}
                              handleLoadMeetingDetails={handleLoadMeetingDetails}
                              handleCreateMissingPlayer={handleCreateMissingPlayer}
                              selectedSeasonMatch={selectedSeasonMatch}
                              setSelectedSeasonMatch={setSelectedSeasonMatch}
                              creatingPlayerKey={creatingPlayerKey}
                              statusConfig={statusConfig}
                            />
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

export default MatchdaysTab;


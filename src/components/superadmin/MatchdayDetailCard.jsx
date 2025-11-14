import { Fragment } from 'react';

const formatCourtRange = (start, end) => {
  if (!start) return '–';
  if (end && end !== start) return `${start}–${end}`;
  return `${start}`;
};

function MatchdayDetailCard({
  match,
  matchResultsCount,
  shouldTriggerParser,
  parserState,
  meetingData,
  meetingError,
  meetingLoading,
  meetingImporting,
  missingPlayers,
  homeTeam,
  awayTeam,
  handleLoadMeetingDetails,
  handleCreateMissingPlayer,
  selectedSeasonMatch,
  setSelectedSeasonMatch,
  creatingPlayerKey,
  statusConfig
}) {
  const selectedHomeLabel = homeTeam
    ? `${homeTeam.club_name}${homeTeam.team_name ? ` ${homeTeam.team_name}` : ''}`
    : 'Unbekannt';
  const selectedAwayLabel = awayTeam
    ? `${awayTeam.club_name}${awayTeam.team_name ? ` ${awayTeam.team_name}` : ''}`
    : 'Unbekannt';

  const renderPlayersCell = (players = []) => {
    if (!players || players.length === 0) return '–';
    return players.map((player, idx) => (
      <Fragment key={`${player.name || player.raw || idx}`}>
        {player.name || player.raw}
        {player.meta ? ` (${player.meta})` : ''}
        {idx < players.length - 1 && <br />}
      </Fragment>
    ));
  };

  const renderMeetingTable = (title, entries) => {
    if (!entries || !entries.length) return null;
    return (
      <div className="meeting-table-wrapper">
        <div className="meeting-table-title">{title}</div>
        <table className="matchday-meeting-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Heim</th>
              <th>Gast</th>
              <th>1. Satz</th>
              <th>2. Satz</th>
              <th>3. Satz</th>
              <th>Matchpunkte</th>
              <th>Sätze</th>
              <th>Spiele</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={`${title}-${idx}`}>
                <td>{entry.matchNumber || idx + 1}</td>
                <td className="meeting-player-cell">{renderPlayersCell(entry.homePlayers)}</td>
                <td className="meeting-player-cell">{renderPlayersCell(entry.awayPlayers)}</td>
                <td>{entry.setScores?.[0]?.raw || '–'}</td>
                <td>{entry.setScores?.[1]?.raw || '–'}</td>
                <td>{entry.setScores?.[2]?.raw || '–'}</td>
                <td>{entry.matchPoints?.raw || '–'}</td>
                <td>{entry.sets?.raw || '–'}</td>
                <td>{entry.games?.raw || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="matchday-detail-inline">
      <div className="matchday-detail-inline-header">
        <div>
          <div className="matchday-detail-title">
            {selectedHomeLabel} vs. {selectedAwayLabel}
          </div>
          <div className="matchday-detail-meta">
            {match.match_date
              ? new Date(match.match_date).toLocaleString('de-DE', {
                  weekday: 'long',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Datum unbekannt'}
            {selectedSeasonMatch?.__listIndex && ` · Spiel #${selectedSeasonMatch.__listIndex}`}
            {match.match_number && ` · Match ${match.match_number}`}
          </div>
        </div>
        <button type="button" className="btn-modern btn-modern-inactive" onClick={() => setSelectedSeasonMatch(null)}>
          Schließen
        </button>
      </div>
      {shouldTriggerParser && (
        <div className="matchday-parser-hint">⚠️ Ergebnisse fehlen – Parser starten, um Satz- und Spielstände nachzuladen.</div>
      )}
      <div className="matchday-detail-grid">
        <div>
          <div className="detail-label">Liga</div>
          <div>{match.league || '–'}</div>
        </div>
        <div>
          <div className="detail-label">Gruppe</div>
          <div>{match.group_name || '–'}</div>
        </div>
        <div>
          <div className="detail-label">Status</div>
          <div>{statusConfig.label}</div>
        </div>
        <div>
          <div className="detail-label">Einzelergebnisse</div>
          <div>
            {matchResultsCount > 0
              ? `${matchResultsCount} ${matchResultsCount === 1 ? 'Match' : 'Matches'} importiert`
              : 'Keine Einzelergebnisse'}
          </div>
        </div>
        <div>
          <div className="detail-label">Ergebnis</div>
          <div>
            {match.final_score ||
              (match.home_score != null && match.away_score != null ? `${match.home_score}:${match.away_score}` : '–')}
          </div>
        </div>
        <div>
          <div className="detail-label">Austragungsort</div>
          <div>{match.venue || '–'}</div>
        </div>
        <div>
          <div className="detail-label">Plätze</div>
          <div>
            {match.court_number ? `Platz ${formatCourtRange(match.court_number, match.court_number_end)}` : '–'}
          </div>
        </div>
        <div>
          <div className="detail-label">Notizen</div>
          <div>{match.notes || '–'}</div>
        </div>
      </div>
      <div className="matchday-meeting-section">
        <div className="matchday-meeting-header">
          <div>
            <div className="matchday-meeting-title">Spielbericht (nuLiga)</div>
            {meetingData?.metadata?.matchDateLabel && (
              <div className="matchday-meeting-meta">{meetingData.metadata.matchDateLabel}</div>
            )}
          </div>
          <div className="matchday-meeting-actions">
            <button
              type="button"
              className="btn-modern btn-modern-inactive btn-meeting-action"
              onClick={() =>
                handleLoadMeetingDetails(match, {
                  homeLabel: selectedHomeLabel,
                  awayLabel: selectedAwayLabel,
                  applyImport: false
                })
              }
              disabled={meetingLoading && !meetingData}
            >
              {meetingLoading && !meetingData ? 'Lade…' : 'Details laden'}
            </button>
            {meetingData && (
              <button
                type="button"
                className="btn-modern btn-modern-inactive btn-meeting-action"
                onClick={() =>
                  handleLoadMeetingDetails(match, {
                    homeLabel: selectedHomeLabel,
                    awayLabel: selectedAwayLabel,
                    applyImport: true
                  })
                }
                disabled={meetingLoading || meetingImporting}
              >
                {meetingImporting ? 'Importiere…' : 'In DB übernehmen'}
              </button>
            )}
          </div>
        </div>
        {meetingError && <div className="parser-feedback parser-feedback--error">{meetingError}</div>}
        {meetingLoading && !meetingData && <div className="matchday-meeting-loading">Lade Spielbericht…</div>}
        {meetingData && (
          <div className="matchday-meeting-content">
            <div className="matchday-meeting-metadata">
              {meetingData.metadata?.completedOn && <div>Abgeschlossen: {meetingData.metadata.completedOn}</div>}
              {meetingData.metadata?.referee && <div>Oberschiedsrichter: {meetingData.metadata.referee}</div>}
              {meetingData.meetingUrl && (
                <a href={meetingData.meetingUrl} target="_blank" rel="noreferrer">
                  nuLiga-Link
                </a>
              )}
            </div>
            {missingPlayers.length > 0 && (
              <div className="matchday-missing-players">
                <div className="matchday-missing-header">
                  ⚠️ {missingPlayers.length}{' '}
                  {missingPlayers.length === 1
                    ? 'Spieler konnte nicht zugeordnet werden.'
                    : 'Spieler konnten nicht zugeordnet werden.'}{' '}
                  Bitte anlegen und den Import anschließend erneut starten.
                </div>
                <table className="matchday-missing-table">
                  <thead>
                    <tr>
                      <th>Spieler</th>
                      <th>LK</th>
                      <th>Vorkommen</th>
                      <th>Einsätze</th>
                      <th>Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingPlayers.map((player) => {
                      const buttonKey = `${match.id}:${player.key}`;
                      return (
                        <tr key={player.key}>
                          <td>
                            <div className="missing-player-name">{player.name}</div>
                            {player.meta && <div className="missing-player-meta">{player.meta}</div>}
                          </td>
                          <td>{player.lk ? `LK ${player.lk}` : '–'}</td>
                          <td>{player.occurrences}</td>
                          <td>
                            {(player.contexts || []).map((ctx, idx) => (
                              <div key={idx} className="missing-player-context">
                                {ctx.matchType || 'Match'} {ctx.matchNumber || '–'} ·{' '}
                                {ctx.teamName || (ctx.side === 'home' ? 'Heim' : 'Gast')}
                              </div>
                            ))}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-modern btn-modern-primary"
                              onClick={() => handleCreateMissingPlayer(match, player)}
                              disabled={creatingPlayerKey === buttonKey}
                            >
                              {creatingPlayerKey === buttonKey ? 'Speichere…' : 'Spieler anlegen'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {renderMeetingTable('Einzel', meetingData.singles)}
            {renderMeetingTable('Doppel', meetingData.doubles)}
            {(meetingData.totals?.singles || meetingData.totals?.doubles || meetingData.totals?.overall) && (
              <div className="matchday-meeting-totals">
                {meetingData.totals?.singles && (
                  <span>
                    Einzel: {meetingData.totals.singles.matchPoints?.raw || '–'} ·{' '}
                    {meetingData.totals.singles.sets?.raw || '–'} Sätze ·{' '}
                    {meetingData.totals.singles.games?.raw || '–'} Spiele
                  </span>
                )}
                {meetingData.totals?.doubles && (
                  <span>
                    Doppel: {meetingData.totals.doubles.matchPoints?.raw || '–'} ·{' '}
                    {meetingData.totals.doubles.sets?.raw || '–'} Sätze ·{' '}
                    {meetingData.totals.doubles.games?.raw || '–'} Spiele
                  </span>
                )}
                {meetingData.totals?.overall && (
                  <span>
                    Gesamt: {meetingData.totals.overall.matchPoints?.raw || '–'} ·{' '}
                    {meetingData.totals.overall.sets?.raw || '–'} Sätze ·{' '}
                    {meetingData.totals.overall.games?.raw || '–'} Spiele
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MatchdayDetailCard;


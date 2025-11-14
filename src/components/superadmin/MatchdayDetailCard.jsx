import { Fragment, useEffect, useState, useMemo, useCallback } from 'react';
import MatchResultsTable from './MatchResultsTable';

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
  matchResultsData,
  loadMatchResults,
  handleLoadMeetingDetails,
  handleCreateMissingPlayer,
  selectedSeasonMatch,
  setSelectedSeasonMatch,
  creatingPlayerKey,
  statusConfig,
  allTeams,
  handleReassignMatchTeams
}) {
  const selectedHomeLabel = homeTeam
    ? `${homeTeam.club_name}${homeTeam.team_name ? ` ${homeTeam.team_name}` : ''}`
    : 'Unbekannt';
  const selectedAwayLabel = awayTeam
    ? `${awayTeam.club_name}${awayTeam.team_name ? ` ${awayTeam.team_name}` : ''}`
    : 'Unbekannt';

  const [pendingHomeTeamId, setPendingHomeTeamId] = useState(match.home_team_id || homeTeam?.id || '');
  const [pendingAwayTeamId, setPendingAwayTeamId] = useState(match.away_team_id || awayTeam?.id || '');
  const [reassignMessage, setReassignMessage] = useState(null);
  const [isReassignSaving, setIsReassignSaving] = useState(false);

  useEffect(() => {
    setPendingHomeTeamId(match.home_team_id || homeTeam?.id || '');
    setPendingAwayTeamId(match.away_team_id || awayTeam?.id || '');
    setReassignMessage(null);
    setIsReassignSaving(false);
  }, [match?.id, match.home_team_id, match.away_team_id, homeTeam?.id, awayTeam?.id]);

  const teamOptions = useMemo(() => {
    const options = [];
    
    // Füge alle Teams aus der Datenbank hinzu
    if (Array.isArray(allTeams)) {
      allTeams.forEach((team) => {
        options.push({
          id: team.id,
          label: `${team.club_name}${team.team_name ? ` ${team.team_name}` : ''}`.trim() || 'Unbenanntes Team',
          isVirtual: false,
          team: team
        });
      });
    }
    
    // Füge Teams aus nuLiga-Metadaten hinzu, falls sie noch nicht in der DB existieren
    if (meetingData?.metadata) {
      const nuLigaHomeTeam = meetingData.metadata.homeTeam;
      const nuLigaAwayTeam = meetingData.metadata.awayTeam;
      
      const addNuLigaTeam = (teamName) => {
        if (!teamName) return;
        
        // Prüfe ob Team bereits in der Liste ist
        const exists = options.some((opt) => opt.label === teamName);
        if (exists) return;
        
        // Füge als virtuelle Option hinzu (noch nicht in DB)
        options.push({
          id: `virtual:${teamName}`,
          label: teamName,
          isVirtual: true,
          nuLigaTeamName: teamName
        });
      };
      
      if (nuLigaHomeTeam) addNuLigaTeam(nuLigaHomeTeam);
      if (nuLigaAwayTeam) addNuLigaTeam(nuLigaAwayTeam);
    }
    
    // Sortiere alphabetisch
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [allTeams, meetingData?.metadata]);

  const resolveTeamLabelById = useCallback(
    (teamId) => {
      if (!teamId) return '';
      const option = teamOptions.find((team) => team.id === teamId);
      return option?.label || '';
    },
    [teamOptions]
  );

  const handleSwapTeams = () => {
    setPendingHomeTeamId(pendingAwayTeamId);
    setPendingAwayTeamId(pendingHomeTeamId);
  };

  const handleApplyTeamReassign = async () => {
    if (!handleReassignMatchTeams) return;
    setReassignMessage(null);
    try {
      setIsReassignSaving(true);
      const result = await handleReassignMatchTeams(match, pendingHomeTeamId, pendingAwayTeamId, {
        meetingHomeTeam: meetingData?.metadata?.homeTeam,
        meetingAwayTeam: meetingData?.metadata?.awayTeam
      });

      const nextHomeLabel =
        result?.homeTeam?.club_name
          ? `${result.homeTeam.club_name}${result.homeTeam.team_name ? ` ${result.homeTeam.team_name}` : ''}`
          : resolveTeamLabelById(pendingHomeTeamId) || selectedHomeLabel;
      const nextAwayLabel =
        result?.awayTeam?.club_name
          ? `${result.awayTeam.club_name}${result.awayTeam.team_name ? ` ${result.awayTeam.team_name}` : ''}`
          : resolveTeamLabelById(pendingAwayTeamId) || selectedAwayLabel;

      setReassignMessage({
        type: 'success',
        text: 'Team-Zuordnung aktualisiert. Spielbericht wird neu geladen …'
      });

      handleLoadMeetingDetails(match, {
        homeLabel: nextHomeLabel,
        awayLabel: nextAwayLabel,
        applyImport: false
      });
    } catch (error) {
      setReassignMessage({
        type: 'error',
        text: error.message || 'Team-Zuordnung konnte nicht gespeichert werden.'
      });
    } finally {
      setIsReassignSaving(false);
    }
  };

  // Lade Match-Results aus DB, wenn Matchday geöffnet wird
  useEffect(() => {
    if (match?.id && matchResultsCount > 0 && !matchResultsData) {
      loadMatchResults(match.id);
    }
  }, [match?.id, matchResultsCount, matchResultsData, loadMatchResults]);


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
      {matchResultsData && (matchResultsData.singles?.length > 0 || matchResultsData.doubles?.length > 0) && (
        <div className="matchday-meeting-section">
          <div className="matchday-meeting-header">
            <div>
              <div className="matchday-meeting-title">Gespeicherte Ergebnisse (Datenbank)</div>
              <div className="matchday-meeting-meta">
                {matchResultsData.singles?.length || 0} Einzel · {matchResultsData.doubles?.length || 0} Doppel
              </div>
            </div>
          </div>
          <div className="matchday-meeting-content">
            <MatchResultsTable title="Einzel" entries={matchResultsData.singles} />
            <MatchResultsTable title="Doppel" entries={matchResultsData.doubles} />
          </div>
        </div>
      )}
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
        {meetingError && handleReassignMatchTeams && (
          <div className="matchday-team-reassign">
            <div className="matchday-team-reassign-header">Team-Zuordnung korrigieren</div>
            <div className="matchday-team-reassign-meta">
              <div>
                nuLiga Heim: <strong>{meetingData?.metadata?.homeTeam || '–'}</strong>
              </div>
              <div>
                nuLiga Gast: <strong>{meetingData?.metadata?.awayTeam || '–'}</strong>
              </div>
            </div>
            <div className="matchday-team-reassign-grid">
              <div>
                <label className="matchday-team-reassign-label">Heimteam (Datenbank)</label>
                <select
                  value={pendingHomeTeamId || ''}
                  onChange={(e) => setPendingHomeTeamId(e.target.value || '')}
                  className="matchday-team-reassign-select"
                >
                  <option value="">– Team wählen –</option>
                  {teamOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}{option.isVirtual ? ' (wird erstellt)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="matchday-team-reassign-label">Gastteam (Datenbank)</label>
                <select
                  value={pendingAwayTeamId || ''}
                  onChange={(e) => setPendingAwayTeamId(e.target.value || '')}
                  className="matchday-team-reassign-select"
                >
                  <option value="">– Team wählen –</option>
                  {teamOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}{option.isVirtual ? ' (wird erstellt)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="matchday-team-reassign-actions">
              <button
                type="button"
                className="btn-modern btn-modern-inactive"
                onClick={handleSwapTeams}
                disabled={!pendingHomeTeamId || !pendingAwayTeamId}
              >
                Heim/Gast tauschen
              </button>
              <button
                type="button"
                className="btn-modern btn-modern-primary"
                onClick={handleApplyTeamReassign}
                disabled={
                  isReassignSaving ||
                  !pendingHomeTeamId ||
                  !pendingAwayTeamId ||
                  pendingHomeTeamId === pendingAwayTeamId
                }
              >
                {isReassignSaving ? 'Speichere…' : 'Zuordnung speichern & neu laden'}
              </button>
            </div>
            {reassignMessage && (
              <div className={`matchday-team-reassign-feedback matchday-team-reassign-feedback--${reassignMessage.type}`}>
                {reassignMessage.text}
              </div>
            )}
          </div>
        )}
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
                <div className="matchday-missing-table-wrapper">
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
              </div>
            )}
            <MatchResultsTable title="Einzel" entries={meetingData.singles} />
            <MatchResultsTable title="Doppel" entries={meetingData.doubles} />
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


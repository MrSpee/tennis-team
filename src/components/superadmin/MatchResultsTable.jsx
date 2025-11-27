import { Fragment } from 'react';
import './MatchResultsTable.css';

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

function MatchResultsTable({ title, entries }) {
  if (!entries || !entries.length) return null;

  return (
    <div className="match-results-table-wrapper">
      <div className="match-results-table-title">{title}</div>
      <div className="match-results-table-scroll">
        <table className="match-results-table">
          <colgroup>
            <col className="match-results-col-number" />
            <col className="match-results-col-players" />
            <col className="match-results-col-players" />
            <col className="match-results-col-set" />
            <col className="match-results-col-set" />
            <col className="match-results-col-set" />
            <col className="match-results-col-points" />
          </colgroup>
          <thead>
            <tr>
              <th className="match-results-col-number">#</th>
              <th className="match-results-col-players">Heim</th>
              <th className="match-results-col-players">Gast</th>
              <th className="match-results-col-set">1. Satz</th>
              <th className="match-results-col-set">2. Satz</th>
              <th className="match-results-col-set">3. Satz</th>
              <th className="match-results-col-points">Punkte</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={`${title}-${idx}`} className="match-results-row">
                <td className="match-results-col-number">{entry.matchNumber || idx + 1}</td>
                <td className="match-results-col-players match-results-players-cell">
                  {renderPlayersCell(entry.homePlayers)}
                </td>
                <td className="match-results-col-players match-results-players-cell">
                  {renderPlayersCell(entry.awayPlayers)}
                </td>
                <td className="match-results-col-set">{entry.setScores?.[0]?.raw || '–'}</td>
                <td className="match-results-col-set">{entry.setScores?.[1]?.raw || '–'}</td>
                <td className="match-results-col-set">{entry.setScores?.[2]?.raw || '–'}</td>
                <td className="match-results-col-points">{entry.matchPoints?.raw || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MatchResultsTable;


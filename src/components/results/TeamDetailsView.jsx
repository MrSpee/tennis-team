import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import TeamView from '../TeamView';

const TeamDetailsView = ({ 
  teamId, 
  teamName, 
  teamMeta, 
  searchTeamMatches,
  externalTeamMatches,
  searchTeamLeagueMatches,
  externalLeagueMatches,
  playerTeams,
  display,
  onTeamChange
}) => {
  const [teamInfo, setTeamInfo] = useState(null);
  
  useEffect(() => {
    if (teamId) {
      supabase
        .from('team_info')
        .select('id, team_name, category, club_name')
        .eq('id', teamId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setTeamInfo(data);
          }
        });
    }
  }, [teamId]);
  
  const displayName = teamInfo 
    ? `${teamInfo.category || ''} ${teamInfo.team_name || ''}`.trim()
    : teamName;
  
  return (
    <>
      {/* Mannschaftsdetails */}
      {(teamMeta || teamInfo) && (
        <div style={{
          background: '#f9fafb',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              {displayName}
            </div>
            {teamMeta && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                {teamMeta.league && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🏆</span>
                    <span>{teamMeta.league}</span>
                  </div>
                )}
                {teamMeta.group && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📋</span>
                    <span>Gruppe {teamMeta.group}</span>
                  </div>
                )}
                {teamMeta.season && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📅</span>
                    <span>{teamMeta.season}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      <TeamView 
        teamId={teamId}
        matches={searchTeamMatches || externalTeamMatches[teamId] || []}
        leagueMatches={searchTeamLeagueMatches.length > 0 
          ? searchTeamLeagueMatches 
          : (externalLeagueMatches[teamId] || [])}
        leagueMeta={teamMeta || null}
        playerTeamIds={(() => {
          // Prüfe, ob das gesuchte Team zu den eigenen Teams gehört
          const isOwnTeam = playerTeams.some(team => team.id === teamId);
          // Wenn es nicht zu den eigenen Teams gehört, leere Liste (keine "Unsere Begegnungen")
          // Wenn es zu den eigenen Teams gehört, alle eigenen Teams (normale Ansicht)
          return isOwnTeam ? playerTeams.map(team => team.id) : [];
        })()}
        display={display}
        onTeamChange={onTeamChange}
      />
    </>
  );
};

export default TeamDetailsView;


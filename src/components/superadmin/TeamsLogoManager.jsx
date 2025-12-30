import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import TeamLogoUpload from './TeamLogoUpload';
import { Search, Building2, Trophy, Users } from 'lucide-react';
import './TeamsLogoManager.css';

/**
 * Vereins-Logo-Manager: Übersicht aller Vereine mit Logo-Upload
 * Logos werden auf Vereinsebene gespeichert, nicht pro Team
 */
export default function TeamsLogoManager({ clubs: initialClubs, teams: initialTeams }) {
  const [clubs, setClubs] = useState(initialClubs || []);
  const [teams, setTeams] = useState(initialTeams || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClub, setSelectedClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clubTeamsMap, setClubTeamsMap] = useState({});

  // Lade Vereine mit logo_url wenn nicht vorhanden
  useEffect(() => {
    const loadData = async () => {
      try {
        // Lade Vereine mit logo_url
        const { data: clubsData, error: clubsError } = await supabase
          .from('club_info')
          .select('id, name, logo_url, region, city')
          .order('name');

        if (clubsError) throw clubsError;

        // Lade Teams für die Gruppierung
        const { data: teamsData, error: teamsError } = await supabase
          .from('team_info')
          .select('id, club_id, club_name, team_name, category')
          .order('club_name')
          .order('team_name');

        if (teamsError) throw teamsError;

        // Gruppiere Teams nach Verein
        const teamsByClub = {};
        (teamsData || []).forEach(team => {
          const clubId = team.club_id || team.club_name; // Fallback falls club_id fehlt
          if (!teamsByClub[clubId]) {
            teamsByClub[clubId] = [];
          }
          teamsByClub[clubId].push(team);
        });

        setClubs(clubsData || []);
        setTeams(teamsData || []);
        setClubTeamsMap(teamsByClub);
      } catch (error) {
        console.error('❌ Fehler beim Laden der Daten:', error);
      } finally {
        setLoading(false);
      }
    };

    // Wenn initialClubs/initialTeams vorhanden, nutze diese
    if (initialClubs && initialClubs.length > 0) {
      setClubs(initialClubs);
      
      // Gruppiere initialTeams
      const teamsByClub = {};
      (initialTeams || []).forEach(team => {
        const clubId = team.club_id || team.club_name;
        if (!teamsByClub[clubId]) {
          teamsByClub[clubId] = [];
        }
        teamsByClub[clubId].push(team);
      });
      setClubTeamsMap(teamsByClub);
      setLoading(false);
    } else {
      loadData();
    }
  }, [initialClubs, initialTeams]);

  // Gefilterte Vereine
  const filteredClubs = clubs.filter(club => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      club.name?.toLowerCase().includes(term) ||
      club.city?.toLowerCase().includes(term) ||
      club.region?.toLowerCase().includes(term)
    );
  });

  const handleUploadComplete = (clubId, logoUrl) => {
    // Aktualisiere lokalen State
    setClubs(prevClubs =>
      prevClubs.map(club =>
        club.id === clubId ? { ...club, logo_url: logoUrl } : club
      )
    );
    setSelectedClub(null);
  };

  if (loading) {
    return (
      <div className="teams-logo-manager-loading">
        <div className="loading-spinner"></div>
        <p>Lade Vereine...</p>
      </div>
    );
  }

  return (
    <div className="teams-logo-manager">
      <div className="teams-logo-manager-header">
        <h2>
          <Building2 size={24} />
          Vereins-Logo-Verwaltung
        </h2>
        <p>{filteredClubs.length} von {clubs.length} Vereinen</p>
      </div>

      {/* Suche */}
      <div className="teams-logo-search">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Suche nach Verein, Ort oder Region..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="clear-search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Vereine Grid */}
      <div className="teams-logo-grid">
        {filteredClubs.length === 0 ? (
          <div className="teams-logo-empty">
            <Building2 size={48} />
            <h3>Keine Vereine gefunden</h3>
            <p>Versuche einen anderen Suchbegriff.</p>
          </div>
        ) : (
          filteredClubs.map((club) => {
            const clubTeams = clubTeamsMap[club.id] || [];
            const teamsCount = clubTeams.length;

            return (
              <div
                key={club.id}
                className={`team-logo-card ${selectedClub?.id === club.id ? 'selected' : ''}`}
                onClick={() => setSelectedClub(club)}
              >
                {/* Logo Preview */}
                <div className="team-logo-card-preview">
                  {club.logo_url ? (
                    <img
                      src={club.logo_url}
                      alt={`${club.name} Logo`}
                      className="team-logo-card-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="team-logo-card-placeholder"
                    style={{ display: club.logo_url ? 'none' : 'flex' }}
                  >
                    {club.name
                      ?.split(' ')
                      .map((word) => word[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase() || '??'}
                  </div>
                </div>

                {/* Verein Info */}
                <div className="team-logo-card-info">
                  <div className="team-logo-card-name">
                    {club.name}
                  </div>
                  {club.city && (
                    <div className="team-logo-card-team">{club.city}</div>
                  )}
                  {club.region && (
                    <div className="team-logo-card-category">{club.region}</div>
                  )}
                </div>

                {/* Teams Count */}
                {teamsCount > 0 && (
                  <div className="team-logo-card-teams-count">
                    <Trophy size={14} />
                    <span>{teamsCount} {teamsCount === 1 ? 'Mannschaft' : 'Mannschaften'}</span>
                  </div>
                )}

                {/* Status Badge */}
                <div className="team-logo-card-status">
                  {club.logo_url ? (
                    <span className="status-badge has-logo">✓ Logo</span>
                  ) : (
                    <span className="status-badge no-logo">Kein Logo</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Logo Upload Modal */}
      {selectedClub && (
        <div className="team-logo-modal-overlay" onClick={() => setSelectedClub(null)}>
          <div className="team-logo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="team-logo-modal-header">
              <h3>
                Logo für {selectedClub.name}
              </h3>
              <button
                className="team-logo-modal-close"
                onClick={() => setSelectedClub(null)}
              >
                ✕
              </button>
            </div>
            <div className="team-logo-modal-body">
              <TeamLogoUpload
                club={selectedClub}
                onUploadComplete={(logoUrl) => handleUploadComplete(selectedClub.id, logoUrl)}
              />
              {clubTeamsMap[selectedClub.id] && clubTeamsMap[selectedClub.id].length > 0 && (
                <div className="team-logo-modal-teams-info" style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  backgroundColor: 'var(--gray-50)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  color: 'var(--gray-600)'
                }}>
                  <strong>ℹ️ Hinweis:</strong> Das Logo wird für alle {clubTeamsMap[selectedClub.id].length} Mannschaften dieses Vereins verwendet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Building2, MapPin, Globe, Users, Trophy, Search, Filter } from 'lucide-react';
import './ClubsTab.css';

function ClubsTab({ clubs, teams, players }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [clubStats, setClubStats] = useState({});
  const [loadingStats, setLoadingStats] = useState(true);

  // Lade Statistiken für alle Clubs
  useEffect(() => {
    const loadClubStats = async () => {
      if (!clubs || clubs.length === 0) {
        setLoadingStats(false);
        return;
      }

      try {
        const statsMap = {};
        
        // Lade Teams pro Club
        const { data: teamsData } = await supabase
          .from('team_info')
          .select('id, club_id, club_name');
        
        // Lade Spieler pro Club (über team_memberships)
        const { data: membershipsData } = await supabase
          .from('team_memberships')
          .select('team_id, player_id, team_info!inner(club_id)')
          .eq('is_active', true);
        
        // Aggregiere Statistiken
        clubs.forEach(club => {
          const clubTeams = (teamsData || []).filter(t => t.club_id === club.id);
          const teamIds = clubTeams.map(t => t.id);
          const clubMemberships = (membershipsData || []).filter(m => 
            teamIds.includes(m.team_id)
          );
          const uniquePlayers = new Set(clubMemberships.map(m => m.player_id));
          
          statsMap[club.id] = {
            teamsCount: clubTeams.length,
            playersCount: uniquePlayers.size,
            activeTeams: clubTeams.length // Kann später erweitert werden
          };
        });
        
        setClubStats(statsMap);
      } catch (error) {
        console.error('❌ Fehler beim Laden der Club-Statistiken:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadClubStats();
  }, [clubs]);

  // Verfügbare Regionen
  const regions = useMemo(() => {
    const regionSet = new Set();
    clubs.forEach(club => {
      if (club.region) regionSet.add(club.region);
    });
    return Array.from(regionSet).sort();
  }, [clubs]);

  // Gefilterte Clubs
  const filteredClubs = useMemo(() => {
    let filtered = clubs;

    // Suche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(club =>
        club.name?.toLowerCase().includes(term) ||
        club.city?.toLowerCase().includes(term) ||
        club.region?.toLowerCase().includes(term)
      );
    }

    // Region-Filter
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(club => club.region === selectedRegion);
    }

    return filtered;
  }, [clubs, searchTerm, selectedRegion]);

  const formatDate = (dateString) => {
    if (!dateString) return '–';
    try {
      return new Date(dateString).toLocaleDateString('de-DE');
    } catch {
      return '–';
    }
  };

  return (
    <div className="clubs-tab-container">
      {/* Header mit Statistiken */}
      <div className="clubs-header">
        <div className="clubs-header-content">
          <div>
            <h2 className="clubs-title">
              <Building2 size={24} />
              Vereinsübersicht
            </h2>
            <p className="clubs-subtitle">
              {filteredClubs.length} von {clubs.length} Vereinen
            </p>
          </div>
          <div className="clubs-stats-grid">
            <div className="stat-card">
              <div className="stat-value">{clubs.length}</div>
              <div className="stat-label">Gesamt</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{regions.length}</div>
              <div className="stat-label">Regionen</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter und Suche */}
      <div className="clubs-filters">
        <div className="search-box">
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
        <div className="filter-box">
          <Filter size={18} className="filter-icon" />
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="filter-select"
          >
            <option value="all">Alle Regionen</option>
            {regions.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Clubs Grid */}
      {loadingStats ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Lade Vereinsstatistiken...</p>
        </div>
      ) : filteredClubs.length === 0 ? (
        <div className="empty-state">
          <Building2 size={48} />
          <h3>Keine Vereine gefunden</h3>
          <p>Versuche einen anderen Suchbegriff oder Filter.</p>
        </div>
      ) : (
        <div className="clubs-grid">
          {filteredClubs.map((club) => {
            const stats = clubStats[club.id] || { teamsCount: 0, playersCount: 0 };
            const isVerified = club.is_verified;
            const dataSource = club.data_source;

            return (
              <div key={club.id} className="club-card">
                <div className="club-card-header">
                  <div className="club-name-section">
                    <h3 className="club-name">{club.name}</h3>
                    {isVerified && (
                      <span className="verified-badge" title="Verifiziert">
                        ✓
                      </span>
                    )}
                  </div>
                  {dataSource && (
                    <span className="data-source-badge" title={`Quelle: ${dataSource}`}>
                      {dataSource === 'tvm_import' ? 'TVM' : dataSource === 'tvm_scraper' ? 'Scraper' : dataSource}
                    </span>
                  )}
                </div>

                <div className="club-card-body">
                  {/* Standort */}
                  {(club.city || club.region) && (
                    <div className="club-info-row">
                      <MapPin size={16} />
                      <span>
                        {[club.city, club.region].filter(Boolean).join(', ') || '–'}
                      </span>
                    </div>
                  )}

                  {/* Webseite */}
                  {club.website && (
                    <div className="club-info-row">
                      <Globe size={16} />
                      <a
                        href={club.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="club-website-link"
                      >
                        {club.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    </div>
                  )}

                  {/* Statistiken */}
                  <div className="club-stats-row">
                    <div className="club-stat-item">
                      <Trophy size={16} />
                      <span className="stat-number">{stats.teamsCount}</span>
                      <span className="stat-text">Mannschaften</span>
                    </div>
                    <div className="club-stat-item">
                      <Users size={16} />
                      <span className="stat-number">{stats.playersCount}</span>
                      <span className="stat-text">Spieler</span>
                    </div>
                  </div>

                  {/* Zusätzliche Infos */}
                  <div className="club-meta">
                    {club.postal_code && (
                      <span className="meta-item">PLZ: {club.postal_code}</span>
                    )}
                    {club.federation && (
                      <span className="meta-item">{club.federation}</span>
                    )}
                    {club.state && (
                      <span className="meta-item">{club.state}</span>
                    )}
                  </div>
                </div>

                <div className="club-card-footer">
                  {club.created_at && (
                    <span className="created-date">
                      Erstellt: {formatDate(club.created_at)}
                    </span>
                  )}
                  {club.verification_date && (
                    <span className="verified-date">
                      Verifiziert: {formatDate(club.verification_date)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ClubsTab;


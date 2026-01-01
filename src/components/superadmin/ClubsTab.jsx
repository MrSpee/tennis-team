import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Building2, MapPin, Globe, Users, Trophy, Search, Filter, Phone, Mail, ExternalLink, Award, Hash, Calendar } from 'lucide-react';
import TeamLogoUpload from './TeamLogoUpload';
import './ClubsTab.css';

function ClubsTab({ clubs, teams, players }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [clubStats, setClubStats] = useState({});
  const [clubNumbers, setClubNumbers] = useState({}); // Map: clubId -> club_number
  const [loadingStats, setLoadingStats] = useState(true);
  const [expandedClub, setExpandedClub] = useState(null); // ID des ausgeklappten Clubs für Logo-Upload
  const [currentSeason, setCurrentSeason] = useState(null); // Aktuelle Saison

  // Berechne aktuelle Saison
  const getCurrentSeason = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0=Jan, 11=Dez
    const currentYear = now.getFullYear();
    
    let season, seasonDisplay;
    if (currentMonth >= 4 && currentMonth <= 7) {
      // Mai bis August = Sommer
      season = `Sommer ${currentYear}`;
      seasonDisplay = `Sommer ${currentYear}`;
    } else {
      // September bis April = Winter
      if (currentMonth >= 8) {
        // Sep-Dez: Winter 2024/25
        const nextYear = currentYear + 1;
        season = `Winter ${currentYear}/${String(nextYear).slice(-2)}`;
        seasonDisplay = `Winter ${currentYear}/${String(nextYear).slice(-2)}`;
      } else {
        // Jan-Apr: Winter 2024/25 (vorheriges Jahr)
        const prevYear = currentYear - 1;
        season = `Winter ${prevYear}/${String(currentYear).slice(-2)}`;
        seasonDisplay = `Winter ${prevYear}/${String(currentYear).slice(-2)}`;
      }
    }
    
    return { season, seasonDisplay };
  }, []);

  // Lade Statistiken und Club-Nummern (saison-spezifisch)
  useEffect(() => {
    const loadClubData = async () => {
      if (!clubs || clubs.length === 0) {
        setLoadingStats(false);
        return;
      }

      const { season: currentSeasonValue, seasonDisplay } = getCurrentSeason;
      setCurrentSeason(seasonDisplay);

      try {
        const statsMap = {};
        const numbersMap = {};
        
        // Lade alle Teams mit club_id
        const { data: teamsData } = await supabase
          .from('team_info')
          .select('id, club_id, club_name, club_number');
        
        // Lade aktive team_seasons für die aktuelle Saison
        const { data: activeSeasons } = await supabase
          .from('team_seasons')
          .select('team_id, season')
          .eq('season', currentSeasonValue)
          .eq('is_active', true);
        
        // Erstelle Set von Team-IDs mit aktiver Saison
        const activeTeamIds = new Set((activeSeasons || []).map(ts => ts.team_id));
        
        // Lade Spieler pro Club (nur für Teams mit aktiver Saison)
        const { data: membershipsData } = await supabase
          .from('team_memberships')
          .select('team_id, player_id, team_info!inner(club_id)')
          .eq('is_active', true);
        
        // Aggregiere Statistiken und Club-Nummern
        clubs.forEach(club => {
          const clubTeams = (teamsData || []).filter(t => t.club_id === club.id);
          
          // Filtere Teams mit aktiver Saison
          const activeSeasonTeams = clubTeams.filter(t => activeTeamIds.has(t.id));
          const activeTeamIdsForClub = activeSeasonTeams.map(t => t.id);
          
          // Filtere Memberships nur für aktive Teams
          const clubMemberships = (membershipsData || []).filter(m => 
            activeTeamIdsForClub.includes(m.team_id)
          );
          const uniquePlayers = new Set(clubMemberships.map(m => m.player_id));
          
          statsMap[club.id] = {
            teamsCount: activeSeasonTeams.length,
            playersCount: uniquePlayers.size,
            activeTeams: activeSeasonTeams.length
          };

          // Extrahiere club_number aus Teams (nehme erste vorhandene)
          const teamWithNumber = clubTeams.find(t => t.club_number);
          if (teamWithNumber?.club_number) {
            numbersMap[club.id] = teamWithNumber.club_number;
          }
        });
        
        setClubStats(statsMap);
        setClubNumbers(numbersMap);
      } catch (error) {
        console.error('❌ Fehler beim Laden der Club-Daten:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadClubData();
  }, [clubs, getCurrentSeason]);

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

  const handleLogoUploadComplete = (logoUrl) => {
    // Logo wurde erfolgreich hochgeladen
    // expandedClub schließen - die Parent-Komponente wird beim nächsten Reload die neuen Daten laden
    setExpandedClub(null);
    // Optional: Kurzer Toast/Feedback hier
  };

  const toggleLogoUpload = (clubId) => {
    setExpandedClub(expandedClub === clubId ? null : clubId);
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
            const clubNumber = clubNumbers[club.id];
            const isVerified = club.is_verified;
            const dataSource = club.data_source;
            const isExpanded = expandedClub === club.id;

            return (
              <div key={club.id} className="club-card">
                {/* Logo & Header */}
                <div className="club-card-header-with-logo">
                  {club.logo_url ? (
                    <div className="club-logo">
                      <img 
                        src={club.logo_url} 
                        alt={`${club.name} Logo`}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="club-logo-placeholder" style={{ display: 'none' }}>
                        <Building2 size={32} />
                      </div>
                    </div>
                  ) : (
                    <div className="club-logo-placeholder">
                      <Building2 size={32} />
                    </div>
                  )}
                  
                  <div className="club-header-content">
                    <div className="club-name-section">
                      <h3 className="club-name">{club.name}</h3>
                      {isVerified && (
                        <span className="verified-badge" title="Verifiziert">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="club-header-badges">
                      {dataSource && (
                        <span className="data-source-badge" title={`Quelle: ${dataSource}`}>
                          {dataSource === 'tvm_import' ? 'TVM' : dataSource === 'tvm_scraper' ? 'Scraper' : dataSource}
                        </span>
                      )}
                      {clubNumber && (
                        <span className="club-number-badge" title="nuLiga Club-Nummer">
                          <Hash size={12} />
                          {clubNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="club-card-body">
                  {/* Standort */}
                  {(club.city || club.region || club.postal_code) && (
                    <div className="club-info-row">
                      <MapPin size={16} />
                      <span>
                        {[
                          club.postal_code,
                          club.city,
                          club.region
                        ].filter(Boolean).join(' ') || '–'}
                      </span>
                      {club.state && (
                        <span className="meta-badge">{club.state}</span>
                      )}
                      {club.bundesland && (
                        <span className="meta-badge">{club.bundesland}</span>
                      )}
                    </div>
                  )}

                  {/* Adresse */}
                  {club.address && (
                    <div className="club-info-row">
                      <Building2 size={16} />
                      <span>{club.address}</span>
                    </div>
                  )}

                  {/* Kontakt */}
                  <div className="club-contact-row">
                    {club.phone && (
                      <div className="club-info-row">
                        <Phone size={16} />
                        <a href={`tel:${club.phone}`} className="club-contact-link">
                          {club.phone}
                        </a>
                      </div>
                    )}
                    {club.email && (
                      <div className="club-info-row">
                        <Mail size={16} />
                        <a href={`mailto:${club.email}`} className="club-contact-link">
                          {club.email}
                        </a>
                      </div>
                    )}
                  </div>

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
                        <ExternalLink size={12} style={{ marginLeft: '0.25rem' }} />
                      </a>
                    </div>
                  )}

                  {/* Plätze */}
                  {(club.court_count || club.has_indoor_courts !== null) && (
                    <div className="club-info-row">
                      <Trophy size={16} />
                      <span>
                        {club.court_count ? `${club.court_count} Plätze` : 'Plätze unbekannt'}
                        {club.has_indoor_courts && (
                          <span className="meta-badge" style={{ marginLeft: '0.5rem' }}>Halle</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Saison-Info */}
                  {currentSeason && (
                    <div className="club-season-info">
                      <Calendar size={16} />
                      <span className="season-label">Aktuelle Saison:</span>
                      <span className="season-value">{currentSeason}</span>
                    </div>
                  )}

                  {/* Statistiken */}
                  <div className="club-stats-row">
                    <div className="club-stat-item">
                      <Trophy size={18} />
                      <div className="stat-content">
                        <span className="stat-number">{stats.teamsCount}</span>
                        <span className="stat-text">Mannschaften</span>
                      </div>
                    </div>
                    <div className="club-stat-item">
                      <Users size={18} />
                      <div className="stat-content">
                        <span className="stat-number">{stats.playersCount}</span>
                        <span className="stat-text">Spieler</span>
                      </div>
                    </div>
                  </div>

                  {/* Verband/Region */}
                  {(club.federation || club.region) && (
                    <div className="club-meta">
                      {club.federation && (
                        <span className="meta-item">
                          <Award size={12} style={{ marginRight: '0.25rem' }} />
                          {club.federation}
                        </span>
                      )}
                      {club.region && (
                        <span className="meta-item">{club.region}</span>
                      )}
                    </div>
                  )}

                  {/* nuLiga Link */}
                  {clubNumber && (
                    <div className="club-nuliga-link">
                      <a
                        href={`https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubInfoDisplay?club=${clubNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nuliga-link-button"
                      >
                        <ExternalLink size={14} />
                        nuLiga-Seite öffnen
                      </a>
                    </div>
                  )}
                </div>

                {/* Logo-Upload Section */}
                <div className="club-card-footer">
                  <button
                    onClick={() => toggleLogoUpload(club.id)}
                    className="logo-upload-toggle"
                  >
                    {club.logo_url ? '📷 Logo ändern' : '📷 Logo hochladen'}
                  </button>
                  {(club.created_at || club.verification_date) && (
                    <div className="club-dates">
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
                  )}
                </div>

                {/* Expandable Logo Upload */}
                {isExpanded && (
                  <div className="club-logo-upload-section">
                    <TeamLogoUpload 
                      club={club}
                      onUploadComplete={handleLogoUploadComplete}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ClubsTab;

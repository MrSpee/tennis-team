import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Users, 
  Building2, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  Eye,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import './Dashboard.css';

function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [activityLogs, setActivityLogs] = useState([]);
  const [pendingClubs, setPendingClubs] = useState([]);
  const [allClubs, setAllClubs] = useState([]);
  const [clubPlayerCounts, setClubPlayerCounts] = useState({});
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [dateFilter, setDateFilter] = useState('all'); // Default: Alle Logs anzeigen
  const [logsFilter, setLogsFilter] = useState('all');
  const [clubSearchTerm, setClubSearchTerm] = useState('');

  // Lade alle Admin-Daten
  useEffect(() => {
    loadAdminData();
  }, [dateFilter, logsFilter]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Lade Statistiken
      const { data: statsData } = await supabase
        .from('system_stats')
        .select('*')
        .gte('created_at', getDateFilter())
        .order('created_at', { ascending: false });

      // Lade Activity Logs mit Filter
      console.log('🔵 Loading activity logs with filter:', logsFilter, 'from:', getDateFilter());
      
      let logsQuery = supabase
        .from('activity_logs')
        .select('*')
        .gte('created_at', getDateFilter())
        .order('created_at', { ascending: false })
        .limit(100);

      // Filter nach Aktionstyp
      if (logsFilter !== 'all') {
        logsQuery = logsQuery.eq('action', logsFilter);
      }

      const { data: logsData, error: logsError } = await logsQuery;
      
      if (logsError) {
        console.error('❌ Error loading activity logs:', logsError);
      } else {
        console.log('✅ Activity logs loaded:', logsData?.length || 0, 'entries');
        console.log('📊 First 3 logs:', logsData?.slice(0, 3));
      }

      // Lade ausstehende Vereine
      const { data: clubsData } = await supabase
        .from('club_info')
        .select('*')
        .eq('is_verified', false)
        .order('created_at', { ascending: false });

      // Lade alle Vereine
      const { data: allClubsData } = await supabase
        .from('club_info')
        .select('*')
        .order('created_at', { ascending: false });

      // Lade Spieler-Anzahl pro Verein separat
      const { data: clubPlayerCounts } = await supabase
        .from('player_teams')
        .select(`
          player_id,
          team_info!inner(
            club_name
          )
        `);

      // Erstelle Map: club_name → Anzahl eindeutige Spieler
      const playerCountMap = {};
      clubPlayerCounts?.forEach(pt => {
        const clubName = pt.team_info?.club_name;
        if (clubName) {
          if (!playerCountMap[clubName]) {
            playerCountMap[clubName] = new Set();
          }
          playerCountMap[clubName].add(pt.player_id);
        }
      });

      // Konvertiere Sets zu Zahlen
      Object.keys(playerCountMap).forEach(clubName => {
        playerCountMap[clubName] = playerCountMap[clubName].size;
      });

      // Lade Matches für Match-Info in Logs
      const { data: matchesData } = await supabase
        .from('matches')
        .select('id, opponent, match_date, location, venue, season')
        .order('match_date', { ascending: false });

      // Lade Players für Namen und Verein-Zuordnung
      const { data: playersData } = await supabase
        .from('players')
        .select(`
          id,
          name,
          email,
          current_lk,
          player_teams!inner(
            team_id,
            team_info(club_name, team_name)
          )
        `);

      setStats(processStats(statsData));
      setActivityLogs(logsData || []);
      setPendingClubs(clubsData || []);
      setAllClubs(allClubsData || []);
      setClubPlayerCounts(playerCountMap);
      setMatches(matchesData || []);
      setPlayers(playersData || []);

    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateFilter = () => {
    const now = new Date();
    let filterDate;
    
    switch (dateFilter) {
      case 'today':
        filterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        filterDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'all':
        filterDate = new Date(0); // Unix epoch
        break;
      default:
        filterDate = new Date(0);
    }
    
    console.log('📅 Date filter:', dateFilter, '→', filterDate.toISOString());
    return filterDate.toISOString();
  };

  const processStats = (statsData) => {
    const processed = {
      totalUsers: 0,
      totalClubs: 0,
      pendingReviews: 0,
      onboardingCompleted: 0,
      totalTeams: 0,
      dailyActivity: 0
    };

    statsData?.forEach(stat => {
      switch (stat.stat_type) {
        case 'daily_active_users':
          processed.totalUsers = stat.stat_value;
          break;
        case 'total_clubs':
          processed.totalClubs = stat.stat_value;
          break;
        case 'pending_club_reviews':
          processed.pendingReviews = stat.stat_value;
          break;
        case 'onboarding_completed':
          processed.onboardingCompleted = stat.stat_value;
          break;
        case 'total_teams':
          processed.totalTeams = stat.stat_value;
          break;
        case 'daily_activity':
          processed.dailyActivity = stat.stat_value;
          break;
      }
    });

    return processed;
  };

  const handleClubAction = async (clubId, action) => {
    try {
      const { error } = await supabase
        .from('club_info')
        .update({
          is_verified: action === 'approve',
          admin_reviewed_at: new Date().toISOString(),
          admin_reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', clubId);

      if (error) throw error;

      // Log die Aktion
      await supabase.rpc('log_activity', {
        p_action: `club_${action}`,
        p_entity_type: 'club',
        p_entity_id: clubId,
        p_details: { action }
      });

      // Aktualisiere Daten
      loadAdminData();

    } catch (error) {
      console.error(`Error ${action}ing club:`, error);
      alert(`Fehler beim ${action === 'approve' ? 'Genehmigen' : 'Ablehnen'} des Vereins`);
    }
  };

  const getActionLabel = (action) => {
    const labelMap = {
      'club_selected': 'Verein ausgewählt',
      'team_created': 'Mannschaft erstellt',
      'profile_updated': 'Profil aktualisiert',
      'onboarding_completed': 'Onboarding abgeschlossen',
      'training_created': 'Training erstellt',
      'training_confirm': 'Training zugesagt',
      'training_decline': 'Training abgesagt',
      'matchday_confirm': 'Medenspiel Verfügbarkeit',
      'matchday_decline': 'Medenspiel Verfügbarkeit',
      'matchday_available': 'Medenspiel Verfügbarkeit',
      'matchday_unavailable': 'Medenspiel Verfügbarkeit',
      'profile_edited': 'Profil bearbeitet',
      'lk_changed': 'LK geändert',
      'match_result_entered': 'Match-Ergebnis eingegeben',
      'page_navigation': 'Seiten-Navigation',
      'error_occurred': 'Fehler aufgetreten',
      'club_approve': 'Verein genehmigt',
      'club_reject': 'Verein abgelehnt'
    };
    return labelMap[action] || action.replace(/_/g, ' ');
  };

  const getActionIcon = (action) => {
    const iconMap = {
      'club_selected': '🏢',
      'team_created': '🏆',
      'profile_updated': '👤',
      'onboarding_completed': '✅',
      'training_created': '🏃',
      'training_confirm': '✅',
      'training_decline': '❌',
      'matchday_confirm': '📅',
      'matchday_decline': '📅',
      'matchday_available': '📅',
      'matchday_unavailable': '📅',
      'profile_edited': '✏️',
      'lk_changed': '📈',
      'match_result_entered': '🏆',
      'page_navigation': '🧭',
      'error_occurred': '⚠️',
      'club_approve': '✅',
      'club_reject': '❌'
    };
    return iconMap[action] || '📝';
  };

  const getActionColor = (action) => {
    const colorMap = {
      'club_selected': '#3b82f6',
      'team_created': '#10b981',
      'profile_updated': '#8b5cf6',
      'onboarding_completed': '#10b981',
      'training_created': '#f59e0b',
      'training_confirm': '#10b981',
      'training_decline': '#ef4444',
      'matchday_confirm': '#10b981',
      'matchday_decline': '#ef4444',
      'profile_edited': '#8b5cf6',
      'lk_changed': '#06b6d4',
      'match_result_entered': '#f59e0b',
      'page_navigation': '#6b7280',
      'error_occurred': '#ef4444',
      'club_approve': '#10b981',
      'club_reject': '#ef4444'
    };
    return colorMap[action] || '#6b7280';
  };

  const exportLogs = () => {
    const csvContent = [
      ['Zeit', 'Benutzer', 'Aktion', 'Entität', 'Details'].join(','),
      ...activityLogs.map(log => [
        new Date(log.created_at).toLocaleString('de-DE'),
        log.user_email || 'Unbekannt',
        log.action,
        log.entity_type || '',
        JSON.stringify(log.details || {})
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="dashboard container" style={{ paddingTop: '2rem' }}>
        <div className="lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">⏳ Lade Admin-Daten...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard container" style={{ paddingTop: '2rem' }}>
      {/* Header */}
      <div className="lk-card-full">
        <div className="formkurve-header">
          <div className="formkurve-title">👑 Super-Admin Dashboard</div>
          <div className="formkurve-subtitle">
            System-Übersicht & Vereinsverwaltung
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="lk-card-full">
        <div className="season-content">
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
          }}>
            {[
              { id: 'overview', label: '📊 Übersicht', icon: TrendingUp },
              { id: 'clubs', label: '🏢 Vereine', icon: Building2 },
              { id: 'logs', label: '📝 Aktivitäten', icon: Activity },
              { id: 'users', label: '👥 Benutzer', icon: Users }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`btn-modern ${selectedTab === tab.id ? 'btn-modern-active' : 'btn-modern-inactive'}`}
                style={{ minWidth: '120px' }}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filter Controls */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              >
                <option value="today">Heute</option>
                <option value="week">Letzte Woche</option>
                <option value="month">Letzter Monat</option>
                <option value="all">Alle</option>
              </select>
            </div>

            {selectedTab === 'logs' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select
                  value={logsFilter}
                  onChange={(e) => setLogsFilter(e.target.value)}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="all">Alle Aktionen</option>
                  <option value="club_selected">Vereinsauswahl</option>
                  <option value="team_created">Team erstellt</option>
                  <option value="profile_updated">Profil aktualisiert</option>
                  <option value="onboarding_completed">Onboarding abgeschlossen</option>
                  <option value="training_created">Training erstellt</option>
                  <option value="training_confirm">Training zugesagt</option>
                  <option value="training_decline">Training abgesagt</option>
                  <option value="matchday_confirm">Matchday zugesagt</option>
                  <option value="matchday_decline">Matchday abgesagt</option>
                  <option value="profile_edited">Profil bearbeitet</option>
                  <option value="lk_changed">LK geändert</option>
                  <option value="match_result_entered">Match-Ergebnis eingegeben</option>
                  <option value="page_navigation">Seiten-Navigation</option>
                  <option value="error_occurred">Fehler aufgetreten</option>
                </select>
              </div>
            )}

            <button
              onClick={loadAdminData}
              className="btn-modern btn-modern-inactive"
              style={{ padding: '0.5rem' }}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">📊 System-Übersicht</div>
          </div>
          <div className="season-content">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem' 
            }}>
              <div className="personality-card">
                <div className="personality-icon">👥</div>
                <div className="personality-content">
                  <h4>Aktive Benutzer</h4>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
                    {stats.totalUsers}
                  </p>
                </div>
              </div>

              <div className="personality-card">
                <div className="personality-icon">🏢</div>
                <div className="personality-content">
                  <h4>Vereine</h4>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
                    {stats.totalClubs}
                  </p>
                </div>
              </div>

              <div className="personality-card">
                <div className="personality-icon">⏳</div>
                <div className="personality-content">
                  <h4>Ausstehende Prüfungen</h4>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: '#f59e0b' }}>
                    {stats.pendingReviews}
                  </p>
                </div>
              </div>

              <div className="personality-card">
                <div className="personality-icon">✅</div>
                <div className="personality-content">
                  <h4>Onboarding abgeschlossen</h4>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
                    {stats.onboardingCompleted}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'clubs' && (
        <div>
          {/* Ausstehende Vereine */}
          {pendingClubs.length > 0 && (
            <div className="lk-card-full" style={{ marginBottom: '1.5rem' }}>
              <div className="formkurve-header">
                <div className="formkurve-title">⏳ Ausstehende Prüfungen</div>
                <div className="formkurve-subtitle">
                  {pendingClubs.length} Vereine warten auf Prüfung
                </div>
              </div>
              <div className="season-content">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {pendingClubs.map(club => (
                    <div key={club.id} style={{
                      padding: '1rem',
                      background: '#fef3c7',
                      border: '2px solid #f59e0b',
                      borderRadius: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '700' }}>
                          {club.name}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                          {club.city} • Erstellt: {new Date(club.created_at).toLocaleDateString('de-DE')}
                        </p>
                        {club.admin_notes && (
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#92400e' }}>
                            📝 {club.admin_notes}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleClubAction(club.id, 'approve')}
                          className="btn-modern btn-modern-active"
                          style={{ background: '#10b981' }}
                        >
                          <CheckCircle size={16} />
                          Genehmigen
                        </button>
                        <button
                          onClick={() => handleClubAction(club.id, 'reject')}
                          className="btn-modern btn-modern-inactive"
                          style={{ background: '#ef4444', color: 'white' }}
                        >
                          <XCircle size={16} />
                          Ablehnen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Alle Vereine - Tabellen-Ansicht */}
          <div className="lk-card-full">
            <div className="formkurve-header">
              <div className="formkurve-title">🏢 Alle Vereine</div>
              <div className="formkurve-subtitle">
                {allClubs.length} Vereine gesamt • {allClubs.filter(c => c.is_verified).length} verifiziert
              </div>
            </div>
            <div className="season-content">
              {/* Suchfeld */}
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="🔍 Verein suchen..."
                  value={clubSearchTerm}
                  onChange={(e) => setClubSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {allClubs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  <Building2 size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p>Keine Vereine gefunden</p>
                </div>
              ) : (() => {
                // Filter und Sortierung
                const filteredClubs = allClubs
                  .filter(club => {
                    if (!clubSearchTerm) return true;
                    const searchLower = clubSearchTerm.toLowerCase();
                    return (
                      club.name?.toLowerCase().includes(searchLower) ||
                      club.city?.toLowerCase().includes(searchLower) ||
                      club.federation?.toLowerCase().includes(searchLower)
                    );
                  })
                  .sort((a, b) => {
                    // Sortiere nach Spieler-Anzahl (absteigend)
                    const countA = clubPlayerCounts[a.name] || 0;
                    const countB = clubPlayerCounts[b.name] || 0;
                    return countB - countA;
                  });

                if (filteredClubs.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      <Building2 size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                      <p>Keine Vereine gefunden für "{clubSearchTerm}"</p>
                    </div>
                  );
                }

                return (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '0.875rem'
                  }}>
                    <thead>
                      <tr style={{ 
                        borderBottom: '2px solid #e2e8f0',
                        background: '#f8fafc'
                      }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Verein</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Stadt</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Verband</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Spieler</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Homepage</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Erstellt</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClubs.map((club, index) => {
                        // Hole Spieler-Anzahl aus der Map
                        const playerCount = clubPlayerCounts[club.name] || 0;

                        return (
                          <tr key={club.id} style={{ 
                            borderBottom: '1px solid #e2e8f0',
                            background: index % 2 === 0 ? 'white' : '#f9fafb'
                          }}>
                            <td style={{ padding: '0.75rem' }}>
                              <div style={{ 
                                padding: '0.25rem 0.5rem', 
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                background: club.is_verified ? '#dcfce7' : '#fef3c7',
                                color: club.is_verified ? '#15803d' : '#92400e',
                                display: 'inline-block',
                                whiteSpace: 'nowrap'
                              }}>
                                {club.is_verified ? '✅ Verifiziert' : '⏳ Prüfung'}
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <strong>{club.name}</strong>
                            </td>
                            <td style={{ padding: '0.75rem', color: '#6b7280' }}>
                              {club.city || '-'}
                            </td>
                            <td style={{ padding: '0.75rem', color: '#6b7280' }}>
                              {club.federation || 'TVM'}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <div style={{ 
                                padding: '0.25rem 0.5rem',
                                borderRadius: '6px',
                                background: playerCount > 0 ? '#e0e7ff' : '#f1f5f9',
                                color: playerCount > 0 ? '#4338ca' : '#6b7280',
                                fontWeight: '600',
                                fontSize: '0.75rem',
                                display: 'inline-block'
                              }}>
                                {playerCount} {playerCount === 1 ? 'Spieler' : 'Spieler'}
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              {club.website ? (
                                <a 
                                  href={club.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ 
                                    color: '#3b82f6',
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: '0.8rem'
                                  }}
                                >
                                  🔗 Website
                                  <Eye size={12} />
                                </a>
                              ) : (
                                <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.8rem' }}>
                              {new Date(club.created_at).toLocaleDateString('de-DE')}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              {!club.is_verified && (
                                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => handleClubAction(club.id, 'approve')}
                                    title="Genehmigen"
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      background: '#10b981',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '0.75rem',
                                      fontWeight: '600'
                                    }}
                                  >
                                    <CheckCircle size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleClubAction(club.id, 'reject')}
                                    title="Ablehnen"
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      background: '#ef4444',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '0.75rem',
                                      fontWeight: '600'
                                    }}
                                  >
                                    <XCircle size={12} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'logs' && (
        <div className="lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">📝 Aktivitäts-Log</div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={exportLogs}
                className="btn-modern btn-modern-inactive"
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>
          </div>
          <div className="season-content">
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {activityLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  <Activity size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p>Keine Aktivitäten gefunden</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activityLogs.map(log => (
                    <div key={log.id} style={{
                      padding: '0.75rem',
                      background: '#f8fafc',
                      border: `1px solid ${getActionColor(log.action)}20`,
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      borderLeft: `4px solid ${getActionColor(log.action)}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1rem' }}>{getActionIcon(log.action)}</span>
                          <strong style={{ color: getActionColor(log.action) }}>
                            {getActionLabel(log.action)}
                          </strong>
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          {new Date(log.created_at).toLocaleString('de-DE')}
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: '0.5rem', 
                        marginTop: '0.5rem', 
                        fontSize: '0.8rem',
                        color: '#6b7280' 
                      }}>
                        {/* Erste Zeile: Spieler-Name, Verein, Response */}
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          {(() => {
                            // Finde Spieler anhand von player_id oder email
                            const player = players.find(p => 
                              p.id === log.details?.player_id || 
                              p.email === log.user_email
                            );
                            
                            if (player) {
                              const teamInfo = player.player_teams?.[0]?.team_info;
                              return (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    👤 <strong>{player.name}</strong>
                                    {player.current_lk && (
                                      <span style={{ 
                                        fontSize: '0.7rem',
                                        padding: '0.125rem 0.375rem',
                                        background: '#e0e7ff',
                                        color: '#4338ca',
                                        borderRadius: '4px',
                                        fontWeight: '600'
                                      }}>
                                        {player.current_lk}
                                      </span>
                                    )}
                                  </div>
                                  {teamInfo && (
                                    <div style={{ 
                                      fontSize: '0.75rem',
                                      color: '#6b7280',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.25rem'
                                    }}>
                                      🏢 {teamInfo.club_name}
                                      {teamInfo.team_name && (
                                        <span style={{ color: '#9ca3af' }}>
                                          • {teamInfo.team_name}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </>
                              );
                            }
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                👤 <strong>{log.user_email || 'Unbekannt'}</strong>
                              </div>
                            );
                          })()}
                          {log.details?.response && (
                            <div style={{ 
                              padding: '0.125rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              background: log.details.response === 'available' ? '#dcfce7' : '#fee2e2',
                              color: log.details.response === 'available' ? '#15803d' : '#991b1b'
                            }}>
                              {log.details.response === 'available' ? '✅ Verfügbar' : '❌ Nicht verfügbar'}
                            </div>
                          )}
                        </div>
                        {/* Zweite Zeile: Match Info (falls matchday action) */}
                        {(log.action.includes('matchday') && log.entity_id) && (() => {
                          const match = matches.find(m => m.id === log.entity_id);
                          if (match) {
                            const matchDate = new Date(match.match_date).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            });
                            return (
                              <div style={{ 
                                padding: '0.5rem',
                                background: '#f0f9ff',
                                borderRadius: '6px',
                                borderLeft: '3px solid #3b82f6',
                                fontSize: '0.75rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '0.5rem'
                              }}>
                                <div>
                                  <strong>🎾 {match.opponent}</strong>
                                  <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>
                                    • {matchDate}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                                  {match.location === 'Home' ? '🏠 Heimspiel' : '✈️ Auswärtsspiel'}
                                  {match.venue && ` • ${match.venue}`}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <details style={{ marginTop: '0.5rem' }}>
                          <summary style={{ 
                            cursor: 'pointer', 
                            fontSize: '0.75rem', 
                            color: '#6b7280',
                            userSelect: 'none'
                          }}>
                            Details anzeigen
                          </summary>
                          <div style={{ 
                            marginTop: '0.5rem', 
                            padding: '0.5rem', 
                            background: '#f1f5f9', 
                            borderRadius: '4px',
                            fontSize: '0.75rem'
                          }}>
                            {/* Relevante Details extrahieren */}
                            {log.details.player_id && (
                              <div style={{ marginBottom: '0.25rem' }}>
                                <strong>Spieler-ID:</strong> {log.details.player_id.substring(0, 8)}...
                              </div>
                            )}
                            {log.details.url && (
                              <div style={{ marginBottom: '0.25rem' }}>
                                <strong>URL:</strong> {log.details.url}
                              </div>
                            )}
                            {log.details.userAgent && (
                              <div style={{ marginBottom: '0.25rem' }}>
                                <strong>Gerät:</strong> {
                                  log.details.userAgent.includes('iPhone') ? '📱 iPhone' :
                                  log.details.userAgent.includes('Android') ? '📱 Android' :
                                  log.details.userAgent.includes('Mac') ? '💻 Mac' :
                                  log.details.userAgent.includes('Windows') ? '💻 Windows' :
                                  '🖥️ Desktop'
                                }
                              </div>
                            )}
                            {log.details.timestamp && (
                              <div style={{ marginBottom: '0.25rem' }}>
                                <strong>Timestamp:</strong> {new Date(log.details.timestamp).toLocaleString('de-DE')}
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'users' && (
        <div className="lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">👥 Benutzer-Verwaltung</div>
            <div className="formkurve-subtitle">
              {players.length} Spieler registriert
            </div>
          </div>
          <div className="season-content">
            {players.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>Keine Spieler gefunden</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontSize: '0.875rem'
                }}>
                  <thead>
                    <tr style={{ 
                      borderBottom: '2px solid #e2e8f0',
                      background: '#f8fafc'
                    }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Spieler</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Email</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>LK</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Verein(e)</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Rolle</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Telefon</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Registriert</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players
                      .sort((a, b) => {
                        // Sortiere nach: 1. Super-Admin, 2. Mannschaftsführer, 3. Name
                        if (a.is_super_admin && !b.is_super_admin) return -1;
                        if (!a.is_super_admin && b.is_super_admin) return 1;
                        
                        const aIsCaptain = a.player_teams?.some(pt => pt.role === 'captain');
                        const bIsCaptain = b.player_teams?.some(pt => pt.role === 'captain');
                        if (aIsCaptain && !bIsCaptain) return -1;
                        if (!aIsCaptain && bIsCaptain) return 1;
                        
                        return (a.name || '').localeCompare(b.name || '');
                      })
                      .map((player, index) => {
                        const teams = player.player_teams || [];
                        const isCaptain = teams.some(pt => pt.role === 'captain');
                        
                        return (
                          <tr key={player.id} style={{ 
                            borderBottom: '1px solid #e2e8f0',
                            background: index % 2 === 0 ? 'white' : '#f9fafb'
                          }}>
                            {/* Spieler Name */}
                            <td style={{ padding: '0.75rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <strong>{player.name || 'Unbekannt'}</strong>
                                {player.is_super_admin && (
                                  <span style={{ 
                                    fontSize: '0.7rem',
                                    padding: '0.125rem 0.375rem',
                                    background: '#fef3c7',
                                    color: '#92400e',
                                    borderRadius: '4px',
                                    fontWeight: '600'
                                  }}>
                                    👑 Admin
                                  </span>
                                )}
                              </div>
                            </td>
                            
                            {/* Email */}
                            <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.8rem' }}>
                              {player.email || '-'}
                            </td>
                            
                            {/* LK */}
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              {player.current_lk ? (
                                <div style={{ 
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '6px',
                                  background: '#e0e7ff',
                                  color: '#4338ca',
                                  fontWeight: '600',
                                  fontSize: '0.75rem',
                                  display: 'inline-block'
                                }}>
                                  {player.current_lk}
                                </div>
                              ) : (
                                <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>-</span>
                              )}
                            </td>
                            
                            {/* Verein(e) */}
                            <td style={{ padding: '0.75rem' }}>
                              {teams.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  {teams.map((pt, idx) => (
                                    <div key={idx} style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                      🏢 {pt.team_info?.club_name || 'Unbekannt'}
                                      {pt.team_info?.team_name && (
                                        <span style={{ color: '#9ca3af' }}>
                                          {' • '}{pt.team_info.team_name}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Kein Verein</span>
                              )}
                            </td>
                            
                            {/* Rolle */}
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              {isCaptain ? (
                                <div style={{ 
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '6px',
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  fontWeight: '600',
                                  fontSize: '0.7rem',
                                  display: 'inline-block'
                                }}>
                                  🎯 MF
                                </div>
                              ) : (
                                <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>Spieler</span>
                              )}
                            </td>
                            
                            {/* Telefon */}
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              {player.phone ? (
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  {player.whatsapp_enabled && '📱 '}
                                  {player.phone}
                                </div>
                              ) : (
                                <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>-</span>
                              )}
                            </td>
                            
                            {/* Registriert */}
                            <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.8rem' }}>
                              {new Date(player.created_at).toLocaleDateString('de-DE')}
                            </td>
                            
                            {/* Status */}
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <div style={{ 
                                padding: '0.25rem 0.5rem',
                                borderRadius: '6px',
                                background: teams.length > 0 ? '#dcfce7' : '#fee2e2',
                                color: teams.length > 0 ? '#15803d' : '#991b1b',
                                fontWeight: '600',
                                fontSize: '0.7rem',
                                display: 'inline-block'
                              }}>
                                {teams.length > 0 ? '✅ Aktiv' : '⚠️ Kein Team'}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminDashboard;

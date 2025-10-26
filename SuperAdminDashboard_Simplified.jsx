// SuperAdminDashboard_Simplified.jsx
// Vereinfachte Version - nutzt nur players_unified

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Users, 
  Building2, 
  Activity, 
  Calendar,
  Trophy,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  RefreshCw
} from 'lucide-react';
import ImportTab from './ImportTab';
import './Dashboard.css';

function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [players, setPlayers] = useState([]);
  const [logsFilter, setLogsFilter] = useState('all');
  const [logs, setLogs] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [allClubs, setAllClubs] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔵 Loading simplified dashboard data...');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 🔧 NEU: Alle Statistiken aus players_unified
      const [
        { count: activeUsersCount },
        { count: totalClubsCount },
        { count: pendingReviewsCount },
        { count: onboardingCompletedCount },
        { count: totalTeamsCount },
        { count: totalMatchesCount },
        { count: totalTrainingsCount },
        { count: dailyActivityCount },
        { count: pendingPlayersCount }
      ] = await Promise.all([
        // 1. Aktive Benutzer (players_unified mit user_id)
        supabase
          .from('players_unified')
          .select('id', { count: 'exact', head: true })
          .not('user_id', 'is', null)
          .eq('status', 'active'),

        // 2. Gesamte Vereine
        supabase
          .from('club_info')
          .select('id', { count: 'exact', head: true }),

        // 3. Ausstehende Vereins-Reviews
        supabase
          .from('club_info')
          .select('id', { count: 'exact', head: true })
          .eq('is_verified', false),

        // 4. Onboarding abgeschlossen
        supabase
          .from('players_unified')
          .select('id', { count: 'exact', head: true })
          .eq('onboarding_status', 'completed'),

        // 5. Gesamte Teams
        supabase
          .from('team_info')
          .select('id', { count: 'exact', head: true }),

        // 6. Gesamte Matches
        supabase
          .from('matches')
          .select('id', { count: 'exact', head: true }),

        // 7. Gesamte Trainings
        supabase
          .from('training_sessions')
          .select('id', { count: 'exact', head: true }),

        // 8. Heutige Aktivitäten
        supabase
          .from('activity_logs')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', today.toISOString()),

        // 9. 🔧 NEU: Wartende Spieler (players_unified)
        supabase
          .from('players_unified')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .eq('onboarding_status', 'not_started')
      ]);

      console.log('✅ Simplified statistics loaded:', {
        users: activeUsersCount,
        clubs: totalClubsCount,
        pending: pendingReviewsCount,
        onboarded: onboardingCompletedCount,
        teams: totalTeamsCount,
        matches: totalMatchesCount,
        trainings: totalTrainingsCount,
        dailyActivity: dailyActivityCount,
        pendingPlayers: pendingPlayersCount
      });

      // Setze Stats
      setStats({
        totalUsers: activeUsersCount || 0,
        totalClubs: totalClubsCount || 0,
        pendingReviews: pendingReviewsCount || 0,
        onboardingCompleted: onboardingCompletedCount || 0,
        totalTeams: totalTeamsCount || 0,
        totalMatches: totalMatchesCount || 0,
        totalTrainings: totalTrainingsCount || 0,
        dailyActivity: dailyActivityCount || 0,
        pendingPlayers: pendingPlayersCount || 0
      });

      // Lade Activity Logs
      console.log('🔵 Loading activity logs...');
      
      let logsQuery = supabase
        .from('activity_logs')
        .select('*')
        .gte('created_at', getDateFilter())
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsFilter !== 'all') {
        logsQuery = logsQuery.eq('action', logsFilter);
      }

      const { data: logsData, error: logsError } = await logsQuery;
      
      if (logsError) {
        console.error('❌ Error loading activity logs:', logsError);
      } else {
        console.log('✅ Activity logs loaded:', logsData?.length || 0, 'entries');
        setLogs(logsData || []);
      }

      // Lade Vereine
      const { data: clubsData } = await supabase
        .from('club_info')
        .select('*')
        .eq('is_verified', false)
        .order('created_at', { ascending: false });

      const { data: allClubsData } = await supabase
        .from('club_info')
        .select('*')
        .order('created_at', { ascending: false });

      setClubs(clubsData || []);
      setAllClubs(allClubsData || []);

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateFilter = () => {
    const now = new Date();
    const filterMap = {
      'today': new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      'week': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      'month': new Date(now.getFullYear(), now.getMonth(), 1),
      'all': new Date(0)
    };
    return filterMap[logsFilter] || filterMap['week'];
  };

  // 🔧 NEU: Vereinfachte Spieler-Ladung
  const loadPlayers = async () => {
    try {
      console.log('🔵 Loading players from players_unified...');
      
      // Lade alle Spieler aus players_unified
      const { data: playersData, error: playersError } = await supabase
        .from('players_unified')
        .select(`
          *,
          team_info (
            club_name,
            team_name,
            category
          )
        `)
        .order('created_at', { ascending: false });

      if (playersError) {
        console.error('❌ Error loading players:', playersError);
        return;
      }

      console.log('✅ Players loaded:', playersData?.length || 0);

      // 🔧 NEU: Lade team_memberships für alle Spieler
      const { data: teamMembershipsData, error: teamsError } = await supabase
        .from('team_memberships')
        .select(`
          player_id,
          team_id,
          is_active,
          is_primary,
          role,
          team_info (
            club_name,
            team_name,
            category
          )
        `);

      if (teamsError) {
        console.error('❌ Error loading team memberships:', teamsError);
      } else {
        console.log('✅ Team memberships loaded:', teamMembershipsData?.length || 0);
      }

      // Formatiere Spieler mit Team-Informationen
      const playersWithTeams = (playersData || []).map(player => {
        const memberships = (teamMembershipsData || [])
          .filter(tm => tm.player_id === player.id)
          .map(tm => ({
            team_id: tm.team_id,
            is_active: tm.is_active,
            is_primary: tm.is_primary,
            role: tm.role,
            team_info: tm.team_info
          }));

        // Bestimme Status-Badge
        let statusBadge = '';
        if (player.status === 'active' && player.onboarding_status === 'completed') {
          statusBadge = '✅ Aktiv';
        } else if (player.status === 'pending' && player.onboarding_status === 'not_started') {
          statusBadge = '⏳ Wartet auf Onboarding';
        } else if (player.status === 'inactive') {
          statusBadge = '❌ Inaktiv';
        } else {
          statusBadge = '🔄 In Bearbeitung';
        }

        return {
          ...player,
          team_memberships: memberships,
          status_badge: statusBadge,
          has_user_id: !!player.user_id,
          is_onboarded: player.onboarding_status === 'completed'
        };
      });

      console.log('✅ All players formatted:', playersWithTeams.length);
      setPlayers(playersWithTeams);

    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  // Lade Spieler wenn Users-Tab aktiv ist
  useEffect(() => {
    if (selectedTab === 'users') {
      loadPlayers();
    }
  }, [selectedTab]);

  const tabs = [
    { id: 'overview', label: '📊 Übersicht', icon: TrendingUp },
    { id: 'clubs', label: '🏢 Vereine', icon: Building2 },
    { id: 'trainings', label: '🏃 Trainings', icon: Activity },
    { id: 'logs', label: '📝 Aktivitäten', icon: Activity },
    { id: 'users', label: '👥 Benutzer', icon: Users },
    { id: 'import', label: '📥 Import', icon: Download }
  ];

  if (loading) {
    return (
      <div className="dashboard container" style={{ paddingTop: '2rem' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <RefreshCw className="animate-spin" size={32} />
          <p style={{ marginTop: '1rem' }}>Lade Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard container" style={{ paddingTop: '2rem' }}>
      {/* Header */}
      <div className="fade-in" style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: '800', 
          margin: 0,
          background: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          🛡️ Super Admin Dashboard (Vereinfacht)
        </h1>
        <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
          Verwaltung mit vereinfachter players_unified Architektur
        </p>
      </div>

      {/* Navigation */}
      <div className="fade-in" style={{ marginBottom: '2rem' }}>
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          flexWrap: 'wrap',
          background: '#f8fafc',
          padding: '0.5rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: selectedTab === tab.id ? 
                  'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)' : 
                  'transparent',
                color: selectedTab === tab.id ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="fade-in">
          <div className="lk-card-full">
            <div className="formkurve-header">
              <div className="formkurve-title">📊 System-Übersicht</div>
              <div className="formkurve-subtitle">
                Vereinfachte Architektur mit players_unified
              </div>
            </div>

            <div className="season-content">
              {/* Statistiken Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                <div className="stat-card" style={{ 
                  background: '#dcfce7', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  border: '1px solid #22c55e' 
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e' }}>
                    {stats.totalUsers || 0}
                  </div>
                  <div style={{ color: '#15803d' }}>Aktive Benutzer</div>
                  {stats.pendingPlayers > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                      ⏳ {stats.pendingPlayers} warten auf Onboarding
                    </div>
                  )}
                </div>

                <div className="stat-card" style={{ 
                  background: '#dbeafe', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  border: '1px solid #3b82f6' 
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                    {stats.totalClubs || 0}
                  </div>
                  <div style={{ color: '#1d4ed8' }}>Vereine</div>
                  {stats.pendingReviews > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                      ⚠️ {stats.pendingReviews} ausstehende Reviews
                    </div>
                  )}
                </div>

                <div className="stat-card" style={{ 
                  background: '#fef3c7', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  border: '1px solid #f59e0b' 
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
                    {stats.totalTeams || 0}
                  </div>
                  <div style={{ color: '#d97706' }}>Teams</div>
                </div>

                <div className="stat-card" style={{ 
                  background: '#f3e8ff', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  border: '1px solid #a855f7' 
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#a855f7' }}>
                    {stats.totalMatches || 0}
                  </div>
                  <div style={{ color: '#7c3aed' }}>Matches</div>
                </div>
              </div>

              {/* Vereinfachte Architektur Info */}
              <div style={{ 
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '2px solid #0ea5e9',
                marginTop: '2rem'
              }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#0c4a6e' }}>
                  🎯 Vereinfachte Architektur
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#0c4a6e' }}>✅ Was wurde vereinfacht:</h4>
                    <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#075985' }}>
                      <li>Einheitliche <code>players_unified</code> Tabelle</li>
                      <li>Keine <code>imported_players</code> mehr</li>
                      <li>Keine <code>opponent_players</code> mehr</li>
                      <li>Einheitliche <code>team_memberships</code></li>
                    </ul>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#0c4a6e' }}>🚀 Vorteile:</h4>
                    <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#075985' }}>
                      <li>Einfacher Code</li>
                      <li>Bessere Performance</li>
                      <li>Weniger Bugs</li>
                      <li>Konsistente Datenstruktur</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {selectedTab === 'users' && (
        <div className="fade-in">
          <div className="lk-card-full">
            <div className="formkurve-header">
              <div className="formkurve-title">👥 Benutzer-Verwaltung (Vereinfacht)</div>
              <div className="formkurve-subtitle">
                {players.filter(p => p.status === 'active' && p.is_onboarded).length} Aktiv · 
                {players.filter(p => p.status === 'pending').length} Wartet auf Onboarding · 
                {players.length} Gesamt
              </div>
            </div>

            <div className="season-content">
              {/* Spieler-Tabelle */}
              <div style={{ 
                background: 'white', 
                borderRadius: '8px', 
                overflow: 'hidden', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
              }}>
                <div style={{ 
                  background: '#f8fafc', 
                  padding: '1rem', 
                  borderBottom: '1px solid #e2e8f0',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Alle Spieler aus players_unified
                </div>

                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#6b7280' }}>Name</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#6b7280' }}>Email</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#6b7280' }}>LK</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#6b7280' }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#6b7280' }}>Teams</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#6b7280' }}>Erstellt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((player, index) => {
                        const teams = player.team_memberships || [];
                        return (
                          <tr key={player.id} style={{ 
                            borderBottom: '1px solid #f3f4f6',
                            background: index % 2 === 0 ? 'white' : '#fafafa'
                          }}>
                            {/* Name */}
                            <td style={{ padding: '0.75rem' }}>
                              <div style={{ fontWeight: '600', color: '#111827' }}>
                                {player.name || 'Unbekannt'}
                                {player.is_captain && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>👑</span>}
                              </div>
                              {player.import_source && (
                                <div style={{ 
                                  fontSize: '0.7rem',
                                  padding: '0.125rem 0.375rem',
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  borderRadius: '4px',
                                  display: 'inline-block',
                                  marginTop: '0.25rem'
                                }}>
                                  {player.import_source === 'ai_import' ? '🤖 KI-Import' : '📥 Import'}
                                </div>
                              )}
                            </td>
                            
                            {/* Email */}
                            <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.8rem' }}>
                              {player.email || (player.status === 'pending' ? 
                                <span style={{ fontStyle: 'italic', color: '#9ca3af' }}>Wartet auf Onboarding</span> : 
                                '-'
                              )}
                            </td>
                            
                            {/* LK */}
                            <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.8rem' }}>
                              {player.current_lk || '-'}
                            </td>
                            
                            {/* Status */}
                            <td style={{ padding: '0.75rem' }}>
                              <div style={{ 
                                padding: '0.25rem 0.5rem',
                                borderRadius: '6px',
                                background: player.status === 'active' && player.is_onboarded
                                  ? '#dcfce7'  // Grün für Aktiv
                                  : player.status === 'pending'
                                    ? '#fef3c7'  // Gelb für Wartend
                                    : '#fee2e2', // Rot für Inaktiv
                                color: player.status === 'active' && player.is_onboarded
                                  ? '#15803d'
                                  : player.status === 'pending'
                                    ? '#92400e'
                                    : '#dc2626',
                                fontWeight: '600',
                                fontSize: '0.7rem',
                                display: 'inline-block'
                              }}>
                                {player.status_badge}
                              </div>
                            </td>
                            
                            {/* Teams */}
                            <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.8rem' }}>
                              {teams.length > 0 ? (
                                <div>
                                  {teams.map((team, i) => (
                                    <div key={i} style={{ marginBottom: '0.25rem' }}>
                                      {team.team_info?.club_name} {team.team_info?.team_name || team.team_info?.category}
                                      {team.is_primary && <span style={{ marginLeft: '0.25rem', fontSize: '0.7rem' }}>⭐</span>}
                                      {!team.is_active && <span style={{ marginLeft: '0.25rem', fontSize: '0.7rem', color: '#f59e0b' }}>⏸️</span>}
                                    </div>
                                  ))}
                                </div>
                              ) : '-'}
                            </td>
                            
                            {/* Erstellt */}
                            <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.8rem' }}>
                              {player.created_at ? new Date(player.created_at).toLocaleDateString('de-DE') : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Tab */}
      {selectedTab === 'import' && (
        <ImportTab />
      )}

      {/* Weitere Tabs... */}
      {/* (Clubs, Trainings, Logs bleiben größtenteils gleich) */}
    </div>
  );
}

export default SuperAdminDashboard;

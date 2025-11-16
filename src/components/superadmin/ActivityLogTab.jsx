import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './ActivityLogTab.css';

export default function ActivityLogTab() {
  const [logs, setLogs] = useState([]);
  const [onboardingStats, setOnboardingStats] = useState({ started: 0, completed: 0, aborted: 0, completionRate: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  // Lookup-Maps für benutzerfreundliche Labels
  const [playerMap, setPlayerMap] = useState(new Map());
  const [teamMap, setTeamMap] = useState(new Map());
  const [clubMap, setClubMap] = useState(new Map());
  const [matchdayMap, setMatchdayMap] = useState(new Map());
  const [filters, setFilters] = useState({
    range: 'all', // all | 24h | 7d | 30d
    action: 'all',
    entity: 'all',
    search: '',
    device: 'all',
    appVersion: 'all'
  });
  const [availableDevices, setAvailableDevices] = useState(['all']);
  const [availableVersions, setAvailableVersions] = useState(['all']);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let query = supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(500);

      // Zeitraum
      const now = new Date();
      if (filters.range === '24h') {
        const d = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', d);
      } else if (filters.range === '7d') {
        const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', d);
      } else if (filters.range === '30d') {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', d);
      }

      if (filters.action !== 'all') {
        query = query.eq('action', filters.action);
      }
      if (filters.entity !== 'all') {
        query = query.eq('entity_type', filters.entity);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      // einfache Textsuche clientseitig
      const term = filters.search.trim().toLowerCase();
      let filtered = rows;
      if (term) {
        filtered = filtered.filter((r) => {
          const hay =
            `${r.action || ''} ${r.entity_type || ''} ${JSON.stringify(r.details || {})}`.toLowerCase();
          return hay.includes(term);
        });
      }
      if (filters.device !== 'all') {
        filtered = filtered.filter((r) => (r.details?.device || '').toLowerCase() === filters.device.toLowerCase());
      }
      if (filters.appVersion !== 'all') {
        filtered = filtered.filter((r) => (r.details?.app_version || '').toLowerCase() === filters.appVersion.toLowerCase());
      }

      setLogs(filtered);
      // verfügbare Devices/Versionen ableiten
      const devices = new Set(['all']);
      const versions = new Set(['all']);
      rows.forEach((r) => {
        if (r.details?.device) devices.add(r.details.device);
        if (r.details?.app_version) versions.add(r.details.app_version);
      });
      setAvailableDevices(Array.from(devices));
      setAvailableVersions(Array.from(versions));
    } catch (e) {
      setError(e.message || 'Fehler beim Laden der Aktivitäten');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Onboarding Funnel (30 Tage, filterabhängig)
  useEffect(() => {
    (async () => {
      try {
        let base = supabase.from('activity_logs').select('action,created_at').limit(5000);
        // Zeitraum analog Filter
        const now = new Date();
        if (filters.range === '24h') {
          const d = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          base = base.gte('created_at', d);
        } else if (filters.range === '7d') {
          const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          base = base.gte('created_at', d);
        } else if (filters.range === '30d') {
          const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          base = base.gte('created_at', d);
        }
        const { data, error } = await base.in('action', ['onboarding_started', 'onboarding_completed', 'onboarding_aborted']);
        if (error) throw error;
        const rows = Array.isArray(data) ? data : [];
        const started = rows.filter(r => r.action === 'onboarding_started').length;
        const completed = rows.filter(r => r.action === 'onboarding_completed').length;
        const aborted = rows.filter(r => r.action === 'onboarding_aborted').length;
        const completionRate = started > 0 ? Math.round((completed / started) * 100) : 0;
        setOnboardingStats({ started, completed, aborted, completionRate });
      } catch {
        // optional
      }
    })();
  }, [filters]);

  // Lade lesbare Labels für Entities
  useEffect(() => {
    (async () => {
      try {
        const playerIds = new Set();
        const teamIds = new Set();
        const clubIds = new Set();
        const matchIds = new Set();
        logs.forEach((l) => {
          if (l.entity_type === 'player' && l.entity_id) playerIds.add(l.entity_id);
          if (l.entity_type === 'team' && l.entity_id) teamIds.add(l.entity_id);
          if (l.entity_type === 'club' && l.entity_id) clubIds.add(l.entity_id);
          if (l.entity_type === 'matchday' && l.entity_id) matchIds.add(l.entity_id);
          // häufig enthalten: details.player_id
          if (l.details?.player_id) playerIds.add(l.details.player_id);
        });
        if (playerIds.size > 0) {
          const { data } = await supabase.from('players_unified').select('id,name').in('id', Array.from(playerIds)).limit(1000);
          const map = new Map(playerMap);
          (data || []).forEach((p) => map.set(p.id, p.name));
          setPlayerMap(map);
        }
        if (teamIds.size > 0) {
          const { data } = await supabase.from('team_info').select('id,club_name,team_name,category').in('id', Array.from(teamIds)).limit(1000);
          const map = new Map(teamMap);
          (data || []).forEach((t) => map.set(t.id, `${t.club_name}${t.team_name ? ` ${t.team_name}` : ''} (${t.category || '—'})`));
          setTeamMap(map);
        }
        if (clubIds.size > 0) {
          const { data } = await supabase.from('club_info').select('id,name').in('id', Array.from(clubIds)).limit(1000);
          const map = new Map(clubMap);
          (data || []).forEach((c) => map.set(c.id, c.name));
          setClubMap(map);
        }
        if (matchIds.size > 0) {
          const { data } = await supabase
            .from('matchdays')
            .select('id, match_number, match_date, home_team:home_team_id (club_name,team_name), away_team:away_team_id (club_name,team_name)')
            .in('id', Array.from(matchIds))
            .limit(1000);
          const map = new Map(matchdayMap);
          (data || []).forEach((m) => {
            const home = m.home_team ? `${m.home_team.club_name}${m.home_team.team_name ? ` ${m.home_team.team_name}` : ''}` : '—';
            const away = m.away_team ? `${m.away_team.club_name}${m.away_team.team_name ? ` ${m.away_team.team_name}` : ''}` : '—';
            const date = m.match_date ? new Date(m.match_date).toLocaleDateString('de-DE') : '—';
            map.set(m.id, `#${m.match_number || '—'} · ${home} vs ${away} · ${date}`);
          });
          setMatchdayMap(map);
        }
      } catch {
        // Lookup ist optional, Fehler hier sind non-critical
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs]);

  const actions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [logs]);

  const entities = useMemo(() => {
    const set = new Set(logs.map((l) => l.entity_type).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [logs]);

  const formatEntity = (log) => {
    const id = log.entity_id;
    switch (log.entity_type) {
      case 'player':
        return playerMap.get(id) || 'Unbekannt';
      case 'team':
        return teamMap.get(id) || 'Unbekannt';
      case 'club':
        return clubMap.get(id) || 'Unbekannt';
      case 'matchday':
        return matchdayMap.get(id) || 'Unbekannt';
      default:
        return '—';
    }
  };

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // Dashboard: Zusammenfassung letzte 24h
  const last24h = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return logs.filter((l) => new Date(l.created_at).getTime() >= since);
  }, [logs]);

  const summary = useMemo(() => {
    const total = last24h.length;
    const byAction = new Map();
    const byEntity = new Map();
    last24h.forEach((l) => {
      byAction.set(l.action, (byAction.get(l.action) || 0) + 1);
      byEntity.set(l.entity_type, (byEntity.get(l.entity_type) || 0) + 1);
    });
    const topActions = Array.from(byAction.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const topEntities = Array.from(byEntity.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
    // Zusatz-KPIs aus den letzten 24h
    const errorCount = last24h.filter(l => l.action === 'error_occurred').length;
    const trainingConfirm = last24h.filter(l => l.action === 'training_confirm').length;
    const trainingDecline = last24h.filter(l => l.action === 'training_decline').length;
    const matchConfirm = last24h.filter(l => l.action === 'matchday_confirm').length;
    const matchDecline = last24h.filter(l => l.action === 'matchday_decline').length;
    return { total, topActions, topEntities, errorCount, trainingConfirm, trainingDecline, matchConfirm, matchDecline };
  }, [last24h]);

  const getCategory = (action = '') => {
    if (!action) return 'other';
    if (action.startsWith('onboarding_')) return 'onboarding';
    if (action.startsWith('training_')) return 'training';
    if (action.startsWith('matchday_') || action.startsWith('match_')) return 'match';
    if (action.startsWith('user_')) return 'auth';
    if (action.startsWith('admin_')) return 'admin';
    if (action === 'error_occurred') return 'error';
    if (action.startsWith('page_') || action === 'navigation') return 'navigation';
    return 'other';
  };

  const mapAbortReason = (reason) => {
    switch (reason) {
      case 'keine_zeit': return 'Keine Zeit';
      case 'finde_mich_nicht': return 'Spieler/Team nicht gefunden';
      case 'daten_sorge': return 'Unsicherheit wegen Daten';
      case 'technischer_fehler': return 'Technischer Fehler';
      case 'window_close': return 'Fenster/Tab geschlossen';
      case 'sonstiges': return 'Sonstiges';
      default: return reason || '—';
    }
  };

  const describeAction = (log) => {
    const a = log.action || '';
    const details = log.details || {};
    if (a === 'user_login') return 'Anmeldung';
    if (a === 'user_logout') return 'Abmeldung';
    if (a === 'error_occurred') return 'Fehler aufgetreten';
    if (a === 'page_navigation') return 'Navigation innerhalb der App';
    if (a === 'onboarding_started') return 'Onboarding gestartet';
    if (a === 'onboarding_step') return `Onboarding: Schritt "${details.step_name || `Schritt ${details.step || '—'}`}"`;
    if (a === 'onboarding_completed') return 'Onboarding abgeschlossen';
    if (a === 'onboarding_aborted') return 'Onboarding abgebrochen';
    if (a.startsWith('onboarding_search')) return 'Onboarding: Spielersuche';
    if (a.startsWith('onboarding_smart_match')) return 'Onboarding: Spieler übernommen';
    if (a.startsWith('onboarding_team_from_db')) return 'Onboarding: Team aus Datenbank gewählt';
    if (a.startsWith('onboarding_team_manual')) return 'Onboarding: Team manuell eingetragen';
    if (a === 'training_created') return 'Training erstellt';
    if (a === 'training_confirm') return 'Training zugesagt';
    if (a === 'training_decline') return 'Training abgesagt';
    if (a === 'matchday_confirm') return 'Spieltag zugesagt';
    if (a === 'matchday_decline') return 'Spieltag abgesagt';
    if (a === 'profile_edited' || a === 'profile_updated') return 'Profil aktualisiert';
    if (a === 'team_changed') return 'Team gewechselt';
    if (a === 'lk_changed') return 'LK geändert';
    if (a === 'match_result_entered') return 'Match-Ergebnis eingetragen';
    if (a.startsWith('admin_')) return 'Admin-Aktion';
    return a || 'Aktivität';
  };

  const sanitizeDetails = (log) => {
    const details = log.details || {};
    const clean = {};
    // Whitelist ausgewählter Felder in gut lesbarer Form
    if (details.user_email) clean.Benutzer = details.user_email;
    if (details.device) clean.Gerät = details.device;
    if (details.app_version) clean['App‑Version'] = details.app_version;
    if (details.step_name || details.step) clean.Schritt = details.step_name || `Schritt ${details.step}`;
    if (details.reason) clean.Abbruchgrund = mapAbortReason(details.reason);
    if (details.response) clean.Antwort = details.response === 'confirm' ? 'zugesagt' : (details.response === 'decline' ? 'abgesagt' : details.response);
    if (details.imported_player_name) clean.Spieler = details.imported_player_name;
    if (details.team_name || details.club_name) {
      clean.Team = [details.club_name, details.team_name].filter(Boolean).join(' • ');
    }
    if (details.duration_seconds) clean.Dauer = `${details.duration_seconds}s`;
    if (details.results_count !== undefined) clean.Suchergebnisse = details.results_count;
    if (details.search_term) clean.Suche = `„${details.search_term}”`;
    if (details.context) clean.Kontext = details.context;
    if (details.url) clean.Seite = details.url;
    if (details.error_message && !details.error_stack) clean.Fehler = details.error_message;
    if (details.error_message && details.error_stack) clean.Fehler = details.error_message; // Stack absichtlich nicht anzeigen
    // Zeige niemals rohe IDs/Codes
    return clean;
  };

  return (
    <div className="activity-tab">
      <div className="activity-toolbar">
        <div className="toolbar-group">
          <label>Zeitraum</label>
          <select value={filters.range} onChange={(e) => setFilters((f) => ({ ...f, range: e.target.value }))}>
            <option value="all">Alle</option>
            <option value="24h">Letzte 24h</option>
            <option value="7d">7 Tage</option>
            <option value="30d">30 Tage</option>
          </select>
        </div>
        <div className="toolbar-group">
          <label>Action</label>
          <select value={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="toolbar-group">
          <label>Entity</label>
          <select value={filters.entity} onChange={(e) => setFilters((f) => ({ ...f, entity: e.target.value }))}>
            {entities.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="toolbar-group">
          <label>Gerät</label>
          <select value={filters.device} onChange={(e) => setFilters((f) => ({ ...f, device: e.target.value }))}>
            {availableDevices.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="toolbar-group">
          <label>App‑Version</label>
          <select value={filters.appVersion} onChange={(e) => setFilters((f) => ({ ...f, appVersion: e.target.value }))}>
            {availableVersions.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="toolbar-group grow">
          <label>Suche</label>
          <input
            type="text"
            placeholder="Aktion, Entity, Details…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <button className="btn-refresh" onClick={loadLogs} disabled={loading}>
          {loading ? 'Lade…' : 'Aktualisieren'}
        </button>
      </div>

      {/* Dashboard: letzte 24h */}
      <div className="activity-dashboard" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        <div className="activity-item">
          <div className="activity-title">Letzte 24h – Gesamt</div>
          <div className="activity-meta" style={{ fontSize: 20, fontWeight: 700 }}>{summary.total}</div>
        </div>
        <div className="activity-item" style={{ background: 'linear-gradient(135deg, #e0f2fe, #dcfce7)' }}>
          <div className="activity-title">Onboarding Funnel</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 4 }}>
            <div>
              <div className="badge entity">Started</div>
              <div style={{ fontWeight: 800 }}>{onboardingStats.started}</div>
            </div>
            <div>
              <div className="badge entity">Completed</div>
              <div style={{ fontWeight: 800 }}>{onboardingStats.completed}</div>
            </div>
            <div>
              <div className="badge entity">Aborted</div>
              <div style={{ fontWeight: 800 }}>{onboardingStats.aborted}</div>
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#065f46' }}>
            Abschlussrate: <strong>{onboardingStats.completionRate}%</strong>
          </div>
        </div>
        <div className="activity-item">
          <div className="activity-title">Fehler (24h)</div>
          <div className="activity-meta" style={{ fontSize: 20, fontWeight: 700 }}>{summary.errorCount}</div>
        </div>
        <div className="activity-item">
          <div className="activity-title">Training RSVP (24h)</div>
          <div className="activity-meta"><span className="badge entity">Bestätigt</span> {summary.trainingConfirm} · <span className="badge entity">Abgelehnt</span> {summary.trainingDecline}</div>
        </div>
        <div className="activity-item">
          <div className="activity-title">Matchday RSVP (24h)</div>
          <div className="activity-meta"><span className="badge entity">Bestätigt</span> {summary.matchConfirm} · <span className="badge entity">Abgelehnt</span> {summary.matchDecline}</div>
        </div>
        <div className="activity-item">
          <div className="activity-title">Top Actions</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {summary.topActions.map(([name, count]) => (
              <li key={name}>
                <span className="badge action">{name || '—'}</span> · {count}
              </li>
            ))}
            {summary.topActions.length === 0 && <li>–</li>}
          </ul>
        </div>
        <div className="activity-item">
          <div className="activity-title">Top Entities</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {summary.topEntities.map(([name, count]) => (
              <li key={name}>
                <span className="badge entity">{name || '—'}</span> · {count}
              </li>
            ))}
            {summary.topEntities.length === 0 && <li>–</li>}
          </ul>
        </div>
      </div>

      {error && <div className="activity-error">❌ {error}</div>}

      <div className="activity-list">
        {logs.map((log) => {
          const details = log.details || {};
          const category = getCategory(log.action);
          const friendly = describeAction(log);
          const clean = sanitizeDetails(log);
          return (
            <div key={log.id} className="activity-item">
              <div className="activity-main row">
                <div className="col">
                  <div className="activity-title">
                    <span className="badge action">{friendly}</span>
                    {log.entity_type && <span className="badge entity">{log.entity_type}</span>}
                    <span className="badge category">{category}</span>
                  </div>
                  <div className="activity-entityline">
                    <strong>Objekt:</strong> {formatEntity(log)}
                  </div>
                  <div className="activity-meta">
                    <span>{new Date(log.created_at).toLocaleString('de-DE')}</span>
                    {details.user_id && <span> · User: {playerMap.get(details.user_id) || 'Unbekannt'}</span>}
                    {details.url && (
                      <span>
                        {' '}
                        · <a href={details.url} target="_blank" rel="noreferrer">URL</a>
                      </span>
                    )}
                  </div>
                  {/* Lesbare Details-Liste (ohne IDs/Codes) */}
                  {Object.keys(clean).length > 0 && (
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: 18, color: '#334155', fontSize: 13 }}>
                      {Object.entries(clean).map(([k, v]) => (
                        <li key={k}><strong>{k}:</strong> {String(v)}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="col right">
                  <button className="btn-refresh" onClick={() => toggle(log.id)}>
                    {expanded[log.id] ? 'Technische Details verbergen' : 'Technische Details anzeigen'}
                  </button>
                </div>
              </div>
              {expanded[log.id] && (
                <pre className="activity-details">
                  {JSON.stringify(sanitizeDetails(log), null, 2)}
                </pre>
              )}
            </div>
          );
        })}
        {logs.length === 0 && !loading && <div className="activity-empty">Keine Aktivitäten gefunden.</div>}
      </div>
    </div>
  );
}



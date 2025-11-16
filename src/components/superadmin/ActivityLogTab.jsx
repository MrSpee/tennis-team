import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './ActivityLogTab.css';

export default function ActivityLogTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    range: 'all', // all | 24h | 7d | 30d
    action: 'all',
    entity: 'all',
    search: ''
  });

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
      const filtered = term
        ? rows.filter((r) => {
            const hay =
              `${r.action || ''} ${r.entity_type || ''} ${r.entity_id || ''} ${JSON.stringify(r.details || {})}`.toLowerCase();
            return hay.includes(term);
          })
        : rows;

      setLogs(filtered);
    } catch (e) {
      setError(e.message || 'Fehler beim Laden der Aktivitäten');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const actions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [logs]);

  const entities = useMemo(() => {
    const set = new Set(logs.map((l) => l.entity_type).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [logs]);

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

      {error && <div className="activity-error">❌ {error}</div>}

      <div className="activity-list">
        {logs.map((log) => {
          const details = log.details || {};
          return (
            <div key={log.id} className="activity-item">
              <div className="activity-main">
                <div className="activity-title">
                  <span className="activity-action">{log.action}</span>
                  {log.entity_type && <span className="activity-entity"> · {log.entity_type}</span>}
                  {log.entity_id && <span className="activity-id"> · {log.entity_id}</span>}
                </div>
                <div className="activity-meta">
                  <span>{new Date(log.created_at).toLocaleString('de-DE')}</span>
                  {details.user_id && <span> · User: {details.user_id}</span>}
                  {details.url && (
                    <span>
                      {' '}
                      · <a href={details.url} target="_blank" rel="noreferrer">URL</a>
                    </span>
                  )}
                </div>
              </div>
              <pre className="activity-details">{JSON.stringify(details, null, 2)}</pre>
            </div>
          );
        })}
        {logs.length === 0 && !loading && <div className="activity-empty">Keine Aktivitäten gefunden.</div>}
      </div>
    </div>
  );
}



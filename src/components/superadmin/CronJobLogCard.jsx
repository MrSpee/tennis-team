import { useState } from 'react';

/**
 * CronJobLogCard - Zeigt einen einzelnen Cron-Job-Run
 */
function CronJobLogCard({ log, expanded = false, onToggle }) {
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unbekannt';
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `Vor ${diffMins} Minute${diffMins > 1 ? 'n' : ''}`;
    if (diffHours < 24) return `Vor ${diffHours} Stunde${diffHours > 1 ? 'n' : ''}`;
    if (diffDays < 7) return `Vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    return then.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Unbekannt';
    return new Date(timestamp).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };
  
  const getStatusConfig = (status) => {
    switch (status) {
      case 'success':
        return { icon: '✅', label: 'Erfolgreich', color: '#10b981', bgColor: '#d1fae5' };
      case 'warning':
        return { icon: '⚠️', label: 'Warnung', color: '#f59e0b', bgColor: '#fef3c7' };
      case 'error':
        return { icon: '❌', label: 'Fehler', color: '#ef4444', bgColor: '#fee2e2' };
      default:
        return { icon: '❓', label: 'Unbekannt', color: '#6b7280', bgColor: '#f3f4f6' };
    }
  };
  
  const statusConfig = getStatusConfig(log.status);
  const summary = log.summary || {};
  
  return (
    <div style={{
      border: `1px solid ${statusConfig.color}40`,
      borderRadius: '12px',
      background: expanded ? '#ffffff' : statusConfig.bgColor + '40',
      padding: '1rem',
      marginBottom: '0.75rem',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    }}
    onClick={onToggle}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: expanded ? '1rem' : '0.5rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.25rem'
          }}>
            <span style={{ fontSize: '1.25rem' }}>🔄</span>
            <span style={{
              fontSize: '1rem',
              fontWeight: '700',
              color: '#1f2937'
            }}>
              {log.job_name === 'update-meeting-ids' ? 'Update Meeting IDs' : log.job_name}
            </span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
              background: statusConfig.bgColor,
              color: statusConfig.color,
              fontWeight: '600'
            }}>
              <span>{statusConfig.icon}</span>
              <span>{statusConfig.label}</span>
            </span>
            <span>•</span>
            <span>{formatTimeAgo(log.start_time)}</span>
            <span>•</span>
            <span>Dauer: {formatDuration(log.duration_ms)}</span>
          </div>
        </div>
        <button
          style={{
            padding: '0.25rem 0.5rem',
            background: 'transparent',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            color: '#6b7280',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {expanded ? '◀ Weniger' : '▶ Details'}
        </button>
      </div>
      
      {/* Zusammenfassung (immer sichtbar) */}
      <div style={{
        fontSize: '0.875rem',
        color: '#374151',
        marginBottom: expanded ? '1rem' : 0
      }}>
        <span style={{ fontWeight: '600' }}>📊 </span>
        <span>{log.total_processed || 0} verarbeitet</span>
        {log.updated > 0 && (
          <>
            <span> • </span>
            <span style={{ color: '#10b981', fontWeight: '600' }}>{log.updated} aktualisiert</span>
          </>
        )}
        {log.skipped > 0 && (
          <>
            <span> • </span>
            <span style={{ color: '#f59e0b' }}>{log.skipped} übersprungen</span>
          </>
        )}
        {log.failed > 0 && (
          <>
            <span> • </span>
            <span style={{ color: '#ef4444', fontWeight: '600' }}>{log.failed} Fehler</span>
          </>
        )}
      </div>
      
      {/* Erweiterte Details (nur wenn expanded) */}
      {expanded && (
        <div style={{
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid #e5e7eb'
        }}>
          {/* Schritt 1: Meeting IDs */}
          {log.total_processed > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                📊 Schritt 1 (meeting_ids):
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginLeft: '1rem',
                lineHeight: '1.75'
              }}>
                • Verarbeitet: {log.total_processed} Matchdays<br />
                • Aktualisiert: {log.updated} meeting_ids<br />
                {log.skipped > 0 && <>&bull; Übersprungen: {log.skipped}<br /></>}
                • Fehler: {log.failed}
              </div>
            </div>
          )}
          
          {/* Schritt 2: Ergebnisse */}
          {(summary.resultsProcessed > 0 || summary.resultsUpdated > 0) && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                📊 Schritt 2 (Ergebnisse):
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginLeft: '1rem',
                lineHeight: '1.75'
              }}>
                • Verarbeitet: {summary.resultsProcessed || 0} Matchdays<br />
                • Aktualisiert: {summary.resultsUpdated || 0} Ergebnisse<br />
                {summary.resultsSkipped > 0 && <>&bull; Übersprungen: {summary.resultsSkipped}<br /></>}
                • Fehler: {summary.resultsFailed || 0}
              </div>
            </div>
          )}
          
          {/* Message */}
          {log.message && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                💬 Message:
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginLeft: '1rem',
                fontStyle: 'italic'
              }}>
                {log.message}
              </div>
            </div>
          )}
          
          {/* Zeitstempel */}
          <div style={{
            fontSize: '0.75rem',
            color: '#9ca3af',
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            Start: {formatDateTime(log.start_time)}<br />
            {log.end_time && `Ende: ${formatDateTime(log.end_time)}`}
          </div>
          
          {/* Fehler (falls vorhanden) */}
          {log.errors && Array.isArray(log.errors) && log.errors.length > 0 && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '8px'
            }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                color: '#991b1b',
                marginBottom: '0.5rem'
              }}>
                ❌ Fehler ({log.errors.length}):
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#7f1d1d',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {log.errors.slice(0, 5).map((error, idx) => (
                  <div key={idx} style={{ marginBottom: '0.5rem' }}>
                    {error.message || error.error || JSON.stringify(error)}
                  </div>
                ))}
                {log.errors.length > 5 && (
                  <div style={{ fontStyle: 'italic' }}>
                    ... und {log.errors.length - 5} weitere Fehler
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CronJobLogCard;


import './ConfigError.css';

function ConfigError() {
  return (
    <div className="config-error">
      <div className="error-container">
        <div className="error-icon">🔧</div>
        <h1>Konfigurationsfehler</h1>
        <p>Die App kann nicht starten, da die Supabase-Konfiguration fehlt.</p>
        
        <div className="error-details">
          <h2>🔧 Für Vercel Deployment:</h2>
          <ol>
            <li>Gehe zu deinem <strong>Vercel Dashboard</strong></li>
            <li>Wähle dein <strong>tennis-team</strong> Projekt</li>
            <li>Gehe zu <strong>Settings → Environment Variables</strong></li>
            <li>Füge hinzu:</li>
          </ol>
          
          <div className="env-vars">
            <div className="env-var">
              <strong>VITE_SUPABASE_URL</strong>
              <span>https://dein-projekt.supabase.co</span>
            </div>
            <div className="env-var">
              <strong>VITE_SUPABASE_ANON_KEY</strong>
              <span>eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</span>
            </div>
          </div>
          
          <p className="note">
            <strong>Wichtig:</strong> Nach dem Hinzufügen der Variablen musst du das Deployment neu starten!
          </p>
        </div>
        
        <div className="error-actions">
          <button onClick={() => window.location.reload()}>
            🔄 Seite neu laden
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfigError;


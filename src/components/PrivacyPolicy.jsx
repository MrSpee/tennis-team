import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './Dashboard.css';

function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '2rem',
          padding: '0.5rem 1rem',
          background: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#374151'
        }}
      >
        <ArrowLeft size={16} />
        Zurück
      </button>

      <div className="lk-card-full" style={{ padding: '2rem' }}>
        <h1 style={{ marginBottom: '1.5rem', fontSize: '2rem', fontWeight: '700' }}>
          Datenschutzerklärung
        </h1>
        <p style={{ marginBottom: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>
          Stand: 4. Januar 2026
        </p>

        <div style={{ lineHeight: '1.8', fontSize: '1rem' }}>
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>1. Verantwortlicher</h2>
            <p>
              Verantwortlich für die Datenverarbeitung ist der Betreiber der Tennis-Team-App.
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              <strong>Kontakt:</strong><br />
              Über die App: SuperAdmin Dashboard<br />
              E-Mail: [Ihre E-Mail-Adresse eintragen]
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>2. Allgemeine Informationen zur Datenverarbeitung</h2>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', marginTop: '1rem' }}>2.1 Zweck der Datenverarbeitung</h3>
            <p>Die App dient der Organisation und Verwaltung von Tennis-Teams, Spielern, Spieltagen und Ergebnissen.</p>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', marginTop: '1rem' }}>2.2 Rechtsgrundlage</h3>
            <p>Die Verarbeitung personenbezogener Daten erfolgt auf Grundlage der:</p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)</li>
              <li>Erfüllung eines Vertrags (Art. 6 Abs. 1 lit. b DSGVO)</li>
              <li>Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO)</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>3. Erhobene Daten</h2>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', marginTop: '1rem' }}>3.1 Registrierung und Profil</h3>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>E-Mail-Adresse</li>
              <li>Name</li>
              <li>Profilbild (optional)</li>
              <li>Spielerdaten (Verein, Team, Position)</li>
              <li>Aktivitätsdaten (Training, Spiele)</li>
            </ul>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', marginTop: '1rem' }}>3.2 Technische Daten</h3>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>IP-Adresse</li>
              <li>Geräteinformationen</li>
              <li>Browser-Typ und -Version</li>
              <li>Zugriffszeiten</li>
              <li>Cookies und ähnliche Technologien</li>
            </ul>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', marginTop: '1rem' }}>3.3 Daten aus Drittdiensten</h3>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Spielergebnisse von nuLiga (öffentlich verfügbar)</li>
              <li>Vereins- und Ligadaten</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>4. Verarbeitungszwecke</h2>
            <p>Ihre Daten werden verarbeitet für:</p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Bereitstellung und Betrieb der App</li>
              <li>Verwaltung Ihrer Mitgliedschaft in Teams</li>
              <li>Kommunikation innerhalb der App</li>
              <li>Anzeige von Spielergebnissen und Statistiken</li>
              <li>Verbesserung der App-Funktionalität</li>
              <li>Sicherstellung der Datensicherheit</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>5. Datenweitergabe</h2>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', marginTop: '1rem' }}>5.1 Drittdienste</h3>
            <p>Wir nutzen folgende Drittdienste:</p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li><strong>Supabase</strong> (Datenbank und Authentifizierung) - Sitz: USA (EU-US Data Privacy Framework) - Zweck: Speicherung und Verarbeitung Ihrer Daten</li>
              <li><strong>Vercel</strong> (Hosting) - Sitz: USA (EU-US Data Privacy Framework) - Zweck: Bereitstellung der App</li>
            </ul>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', marginTop: '1rem' }}>5.2 Weitergabe innerhalb der App</h3>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Ihre Profildaten sind für andere Mitglieder Ihrer Teams sichtbar</li>
              <li>Spielergebnisse und Statistiken sind für Team-Mitglieder einsehbar</li>
            </ul>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', marginTop: '1rem' }}>5.3 Keine kommerzielle Weitergabe</h3>
            <p>Wir verkaufen oder vermieten Ihre Daten nicht an Dritte.</p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>6. Cookies und Tracking</h2>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', marginTop: '1rem' }}>6.1 Technisch notwendige Cookies</h3>
            <p>Die App nutzt technisch notwendige Cookies für:</p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Authentifizierung und Session-Verwaltung</li>
              <li>Funktionalität der App</li>
            </ul>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', marginTop: '1rem' }}>6.2 Analyse</h3>
            <p>Wir nutzen keine Tracking- oder Analyse-Tools (z.B. Google Analytics).</p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>7. Datensicherheit</h2>
            <p>Wir setzen technische und organisatorische Maßnahmen ein, um Ihre Daten zu schützen:</p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Verschlüsselte Datenübertragung (HTTPS)</li>
              <li>Zugriffskontrollen und Authentifizierung</li>
              <li>Regelmäßige Sicherheitsupdates</li>
              <li>Backups</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>8. Ihre Rechte</h2>
            <p>Sie haben folgende Rechte gemäß DSGVO:</p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li><strong>Auskunft (Art. 15 DSGVO):</strong> Sie können Auskunft über Ihre gespeicherten Daten verlangen.</li>
              <li><strong>Berichtigung (Art. 16 DSGVO):</strong> Sie können die Berichtigung falscher Daten verlangen.</li>
              <li><strong>Löschung (Art. 17 DSGVO):</strong> Sie können die Löschung Ihrer Daten verlangen, sofern keine gesetzlichen Aufbewahrungspflichten bestehen.</li>
              <li><strong>Einschränkung (Art. 18 DSGVO):</strong> Sie können die Einschränkung der Verarbeitung verlangen.</li>
              <li><strong>Datenübertragbarkeit (Art. 20 DSGVO):</strong> Sie können Ihre Daten in einem strukturierten, gängigen Format erhalten.</li>
              <li><strong>Widerspruch (Art. 21 DSGVO):</strong> Sie können der Verarbeitung Ihrer Daten aus berechtigten Gründen widersprechen.</li>
              <li><strong>Widerruf der Einwilligung (Art. 7 DSGVO):</strong> Sie können Ihre Einwilligung jederzeit widerrufen.</li>
              <li><strong>Beschwerde:</strong> Sie können sich bei einer Aufsichtsbehörde beschweren (z.B. beim Landesdatenschutzbeauftragten).</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>9. Speicherdauer</h2>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Ihre Daten werden so lange gespeichert, wie Ihr Account aktiv ist</li>
              <li>Nach Löschung des Accounts werden Ihre Daten innerhalb von 30 Tagen gelöscht</li>
              <li>Gesetzliche Aufbewahrungspflichten bleiben unberührt</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>10. Minderjährige</h2>
            <p>
              Die App ist für Personen ab 16 Jahren vorgesehen. Bei Nutzern unter 16 Jahren ist die Einwilligung eines Erziehungsberechtigten erforderlich.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>11. Änderungen dieser Datenschutzerklärung</h2>
            <p>
              Wir behalten uns vor, diese Datenschutzerklärung zu ändern. Wesentliche Änderungen werden Ihnen per E-Mail oder in der App mitgeteilt.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>12. Kontakt</h2>
            <p>
              Bei Fragen zum Datenschutz kontaktieren Sie uns bitte:
            </p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Über die App: SuperAdmin Dashboard</li>
              <li>E-Mail: [Ihre E-Mail-Adresse eintragen]</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicy;


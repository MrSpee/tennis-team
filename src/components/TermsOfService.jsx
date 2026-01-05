import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './Dashboard.css';

function TermsOfService() {
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
          Nutzungsbedingungen
        </h1>
        <p style={{ marginBottom: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>
          Stand: 4. Januar 2026
        </p>

        <div style={{ lineHeight: '1.8', fontSize: '1rem' }}>
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>1. Geltungsbereich</h2>
            <p>
              Diese Nutzungsbedingungen gelten für die Nutzung der Tennis-Team-App (im Folgenden "App"). 
              Mit der Registrierung und Nutzung der App akzeptieren Sie diese Bedingungen.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>2. Registrierung und Account</h2>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Sie müssen mindestens 16 Jahre alt sein, um die App nutzen zu können.</li>
              <li>Sie verpflichten sich, wahrheitsgemäße Angaben zu machen.</li>
              <li>Sie sind verantwortlich für die Geheimhaltung Ihrer Zugangsdaten.</li>
              <li>Ein Account darf nur von einer Person genutzt werden.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>3. Nutzungsregeln</h2>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Die App darf nur für legale Zwecke genutzt werden.</li>
              <li>Störende, beleidigende oder rechtswidrige Inhalte sind untersagt.</li>
              <li>Die App darf nicht missbraucht werden (z.B. Spam, Betrug, Datenmanipulation).</li>
              <li>Verstöße können zur sofortigen Sperrung des Accounts führen.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>4. Datenschutz</h2>
            <p>
              Ihre personenbezogenen Daten werden gemäß unserer Datenschutzerklärung verarbeitet. 
              Mit der Nutzung der App stimmen Sie der Datenschutzerklärung zu.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>5. Verfügbarkeit und Änderungen</h2>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Wir behalten uns vor, die App jederzeit zu ändern, zu erweitern oder einzustellen.</li>
              <li>Wir übernehmen keine Garantie für die Verfügbarkeit der App.</li>
              <li>Funktionen können ohne Vorankündigung geändert oder entfernt werden.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>6. Haftungsausschluss</h2>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Die App wird "wie besehen" zur Verfügung gestellt.</li>
              <li>Wir haften nicht für Schäden, die durch die Nutzung der App entstehen.</li>
              <li>Wir übernehmen keine Haftung für die Richtigkeit von Spielergebnissen oder Daten Dritter (z.B. nuLiga).</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>7. Urheberrechte</h2>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Alle Inhalte der App sind urheberrechtlich geschützt.</li>
              <li>Sie dürfen Inhalte nicht ohne Genehmigung kopieren, verbreiten oder kommerziell nutzen.</li>
              <li>Sie behalten die Rechte an Ihren eigenen Inhalten (z.B. Profilbilder).</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>8. Kündigung</h2>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Sie können Ihren Account jederzeit löschen.</li>
              <li>Wir behalten uns vor, Accounts bei Verstößen zu sperren oder zu löschen.</li>
              <li>Nach der Kündigung werden Ihre Daten gemäß Datenschutzerklärung gelöscht.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>9. Änderungen der Bedingungen</h2>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Wir behalten uns vor, diese Nutzungsbedingungen zu ändern.</li>
              <li>Wesentliche Änderungen werden Ihnen per E-Mail oder in der App mitgeteilt.</li>
              <li>Bei fortgesetzter Nutzung gelten die geänderten Bedingungen.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>10. Kontakt</h2>
            <p>
              Bei Fragen zu diesen Nutzungsbedingungen kontaktieren Sie uns bitte über die App oder per E-Mail.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default TermsOfService;


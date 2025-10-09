import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Login.css';
import './Dashboard.css';

function EmailVerificationError() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(7);

  const error = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const errorDescription = searchParams.get('error_description');

  useEffect(() => {
    // Countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const getErrorMessage = () => {
    if (errorCode === 'otp_expired') {
      return {
        title: '⏰ Link abgelaufen',
        message: 'Der Bestätigungslink ist leider abgelaufen.',
        hint: 'Bitte fordere einen neuen Link an oder registriere dich erneut.'
      };
    }

    if (error === 'access_denied') {
      return {
        title: '🔒 Zugriff verweigert',
        message: 'Der Link konnte nicht verifiziert werden.',
        hint: 'Bitte versuche es erneut oder kontaktiere den Support.'
      };
    }

    return {
      title: '❌ Fehler aufgetreten',
      message: errorDescription || 'Ein unbekannter Fehler ist aufgetreten.',
      hint: 'Bitte versuche es erneut.'
    };
  };

  const errorInfo = getErrorMessage();

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img 
            src="/app-icon.jpg" 
            alt="Platzhirsch Logo" 
            style={{ 
              width: '120px', 
              height: '120px', 
              marginBottom: '1rem',
              borderRadius: '50%',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              display: 'block',
              margin: '0 auto 1rem'
            }}
            onError={(e) => {
              // Fallback wenn Logo nicht gefunden
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <div style={{ fontSize: '3rem', display: 'none' }}>🎾</div>
          <h1 style={{ marginTop: '1rem' }}>Platzhirsch</h1>
        </div>

        <div className="login-form">
          {/* Error Icon */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '1.5rem',
            fontSize: '3rem'
          }}>
            {errorCode === 'otp_expired' ? '⏰' : '❌'}
          </div>

          {/* Error Title */}
          <h2 style={{ 
            textAlign: 'center', 
            fontSize: '1.5rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            color: '#1f2937'
          }}>
            {errorInfo.title}
          </h2>

          {/* Error Message */}
          <p style={{ 
            textAlign: 'center', 
            color: '#6b7280',
            marginBottom: '1rem',
            fontSize: '1rem'
          }}>
            {errorInfo.message}
          </p>

          {/* Hint */}
          <div style={{
            padding: '1rem',
            background: '#fef3c7',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '6px',
            marginBottom: '1.5rem'
          }}>
            <p style={{ 
              margin: 0,
              fontSize: '0.875rem',
              color: '#92400e'
            }}>
              💡 {errorInfo.hint}
            </p>
          </div>

          {/* Countdown */}
          <div style={{ 
            textAlign: 'center',
            padding: '1rem',
            background: '#f0f9ff',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <p style={{ 
              margin: 0,
              fontSize: '0.875rem',
              color: '#1e40af'
            }}>
              Weiterleitung zur Login-Seite in <strong>{countdown}</strong> Sekunden...
            </p>
            <div style={{
              marginTop: '0.5rem',
              height: '4px',
              background: '#e0e7ff',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                width: `${(7 - countdown) / 7 * 100}%`,
                transition: 'width 1s linear',
                borderRadius: '2px'
              }} />
            </div>
          </div>

          {/* Manual Navigation Button */}
          <button
            onClick={() => navigate('/login')}
            className="btn-login"
            style={{
              width: '100%',
              padding: '0.75rem',
              marginBottom: '0.5rem'
            }}
          >
            Sofort zur Login-Seite
          </button>

          {/* Debug Info (nur in Development) */}
          {import.meta.env.DEV && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ 
                cursor: 'pointer', 
                fontSize: '0.75rem', 
                color: '#6b7280',
                userSelect: 'none'
              }}>
                Debug Info
              </summary>
              <div style={{ 
                marginTop: '0.5rem',
                padding: '0.5rem',
                background: '#f1f5f9',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                wordBreak: 'break-all'
              }}>
                <div><strong>error:</strong> {error}</div>
                <div><strong>error_code:</strong> {errorCode}</div>
                <div><strong>error_description:</strong> {errorDescription}</div>
              </div>
            </details>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '2rem',
          fontSize: '0.75rem',
          color: '#9ca3af'
        }}>
          <p>Brauchst du Hilfe? Kontaktiere den Support.</p>
        </div>
      </div>
    </div>
  );
}

export default EmailVerificationError;

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';
import './Dashboard.css';

function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [countdown, setCountdown] = useState(10);

  // Lustige Tennis-Sprüche
  const funnyMessages = [
    "Hoppla! Diese Seite ist out! 🎾",
    "Doppelfehler! Seite nicht gefunden. 🤦",
    "Netzroller... die Seite ist im Aus! 🎾",
    "Break Point verpasst! Seite existiert nicht. 🎾",
    "Ace! Aber leider in die falsche Richtung. 🎾",
    "Match Point... aber für die falsche Seite! 🤷",
    "Diese Seite wurde disqualifiziert! ⚠️",
    "Schiedsrichter-Entscheidung: Seite nicht gefunden! 👨‍⚖️"
  ];

  // Zufälligen Spruch nur einmal beim ersten Render generieren
  const [randomMessage] = useState(() => 
    funnyMessages[Math.floor(Math.random() * funnyMessages.length)]
  );
  const targetPage = isAuthenticated ? 'Dashboard' : 'Login';
  const targetPath = isAuthenticated ? '/' : '/login';

  useEffect(() => {
    // Countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(targetPath);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, targetPath]);

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '500px' }}>
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
          {/* 404 Animation */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '1.5rem',
            fontSize: '5rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            404
          </div>

          {/* Lustiger Spruch */}
          <h2 style={{ 
            textAlign: 'center', 
            fontSize: '1.5rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            color: '#1f2937'
          }}>
            {randomMessage}
          </h2>

          {/* Beschreibung */}
          <p style={{ 
            textAlign: 'center', 
            color: '#6b7280',
            marginBottom: '1.5rem',
            fontSize: '1rem'
          }}>
            Die Seite, die du suchst, hat leider einen Doppelfehler gemacht und existiert nicht.
          </p>

          {/* Tennis Court Illustration */}
          <div style={{
            textAlign: 'center',
            fontSize: '4rem',
            marginBottom: '1.5rem',
            opacity: 0.3
          }}>
            🎾🏆🥇
          </div>

          {/* Countdown */}
          <div style={{ 
            textAlign: 'center',
            padding: '1rem',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            borderRadius: '12px',
            marginBottom: '1rem',
            border: '2px solid #bae6fd'
          }}>
            <p style={{ 
              margin: 0,
              fontSize: '0.875rem',
              color: '#0369a1',
              marginBottom: '0.5rem'
            }}>
              Zurück zum <strong>{targetPage}</strong> in <strong>{countdown}</strong> Sekunden...
            </p>
            <div style={{
              height: '6px',
              background: '#e0e7ff',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                width: `${(10 - countdown) / 10 * 100}%`,
                transition: 'width 1s linear',
                borderRadius: '3px'
              }} />
            </div>
          </div>

          {/* Manual Navigation Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => navigate(targetPath)}
              className="btn-login"
              style={{
                flex: 1,
                padding: '0.75rem',
                fontSize: '0.875rem'
              }}
            >
              Sofort zum {targetPage}
            </button>
            
            {isAuthenticated && (
              <button
                onClick={() => navigate(-1)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  background: 'transparent',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.color = '#3b82f6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.color = '#6b7280';
                }}
              >
                ← Zurück
              </button>
            )}
          </div>

          {/* Lustige Tennis-Tipps */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#fef3c7',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '6px'
          }}>
            <p style={{ 
              margin: 0,
              fontSize: '0.875rem',
              color: '#92400e'
            }}>
              💡 <strong>Tennis-Tipp:</strong> Auch Roger Federer hat mal den falschen Court gesucht. 
              Du bist in guter Gesellschaft! 🎾
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '2rem',
          fontSize: '0.75rem',
          color: '#9ca3af'
        }}>
          <p>Brauchst du Hilfe? Zurück zum {targetPage}.</p>
        </div>
      </div>
    </div>
  );
}

export default NotFound;


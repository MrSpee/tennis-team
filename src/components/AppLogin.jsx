import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import './Login.css';

function AppLogin() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
  
  const auth = useAuth();
  const navigate = useNavigate();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSendingReset(true);

    try {
      console.log('🔄 Sending password reset email to:', resetEmail);
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/password-reset`
      });

      if (resetError) {
        console.error('❌ Password reset error:', resetError);
        setError(`Fehler beim Versenden: ${resetError.message}`);
        setSendingReset(false);
        return;
      }

      console.log('✅ Password reset email sent');
      setSuccess('📧 Super! Wir haben dir eine E-Mail geschickt. Schau in dein Postfach (auch im Spam-Ordner!) und klicke auf den Link zum Passwort zurücksetzen.');
      setResetEmail('');
      
      // Nach 3 Sekunden zurück zum Login
      setTimeout(() => {
        setShowForgotPassword(false);
        setSuccess('');
      }, 5000);
      
    } catch (err) {
      console.error('❌ Password reset exception:', err);
      setError('Fehler: ' + err.message);
    } finally {
      setSendingReset(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegister) {
        // Registrierung - nur E-Mail und Passwort
        const result = await auth.register(email, password, {
          name: email.split('@')[0], // Verwende E-Mail-Prefix als temporären Namen
          points: 0
        });

        if (result.success) {
          setSuccess('🎾 Fast geschafft! Check deine E-Mails und bestätige deinen Account. Dann kann\'s losgehen!');
          setIsRegister(false);
          // Formular zurücksetzen
          setEmail('');
          setPassword('');
        } else {
          setError(result.error || '❌ Registrierung fehlgeschlagen. Versuche es nochmal!');
        }
      } else {
        // Login
        console.log('🔵 Attempting login...');
        const result = await auth.login(email, password);
        console.log('🔵 Login result:', result);
        
        if (result.success) {
          console.log('✅ Login successful, navigating to dashboard...');
          setTimeout(() => {
            navigate('/');
          }, 100); // Kurze Verzögerung für State-Update
        } else {
          setError(result.error || '❌ Login fehlgeschlagen. Prüfe deine E-Mail und dein Passwort!');
        }
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            marginBottom: '1rem' 
          }}>
            <img 
              src="/app-icon.jpg" 
              alt="Platzhirsch Logo" 
              style={{ 
                width: '120px', 
                height: '120px', 
                marginBottom: '1rem',
                borderRadius: '50%',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              onError={(e) => {
                // Fallback wenn Logo nicht gefunden
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div style={{ fontSize: '3rem', display: 'none' }}>🎾</div>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Platzhirsch
          </h1>
          <p style={{ 
            fontSize: '1.2rem', 
            color: '#666', 
            fontStyle: 'italic',
            marginBottom: '0.5rem',
            textAlign: 'center',
            lineHeight: '1.6'
          }}>
            Deine Matches,<br />
            Dein Team,<br />
            Dein Tennis.
          </p>
          {isRegister && (
            <div style={{
              background: 'linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 100%)',
              border: '2px solid #0ea5e9',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <h2 style={{ 
                fontSize: '1.1rem', 
                fontWeight: '700', 
                color: '#0c4a6e',
                margin: '0 0 0.5rem 0'
              }}>
                🎾 Willkommen bei Platzhirsch!
              </h2>
              <p style={{ 
                fontSize: '0.95rem', 
                color: '#1e40af',
                margin: '0',
                lineHeight: '1.6',
                fontStyle: 'italic',
                maxWidth: '100%',
                wordWrap: 'break-word',
                padding: '0 0.5rem'
              }}>
                Vom ersten Aufschlag bis zum großen Triumph –<br />
                Platzhirsch begleitet dich auf deiner Tennisreise.
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>✉️ E-Mail *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="max@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>🔒 Passwort *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mindestens 6 Zeichen"
              minLength={6}
              required
            />
            {!isRegister && (
              <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setError('');
                    setSuccess('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3498db',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '0'
                  }}
                >
                  Passwort vergessen?
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message" style={{ whiteSpace: 'pre-line' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              ✅ {success}
            </div>
          )}

          <button 
            type="submit" 
            className="btn-login"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              background: isRegister ? '#2ecc71' : '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.3s ease'
            }}
          >
            {loading ? '⏳ Bitte warten...' : (isRegister ? '🎾 Jetzt registrieren' : '🚀 Anmelden')}
          </button>
        </form>

        <div className="login-footer">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setSuccess('');
              setEmail('');
              setPassword('');
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              marginTop: '1rem',
              background: 'transparent',
              border: '2px solid #3498db',
              borderRadius: '8px',
              color: '#3498db',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#3498db';
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.color = '#3498db';
            }}
          >
            {isRegister 
              ? '← Zurück zum Login' 
              : '✨ Neuen Account erstellen'}
          </button>
        </div>
      </div>

      {/* Passwort vergessen Modal */}
      {showForgotPassword && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔑</div>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '700' }}>
                Passwort vergessen?
              </h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                Kein Problem! Gib deine E-Mail-Adresse ein und wir schicken dir einen Link zum Zurücksetzen.
              </p>
            </div>

            {error && (
              <div className="error-message" style={{ marginBottom: '1rem' }}>
                ❌ {error}
              </div>
            )}

            {success && (
              <div className="success-message" style={{ marginBottom: '1rem' }}>
                ✅ {success}
              </div>
            )}

            <form onSubmit={handleForgotPassword}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  ✉️ E-Mail-Adresse
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="max@example.com"
                  required
                  disabled={sendingReset}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setError('');
                    setSuccess('');
                    setResetEmail('');
                  }}
                  disabled={sendingReset}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: sendingReset ? 'not-allowed' : 'pointer'
                  }}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={sendingReset}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: sendingReset ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: sendingReset ? 'not-allowed' : 'pointer'
                  }}
                >
                  {sendingReset ? '⏳ Sende E-Mail...' : '📧 Link senden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppLogin;


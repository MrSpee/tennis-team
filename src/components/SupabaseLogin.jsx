import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function SupabaseLogin() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ranking, setRanking] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const auth = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegister) {
        // Registrierung
        if (!name.trim()) {
          setError('Bitte geben Sie Ihren Namen ein');
          setLoading(false);
          return;
        }

        const result = await auth.register(email, password, {
          name,
          phone,
          ranking,
          points: 0
        });

        if (result.success) {
          setSuccess('🎾 Fast geschafft! Check deine E-Mails und bestätige deinen Account. Dann kann\'s losgehen!');
          setIsRegister(false);
          // Formular zurücksetzen
          setEmail('');
          setPassword('');
          setName('');
          setPhone('');
          setRanking('');
        } else {
          setError(result.error || 'Registrierung fehlgeschlagen');
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
          setError(result.error || 'Login fehlgeschlagen. Bitte prüfen Sie Ihre Daten.');
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
              src="/logo.png" 
              alt="Rot-Gelb Sürth Herren 40" 
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
            marginBottom: '1.5rem'
          }}>
            Spiel, Satz und Übersicht
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <>
              <div className="form-group">
                <label>👤 Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Max Mustermann"
                  required
                />
              </div>

              <div className="form-group">
                <label>📱 Telefon</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+49 123 456789"
                />
              </div>

              <div className="form-group">
                <label>🏆 Leistungsklasse</label>
                <input
                  type="text"
                  value={ranking}
                  onChange={(e) => setRanking(e.target.value)}
                  placeholder="z.B. LK 10"
                />
              </div>
            </>
          )}

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
          </div>

          {error && (
            <div className="error-message">
              ❌ {error}
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
              setName('');
              setPhone('');
              setRanking('');
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
    </div>
  );
}

export default SupabaseLogin;


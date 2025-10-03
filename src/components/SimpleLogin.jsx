import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

function SimpleLogin() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, completeProfile } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    // Validierung
    if (!code || code.length !== 4) {
      setError('Bitte 4-stelligen Code eingeben');
      return;
    }

    if (isNewUser && !name.trim()) {
      setError('Bitte Namen eingeben');
      return;
    }

    // Admin-Login (Code 1234)
    if (code === '1234') {
      const result = login(code, true); // Admin
      if (result.success) {
        navigate('/');
      }
      return;
    }

    // Spieler-Login
    const result = login(code, false);
    
    if (result.success) {
      if (result.needsProfile && name.trim()) {
        // Neuer Spieler - Name setzen
        completeProfile({ name: name.trim() });
      }
      navigate('/');
    } else {
      setError('Login fehlgeschlagen');
      setCode('');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card fade-in">
        <div className="login-header">
          <div className="tennis-icon">🎾</div>
          <h1>Tennis Team</h1>
          <p>Einfach anmelden oder registrieren</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {/* Name (nur für neue User) */}
          {isNewUser && (
            <div className="form-group">
              <label htmlFor="name">Dein Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Max Mustermann"
                autoComplete="name"
                required={isNewUser}
              />
            </div>
          )}

          {/* Code */}
          <div className="form-group">
            <label htmlFor="code">
              {isNewUser ? 'Wähle deinen 4-stelligen Code' : 'Dein 4-stelliger Code'}
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setCode(value);
              }}
              placeholder="z.B. 5678"
              maxLength={4}
              pattern="\d{4}"
              autoComplete="off"
              style={{
                fontSize: '1.5rem',
                letterSpacing: '0.5rem',
                textAlign: 'center'
              }}
              required
            />
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              {isNewUser 
                ? '💡 Merke dir diesen Code für zukünftige Logins' 
                : '🔑 Gib deinen persönlichen Code ein'}
            </small>
          </div>

          {error && (
            <div className="error-message" style={{
              padding: '0.75rem',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              color: '#c33',
              textAlign: 'center'
            }}>
              ❌ {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn-login"
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              backgroundColor: '#2ecc71',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {isNewUser ? '🚀 Registrieren & Starten' : '🎾 Anmelden'}
          </button>
        </form>

        {/* Toggle zwischen Login und Registrierung */}
        <div style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          paddingTop: '1rem',
          borderTop: '1px solid #e0e0e0'
        }}>
          <button
            onClick={() => {
              setIsNewUser(!isNewUser);
              setError('');
              setName('');
              setCode('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#3498db',
              cursor: 'pointer',
              fontSize: '0.95rem',
              textDecoration: 'underline'
            }}
          >
            {isNewUser 
              ? '← Ich habe bereits einen Code' 
              : '✨ Neuer Spieler? Hier registrieren'}
          </button>
        </div>

        {/* Hinweise */}
        <div className="demo-hint" style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          fontSize: '0.85rem'
        }}>
          <p style={{ marginBottom: '0.5rem' }}><strong>💡 So funktioniert's:</strong></p>
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', lineHeight: '1.6' }}>
            <li><strong>Neu hier?</strong> Klicke "Neuer Spieler", gib Namen + 4-stelligen Code ein</li>
            <li><strong>Schon registriert?</strong> Gib einfach deinen Code ein</li>
            <li><strong>Admin?</strong> Code <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '4px' }}>1234</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default SimpleLogin;


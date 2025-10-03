import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Shield } from 'lucide-react';
import './Login.css';

function Login() {
  const [loginMode, setLoginMode] = useState('player'); // 'player' or 'admin'
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!code || code.length !== 4) {
      setError('Bitte geben Sie einen 4-stelligen Code ein');
      return;
    }

    const result = login(code, loginMode === 'admin');
    
    if (result.success) {
      if (result.needsProfile) {
        // New player - redirect to profile completion
        navigate('/profile?setup=true');
      } else {
        // Existing user - go to dashboard
        navigate('/');
      }
    } else {
      if (loginMode === 'admin') {
        setError('Ungültiger Admin-Code');
      } else {
        setError('Login fehlgeschlagen. Bitte versuchen Sie es erneut.');
      }
      setCode('');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card fade-in">
        <div className="login-header">
          <div className="tennis-icon">🎾</div>
          <h1>Tennis Team Organizer</h1>
          <p>Willkommen zurück!</p>
        </div>

        {/* Tab Selector */}
        <div className="login-tabs">
          <button
            className={`tab ${loginMode === 'player' ? 'active' : ''}`}
            onClick={() => {
              setLoginMode('player');
              setCode('');
              setError('');
            }}
          >
            <User size={20} />
            Spieler
          </button>
          <button
            className={`tab ${loginMode === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setLoginMode('admin');
              setCode('');
              setError('');
            }}
          >
            <Shield size={20} />
            Admin
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="code">
              <Lock size={18} />
              {loginMode === 'player' ? 'Ihr 4-stelliger Code' : 'Admin-Code'}
            </label>
            <input
              type="password"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="____"
              autoFocus
              required
              maxLength="4"
              pattern="\d{4}"
              className="code-input"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="btn btn-primary btn-full">
            Anmelden
          </button>
        </form>
        
        <div className="login-footer">
          {loginMode === 'player' ? (
            <>
              <p className="hint">👋 <strong>Neu hier?</strong></p>
              <p className="hint-text">Wählen Sie einen beliebigen 4-stelligen Code (z.B. 1111) und Sie werden durch die Ersteinrichtung geführt.</p>
              <p className="hint-text">💡 Merken Sie sich Ihren Code - Sie benötigen ihn beim nächsten Login!</p>
            </>
          ) : (
            <>
              <p className="hint">🔐 <strong>Admin-Bereich</strong></p>
              <p className="hint-text">Nur für Teamleiter. Verwenden Sie den Admin-Code: <strong>1234</strong></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;

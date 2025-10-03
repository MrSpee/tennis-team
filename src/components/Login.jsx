import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react';
import './Login.css';

function Login() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (login(code)) {
      navigate('/');
    } else {
      setError('Ungültiger Zugangscode');
      setCode('');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card fade-in">
        <div className="login-header">
          <div className="tennis-icon">🎾</div>
          <h1>Tennis Team Organizer</h1>
          <p>Anmeldung für Teammitglieder</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="code">
              <Lock size={18} />
              Zugangscode
            </label>
            <input
              type="password"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code eingeben"
              autoFocus
              required
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="btn btn-primary btn-full">
            Anmelden
          </button>
        </form>
        
        <div className="login-footer">
          <p className="hint">Demo-Codes:</p>
          <p className="hint-code">Team Captain: <strong>1234</strong></p>
          <p className="hint-code">Spieler: <strong>5678</strong></p>
        </div>
      </div>
    </div>
  );
}

export default Login;

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './PasswordReset.css';

function PasswordReset({ onClose }) {
  const { requestPasswordReset, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleRequestReset = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await requestPasswordReset();
      
      if (result.success) {
        setSuccess(result.message);
        // Nach 5 Sekunden schließen
        setTimeout(() => {
          onClose();
        }, 5000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(`Unerwarteter Fehler: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-reset-modal">
      <div className="password-reset-content">
        <div className="password-reset-header">
          <h2>🔐 Passwort zurücksetzen</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="password-reset-body">
          <div className="info-section">
            <div className="info-icon">📧</div>
            <div className="info-content">
              <h3>🎾 Passwort vergessen? Kein Problem!</h3>
              <p>
                Wir schicken dir eine coole E-Mail mit einem magischen Link zum Passwort-Reset. 
                Keine Sorge, das passiert auch den besten Tennis-Spielern! 😄
              </p>
              <p className="email-info">
                <strong>📮 Deine E-Mail:</strong> {currentUser?.email}
              </p>
            </div>
          </div>

          <div className="steps-section">
            <h4>🎯 So läuft's ab (super einfach!):</h4>
            <ol>
              <li>📧 Du bekommst eine E-Mail von uns (nicht vom Spam-Ordner fressen lassen!)</li>
              <li>🔗 Ein Klick auf den Link und du bist schon fast fertig</li>
              <li>🔐 Neues Passwort ausdenken (muss nicht tennis123 sein 😉)</li>
              <li>✅ Zack - du bist wieder drin und kannst weiter Tennis spielen!</li>
            </ol>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              🤷‍♂️ Egal, bleib ich halt ausgesperrt
            </button>
            <button 
              type="button" 
              onClick={handleRequestReset} 
              disabled={loading}
              className="btn-reset"
            >
              {loading ? '⏳ E-Mail fliegt schon zu dir...' : '🚀 E-Mail losjagen!'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PasswordReset;

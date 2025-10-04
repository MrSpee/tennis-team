import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './PasswordChange.css';

function PasswordChange({ onClose }) {
  const { changePassword } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Fehler zurücksetzen bei Eingabe
    if (error) setError('');
  };

  const validatePassword = (password) => {
    // Mindestens 8 Zeichen, 1 Großbuchstabe, 1 Kleinbuchstabe, 1 Zahl
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    return {
      valid: minLength && hasUpperCase && hasLowerCase && hasNumbers,
      errors: [
        !minLength && 'Mindestens 8 Zeichen',
        !hasUpperCase && 'Mindestens 1 Großbuchstabe',
        !hasLowerCase && 'Mindestens 1 Kleinbuchstabe',
        !hasNumbers && 'Mindestens 1 Zahl'
      ].filter(Boolean)
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validierung
    if (!formData.currentPassword) {
      setError('Bitte geben Sie Ihr aktuelles Passwort ein.');
      return;
    }

    if (!formData.newPassword) {
      setError('Bitte geben Sie ein neues Passwort ein.');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Die neuen Passwörter stimmen nicht überein.');
      return;
    }

    // Passwort-Stärke prüfen
    const validation = validatePassword(formData.newPassword);
    if (!validation.valid) {
      setError(`Passwort-Anforderungen nicht erfüllt: ${validation.errors.join(', ')}`);
      return;
    }

    setLoading(true);

    try {
      const result = await changePassword(formData.newPassword);
      
      if (result.success) {
        setSuccess('✅ Passwort erfolgreich geändert!');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        // Nach 2 Sekunden schließen
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(`Fehler beim Ändern des Passworts: ${result.error}`);
      }
    } catch (error) {
      setError(`Unerwarteter Fehler: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const passwordValidation = formData.newPassword ? validatePassword(formData.newPassword) : null;

  return (
    <div className="password-change-modal">
      <div className="password-change-content">
        <div className="password-change-header">
          <h2>🔐 Passwort ändern</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="password-change-form">
          <div className="form-group">
            <label htmlFor="currentPassword">Aktuelles Passwort</label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">Neues Passwort</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              required
              disabled={loading}
            />
            {passwordValidation && (
              <div className={`password-requirements ${passwordValidation.valid ? 'valid' : 'invalid'}`}>
                <h4>Passwort-Anforderungen:</h4>
                <ul>
                  <li className={formData.newPassword.length >= 8 ? 'met' : 'not-met'}>
                    Mindestens 8 Zeichen
                  </li>
                  <li className={/[A-Z]/.test(formData.newPassword) ? 'met' : 'not-met'}>
                    Mindestens 1 Großbuchstabe
                  </li>
                  <li className={/[a-z]/.test(formData.newPassword) ? 'met' : 'not-met'}>
                    Mindestens 1 Kleinbuchstabe
                  </li>
                  <li className={/\d/.test(formData.newPassword) ? 'met' : 'not-met'}>
                    Mindestens 1 Zahl
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Neues Passwort bestätigen</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={loading}
            />
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <div className="error-message">Passwörter stimmen nicht überein</div>
            )}
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
              Abbrechen
            </button>
            <button type="submit" disabled={loading}>
              {loading ? '⏳ Ändere Passwort...' : '✅ Passwort ändern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PasswordChange;

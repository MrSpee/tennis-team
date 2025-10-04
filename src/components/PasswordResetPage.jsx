import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import './PasswordResetPage.css';

function PasswordResetPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    checkPasswordReset();
  }, []);

  const checkPasswordReset = async () => {
    try {
      console.log('🔄 Checking password reset session...');
      
      // Prüfe ob wir von einem Passwort-Reset kommen
      const { data, error } = await supabase.auth.getSession();
      
      console.log('📊 Session check result:', { session: data.session, error });
      
      if (error) {
        console.error('❌ Session check error:', error);
        setError('Ups! Da ist was schiefgelaufen. Versuch es nochmal mit dem Link aus der E-Mail! 🤔');
        setLoading(false);
        return;
      }

      if (!data.session) {
        console.log('❌ No session found');
        setError('Keine aktive Session gefunden. Bitte klicke auf den Link in deiner E-Mail! 📧');
        setLoading(false);
        return;
      }

      // Session vorhanden - Passwort kann geändert werden
      console.log('✅ Session found, ready for password update');
      setLoading(false);
      // Keine Success-Meldung hier, da sie die echte Erfolgsmeldung überschreiben würde
      
    } catch (error) {
      console.error('❌ Password reset check error:', error);
      setError('Ups! Da ist ein Fehler aufgetreten. Versuch es nochmal! 😅');
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein! Versuch es nochmal 😊');
      return;
    }

    if (newPassword.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein! 📏');
      return;
    }

    setIsUpdating(true);
    setError('');

    try {
      console.log('🔄 Attempting password update...');
      
      // Prüfe nochmal die aktuelle Session
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('📊 Current session before update:', sessionData.session);
      
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      console.log('📊 Password update result:', { data, error: updateError });

      if (updateError) {
        console.error('❌ Password update error:', updateError);
        setError(`Hmm, da ist was schiefgelaufen: ${updateError.message}. Versuch es nochmal! 🤷‍♂️`);
        setIsUpdating(false);
        return;
      }

      console.log('✅ Password update successful!');
      setSuccess('🎉 Mega! Dein Passwort wurde erfolgreich geändert! Du wirst jetzt zur App weitergeleitet...');
      setIsUpdating(false);
      
      // Nach 3 Sekunden zur App weiterleiten
      setTimeout(() => {
        console.log('🔄 Redirecting to dashboard...');
        navigate('/dashboard');
      }, 3000);

    } catch (error) {
      console.error('❌ Password update exception:', error);
      setError(`Oops! Da ist ein Fehler aufgetreten: ${error.message}. Keine Panik, versuch's einfach nochmal! 😅`);
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="password-reset-page">
        <div className="password-reset-container">
          <div className="loading-section">
            <div className="loading-icon">🎾</div>
            <h2>Prüfe deinen Passwort-Reset...</h2>
            <p>Einen Moment, wir checken deinen Link! 😊</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="password-reset-page">
      <div className="password-reset-container">

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

        {!error && (
          <form onSubmit={handlePasswordUpdate} className="password-form">
            <div className="form-header">
              <h2>🔐 Neues Passwort eingeben</h2>
              <p>Du bist fast fertig! Gib einfach dein neues Passwort ein 🎯</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="newPassword">
                🎾 Neues Passwort
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mindestens 6 Zeichen..."
                required
                disabled={isUpdating}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                🔄 Passwort bestätigen
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nochmal eingeben..."
                required
                disabled={isUpdating}
              />
            </div>

            <div className="password-requirements">
              <h4>🎯 Passwort-Anforderungen:</h4>
              <ul>
                <li>Mindestens 6 Zeichen lang</li>
                <li>Am besten eine Mischung aus Buchstaben und Zahlen</li>
                <li>Muss nicht "tennis123" sein 😉</li>
              </ul>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => navigate('/login')}
                disabled={isUpdating}
                className="btn-cancel"
              >
                🤷‍♂️ Zurück zum Login
              </button>
              <button 
                type="submit" 
                disabled={isUpdating}
                className="btn-update"
              >
                {isUpdating ? '⏳ Passwort wird gespeichert...' : '🚀 Passwort ändern!'}
              </button>
            </div>
          </form>
        )}

        <div className="help-section">
          <h4>🆘 Hilfe benötigt?</h4>
          <p>Falls du Probleme hast, frag einfach deinen Captain Daniel! Er hilft gerne 😊</p>
        </div>
      </div>
    </div>
  );
}

export default PasswordResetPage;

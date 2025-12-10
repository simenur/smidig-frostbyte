import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { auth } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/Logo.png';
import './ChangePassword.css';

function ChangePassword() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('changePassword.errors.allFieldsRequired'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('changePassword.errors.passwordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('changePassword.errors.passwordsDontMatch'));
      return;
    }

    if (newPassword === currentPassword) {
      setError(t('changePassword.errors.samePassword'));
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;

      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error changing password:', error);

      if (error.code === 'auth/wrong-password') {
        setError(t('changePassword.errors.wrongPassword'));
      } else if (error.code === 'auth/weak-password') {
        setError(t('changePassword.errors.weakPassword'));
      } else {
        setError(t('changePassword.errors.failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-container">
      <header className="change-password-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← {t('common.back')}
        </button>
        <div className="header-brand">
          <img src={logo} alt="Logo" className="header-logo" />
          <h1>{t('changePassword.title')}</h1>
        </div>
        <button onClick={toggleTheme} className="theme-button" title={theme === 'light' ? t('dashboard.theme.switchToDark') : t('dashboard.theme.switchToLight')}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </header>

      <main className="change-password-main">
        <div className="change-password-card">
          <h2>{t('changePassword.subtitle')}</h2>
          <p className="change-password-description">
            {t('changePassword.description')}
          </p>

          <form onSubmit={handleSubmit} className="change-password-form">
            <div className="form-group">
              <label htmlFor="currentPassword">
                {t('changePassword.currentPassword')}
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('changePassword.currentPasswordPlaceholder')}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">
                {t('changePassword.newPassword')}
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('changePassword.newPasswordPlaceholder')}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                {t('changePassword.confirmPassword')}
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('changePassword.confirmPasswordPlaceholder')}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {success && (
              <div className="success-message">
                {t('changePassword.success')}
              </div>
            )}

            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? t('changePassword.changing') : t('changePassword.changeButton')}
            </button>
          </form>

          <div className="password-requirements">
            <h4>{t('changePassword.requirements.title')}</h4>
            <ul>
              <li>{t('changePassword.requirements.minLength')}</li>
              <li>{t('changePassword.requirements.different')}</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ChangePassword;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { auth, db } from '../firebase';
import logo from '../assets/Logo.png';
import './Register.css';

function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!email.trim() || !password || !confirmPassword) {
        setError(t('register.errors.allFieldsRequired'));
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError(t('register.errors.passwordTooShort'));
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError(t('register.errors.passwordsDontMatch'));
        setLoading(false);
        return;
      }

      const emailLower = email.trim().toLowerCase();

      // Check if email exists in pendingParents collection
      const pendingQuery = query(
        collection(db, 'pendingParents'),
        where('email', '==', emailLower)
      );
      const pendingSnapshot = await getDocs(pendingQuery);

      if (pendingSnapshot.empty) {
        setError(t('register.errors.notInvited'));
        setLoading(false);
        return;
      }

      // Get the pending parent data
      const pendingParentDoc = pendingSnapshot.docs[0];
      const pendingParentData = pendingParentDoc.data();

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, emailLower, password);
      const user = userCredential.user;

      // Create user document in users collection
      await setDoc(doc(db, 'users', user.uid), {
        email: emailLower,
        name: pendingParentData.name,
        phone: pendingParentData.phone || null,
        role: 'parent',
        createdAt: new Date(),
        registeredAt: new Date()
      });

      // Delete from pendingParents collection
      await deleteDoc(doc(db, 'pendingParents', pendingParentDoc.id));

      // Success - user will be automatically redirected by App.jsx auth listener
      // The auth listener will detect the new user and redirect to dashboard
    } catch (error) {
      console.error('Registration error:', error);

      // Handle specific Firebase Auth errors
      if (error.code === 'auth/email-already-in-use') {
        setError(t('register.errors.emailInUse'));
      } else if (error.code === 'auth/invalid-email') {
        setError(t('register.errors.invalidEmail'));
      } else if (error.code === 'auth/weak-password') {
        setError(t('register.errors.weakPassword'));
      } else {
        setError(t('register.errors.failed') + ': ' + error.message);
      }
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <img src={logo} alt="Logo" className="register-logo" />
        <h1>{t('register.title')}</h1>
        <h2>{t('register.subtitle')}</h2>
        <p className="register-description">{t('register.description')}</p>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t('register.confirmPassword')}</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('register.confirmPasswordPlaceholder')}
              disabled={loading}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? t('register.registering') : t('register.registerButton')}
          </button>
        </form>

        <div className="register-footer">
          <p>{t('register.alreadyHaveAccount')}</p>
          <button onClick={() => navigate('/login')} className="login-link-button">
            {t('auth.login')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;

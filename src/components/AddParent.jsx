import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { auth, db } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import logo from '../assets/Logo.png';
import './AddParent.css';

function AddParent() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { showSuccess } = useToast();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    password: ''
  });

  useEffect(() => {
    const checkUserRole = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          setUserRole(role);

          if (role !== 'staff') {
            // Only staff can add parents
            navigate('/dashboard');
          }
        } else {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateRandomPassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!formData.email.trim()) {
      setError(t('addParent.errors.emailRequired'));
      return;
    }

    if (!formData.name.trim()) {
      setError(t('addParent.errors.nameRequired'));
      return;
    }

    setSubmitting(true);

    try {
      // Generate a random password for the parent
      const tempPassword = formData.password || generateRandomPassword();

      // Import Firebase Auth functions dynamically to avoid issues
      const { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } = await import('firebase/auth');

      // Get current user's credentials to re-authenticate later
      const currentUserEmail = auth.currentUser.email;

      // Note: This is a workaround. The proper way is to use Cloud Functions.
      // Creating a new user will log out the current user, so we need to handle that.

      // For now, we'll create the Firestore document manually and ask the parent to register themselves
      // or we can send them an invitation link

      // Alternative approach: Store as "pending parent" and handle via Cloud Function or manual process
      const parentData = {
        email: formData.email.trim().toLowerCase(),
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        role: 'parent',
        createdAt: new Date(),
        createdBy: auth.currentUser.uid,
        status: 'pending' // Mark as pending until they complete registration
      };

      // Add to a "pendingParents" collection
      await addDoc(collection(db, 'pendingParents'), parentData);

      setSuccess(true);
      setFormData({
        email: '',
        name: '',
        phone: '',
        password: ''
      });

      showSuccess(t('addParent.pendingMessage', { email: formData.email }));

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error adding parent:', error);
      setError(t('addParent.errors.failed') + ': ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="add-parent-container">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (userRole !== 'staff') {
    return null;
  }

  return (
    <div className="add-parent-container">
      <header className="add-parent-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← {t('common.back')}
        </button>
        <div className="header-brand">
          <img src={logo} alt="Logo" className="header-logo" />
          <h1>{t('addParent.title')}</h1>
        </div>
        <button onClick={toggleTheme} className="theme-button" title={theme === 'light' ? t('dashboard.theme.switchToDark') : t('dashboard.theme.switchToLight')}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </header>

      <main className="add-parent-main">
        <div className="add-parent-card">
          <h2>{t('addParent.subtitle')}</h2>
          <p className="add-parent-description">
            {t('addParent.description')}
          </p>

          <form onSubmit={handleSubmit} className="add-parent-form">
            <div className="form-group">
              <label htmlFor="email">
                {t('addParent.fields.email')} <span className="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t('addParent.fields.emailPlaceholder')}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="name">
                {t('addParent.fields.name')} <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t('addParent.fields.namePlaceholder')}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                {t('addParent.fields.phone')}
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder={t('addParent.fields.phonePlaceholder')}
                disabled={submitting}
              />
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {success && (
              <div className="success-message">
                {t('addParent.success')}
              </div>
            )}

            <button
              type="submit"
              className="submit-button"
              disabled={submitting}
            >
              {submitting ? t('addParent.submitting') : t('addParent.submitButton')}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default AddParent;

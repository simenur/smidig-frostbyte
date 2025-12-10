import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { auth, db } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/Logo.png';
import './AddChild.css';

// Department constants
const DEPARTMENTS = ['Småbarna', 'Mellombarna', 'Storbarna'];

function AddChild() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    department: DEPARTMENTS[0],
    allergies: '',
    notes: '',
    emergencyContact: {
      name: '',
      phone: '',
      email: ''
    }
  });

  const [parents, setParents] = useState([
    { email: '', name: '', phone: '' }
  ]);

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
            // Only staff can add children
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

  const handleEmergencyContactChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [name]: value
      }
    }));
  };

  const handleParentChange = (index, field, value) => {
    setParents(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const addParent = () => {
    setParents(prev => [...prev, { email: '', name: '', phone: '' }]);
  };

  const removeParent = (index) => {
    if (parents.length > 1) {
      setParents(prev => prev.filter((_, i) => i !== index));
    }
  };

  const findOrCreateParents = async (parentsData) => {
    const parentIds = [];
    const errors = [];

    for (const parent of parentsData) {
      if (!parent.email.trim()) {
        continue; // Skip empty entries
      }

      try {
        // Check if user with this email already exists in Firestore
        const usersQuery = query(
          collection(db, 'users'),
          where('email', '==', parent.email.trim().toLowerCase())
        );
        const usersSnapshot = await getDocs(usersQuery);

        if (!usersSnapshot.empty) {
          // Parent already exists, use their UID
          const existingUser = usersSnapshot.docs[0];
          parentIds.push(existingUser.id);
        } else {
          // Parent doesn't exist - need to create account
          // For now, we'll store them in pendingParents
          // In a production app, you'd call a Cloud Function here
          errors.push(`${parent.email} må opprettes manuelt (Cloud Function ikke implementert ennå)`);
        }
      } catch (err) {
        console.error('Error processing parent:', parent.email, err);
        errors.push(`Feil ved prosessering av ${parent.email}`);
      }
    }

    return { parentIds, errors };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!formData.name.trim()) {
      setError(t('addChild.errors.nameRequired'));
      return;
    }

    // Check if at least one parent has email
    const validParents = parents.filter(p => p.email.trim() && p.name.trim());
    if (validParents.length === 0) {
      setError(t('addChild.errors.parentEmailRequired'));
      return;
    }

    setSubmitting(true);

    try {
      // Find or create parent accounts
      const { parentIds, errors } = await findOrCreateParents(validParents);

      if (errors.length > 0) {
        setError(errors.join(', '));
        setSubmitting(false);
        return;
      }

      if (parentIds.length === 0) {
        setError(t('addChild.errors.noValidParents'));
        setSubmitting(false);
        return;
      }

      // Create child document
      const childData = {
        name: formData.name.trim(),
        department: formData.department,
        parentIds: parentIds,
        parentInfo: validParents.map(p => ({
          email: p.email.trim().toLowerCase(),
          name: p.name.trim(),
          phone: p.phone.trim() || null
        })),
        allergies: formData.allergies.trim() || null,
        notes: formData.notes.trim() || null,
        emergencyContact: {
          name: formData.emergencyContact.name.trim() || null,
          phone: formData.emergencyContact.phone.trim() || null,
          email: formData.emergencyContact.email.trim() || null
        },
        checkedIn: false,
        lastCheckIn: null,
        lastCheckOut: null,
        createdAt: new Date(),
        createdBy: auth.currentUser.uid
      };

      await addDoc(collection(db, 'children'), childData);

      setSuccess(true);

      // Reset form
      setFormData({
        name: '',
        department: DEPARTMENTS[0],
        allergies: '',
        notes: '',
        emergencyContact: {
          name: '',
          phone: '',
          email: ''
        }
      });
      setParents([{ email: '', name: '', phone: '' }]);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error adding child:', error);
      setError(t('addChild.errors.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="add-child-container">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (userRole !== 'staff') {
    return null;
  }

  return (
    <div className="add-child-container">
      <header className="add-child-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← {t('common.back')}
        </button>
        <div className="header-brand">
          <img src={logo} alt="Logo" className="header-logo" />
          <h1>{t('addChild.title')}</h1>
        </div>
        <button onClick={toggleTheme} className="theme-button" title={theme === 'light' ? t('dashboard.theme.switchToDark') : t('dashboard.theme.switchToLight')}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </header>

      <main className="add-child-main">
        <div className="add-child-card">
          <h2>{t('addChild.subtitle')}</h2>
          <p className="add-child-description">
            {t('addChild.description')}
          </p>

          <form onSubmit={handleSubmit} className="add-child-form">
            <div className="form-group">
              <label htmlFor="name">
                {t('addChild.fields.name')} <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t('addChild.fields.namePlaceholder')}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="department">
                {t('addChild.fields.department')} <span className="required">*</span>
              </label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                disabled={submitting}
                required
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="form-section-title">
              <h3>{t('addChild.parents.title')}</h3>
            </div>

            {parents.map((parent, index) => (
              <div key={index} className="parent-group">
                <div className="parent-group-header">
                  <h4>{t('addChild.parents.parentNumber', { number: index + 1 })}</h4>
                  {parents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParent(index)}
                      className="remove-parent-button"
                      disabled={submitting}
                    >
                      {t('addChild.parents.remove')}
                    </button>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor={`parent-email-${index}`}>
                    {t('addChild.parents.email')} <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    id={`parent-email-${index}`}
                    value={parent.email}
                    onChange={(e) => handleParentChange(index, 'email', e.target.value)}
                    placeholder={t('addChild.parents.emailPlaceholder')}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`parent-name-${index}`}>
                    {t('addChild.parents.name')} <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id={`parent-name-${index}`}
                    value={parent.name}
                    onChange={(e) => handleParentChange(index, 'name', e.target.value)}
                    placeholder={t('addChild.parents.namePlaceholder')}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`parent-phone-${index}`}>
                    {t('addChild.parents.phone')}
                  </label>
                  <input
                    type="tel"
                    id={`parent-phone-${index}`}
                    value={parent.phone}
                    onChange={(e) => handleParentChange(index, 'phone', e.target.value)}
                    placeholder={t('addChild.parents.phonePlaceholder')}
                    disabled={submitting}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addParent}
              className="add-another-parent-button"
              disabled={submitting}
            >
              + {t('addChild.parents.addAnother')}
            </button>

            <div className="form-group">
              <label htmlFor="allergies">
                {t('addChild.fields.allergies')}
              </label>
              <input
                type="text"
                id="allergies"
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                placeholder={t('addChild.fields.allergiesPlaceholder')}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">
                {t('addChild.fields.notes')}
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder={t('addChild.fields.notesPlaceholder')}
                rows="3"
                disabled={submitting}
              />
            </div>

            <div className="form-section-title">
              <h3>{t('addChild.emergencyContact.title')}</h3>
            </div>

            <div className="form-group">
              <label htmlFor="emergencyContactName">
                {t('addChild.emergencyContact.name')}
              </label>
              <input
                type="text"
                id="emergencyContactName"
                name="name"
                value={formData.emergencyContact.name}
                onChange={handleEmergencyContactChange}
                placeholder={t('addChild.emergencyContact.namePlaceholder')}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="emergencyContactPhone">
                {t('addChild.emergencyContact.phone')}
              </label>
              <input
                type="tel"
                id="emergencyContactPhone"
                name="phone"
                value={formData.emergencyContact.phone}
                onChange={handleEmergencyContactChange}
                placeholder={t('addChild.emergencyContact.phonePlaceholder')}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="emergencyContactEmail">
                {t('addChild.emergencyContact.email')}
              </label>
              <input
                type="email"
                id="emergencyContactEmail"
                name="email"
                value={formData.emergencyContact.email}
                onChange={handleEmergencyContactChange}
                placeholder={t('addChild.emergencyContact.emailPlaceholder')}
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
                {t('addChild.success')}
              </div>
            )}

            <button
              type="submit"
              className="submit-button"
              disabled={submitting}
            >
              {submitting ? t('addChild.submitting') : t('addChild.submitButton')}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default AddChild;

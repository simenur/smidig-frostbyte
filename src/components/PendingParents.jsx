import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { auth, db } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import logo from '../assets/Logo.png';
import './PendingParents.css';

function PendingParents() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { showSuccess, showError } = useToast();
  const [pendingParents, setPendingParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Check if user is staff
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          setUserRole(role);

          if (role !== 'staff') {
            navigate('/dashboard');
            return;
          }
        }

        // Fetch pending parents
        const pendingQuery = query(collection(db, 'pendingParents'));
        const querySnapshot = await getDocs(pendingQuery);

        const parents = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setPendingParents(parents);
      } catch (error) {
        console.error('Error fetching pending parents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleDelete = async (parentId, parentName) => {
    if (!window.confirm(t('pendingParents.delete.confirm', { name: parentName }))) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'pendingParents', parentId));
      setPendingParents(pendingParents.filter(p => p.id !== parentId));
      showSuccess(t('pendingParents.delete.success', { name: parentName }));
    } catch (error) {
      console.error('Error deleting pending parent:', error);
      showError(t('pendingParents.delete.error'));
    }
  };

  if (loading) {
    return (
      <div className="pending-parents-container">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (userRole !== 'staff') {
    return null;
  }

  return (
    <div className="pending-parents-container">
      <header className="pending-parents-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← {t('common.back')}
        </button>
        <div className="header-brand">
          <img src={logo} alt="Logo" className="header-logo" />
          <h1>{t('pendingParents.title')}</h1>
        </div>
        <button onClick={toggleTheme} className="theme-button" title={theme === 'light' ? t('dashboard.theme.switchToDark') : t('dashboard.theme.switchToLight')}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </header>

      <main className="pending-parents-main">
        <div className="pending-parents-card">
          <h2>{t('pendingParents.subtitle')}</h2>
          <p className="pending-parents-description">
            {t('pendingParents.description')}
          </p>

          {pendingParents.length === 0 ? (
            <p className="no-pending-parents">{t('pendingParents.noPending')}</p>
          ) : (
            <div className="pending-parents-list">
              {pendingParents.map(parent => (
                <div key={parent.id} className="pending-parent-item">
                  <div className="pending-parent-info">
                    <h3>{parent.name}</h3>
                    <p className="pending-parent-email">{parent.email}</p>
                    {parent.phone && <p className="pending-parent-phone">{parent.phone}</p>}
                    <p className="pending-parent-date">
                      {t('pendingParents.addedOn')}: {parent.createdAt?.toDate().toLocaleDateString('no-NO')}
                    </p>
                  </div>
                  <div className="pending-parent-actions">
                    <button
                      onClick={() => handleDelete(parent.id, parent.name)}
                      className="delete-pending-button"
                    >
                      {t('pendingParents.deleteButton')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="info-box">
            <h3>{t('pendingParents.infoBox.title')}</h3>
            <p>{t('pendingParents.infoBox.description')}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PendingParents;

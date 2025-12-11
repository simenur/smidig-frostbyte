import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp, addDoc, collection, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { auth, db } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import ActivityLog from './ActivityLog';
import logo from '../assets/Logo.png';
import './ChildProfile.css';

function ChildProfile() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;

      try {
        // Fetch user role
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        let fetchedRole = null;
        if (userDoc.exists()) {
          fetchedRole = userDoc.data().role;
          setUserRole(fetchedRole);
        }

        // Fetch child data
        const childDoc = await getDoc(doc(db, 'children', childId));
        if (childDoc.exists()) {
          const childData = { id: childDoc.id, ...childDoc.data() };

          // Check if user has permission to view this child
          // Use the fetched role directly, not the state
          if (fetchedRole !== 'staff' && !childData.parentIds?.includes(auth.currentUser.uid)) {
            alert(t('profile.messages.noAccess'));
            navigate('/dashboard');
            return;
          }

          setChild(childData);
          setEditedData({
            allergies: childData.allergies || '',
            notes: childData.notes || '',
            emergencyContact: childData.emergencyContact || { name: '', phone: '', email: '' }
          });
        } else {
          alert(t('profile.messages.notFound'));
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error fetching child:', error);
        alert(t('profile.messages.loadError'));
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [childId, navigate]);

  const handleCheckIn = async () => {
    try {
      const now = Timestamp.now();
      const childRef = doc(db, 'children', childId);

      // Update child status
      await updateDoc(childRef, {
        checkedIn: true,
        lastCheckIn: now
      });

      // Log the check-in
      await addDoc(collection(db, 'logs'), {
        childId: childId,
        childName: child.name,
        action: 'check-in',
        timestamp: now,
        performedBy: auth.currentUser.uid,
        performedByEmail: auth.currentUser.email
      });

      setChild({ ...child, checkedIn: true, lastCheckIn: now });
    } catch (error) {
      console.error('Error checking in:', error);
      alert(t('profile.messages.checkInError'));
    }
  };

  const handleCheckOut = async () => {
    try {
      const now = Timestamp.now();
      const childRef = doc(db, 'children', childId);

      // Update child status
      await updateDoc(childRef, {
        checkedIn: false,
        lastCheckOut: now
      });

      // Log the check-out
      await addDoc(collection(db, 'logs'), {
        childId: childId,
        childName: child.name,
        action: 'check-out',
        timestamp: now,
        performedBy: auth.currentUser.uid,
        performedByEmail: auth.currentUser.email
      });

      setChild({ ...child, checkedIn: false, lastCheckOut: now });
    } catch (error) {
      console.error('Error checking out:', error);
      alert(t('profile.messages.checkOutError'));
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset to original data
      setEditedData({
        allergies: child.allergies || '',
        notes: child.notes || '',
        emergencyContact: child.emergencyContact || { name: '', phone: '', email: '' }
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    try {
      const childRef = doc(db, 'children', childId);
      const updateData = {
        allergies: editedData.allergies || null,
        notes: editedData.notes || null,
        emergencyContact: editedData.emergencyContact.name || editedData.emergencyContact.phone || editedData.emergencyContact.email
          ? editedData.emergencyContact
          : null
      };

      await updateDoc(childRef, updateData);

      // Update local state
      setChild({ ...child, ...updateData });
      setIsEditing(false);
      alert(t('profile.messages.updateSuccess'));
    } catch (error) {
      console.error('Error updating child:', error);
      alert(t('profile.messages.updateError'));
    }
  };

  const handleDelete = async () => {
    // Confirmation dialog
    const confirmMessage = t('profile.delete.confirmMessage', { name: child.name });
    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Double confirmation for safety
    const doubleConfirm = t('profile.delete.doubleConfirm');
    if (!window.confirm(doubleConfirm)) {
      return;
    }

    try {
      // Delete all activity logs for this child
      const logsQuery = query(
        collection(db, 'activityLog'),
        where('childId', '==', childId)
      );
      const logsSnapshot = await getDocs(logsQuery);

      const deletePromises = logsSnapshot.docs.map(logDoc =>
        deleteDoc(doc(db, 'activityLog', logDoc.id))
      );
      await Promise.all(deletePromises);

      // Delete the child document
      await deleteDoc(doc(db, 'children', childId));

      alert(t('profile.delete.success', { name: child.name }));
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting child:', error);
      alert(t('profile.delete.error') + ': ' + error.message);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return t('profile.info.never');
    const date = timestamp.toDate();
    return date.toLocaleString('no-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="profile-container">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (!child) {
    return null;
  }

  return (
    <div className="profile-container">
      <header className="profile-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← {t('common.back')}
        </button>
        <div className="header-brand">
          <img src={logo} alt="Logo" className="header-logo" />
          <h1>{t('profile.header.title')}</h1>
        </div>
        <div className="profile-header-actions">
          <button onClick={toggleTheme} className="theme-button" title={theme === 'light' ? t('dashboard.theme.switchToDark') : t('dashboard.theme.switchToLight')}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={handleEditToggle} className="edit-button">
            {isEditing ? t('profile.header.cancel') : t('profile.header.edit')}
          </button>
        </div>
      </header>

      <main className="profile-main">
        <div className="profile-card">
          <div className="profile-avatar">
            {child.name.charAt(0).toUpperCase()}
          </div>

          <h2 className="profile-name">{child.name}</h2>

          <div className={`status-badge ${child.checkedIn ? 'checked-in' : 'checked-out'}`}>
            {child.checkedIn ? t('profile.status.present') : t('profile.status.notPresent')}
          </div>

          <div className="profile-actions">
            {child.checkedIn ? (
              <button onClick={handleCheckOut} className="checkout-button">
                {t('profile.actions.checkOut')}
              </button>
            ) : (
              <button onClick={handleCheckIn} className="checkin-button">
                {t('profile.actions.checkIn')}
              </button>
            )}
            {userRole === 'staff' && (
              <button
                onClick={() => navigate('/messages', {
                  state: {
                    childId: child.id,
                    childName: child.name,
                    department: child.department
                  }
                })}
                className="message-button"
              >
                ✉️ {t('profile.actions.sendMessage')}
              </button>
            )}
          </div>
        </div>

        <div className="info-section">
          <h3>{t('profile.info.title')}</h3>

          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">{t('profile.info.status')}</span>
              <span className="info-value">
                {child.checkedIn ? t('profile.status.presentInKindergarten') : t('profile.status.notPresentText')}
              </span>
            </div>

            <div className="info-item">
              <span className="info-label">{t('profile.info.lastCheckIn')}</span>
              <span className="info-value">{formatTime(child.lastCheckIn)}</span>
            </div>

            <div className="info-item">
              <span className="info-label">{t('profile.info.lastCheckOut')}</span>
              <span className="info-value">{formatTime(child.lastCheckOut)}</span>
            </div>

            <div className="info-item full-width">
              <span className="info-label">{t('profile.info.allergies')}</span>
              {isEditing ? (
                <input
                  type="text"
                  className="info-input"
                  value={editedData.allergies}
                  onChange={(e) => setEditedData({ ...editedData, allergies: e.target.value })}
                  placeholder={t('profile.info.allergiesPlaceholder')}
                />
              ) : (
                <span className="info-value">{child.allergies || t('profile.info.allergiesNone')}</span>
              )}
            </div>

            <div className="info-item full-width">
              <span className="info-label">{t('profile.info.notes')}</span>
              {isEditing ? (
                <textarea
                  className="info-textarea"
                  value={editedData.notes}
                  onChange={(e) => setEditedData({ ...editedData, notes: e.target.value })}
                  placeholder={t('profile.info.notesPlaceholder')}
                  rows="3"
                />
              ) : (
                <span className="info-value">{child.notes || t('profile.info.notesNone')}</span>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="edit-actions">
              <button onClick={handleSave} className="save-button">
                {t('profile.editActions.save')}
              </button>
              <button onClick={handleEditToggle} className="cancel-button">
                {t('profile.editActions.cancel')}
              </button>
            </div>
          )}
        </div>

        <div className="info-section">
          <h3>{t('profile.contact.title')}</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">{t('profile.contact.emergencyContactName')}</span>
              {isEditing ? (
                <input
                  type="text"
                  className="info-input"
                  value={editedData.emergencyContact.name}
                  onChange={(e) => setEditedData({
                    ...editedData,
                    emergencyContact: { ...editedData.emergencyContact, name: e.target.value }
                  })}
                  placeholder={t('profile.contact.emergencyContactNamePlaceholder')}
                />
              ) : (
                <span className="info-value">{child.emergencyContact?.name || t('profile.contact.notProvided')}</span>
              )}
            </div>

            <div className="info-item">
              <span className="info-label">{t('profile.contact.phone')}</span>
              {isEditing ? (
                <input
                  type="tel"
                  className="info-input"
                  value={editedData.emergencyContact.phone}
                  onChange={(e) => setEditedData({
                    ...editedData,
                    emergencyContact: { ...editedData.emergencyContact, phone: e.target.value }
                  })}
                  placeholder={t('profile.contact.phonePlaceholder')}
                />
              ) : (
                <span className="info-value">
                  {child.emergencyContact?.phone ? (
                    <a href={`tel:${child.emergencyContact.phone}`}>
                      {child.emergencyContact.phone}
                    </a>
                  ) : (
                    t('profile.contact.notProvided')
                  )}
                </span>
              )}
            </div>

            <div className="info-item">
              <span className="info-label">{t('profile.contact.email')}</span>
              {isEditing ? (
                <input
                  type="email"
                  className="info-input"
                  value={editedData.emergencyContact.email}
                  onChange={(e) => setEditedData({
                    ...editedData,
                    emergencyContact: { ...editedData.emergencyContact, email: e.target.value }
                  })}
                  placeholder={t('profile.contact.emailPlaceholder')}
                />
              ) : (
                <span className="info-value">
                  {child.emergencyContact?.email ? (
                    <a href={`mailto:${child.emergencyContact.email}`}>
                      {child.emergencyContact.email}
                    </a>
                  ) : (
                    t('profile.contact.notProvided')
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {userRole === 'staff' && (
          <div className="danger-zone">
            <h3>{t('profile.delete.dangerZoneTitle')}</h3>
            <p className="danger-zone-description">{t('profile.delete.dangerZoneDescription')}</p>
            <button onClick={handleDelete} className="delete-button">
              {t('profile.delete.deleteButton')}
            </button>
          </div>
        )}

        <ActivityLog childId={childId} />
      </main>
    </div>
  );
}

export default ChildProfile;

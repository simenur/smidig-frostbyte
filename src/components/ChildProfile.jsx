import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import './ChildProfile.css';

function ChildProfile() {
  const { childId } = useParams();
  const navigate = useNavigate();
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
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }

        // Fetch child data
        const childDoc = await getDoc(doc(db, 'children', childId));
        if (childDoc.exists()) {
          const childData = { id: childDoc.id, ...childDoc.data() };

          // Check if user has permission to view this child
          if (userRole !== 'staff' && !childData.parentIds?.includes(auth.currentUser.uid)) {
            alert('Du har ikke tilgang til dette barnet');
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
          alert('Barn ikke funnet');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error fetching child:', error);
        alert('Kunne ikke laste barnets profil');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [childId, navigate, userRole]);

  const handleCheckIn = async () => {
    try {
      const childRef = doc(db, 'children', childId);
      await updateDoc(childRef, {
        checkedIn: true,
        lastCheckIn: Timestamp.now()
      });
      setChild({ ...child, checkedIn: true, lastCheckIn: Timestamp.now() });
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Kunne ikke krysse inn. Prøv igjen.');
    }
  };

  const handleCheckOut = async () => {
    try {
      const childRef = doc(db, 'children', childId);
      await updateDoc(childRef, {
        checkedIn: false,
        lastCheckOut: Timestamp.now()
      });
      setChild({ ...child, checkedIn: false, lastCheckOut: Timestamp.now() });
    } catch (error) {
      console.error('Error checking out:', error);
      alert('Kunne ikke krysse ut. Prøv igjen.');
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
      alert('Informasjonen ble oppdatert');
    } catch (error) {
      console.error('Error updating child:', error);
      alert('Kunne ikke oppdatere informasjonen. Prøv igjen.');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Aldri';
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
        <p>Laster...</p>
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
          ← Tilbake
        </button>
        <h1>Profil</h1>
        <div className="profile-header-actions">
          <button onClick={toggleTheme} className="theme-button" title={`Bytt til ${theme === 'light' ? 'mørk' : 'lys'} modus`}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={handleEditToggle} className="edit-button">
            {isEditing ? 'Avbryt' : 'Rediger'}
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
            {child.checkedIn ? '✓ Til stede' : '○ Ikke til stede'}
          </div>

          <div className="profile-actions">
            {child.checkedIn ? (
              <button onClick={handleCheckOut} className="checkout-button">
                Kryss ut
              </button>
            ) : (
              <button onClick={handleCheckIn} className="checkin-button">
                Kryss inn
              </button>
            )}
          </div>
        </div>

        <div className="info-section">
          <h3>Informasjon</h3>

          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Status</span>
              <span className="info-value">
                {child.checkedIn ? 'Til stede i barnehagen' : 'Ikke til stede'}
              </span>
            </div>

            <div className="info-item">
              <span className="info-label">Sist krysset inn</span>
              <span className="info-value">{formatTime(child.lastCheckIn)}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Sist krysset ut</span>
              <span className="info-value">{formatTime(child.lastCheckOut)}</span>
            </div>

            <div className="info-item full-width">
              <span className="info-label">Allergier</span>
              {isEditing ? (
                <input
                  type="text"
                  className="info-input"
                  value={editedData.allergies}
                  onChange={(e) => setEditedData({ ...editedData, allergies: e.target.value })}
                  placeholder="F.eks. nøtter, melk, gluten"
                />
              ) : (
                <span className="info-value">{child.allergies || 'Ingen registrert'}</span>
              )}
            </div>

            <div className="info-item full-width">
              <span className="info-label">Notater</span>
              {isEditing ? (
                <textarea
                  className="info-textarea"
                  value={editedData.notes}
                  onChange={(e) => setEditedData({ ...editedData, notes: e.target.value })}
                  placeholder="Viktig informasjon om barnet"
                  rows="3"
                />
              ) : (
                <span className="info-value">{child.notes || 'Ingen notater'}</span>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="edit-actions">
              <button onClick={handleSave} className="save-button">
                Lagre endringer
              </button>
              <button onClick={handleEditToggle} className="cancel-button">
                Avbryt
              </button>
            </div>
          )}
        </div>

        <div className="info-section">
          <h3>Kontaktinformasjon</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Nødkontakt navn</span>
              {isEditing ? (
                <input
                  type="text"
                  className="info-input"
                  value={editedData.emergencyContact.name}
                  onChange={(e) => setEditedData({
                    ...editedData,
                    emergencyContact: { ...editedData.emergencyContact, name: e.target.value }
                  })}
                  placeholder="Navn på kontaktperson"
                />
              ) : (
                <span className="info-value">{child.emergencyContact?.name || 'Ikke oppgitt'}</span>
              )}
            </div>

            <div className="info-item">
              <span className="info-label">Telefon</span>
              {isEditing ? (
                <input
                  type="tel"
                  className="info-input"
                  value={editedData.emergencyContact.phone}
                  onChange={(e) => setEditedData({
                    ...editedData,
                    emergencyContact: { ...editedData.emergencyContact, phone: e.target.value }
                  })}
                  placeholder="12345678"
                />
              ) : (
                <span className="info-value">
                  {child.emergencyContact?.phone ? (
                    <a href={`tel:${child.emergencyContact.phone}`}>
                      {child.emergencyContact.phone}
                    </a>
                  ) : (
                    'Ikke oppgitt'
                  )}
                </span>
              )}
            </div>

            <div className="info-item">
              <span className="info-label">E-post</span>
              {isEditing ? (
                <input
                  type="email"
                  className="info-input"
                  value={editedData.emergencyContact.email}
                  onChange={(e) => setEditedData({
                    ...editedData,
                    emergencyContact: { ...editedData.emergencyContact, email: e.target.value }
                  })}
                  placeholder="epost@eksempel.no"
                />
              ) : (
                <span className="info-value">
                  {child.emergencyContact?.email ? (
                    <a href={`mailto:${child.emergencyContact.email}`}>
                      {child.emergencyContact.email}
                    </a>
                  ) : (
                    'Ikke oppgitt'
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ChildProfile;

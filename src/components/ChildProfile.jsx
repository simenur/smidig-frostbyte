import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './ChildProfile.css';

function ChildProfile() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

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
        <div></div>
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

            {child.allergies && (
              <div className="info-item">
                <span className="info-label">Allergier</span>
                <span className="info-value">{child.allergies}</span>
              </div>
            )}

            {child.notes && (
              <div className="info-item full-width">
                <span className="info-label">Notater</span>
                <span className="info-value">{child.notes}</span>
              </div>
            )}
          </div>
        </div>

        {userRole === 'staff' && child.emergencyContact && (
          <div className="info-section">
            <h3>Kontaktinformasjon</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Nødkontakt</span>
                <span className="info-value">{child.emergencyContact.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Telefon</span>
                <span className="info-value">
                  <a href={`tel:${child.emergencyContact.phone}`}>
                    {child.emergencyContact.phone}
                  </a>
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ChildProfile;

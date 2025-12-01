import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, query, onSnapshot, doc, updateDoc, Timestamp, getDoc, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [children, setChildren] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    // Fetch user profile to get role
    const fetchUserProfile = async () => {
      try {
        console.log('Fetching profile for UID:', auth.currentUser.uid);
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));

        if (userDoc.exists()) {
          const profile = userDoc.data();
          console.log('User profile found:', profile);
          setUserRole(profile.role);
        } else {
          console.error('User profile not found for UID:', auth.currentUser.uid);
          console.error('Make sure you have a document in the "users" collection with this UID as the document ID');
          setUserRole('parent'); // Default to parent if no profile
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUserRole('parent');
      }
    };

    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (!auth.currentUser || userRole === null) return;

    console.log('Querying children for role:', userRole);
    console.log('User UID:', auth.currentUser.uid);

    // Query children based on role
    let q;
    if (userRole === 'staff') {
      // Staff can see all children
      console.log('Staff mode: fetching all children');
      q = query(collection(db, 'children'));
    } else {
      // Parents only see their own children
      console.log('Parent mode: fetching children where parentIds contains', auth.currentUser.uid);
      q = query(
        collection(db, 'children'),
        where('parentIds', 'array-contains', auth.currentUser.uid)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Firestore query returned', snapshot.docs.length, 'children');
      const childrenData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Children data:', childrenData);
      setChildren(childrenData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching children:', error);
      console.error('Error details:', error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userRole]);

  const handleCheckIn = async (childId) => {
    try {
      const childRef = doc(db, 'children', childId);
      await updateDoc(childRef, {
        checkedIn: true,
        lastCheckIn: Timestamp.now()
      });
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Kunne ikke krysse inn. Prøv igjen.');
    }
  };

  const handleCheckOut = async (childId) => {
    try {
      const childRef = doc(db, 'children', childId);
      await updateDoc(childRef, {
        checkedIn: false,
        lastCheckOut: Timestamp.now()
      });
    } catch (error) {
      console.error('Error checking out:', error);
      alert('Kunne ikke krysse ut. Prøv igjen.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate();
    return date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <p>Laster...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>Krysselista</h1>
          <p className="subtitle">Eventyrhagen Barnehage</p>
          {userRole && (
            <p className="role-badge">
              {userRole === 'staff' ? '👨‍💼 Ansatt' : '👨‍👩‍👧 Forelder'}
            </p>
          )}
        </div>
        <div className="header-actions">
          <button onClick={toggleTheme} className="theme-button" title={`Bytt til ${theme === 'light' ? 'mørk' : 'lys'} modus`}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logg ut
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="stats-bar">
          <div className="stat">
            <span className="stat-number">{children.filter(c => c.checkedIn).length}</span>
            <span className="stat-label">Inne</span>
          </div>
          <div className="stat">
            <span className="stat-number">{children.filter(c => !c.checkedIn).length}</span>
            <span className="stat-label">Ute</span>
          </div>
        </div>

        <div className="children-list">
          {children.length === 0 ? (
            <p className="empty-message">Ingen barn registrert ennå.</p>
          ) : (
            children.map((child) => (
              <div key={child.id} className={`child-card ${child.checkedIn ? 'checked-in' : 'checked-out'}`}>
                <div className="child-info">
                  <h3>{child.name}</h3>
                  <p className="child-status">
                    {child.checkedIn ? (
                      <>
                        <span className="status-dot checked-in"></span>
                        Krysset inn kl. {formatTime(child.lastCheckIn)}
                      </>
                    ) : (
                      <>
                        <span className="status-dot checked-out"></span>
                        {child.lastCheckOut ? `Krysset ut kl. ${formatTime(child.lastCheckOut)}` : 'Ikke krysset inn'}
                      </>
                    )}
                  </p>
                </div>
                <div className="child-actions">
                  <button
                    onClick={() => navigate(`/child/${child.id}`)}
                    className="profile-button"
                  >
                    Se profil
                  </button>
                  {child.checkedIn ? (
                    <button
                      onClick={() => handleCheckOut(child.id)}
                      className="checkout-button"
                    >
                      Kryss ut
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCheckIn(child.id)}
                      className="checkin-button"
                    >
                      Kryss inn
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;

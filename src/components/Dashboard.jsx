import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { collection, query, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './Dashboard.css';

function Dashboard() {
  const [children, setChildren] = useState([]);
  const [userRole, setUserRole] = useState('parent'); // 'parent' or 'staff'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for changes in children collection
    const q = query(collection(db, 'children'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const childrenData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChildren(childrenData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching children:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logg ut
        </button>
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, query, onSnapshot, doc, updateDoc, Timestamp, getDoc, where, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import './Dashboard.css';

// Department constants
const DEPARTMENTS = ['Småbarna', 'Mellombarna', 'Storbarna'];

// Test parent UID - used when toggling to parent mode for testing
const TEST_PARENT_UID = 'VtDgO4jGy9Z8LncGTAx6r5zShIv1';

function Dashboard() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [children, setChildren] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'checked-in', 'checked-out'
  const [selectedDepartment, setSelectedDepartment] = useState(DEPARTMENTS[0]); // Default to first department
  const [departmentStaff, setDepartmentStaff] = useState([]); // Staff in selected department
  const [testParentMode, setTestParentMode] = useState(false); // Flag for test parent mode

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
      // Use test parent UID when in test mode
      const parentUid = testParentMode ? TEST_PARENT_UID : auth.currentUser.uid;
      console.log('Parent mode: fetching children where parentIds contains', parentUid);
      q = query(
        collection(db, 'children'),
        where('parentIds', 'array-contains', parentUid)
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
  }, [userRole, testParentMode]);

  // Fetch staff members for selected department (for staff users only)
  useEffect(() => {
    if (!auth.currentUser || userRole !== 'staff') return;

    const q = query(
      collection(db, 'users'),
      where('role', '==', 'staff'),
      where('departments', 'array-contains', selectedDepartment)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDepartmentStaff(staffData);
    }, (error) => {
      console.error('Error fetching staff:', error);
    });

    return () => unsubscribe();
  }, [userRole, selectedDepartment]);

  const handleCheckIn = async (childId) => {
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
        childName: children.find(c => c.id === childId)?.name || 'Unknown',
        action: 'check-in',
        timestamp: now,
        performedBy: auth.currentUser.uid,
        performedByEmail: auth.currentUser.email
      });
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Kunne ikke krysse inn. Prøv igjen.');
    }
  };

  const handleCheckOut = async (childId) => {
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
        childName: children.find(c => c.id === childId)?.name || 'Unknown',
        action: 'check-out',
        timestamp: now,
        performedBy: auth.currentUser.uid,
        performedByEmail: auth.currentUser.email
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

  // TESTING ONLY: Toggle between staff and parent roles
  const toggleRole = () => {
    const newRole = userRole === 'staff' ? 'parent' : 'staff';
    setUserRole(newRole);
    setTestParentMode(newRole === 'parent');
    console.log('🔄 TESTING: Switched role to', newRole);
    if (newRole === 'parent') {
      console.log('🔄 TESTING: Using test parent UID:', TEST_PARENT_UID);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate();
    return date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
  };

  // Filter children based on search query, status filter, and department
  const getFilteredChildren = () => {
    let filtered = children;

    // Apply department filter (for staff only)
    if (userRole === 'staff') {
      filtered = filtered.filter(child => child.department === selectedDepartment);
    }

    // Apply search filter (only for staff)
    if (userRole === 'staff' && searchQuery.trim()) {
      filtered = filtered.filter(child =>
        child.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter (only for staff)
    if (userRole === 'staff' && filter !== 'all') {
      if (filter === 'checked-in') {
        filtered = filtered.filter(child => child.checkedIn);
      } else if (filter === 'checked-out') {
        filtered = filtered.filter(child => !child.checkedIn);
      }
    }

    return filtered;
  };

  const filteredChildren = getFilteredChildren();

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
          <button onClick={toggleRole} className="dev-toggle-button" title="TEST: Bytt rolle">
            🔄 {userRole === 'staff' ? 'Bytt til forelder' : 'Bytt til ansatt'}
          </button>
          <button onClick={toggleTheme} className="theme-button" title={`Bytt til ${theme === 'light' ? 'mørk' : 'lys'} modus`}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logg ut
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {userRole === 'staff' && (
          <>
            {/* Department tabs */}
            <div className="department-tabs">
              {DEPARTMENTS.map(dept => (
                <button
                  key={dept}
                  onClick={() => setSelectedDepartment(dept)}
                  className={`department-tab ${selectedDepartment === dept ? 'active' : ''}`}
                >
                  {dept}
                </button>
              ))}
            </div>

            {/* Staff list for selected department */}
            {departmentStaff.length > 0 && (
              <div className="staff-info">
                <h3>Ansatte på {selectedDepartment}:</h3>
                <div className="staff-list">
                  {departmentStaff.map(staff => (
                    <span key={staff.id} className="staff-badge">
                      {staff.name || staff.email}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="stats-bar">
              <div className="stat">
                <span className="stat-number">{filteredChildren.filter(c => c.checkedIn).length}</span>
                <span className="stat-label">Inne</span>
              </div>
              <div className="stat">
                <span className="stat-number">{filteredChildren.filter(c => !c.checkedIn).length}</span>
                <span className="stat-label">Ute</span>
              </div>
            </div>

            <div className="search-filter-bar">
              <input
                type="text"
                placeholder="Søk etter barn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <div className="filter-buttons">
                <button
                  onClick={() => setFilter('all')}
                  className={`filter-button ${filter === 'all' ? 'active' : ''}`}
                >
                  Alle
                </button>
                <button
                  onClick={() => setFilter('checked-in')}
                  className={`filter-button ${filter === 'checked-in' ? 'active' : ''}`}
                >
                  Inne
                </button>
                <button
                  onClick={() => setFilter('checked-out')}
                  className={`filter-button ${filter === 'checked-out' ? 'active' : ''}`}
                >
                  Ute
                </button>
              </div>
            </div>
          </>
        )}

        <div className="children-list">
          {filteredChildren.length === 0 ? (
            <p className="empty-message">
              {children.length === 0 ? 'Ingen barn registrert ennå.' : 'Ingen barn matcher søket.'}
            </p>
          ) : (
            filteredChildren.map((child) => (
              <div key={child.id} className={`child-card ${child.checkedIn ? 'checked-in' : 'checked-out'}`}>
                <div className="child-info">
                  <div className="child-name-row">
                    <h3>{child.name}</h3>
                    {child.department && (
                      <span className="department-badge">{child.department}</span>
                    )}
                  </div>
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

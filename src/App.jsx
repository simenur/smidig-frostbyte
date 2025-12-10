import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ChildProfile from './components/ChildProfile';
import ChangePassword from './components/ChangePassword';
import AddChild from './components/AddChild';
import AddParent from './components/AddParent';
import './i18n'; // Initialize i18next
import './App.css';

function App() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Set document direction based on language (RTL for Arabic)
  useEffect(() => {
    const isRTL = i18n.language === 'ar';
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" /> : <Login />}
        />
        <Route
          path="/dashboard"
          element={user ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/child/:childId"
          element={user ? <ChildProfile /> : <Navigate to="/login" />}
        />
        <Route
          path="/change-password"
          element={user ? <ChangePassword /> : <Navigate to="/login" />}
        />
        <Route
          path="/add-child"
          element={user ? <AddChild /> : <Navigate to="/login" />}
        />
        <Route
          path="/add-parent"
          element={user ? <AddParent /> : <Navigate to="/login" />}
        />
        <Route
          path="/"
          element={<Navigate to={user ? "/dashboard" : "/login"} />}
        />
      </Routes>
    </Router>
  );
}

export default App;

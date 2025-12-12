import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './BottomNav.css';

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="bottom-nav">
      <button
        onClick={() => navigate('/dashboard')}
        className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
      >
        <span className="nav-icon">🏠</span>
        <span className="nav-label">{t('app.title')}</span>
      </button>

      <button
        onClick={() => navigate('/messages')}
        className={`nav-item ${isActive('/messages') ? 'active' : ''}`}
      >
        <span className="nav-icon">✉️</span>
        <span className="nav-label">{t('messages.title')}</span>
      </button>

      <button
        onClick={() => navigate('/calendar')}
        className={`nav-item ${isActive('/calendar') ? 'active' : ''}`}
      >
        <span className="nav-icon">📅</span>
        <span className="nav-label">{t('calendar.title')}</span>
      </button>
    </nav>
  );
}

export default BottomNav;

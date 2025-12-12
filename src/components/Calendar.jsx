import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, getDoc, Timestamp, orderBy } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { auth, db } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/Logo.png';
import BottomNav from './BottomNav';
import './Calendar.css';

function Calendar() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [events, setEvents] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    type: 'event', // 'event', 'holiday', 'meeting'
    department: 'all', // 'all', 'Småbarna', 'Mellombarna', 'Storbarna'
    announceEvent: true, // Whether to send announcement
    announcementText: '' // Custom announcement text
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch user role
  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        } else {
          setUserRole('parent');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUserRole('parent');
      }
    };

    fetchUserProfile();
  }, []);

  // Fetch events
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'events'),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(eventsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showAddModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddModal]);

  // Auto-generate announcement text when event details change
  useEffect(() => {
    if (newEvent.title && newEvent.date && newEvent.announceEvent) {
      const eventDate = new Date(newEvent.date);
      const defaultText = `📅 ${t('calendar.types.' + newEvent.type)}: ${newEvent.title}\n📆 ${eventDate.toLocaleDateString('no-NO', { day: 'numeric', month: 'long', year: 'numeric' })}${newEvent.description ? '\n\n' + newEvent.description : ''}`;

      // Only update if announcementText is empty or matches the previous default
      if (!newEvent.announcementText || newEvent.announcementText.startsWith('📅')) {
        setNewEvent(prev => ({ ...prev, announcementText: defaultText }));
      }
    }
  }, [newEvent.title, newEvent.date, newEvent.type, newEvent.description, newEvent.announceEvent, t]);

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) {
      alert(t('calendar.errors.requiredFields'));
      return;
    }

    try {
      // Convert date string to Firestore Timestamp
      const eventDate = new Date(newEvent.date);

      // Create event
      await addDoc(collection(db, 'events'), {
        title: newEvent.title,
        description: newEvent.description,
        date: Timestamp.fromDate(eventDate),
        type: newEvent.type,
        department: newEvent.department,
        createdBy: auth.currentUser.uid,
        createdAt: Timestamp.now()
      });

      // Send notification to department chat if announceEvent is checked
      if (newEvent.announceEvent) {
        // Get current user data for sender info
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};

        // Generate message text - use custom text or generate default
        let messageText = newEvent.announcementText?.trim();

        if (!messageText) {
          const eventType = t('calendar.types.' + newEvent.type);
          const formattedDate = eventDate.toLocaleDateString('no-NO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });

          messageText = `📅 ${eventType}: ${newEvent.title}\n📆 ${formattedDate}`;

          if (newEvent.description && newEvent.description.trim()) {
            messageText += `\n\n${newEvent.description}`;
          }
        }

        // Always use staff-broadcast type, but specify department
        await addDoc(collection(db, 'messages'), {
          message: messageText,
          type: 'staff-broadcast',
          department: newEvent.department,
          from: {
            uid: auth.currentUser.uid,
            name: userData.name || auth.currentUser.email,
            role: 'staff'
          },
          timestamp: Timestamp.now(),
          readBy: []
        });
      }

      setNewEvent({ title: '', description: '', date: '', type: 'event', department: 'all', announceEvent: true, announcementText: '' });
      setShowAddModal(false);
      alert(t('calendar.success.eventAdded'));
    } catch (error) {
      console.error('Error adding event:', error);
      alert(t('calendar.errors.addFailed'));
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm(t('calendar.deleteConfirm'))) return;

    try {
      await deleteDoc(doc(db, 'events', eventId));
      alert(t('calendar.success.eventDeleted'));
    } catch (error) {
      console.error('Error deleting event:', error);
      alert(t('calendar.errors.deleteFailed'));
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = event.date.toDate();
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear();
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('no-NO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleDayClick = (date) => {
    if (userRole === 'staff') {
      // Format date as YYYY-MM-DD for date input
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      setNewEvent({ title: '', description: '', date: formattedDate, type: 'event', department: 'all', announceEvent: true, announcementText: '' });
      setShowAddModal(true);
    }
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = new Date().toDateString() === date.toDateString();

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''} ${userRole === 'staff' ? 'clickable' : ''}`}
          onClick={() => handleDayClick(date)}
        >
          <div className="day-number">{day}</div>
          {dayEvents.length > 0 && (
            <div className="day-events">
              {dayEvents.map(event => (
                <div
                  key={event.id}
                  className={`event-dot ${event.type}`}
                  title={event.title}
                ></div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const upcomingEvents = events
    .filter(event => event.date.toDate() >= new Date())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="calendar-container">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <header className="calendar-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← {t('common.back')}
        </button>
        <div className="header-brand" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <img src={logo} alt="Logo" className="header-logo" />
          <h1>{t('calendar.title')}</h1>
        </div>
        <button onClick={toggleTheme} className="theme-button" title={theme === 'light' ? t('dashboard.theme.switchToDark') : t('dashboard.theme.switchToLight')}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </header>

      <main className="calendar-main">
        <div className="calendar-grid-container">
          <div className="calendar-controls">
            <button onClick={prevMonth} className="month-button">❮</button>
            <h2 className="current-month">
              {currentMonth.toLocaleDateString('no-NO', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={nextMonth} className="month-button">❯</button>
            {userRole === 'staff' && (
              <button onClick={() => setShowAddModal(true)} className="add-event-button">
                + {t('calendar.addEvent')}
              </button>
            )}
          </div>

          <div className="calendar-weekdays">
            <div className="weekday">{t('calendar.weekdays.sun')}</div>
            <div className="weekday">{t('calendar.weekdays.mon')}</div>
            <div className="weekday">{t('calendar.weekdays.tue')}</div>
            <div className="weekday">{t('calendar.weekdays.wed')}</div>
            <div className="weekday">{t('calendar.weekdays.thu')}</div>
            <div className="weekday">{t('calendar.weekdays.fri')}</div>
            <div className="weekday">{t('calendar.weekdays.sat')}</div>
          </div>

          <div className="calendar-grid">
            {renderCalendar()}
          </div>
        </div>

        <div className="upcoming-events">
          <h3>{t('calendar.upcomingEvents')}</h3>
          {upcomingEvents.length === 0 ? (
            <p className="no-events">{t('calendar.noUpcoming')}</p>
          ) : (
            <div className="events-list">
              {upcomingEvents.map(event => (
                <div key={event.id} className={`event-card ${event.type}`}>
                  <div className="event-header">
                    <h4>{event.title}</h4>
                    {userRole === 'staff' && (
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="delete-event-button"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  <p className="event-date">{formatDate(event.date)}</p>
                  {event.description && (
                    <p className="event-description">{event.description}</p>
                  )}
                  <span className={`event-type-badge ${event.type}`}>
                    {t(`calendar.types.${event.type}`)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Event Modal */}
      {showAddModal && userRole === 'staff' && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('calendar.addEvent')}</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleAddEvent} className="event-form">
              <div className="form-group">
                <label>{t('calendar.form.title')}</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder={t('calendar.form.titlePlaceholder')}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('calendar.form.date')}</label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('calendar.form.type')}</label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                >
                  <option value="event">{t('calendar.types.event')}</option>
                  <option value="holiday">{t('calendar.types.holiday')}</option>
                  <option value="meeting">{t('calendar.types.meeting')}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t('calendar.form.department')}</label>
                <select
                  value={newEvent.department}
                  onChange={(e) => setNewEvent({ ...newEvent, department: e.target.value })}
                >
                  <option value="all">{t('calendar.departments.all')}</option>
                  <option value="Småbarna">{t('dashboard.departments.smaabarna')}</option>
                  <option value="Mellombarna">{t('dashboard.departments.mellombarna')}</option>
                  <option value="Storbarna">{t('dashboard.departments.storbarna')}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t('calendar.form.description')}</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder={t('calendar.form.descriptionPlaceholder')}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newEvent.announceEvent}
                    onChange={(e) => setNewEvent({ ...newEvent, announceEvent: e.target.checked })}
                  />
                  <span>{t('calendar.form.announceToChat')}</span>
                </label>
              </div>

              {newEvent.announceEvent && (
                <div className="form-group">
                  <label>{t('calendar.form.announcementText')}</label>
                  <textarea
                    value={newEvent.announcementText}
                    onChange={(e) => setNewEvent({ ...newEvent, announcementText: e.target.value })}
                    placeholder={t('calendar.form.announcementPlaceholder')}
                    rows="4"
                  />
                </div>
              )}

              <div className="modal-actions">
                <button type="submit" className="submit-button">
                  {t('calendar.form.submit')}
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="cancel-button">
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default Calendar;

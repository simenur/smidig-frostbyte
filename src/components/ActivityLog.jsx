import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import './ActivityLog.css';

function ActivityLog({ childId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!childId) return;

    // Query logs for this child, ordered by timestamp descending
    const logsQuery = query(
      collection(db, 'logs'),
      where('childId', '==', childId),
      orderBy('timestamp', 'desc'),
      limit(showAll ? 100 : 2)
    );

    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(logsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching logs:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [childId, showAll]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleString('no-NO', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionText = (action) => {
    return action === 'check-in' ? 'Krysset inn' : 'Krysset ut';
  };

  const getActionIcon = (action) => {
    return action === 'check-in' ? '📥' : '📤';
  };

  if (loading) {
    return (
      <div className="activity-log">
        <h3>Aktivitetslogg</h3>
        <p className="log-loading">Laster logger...</p>
      </div>
    );
  }

  return (
    <div className="activity-log">
      <h3>Aktivitetslogg</h3>

      {logs.length === 0 ? (
        <p className="no-logs">Ingen aktivitet registrert ennå.</p>
      ) : (
        <>
          <div className="log-list">
            {logs.map((log) => (
              <div key={log.id} className={`log-item ${log.action}`}>
                <div className="log-icon">{getActionIcon(log.action)}</div>
                <div className="log-content">
                  <div className="log-action">{getActionText(log.action)}</div>
                  <div className="log-timestamp">{formatTimestamp(log.timestamp)}</div>
                  {log.performedByEmail && (
                    <div className="log-user">av {log.performedByEmail}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {logs.length >= 2 && !showAll && (
            <button onClick={() => setShowAll(true)} className="show-more-button">
              Vis mer historikk
            </button>
          )}

          {showAll && (
            <button onClick={() => setShowAll(false)} className="show-less-button">
              Vis mindre
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default ActivityLog;

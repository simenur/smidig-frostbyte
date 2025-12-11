import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, onSnapshot, doc, getDoc, addDoc, Timestamp, updateDoc, arrayUnion, where, getDocs } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { auth, db } from '../firebase';
import logo from '../assets/Logo.png';
import './Messages.css';

function Messages() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null); // Selected conversation
  const [newMessageText, setNewMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // Search in threads list
  const [modalSearchQuery, setModalSearchQuery] = useState(''); // Search in modal

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

  // Fetch children
  useEffect(() => {
    if (!auth.currentUser || userRole === null) return;

    let q;
    if (userRole === 'staff') {
      q = query(collection(db, 'children'));
    } else {
      q = query(
        collection(db, 'children'),
        where('parentIds', 'array-contains', auth.currentUser.uid)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const childrenData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChildren(childrenData);
    });

    return () => unsubscribe();
  }, [userRole]);

  // Fetch messages
  useEffect(() => {
    if (!auth.currentUser || userRole === null) return;

    const q = query(collection(db, 'messages'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by timestamp
      const sorted = messagesData.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return a.timestamp.toMillis() - b.timestamp.toMillis();
      });

      setMessages(sorted);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userRole]);

  // Auto-select thread from location state (from child profile)
  useEffect(() => {
    if (location.state?.childId && children.length > 0 && messages.length > 0) {
      const { childId, childName, department } = location.state;

      // Create thread object matching the structure
      setSelectedThread({
        type: 'child',
        childId: childId,
        childName: childName,
        department: department
      });

      // Clear location state to prevent re-selection
      window.history.replaceState({}, document.title);
    }
  }, [location.state, children, messages]);

  // Get threads (conversations) for the conversation list
  const getThreads = () => {
    const threads = [];
    const threadsMap = new Map();

    children.forEach(child => {
      const threadMessages = messages.filter(msg => {
        // Filter messages for this child
        if (msg.childId === child.id) {
          // Check if user has access
          if (userRole === 'staff') return true;
          if (userRole === 'parent') {
            return msg.from.uid === auth.currentUser.uid ||
                   msg.type === 'staff-to-parent' ||
                   msg.type === 'parent-to-staff';
          }
        }
        return false;
      });

      // Only show children with messages (both staff and parents)
      if (threadMessages.length > 0) {
        const lastMessage = threadMessages[threadMessages.length - 1];
        const unreadCount = threadMessages.filter(msg =>
          !msg.readBy?.includes(auth.currentUser.uid)
        ).length;

        threads.push({
          type: 'child',
          childId: child.id,
          childName: child.name,
          department: child.department,
          lastMessage: lastMessage,
          unreadCount: unreadCount,
          messageCount: threadMessages.length
        });
      }
    });

    // Add broadcast threads for staff (always show, even without messages)
    if (userRole === 'staff') {
      const departments = ['Småbarna', 'Mellombarna', 'Storbarna'];
      departments.forEach(dept => {
        const deptMessages = messages.filter(msg =>
          msg.type === 'staff-broadcast' && msg.department === dept
        );

        const lastMessage = deptMessages[deptMessages.length - 1];
        threads.push({
          type: 'broadcast',
          department: dept,
          lastMessage: lastMessage,
          messageCount: deptMessages.length
        });
      });
    }

    // Add broadcast threads for parents (only for their children's departments)
    if (userRole === 'parent') {
      // Get unique departments from parent's children
      const parentDepartments = [...new Set(children.map(child => child.department))];

      parentDepartments.forEach(dept => {
        const deptMessages = messages.filter(msg =>
          msg.type === 'staff-broadcast' && msg.department === dept
        );

        // Only show if there are broadcast messages
        if (deptMessages.length > 0) {
          const lastMessage = deptMessages[deptMessages.length - 1];
          const unreadCount = deptMessages.filter(msg =>
            !msg.readBy?.includes(auth.currentUser.uid)
          ).length;

          threads.push({
            type: 'broadcast',
            department: dept,
            lastMessage: lastMessage,
            unreadCount: unreadCount,
            messageCount: deptMessages.length
          });
        }
      });
    }

    // Sort by last message time
    return threads.sort((a, b) => {
      const aTime = a.lastMessage?.timestamp?.toMillis() || 0;
      const bTime = b.lastMessage?.timestamp?.toMillis() || 0;
      return bTime - aTime;
    });
  };

  // Get messages for selected thread
  const getThreadMessages = () => {
    if (!selectedThread) return [];

    return messages.filter(msg => {
      if (selectedThread.type === 'child') {
        return msg.childId === selectedThread.childId;
      } else if (selectedThread.type === 'broadcast') {
        return msg.type === 'staff-broadcast' && msg.department === selectedThread.department;
      }
      return false;
    });
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedThread) return;

    setSending(true);
    try {
      const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const currentUserData = currentUserDoc.data();

      let messageData = {
        from: {
          uid: auth.currentUser.uid,
          name: currentUserData.name || currentUserData.email,
          role: currentUserData.role
        },
        message: newMessageText.trim(),
        timestamp: Timestamp.now(),
        readBy: [auth.currentUser.uid]
      };

      if (selectedThread.type === 'child') {
        if (userRole === 'parent') {
          messageData.type = 'parent-to-staff';
          messageData.childId = selectedThread.childId;
          messageData.department = selectedThread.department;
        } else {
          messageData.type = 'staff-to-parent';
          messageData.childId = selectedThread.childId;
          messageData.department = selectedThread.department;
        }
      } else if (selectedThread.type === 'broadcast') {
        messageData.type = 'staff-broadcast';
        messageData.department = selectedThread.department;
      }

      await addDoc(collection(db, 'messages'), messageData);
      setNewMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert(t('messages.errors.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  // Mark messages as read when viewing thread
  useEffect(() => {
    if (!selectedThread) return;

    const threadMessages = getThreadMessages();
    threadMessages.forEach(async (msg) => {
      if (!msg.readBy?.includes(auth.currentUser.uid)) {
        try {
          const messageRef = doc(db, 'messages', msg.id);
          await updateDoc(messageRef, {
            readBy: arrayUnion(auth.currentUser.uid)
          });
        } catch (error) {
          console.error('Error marking message as read:', error);
        }
      }
    });
  }, [selectedThread, messages]);

  // Start new conversation with a child
  const handleStartConversation = (child) => {
    setSelectedThread({
      type: 'child',
      childId: child.id,
      childName: child.name,
      department: child.department
    });
    setShowNewConversationModal(false);
    setModalSearchQuery(''); // Reset modal search
  };

  // Filter threads based on search query
  const getFilteredThreads = () => {
    const allThreads = getThreads();
    if (!searchQuery.trim()) return allThreads;

    return allThreads.filter(thread => {
      const query = searchQuery.toLowerCase();
      if (thread.type === 'child') {
        return thread.childName.toLowerCase().includes(query) ||
               thread.department.toLowerCase().includes(query);
      } else if (thread.type === 'broadcast') {
        return thread.department.toLowerCase().includes(query);
      }
      return false;
    });
  };

  // Filter children in modal based on search query
  const getFilteredChildren = () => {
    if (!modalSearchQuery.trim()) return children;

    const query = modalSearchQuery.toLowerCase();
    return children.filter(child =>
      child.name.toLowerCase().includes(query) ||
      child.department.toLowerCase().includes(query)
    );
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.floor((now - date) / (1000 * 60));
      return minutes < 1 ? t('messages.justNow') : `${minutes}m`;
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return t('messages.yesterday');
    } else {
      return date.toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit' });
    }
  };

  const threads = getFilteredThreads();
  const threadMessages = getThreadMessages();
  const filteredChildren = getFilteredChildren();

  if (loading) {
    return (
      <div className="messages-container">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="messages-container">
      <header className="messages-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← {t('common.back')}
        </button>
        <div className="header-brand">
          <img src={logo} alt="Logo" className="header-logo" />
          <h1>{t('messages.title')}</h1>
        </div>
      </header>

      <div className="messages-layout">
        {/* Threads List (Left side / Mobile first view) */}
        <div className={`threads-list ${selectedThread ? 'has-selection' : ''}`}>
          <div className="threads-header">
            <h2>{t('messages.conversations')}</h2>
            {userRole === 'staff' && (
              <button
                onClick={() => setShowNewConversationModal(true)}
                className="new-conversation-button"
              >
                + {t('messages.newConversation')}
              </button>
            )}
          </div>

          {/* Search in threads list */}
          <div className="threads-search">
            <input
              type="text"
              placeholder={t('messages.searchConversations')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                className="clear-search"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          <div className="threads">
            {threads.length === 0 ? (
              <div className="no-threads">
                <p>{t('messages.noConversations')}</p>
              </div>
            ) : (
              threads.map((thread, index) => (
                <div
                  key={`${thread.type}-${thread.childId || thread.department}-${index}`}
                  className={`thread-item ${selectedThread?.childId === thread.childId && selectedThread?.department === thread.department ? 'active' : ''} ${thread.unreadCount > 0 ? 'unread' : ''}`}
                  onClick={() => setSelectedThread(thread)}
                >
                  <div className="thread-avatar">
                    {thread.type === 'child' ? thread.childName.charAt(0).toUpperCase() : '📢'}
                  </div>
                  <div className="thread-info">
                    <div className="thread-header">
                      <h3>{thread.type === 'child' ? thread.childName : thread.department}</h3>
                      {thread.lastMessage && (
                        <span className="thread-time">{formatTime(thread.lastMessage.timestamp)}</span>
                      )}
                    </div>
                    <div className="thread-preview">
                      {thread.lastMessage ? (
                        <p>{thread.lastMessage.message}</p>
                      ) : (
                        <p className="no-messages">{t('messages.noMessages')}</p>
                      )}
                    </div>
                  </div>
                  {thread.unreadCount > 0 && (
                    <div className="unread-badge">{thread.unreadCount}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Window (Right side / Mobile second view) */}
        <div className={`chat-window ${selectedThread ? 'active' : ''}`}>
          {selectedThread ? (
            <>
              <div className="chat-header">
                <button
                  className="mobile-back-button"
                  onClick={() => setSelectedThread(null)}
                >
                  ←
                </button>
                <div className="chat-header-info">
                  <h3>
                    {selectedThread.type === 'child'
                      ? selectedThread.childName
                      : `📢 ${selectedThread.department}`}
                  </h3>
                  {selectedThread.department && selectedThread.type === 'child' && (
                    <p className="chat-subtitle">{selectedThread.department}</p>
                  )}
                </div>
              </div>

              <div className="chat-messages">
                {threadMessages.length === 0 ? (
                  <div className="no-messages-placeholder">
                    <p>{t('messages.startConversation')}</p>
                  </div>
                ) : (
                  threadMessages.map((msg, index) => {
                    const isOwn = msg.from.uid === auth.currentUser.uid;
                    const showDate = index === 0 ||
                      (threadMessages[index - 1] &&
                       new Date(msg.timestamp?.toDate()).toDateString() !==
                       new Date(threadMessages[index - 1].timestamp?.toDate()).toDateString());

                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="message-date">
                            {new Date(msg.timestamp?.toDate()).toLocaleDateString('no-NO', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short'
                            })}
                          </div>
                        )}
                        <div className={`message ${isOwn ? 'own' : 'other'}`}>
                          {!isOwn && (
                            <div className="message-avatar">
                              {msg.from.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="message-content">
                            {!isOwn && (
                              <div className="message-sender">{msg.from.name}</div>
                            )}
                            <div className="message-bubble">
                              {msg.message}
                            </div>
                            <div className="message-time">
                              {msg.timestamp?.toDate().toLocaleTimeString('no-NO', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat input - hide for parents viewing broadcast threads */}
              {userRole === 'staff' || selectedThread.type === 'child' ? (
                <form onSubmit={handleSendMessage} className="chat-input">
                  <input
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder={t('messages.typeMessage')}
                    disabled={sending}
                  />
                  <button type="submit" disabled={sending || !newMessageText.trim()}>
                    {sending ? '...' : '➤'}
                  </button>
                </form>
              ) : (
                <div className="broadcast-info">
                  <p>📢 {t('messages.broadcastInfo')}</p>
                </div>
              )}
            </>
          ) : (
            <div className="no-thread-selected">
              <p>{t('messages.selectConversation')}</p>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConversationModal && userRole === 'staff' && (
        <div className="modal-overlay" onClick={() => setShowNewConversationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('messages.newConversation')}</h2>
              <button
                className="modal-close"
                onClick={() => setShowNewConversationModal(false)}
              >
                ×
              </button>
            </div>

            {/* Search in modal */}
            <div className="modal-search">
              <input
                type="text"
                placeholder={t('messages.searchChildren')}
                value={modalSearchQuery}
                onChange={(e) => setModalSearchQuery(e.target.value)}
                className="search-input"
              />
              {modalSearchQuery && (
                <button
                  className="clear-search"
                  onClick={() => setModalSearchQuery('')}
                >
                  ×
                </button>
              )}
            </div>

            <div className="modal-body">
              {['Småbarna', 'Mellombarna', 'Storbarna'].map(dept => {
                const deptChildren = filteredChildren.filter(child => child.department === dept);
                if (deptChildren.length === 0) return null;

                return (
                  <div key={dept} className="department-group">
                    <h3 className="department-title">{dept}</h3>
                    <div className="modal-children-list">
                      {deptChildren.map(child => (
                        <button
                          key={child.id}
                          className="child-item"
                          onClick={() => handleStartConversation(child)}
                        >
                          <div className="child-avatar">
                            {child.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="child-name">{child.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Messages;

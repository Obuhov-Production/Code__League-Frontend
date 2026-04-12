import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoImg from '@images/logos/logo.png';

/* SVG icons */
import IconHome        from '@images/dashboard_components/icon_home.svg?react';
import IconTournaments from '@images/dashboard_components/icon_tournaments.svg?react';
import IconTeams       from '@images/dashboard_components/icon_teams.svg?react';
import IconLeaderboard from '@images/dashboard_components/icon_leaderboard.svg?react';
import IconProfile     from '@images/dashboard_components/icon_profile.svg?react';
import IconAdmin       from '@images/dashboard_components/icon_admin.svg?react';
import IconJury        from '@images/dashboard_components/icon_jury.svg?react';
import IconOrganizer  from '@images/dashboard_components/icon_tournament.svg?react';
import IconChat        from '@images/dashboard_components/icon_chat.svg?react';
import IconBell        from '@images/dashboard_components/icon_bell.svg?react';
import IconSearch      from '@images/dashboard_components/icon_search.svg?react';
import IconLogout      from '@images/dashboard_components/icon_logout.svg?react';

import { getMe, clearSession, isLoggedIn, API_BASE, CHECK_BACKEND, DEV_MOCK_USER, loadCachedUser, saveUser,
  getNotifications, markNotificationRead, deleteNotification, markAllNotificationsRead } from '@utils/authApi';
import { useToast } from '@utils/toast.jsx';
import { hasRole, UserAvatar, MiniProfileModal, UserSearchModal, TabTip, formatDate, getSocket } from './db.shared.jsx';

import TabOverview    from './TabOverview.jsx';
import TabTournaments from './TabTournaments.jsx';
import TabTeams       from './TabTeams.jsx';
import TabLeaderboard from './TabLeaderboard.jsx';
import TabChat        from './TabChat.jsx';
import TabProfile     from './TabProfile.jsx';
import TabAdmin       from './TabAdmin.jsx';
import TabJury        from './TabJury.jsx';
import TabOrganizer  from './TabOrganizer.jsx';

export default function Dashboard() {
  const navigate    = useNavigate();
  const toast       = useToast();
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTabRaw]  = useState(() => {
    const saved = localStorage.getItem('db_tab') || 'overview';
    // Privileged tabs require user data — always start from overview to avoid blank panels
    return ['admin', 'jury', 'organizer'].includes(saved) ? 'overview' : saved;
  });
  const setTab = t => { setTabRaw(t); localStorage.setItem('db_tab', t); };
  const [notifOpen,      setNotifOpen]      = useState(false);
  const [notifications,  setNotifications]  = useState([]);
  const [notifLoading,   setNotifLoading]   = useState(false);
  const [miniProfile,    setMiniProfile]    = useState(false);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [chatHasUnread,  setChatHasUnread]  = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!CHECK_BACKEND) {
      setUser(DEV_MOCK_USER);
      setLoading(false);
      return;
    }
    if (!isLoggedIn()) { navigate('/login'); return; }
    // Show cached user instantly (has avatar_url from OAuth)
    const cached = loadCachedUser();
    if (cached) { setUser(cached); setLoading(false); }
    // Always refresh from backend to get the latest data
    getMe()
      .then(fresh => { saveUser(fresh); setUser(fresh); })
      .catch(() => {
        if (!cached) { clearSession(); toast.error('Сесія закінчилась'); navigate('/login'); }
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const handleLogout = () => { clearSession(); toast.info('Ви вийшли'); navigate('/'); };

  // ── Notifications ──────────────────────────────
  const loadNotifications = () => {
    setNotifLoading(true);
    getNotifications()
      .then(data => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setNotifLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const socket = getSocket();
    if (!socket) return;
    const onNotif = notif => setNotifications(prev => [notif, ...prev]);
    socket.on('notification:new', onNotif);
    return () => socket.off('notification:new', onNotif);
  }, [user]); // eslint-disable-line

  // Close notifications on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const fn = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [notifOpen]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      markNotificationRead(notif.id).catch(() => {});
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    if (notif.link_tab) { setTab(notif.link_tab); setNotifOpen(false); }
  };

  const handleNotifDelete = async (e, id) => {
    e.stopPropagation();
    deleteNotification(id).catch(() => {});
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };


  const TABS = [
    { id: 'overview',    label: 'Головна',     Icon: IconHome },
    { id: 'tournaments', label: 'Турніри',   Icon: IconTournaments },
    { id: 'leaderboard', label: 'Лідерборд', Icon: IconLeaderboard },
    { id: 'teams',       label: 'Команди',   Icon: IconTeams },
    { id: 'chat',        label: 'Спілкування',       Icon: IconChat },
    { id: 'profile',     label: 'Профіль',   Icon: IconProfile },
    ...(hasRole(user, 'admin') || hasRole(user, 'jury') ? [{ id: 'jury',      label: 'Журі',       Icon: IconJury      }] : []),
    ...(hasRole(user, 'admin') || hasRole(user, 'organizer') ? [{ id: 'organizer', label: 'Організатор', Icon: IconOrganizer }] : []),
    ...(hasRole(user, 'admin')                           ? [{ id: 'admin',     label: 'Адмін',      Icon: IconAdmin     }] : []),
  ];

  const tabLabel = TABS.find(t => t.id === tab)?.label ?? '';

  return (
    <div className="db-page">
      <aside className="db-sidebar">
        <Link to="/" className="db-logo">
          <img src={logoImg} alt="logo" className="db-logo-img" />
          <span>Code League</span>
        </Link>

        <nav className="db-nav">
          {!loading && TABS.map(({ id, label, Icon }) => (
            <button key={id} className={`db-nav-item${tab === id ? ' active' : ''}${
              id === 'admin' || id === 'jury' || id === 'organizer' ? ' db-nav-admin-only' : ''
            }`} onClick={() => setTab(id)}>
              <span className="db-nav-icon"><Icon /></span>
              <span className="db-nav-label">{label}</span>
              {(id === 'admin' || id === 'organizer') && <span className="db-nav-badge">●</span>}
              {id === 'chat' && chatHasUnread && tab !== 'chat' && <span className="db-nav-badge chat-unread">●</span>}
            </button>
          ))}
        </nav>

        {!loading && user && (
          <button className="db-sidebar-user" onClick={() => setTab('profile')}>
            <UserAvatar user={user} size={34} />
            <div className="db-sidebar-info">
              <span className="db-sidebar-name">{user.username || user.email}</span>
              <span className="db-sidebar-role">
                {hasRole(user, 'admin') ? '⚙ Адмін' : hasRole(user, 'organizer') ? '🗂 Організатор' : hasRole(user, 'jury') ? '⚖ Журі' : '👤 Учасник'}
              </span>
            </div>
            <button className="db-sidebar-logout" title="Вийти" onClick={e => { e.stopPropagation(); handleLogout(); }}>
              <IconLogout />
            </button>
          </button>
        )}
      </aside>

      <div className="db-main">
        <header className="db-topbar">
          <h2 className="db-topbar-title">{tabLabel}</h2>
          <div className="db-topbar-right">
            <button type="button" className="db-topbar-icon-btn"
              onClick={() => { setUserSearchOpen(true); setNotifOpen(false); setMiniProfile(false); }}
              title="Пошук користувачів" aria-label="Пошук користувачів">
              <IconSearch />
            </button>
            <div ref={notifRef} className={`db-topbar-icon-btn db-bell-wrap${notifOpen ? ' open' : ''}`}
              onClick={() => { setNotifOpen(p => { if (!p) loadNotifications(); return !p; }); setMiniProfile(false); }}>
              <IconBell />
              {unreadCount > 0 && <span className="db-bell-dot" />}
              {notifOpen && (
                <div className="db-notif-panel" onClick={e => e.stopPropagation()}>
                  <div className="db-notif-header">
                    <p className="db-notif-title">Сповіщення{unreadCount > 0 && <span className="db-notif-badge">{unreadCount}</span>}</p>
                    {unreadCount > 0 && (
                      <button className="db-notif-read-all" onClick={handleMarkAllRead}>Прочитати всі</button>
                    )}
                  </div>
                  {notifLoading ? (
                    <div style={{ padding: '16px 0', textAlign: 'center', color: '#888', fontSize: 13 }}>Завантаження...</div>
                  ) : notifications.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#888', fontSize: 13 }}>
                      🔔 Немає нових сповіщень
                    </div>
                  ) : (
                    <div className="db-notif-list">
                      {notifications.map(n => (
                        <div key={n.id} className={`db-notif-item${n.is_read ? ' read' : ''}`}
                          onClick={() => handleNotifClick(n)}>
                          <span className="db-notif-icon">{n.icon || '🔔'}</span>
                          <div className="db-notif-body">
                            <span className="db-notif-text">{n.message}</span>
                            {n.created_at && (
                              <span className="db-notif-time">{formatDate(n.created_at)}</span>
                            )}
                          </div>
                          <button className="db-notif-del" title="Видалити"
                            onClick={e => handleNotifDelete(e, n.id)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {!loading && user && (
              <div className="db-topbar-avatar-wrap" onClick={() => { setMiniProfile(p => !p); setNotifOpen(false); }}>
                <UserAvatar user={user} size={36} className="db-topbar-avatar" />
                {miniProfile && (
                  <MiniProfileModal user={user} onClose={() => setMiniProfile(false)}
                    onGoProfile={() => { setTab('profile'); setMiniProfile(false); }} />
                )}
              </div>
            )}
          </div>
        </header>

        <main className="db-content">
          {loading ? (
            <div className="db-loading"><div className="db-spinner" /></div>
          ) : (
            <>
              {tab !== 'chat' && <TabTip tab={tab} />}
              {tab === 'overview'    && <TabOverview    user={user} toast={toast} onNavigate={setTab} />}
              {tab === 'tournaments' && <TabTournaments user={user} toast={toast} />}
              {tab === 'teams'       && <TabTeams       toast={toast} />}
              {tab === 'leaderboard' && <TabLeaderboard toast={toast} />}
              {tab === 'chat'        && <TabChat        user={user} toast={toast} userId={user?.id} onUnreadChange={setChatHasUnread} setTab={setTab} />}
              {tab === 'profile'     && <TabProfile     user={user} setUser={setUser} toast={toast} onLogout={handleLogout} setTab={setTab} />}
              {tab === 'jury'      && (hasRole(user, 'admin') || hasRole(user, 'jury'))      && <TabJury      user={user} toast={toast} />}
              {tab === 'organizer' && (hasRole(user, 'admin') || hasRole(user, 'organizer')) && <TabOrganizer toast={toast} />}
              {tab === 'admin'     && hasRole(user, 'admin')                                  && <TabAdmin     toast={toast} />}
            </>
          )}
        </main>
      </div>

      {userSearchOpen && <UserSearchModal onClose={() => setUserSearchOpen(false)} />}
    </div>
  );
}
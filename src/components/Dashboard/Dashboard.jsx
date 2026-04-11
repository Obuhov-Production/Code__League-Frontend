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
import IconChat        from '@images/dashboard_components/icon_chat.svg?react';
import IconBell        from '@images/dashboard_components/icon_bell.svg?react';
import IconSearch      from '@images/dashboard_components/icon_search.svg?react';

import { getMe, clearSession, isLoggedIn, API_BASE, CHECK_BACKEND, DEV_MOCK_USER } from '@utils/authApi';
import { useToast } from '@utils/toast.jsx';
import { hasRole, UserAvatar, MiniProfileModal, UserSearchModal, TabTip, formatDate } from './db.shared.jsx';

import TabOverview    from './TabOverview.jsx';
import TabTournaments from './TabTournaments.jsx';
import TabTeams       from './TabTeams.jsx';
import TabLeaderboard from './TabLeaderboard.jsx';
import TabChat        from './TabChat.jsx';
import TabProfile     from './TabProfile.jsx';
import TabAdmin       from './TabAdmin.jsx';
import TabJury        from './TabJury.jsx';

export default function Dashboard() {
  const navigate    = useNavigate();
  const toast       = useToast();
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTabRaw]  = useState(() => localStorage.getItem('db_tab') || 'overview');
  const setTab = t => { setTabRaw(t); localStorage.setItem('db_tab', t); };
  const [notifOpen,      setNotifOpen]      = useState(false);
  const [miniProfile,    setMiniProfile]    = useState(false);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [chatHasUnread,  setChatHasUnread]  = useState(false);

  useEffect(() => {
    if (!CHECK_BACKEND) {
      setUser(DEV_MOCK_USER);
      setLoading(false);
      return;
    }
    if (!isLoggedIn()) { navigate('/login'); return; }
    getMe()
      .then(setUser)
      .catch(() => { clearSession(); toast.error('Сесія закінчилась'); navigate('/login'); })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const handleLogout = () => { clearSession(); toast.info('Ви вийшли'); navigate('/'); };

  const TABS = [
    { id: 'overview',    label: 'Огляд',     Icon: IconHome },
    { id: 'tournaments', label: 'Турніри',   Icon: IconTournaments },
    { id: 'leaderboard', label: 'Лідерборд', Icon: IconLeaderboard },
    { id: 'teams',       label: 'Команди',   Icon: IconTeams },
    { id: 'chat',        label: 'Чат',       Icon: IconChat },
    { id: 'profile',     label: 'Профіль',   Icon: IconProfile },
    ...(hasRole(user, 'admin') || hasRole(user, 'jury') ? [{ id: 'jury',  label: 'Журі',  Icon: IconAdmin }] : []),
    ...(hasRole(user, 'admin')                           ? [{ id: 'admin', label: 'Адмін', Icon: IconAdmin }] : []),
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
            <button key={id} className={`db-nav-item${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
              <span className="db-nav-icon"><Icon /></span>
              <span className="db-nav-label">{label}</span>
              {id === 'admin' && <span className="db-nav-badge">●</span>}
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
                {hasRole(user, 'admin') ? '⚙ Адмін' : hasRole(user, 'jury') ? '⚖ Журі' : '👤 Учасник'}
              </span>
            </div>
            <button className="db-sidebar-logout" title="Вийти" onClick={e => { e.stopPropagation(); handleLogout(); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
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
            <div className={`db-topbar-icon-btn db-bell-wrap${notifOpen ? ' open' : ''}`}
              onClick={() => { setNotifOpen(p => !p); setMiniProfile(false); }}>
              <IconBell />
              <span className="db-bell-dot" />
              {notifOpen && (
                <div className="db-notif-panel" onClick={e => e.stopPropagation()}>
                  <p className="db-notif-title">Сповіщення</p>
                  <div className="db-notif-item"><span>🏆</span><span>Відкрита реєстрація в нові турніри!</span></div>
                  <div className="db-notif-item"><span>💬</span><span>Відтепер доступний чат між командами</span></div>
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
              {tab === 'profile'     && <TabProfile     user={user} setUser={setUser} toast={toast} onLogout={handleLogout} />}
              {tab === 'jury'  && (hasRole(user, 'admin') || hasRole(user, 'jury')) && <TabJury  user={user} toast={toast} />}
              {tab === 'admin' && hasRole(user, 'admin')                            && <TabAdmin toast={toast} />}
            </>
          )}
        </main>
      </div>

      {userSearchOpen && <UserSearchModal onClose={() => setUserSearchOpen(false)} />}
    </div>
  );
}
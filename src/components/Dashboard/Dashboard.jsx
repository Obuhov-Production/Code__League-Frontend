import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoImg from '@images/logos/logo.png';

/* svg icons - іконашкі */
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
import IconChatBubble  from '@images/dashboard_components/chat.svg?react';
import IconTrash       from '@images/dashboard_components/icon_trash_bin.svg?react';
import IconSearch      from '@images/dashboard_components/icon_search.svg?react';
import IconLogout      from '@images/dashboard_components/icon_logout.svg?react';
import IconGithub      from '@images/dashboard_components/github.svg?react';

import { getMe, clearSession, isLoggedIn, API_BASE, CHECK_BACKEND, DEV_MOCK_USER, loadCachedUser, saveUser,
  getNotifications, markNotificationRead, deleteNotification, markAllNotificationsRead,
  deleteAllNotifications, setMyStatus, getMyTeams,
  getTeamInviteDetails, acceptTeamInvite, rejectTeamInvite } from '@utils/authApi';
import { useToast } from '@utils/toast.jsx';
import { hasRole, UserAvatar, MiniProfileModal, UserSearchModal, TabTip, getSocket, playMsgSound, BASE_ROOMS, STICKER_PREFIX, parseFileUrls, getStatusMeta } from './db.shared.jsx';

import TabOverview    from './TabOverview.jsx';
import TabTournaments from './TabTournaments.jsx';
import TabTeams       from './TabTeams.jsx';
import TabLeaderboard from './TabLeaderboard.jsx';
import TabChat        from './TabChat.jsx';
import TabProfile     from './TabProfile.jsx';
import TabAdmin       from './TabAdmin.jsx';
import TabJury        from './TabJury.jsx';
import TabOrganizer      from './TabOrganizer.jsx';
import TabTeamWorkspace  from './TabTeamWorkspace.jsx';

/* Map legacy icon-name strings (e.g. "check-circle") to emoji.
   New backend code emits emoji directly, but old DB rows still hold the names. */
const NOTIF_ICON_MAP = {
  'check-circle':           '✅',
  'x-circle':               '❌',
  'check':                  '✅',
  'cross':                  '❌',
  'warning':                '⚠️',
  'info':                   'ℹ️',
  'bell':                   '🔔',
  'trophy':                 '🏆',
  'star':                   '⭐',
  'team_invite':            '📨',
  'team_member_joined':     '🎉',
  'team_invite_rejected':   '🚫',
};
function notifIcon(raw) {
  if (!raw) return '🔔';
  return NOTIF_ICON_MAP[raw] || raw;
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'щойно';
  if (mins < 60) return `${mins} хв тому`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} год тому`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days} д тому`;
  return new Date(dateStr).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
}

/* ── Team invite card (inline-expandable inside notification panel) ── */
function TeamInviteCard({ notif, onResolved, toast }) {
  const memberId = Number(String(notif.link_tab || '').split(':')[1]);
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(null); // 'accept' | 'reject' | null
  const [resolved, setResolved] = useState(null); // 'accepted' | 'rejected' | 'gone'

  const toggle = async () => {
    if (resolved) return;
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (!details && !loading) {
      setLoading(true);
      try {
        const d = await getTeamInviteDetails(memberId);
        setDetails(d);
        if (d?.status && d.status !== 'pending') setResolved(d.status);
      } catch (err) {
        toast?.error?.(err.message || 'Не вдалося завантажити запрошення');
        setResolved('gone');
      } finally { setLoading(false); }
    }
  };

  const handleAccept = async (e) => {
    e.stopPropagation();
    setActing('accept');
    try {
      await acceptTeamInvite(memberId);
      setResolved('accepted');
      toast?.success?.('Ви приєдналися до команди');
      window.dispatchEvent(new CustomEvent('cl:teams:changed', {
        detail: { reason: 'invite-accepted', memberId }
      }));
      onResolved?.('accepted');
    } catch (err) { toast?.error?.(err.message); }
    finally { setActing(null); }
  };

  const handleReject = async (e) => {
    e.stopPropagation();
    setActing('reject');
    try {
      await rejectTeamInvite(memberId);
      setResolved('rejected');
      toast?.success?.('Запрошення відхилено');
      window.dispatchEvent(new CustomEvent('cl:teams:changed', {
        detail: { reason: 'invite-rejected', memberId }
      }));
      onResolved?.('rejected');
    } catch (err) { toast?.error?.(err.message); }
    finally { setActing(null); }
  };

  return (
    <div className={`db-notif-item db-notif-invite${notif.is_read ? ' read' : ''}${expanded ? ' expanded' : ''}`}
         onClick={toggle}>
      <span className="db-notif-icon">📨</span>
      <div className="db-notif-body">
        <span className="db-notif-text">{notif.message}</span>
        {notif.created_at && <span className="db-notif-time">{relativeTime(notif.created_at)}</span>}
        {expanded && (
          <div className="db-notif-invite-details" onClick={e => e.stopPropagation()}>
            {loading && <div className="db-notif-invite-loading">Завантаження…</div>}
            {!loading && details && (
              <>
                <div className="db-notif-invite-row"><span>Команда:</span><b>{details.team?.name ?? '—'}</b></div>
                {details.tournament && (
                  <div className="db-notif-invite-row"><span>Турнір:</span><b>{details.tournament.name}</b></div>
                )}
                {details.captain && (
                  <div className="db-notif-invite-row"><span>Капітан:</span><b>@{details.captain.username}</b></div>
                )}
                {details.team?.city && (
                  <div className="db-notif-invite-row"><span>Місто:</span><b>{details.team.city}</b></div>
                )}
                {details.team?.school && (
                  <div className="db-notif-invite-row"><span>Школа:</span><b>{details.team.school}</b></div>
                )}
              </>
            )}
            {resolved === 'accepted' && (
              <div className="db-notif-invite-status accepted">✅ Ви прийняли запрошення</div>
            )}
            {resolved === 'rejected' && (
              <div className="db-notif-invite-status rejected">✕ Запрошення відхилено</div>
            )}
            {resolved === 'gone' && (
              <div className="db-notif-invite-status rejected">Запрошення вже не активне</div>
            )}
            {!resolved && !loading && (
              <div className="db-notif-invite-actions">
                <button className="db-btn db-btn-primary db-btn-sm"
                        onClick={handleAccept} disabled={!!acting}>
                  {acting === 'accept' ? '...' : 'Прийняти'}
                </button>
                <button className="db-btn db-btn-ghost db-btn-sm"
                        onClick={handleReject} disabled={!!acting}>
                  {acting === 'reject' ? '...' : 'Відхилити'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate    = useNavigate();
  const toast       = useToast();
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTabRaw]  = useState(() => {
    const saved = localStorage.getItem('db_tab') || 'overview';
    return ['admin', 'jury', 'organizer'].includes(saved) ? 'overview' : saved;
  });
  const setTab = t => { setTabRaw(t); localStorage.setItem('db_tab', t); };
  const [notifOpen,      setNotifOpen]      = useState(false);
  const [notifications,  setNotifications]  = useState([]);
  const [notifLoading,   setNotifLoading]   = useState(false);
  const [miniProfile,    setMiniProfile]    = useState(false);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [chatUnreadByRoom, setChatUnreadByRoom] = useState({});
  const [chatLastMsgs,    setChatLastMsgs]      = useState({});
  const [activeChatRoom,  setActiveChatRoom]    = useState(null);
  const [soundOn,         setSoundOn]           = useState(() => {
    try { return JSON.parse(localStorage.getItem('cl_chat_sound') ?? 'true'); }
    catch { return true; }
  });
  const [notifFilter,    setNotifFilter]    = useState('all');
  const [bellShake,      setBellShake]      = useState(false);
  const [newNotifIds,    setNewNotifIds]    = useState(new Set());
  const [myTeams,        setMyTeams]        = useState([]);
  const notifRef = useRef(null);

  const chatUnreadTotal = Object.values(chatUnreadByRoom).reduce((s, v) => s + (v || 0), 0);
  const nowOnline = u => u ? { ...u, status: 'online', last_seen_at: new Date().toISOString() } : u;

  const refreshCurrentUser = async () => {
    if (!CHECK_BACKEND || !isLoggedIn()) return null;
    const fresh = await getMe();
    saveUser(fresh);
    if (hasRole(fresh, 'banned')) {
      navigate('/banned', { replace: true });
      return fresh;
    }
    setUser(nowOnline(fresh));
    return fresh;
  };

  useEffect(() => {
    try { localStorage.setItem('cl_chat_sound', JSON.stringify(soundOn)); } catch {}
  }, [soundOn]);

  useEffect(() => {
    if (!CHECK_BACKEND) {
      setUser(DEV_MOCK_USER);
      setLoading(false);
      return;
    }
    if (!isLoggedIn()) { navigate('/login'); return; }
    /* On every dashboard mount we are by definition online — override any stale
     * status/last_seen left in cache or returned by the server before the
     * presence ping has had time to land. */
    const cached = loadCachedUser();
    if (cached) {
      if (hasRole(cached, 'banned')) { navigate('/banned', { replace: true }); return; }
      setUser(nowOnline(cached));
      setLoading(false);
    }
    refreshCurrentUser()
      .catch(() => {
        if (!cached) { clearSession(); toast.error('Сесія закінчилась'); navigate('/login'); }
      })
      .finally(() => setLoading(false));
  }, []);

  /* ── Presence: activity-aware status tracking ──
     online  = platform open + activity in last 5 min
     away    = platform open but idle > 5 min (or browser tab hidden)
     offline = page closed / idle > 20 min                              */
  useEffect(() => {
    if (!user || !CHECK_BACKEND) return;

    let alive = true;
    let currentStatus = 'online';
    let idleTimer = null;

    const IDLE_AWAY_MS    =  5 * 60 * 1000;  // 5 min  → away
    const IDLE_OFFLINE_MS = 20 * 60 * 1000;  // 20 min → offline

    const applyStatus = (status, opts = {}) => {
      if (!alive) return;
      currentStatus = status;
      setUser(u => u ? { ...u, status, last_seen_at: new Date().toISOString() } : u);
      setMyStatus(status, opts).catch(() => {});
    };
    const beacon = (status) => {
      currentStatus = status;
      setUser(u => u ? { ...u, status, last_seen_at: new Date().toISOString() } : u);
      setMyStatus(status, { keepalive: true }).catch(() => {});
    };

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        applyStatus('away');
        // After another 15 min of being away (= 20 min total) → offline
        idleTimer = setTimeout(() => applyStatus('offline'), IDLE_OFFLINE_MS - IDLE_AWAY_MS);
      }, IDLE_AWAY_MS);
    };

    const onActivity = () => {
      if (!alive) return;
      resetIdleTimer();
      if (currentStatus !== 'online' && document.visibilityState !== 'hidden') {
        applyStatus('online');
      }
    };

    // Go online immediately on mount
    applyStatus('online');
    resetIdleTimer();

    // Heartbeat — keep last_seen_at fresh while the user is active
    const heartbeat = setInterval(() => {
      if (alive && currentStatus === 'online' && document.visibilityState !== 'hidden') {
        applyStatus('online');
      }
    }, 45_000);

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        clearTimeout(idleTimer);
        beacon('away');
      } else {
        onActivity();
      }
    };
    const onPageHide = () => beacon('offline');

    // Throttle high-frequency events so we don't spam the server
    let lastThrottledAt = 0;
    const throttled = () => {
      const now = Date.now();
      if (now - lastThrottledAt > 10_000) { lastThrottledAt = now; onActivity(); }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide',      onPageHide);
    window.addEventListener('beforeunload',  onPageHide);
    document.addEventListener('keydown',     onActivity,  { passive: true });
    document.addEventListener('click',       onActivity,  { passive: true });
    document.addEventListener('mousemove',   throttled,   { passive: true });
    document.addEventListener('touchstart',  throttled,   { passive: true });
    document.addEventListener('scroll',      throttled,   { passive: true, capture: true });

    return () => {
      alive = false;
      clearTimeout(idleTimer);
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide',     onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
      document.removeEventListener('keydown',    onActivity);
      document.removeEventListener('click',      onActivity);
      document.removeEventListener('mousemove',  throttled);
      document.removeEventListener('touchstart', throttled);
      document.removeEventListener('scroll',     throttled, { capture: true });
      beacon('offline');
    };
  }, [user?.id]);

  const handleLogout = () => {
    if (CHECK_BACKEND) setMyStatus('offline', { keepalive: true }).catch(() => {});
    clearSession(); toast.info('Ви вийшли'); navigate('/');
  };

  /* --- Team rooms for notification labels --- */
  useEffect(() => {
    if (!user) return;
    const refreshTeams = () => getMyTeams().then(d => setMyTeams(Array.isArray(d) ? d : [])).catch(() => {});
    refreshTeams();
    window.addEventListener('cl:teams:changed', refreshTeams);
    return () => window.removeEventListener('cl:teams:changed', refreshTeams);
  }, [user?.id]);

  /* --- Notification --- */
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
    const onNotif = notif => {
      setNotifications(prev => [notif, ...prev]);
      setNewNotifIds(prev => new Set([...prev, notif.id]));
      setTimeout(() => setNewNotifIds(prev => { const s = new Set(prev); s.delete(notif.id); return s; }), 1200);
      setBellShake(true);
      setTimeout(() => setBellShake(false), 700);
      toast.info(notif.message, 4000);
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification('Code League', { body: notif.message });
      }
      if (notif?.link_tab === 'applications') {
        refreshCurrentUser().catch(() => {});
      }
      if (['team_invite', 'team_member_joined', 'team_invite_rejected'].includes(notif?.icon)) {
        getMyTeams()
          .then(d => setMyTeams(Array.isArray(d) ? d : []))
          .catch(() => {});
        window.dispatchEvent(new CustomEvent('cl:teams:changed', {
          detail: { reason: notif.icon, notification: notif }
        }));
      }
    };
    const onUserUpdated = payload => {
      refreshCurrentUser()
        .then(fresh => {
          if (payload?.reason === 'role_changed' && fresh) {
            toast.info('Ваші доступи оновлено', 3000);
          }
        })
        .catch(() => {});
    };
    const onTournamentUpdated = payload => {
      getMyTeams()
        .then(d => setMyTeams(Array.isArray(d) ? d : []))
        .catch(() => {});
      window.dispatchEvent(new CustomEvent('cl:teams:changed', {
        detail: {
          reason: payload?.reason || 'tournament_status_changed',
          tournamentId: payload?.tournamentId ?? payload?.tournament_id,
          status: payload?.status,
        },
      }));
      toast.info('Статус турніру оновлено', 3000);
    };
    socket.on('notification:new', onNotif);
    socket.on('user:updated', onUserUpdated);
    socket.on('tournament:updated', onTournamentUpdated);
    return () => {
      socket.off('notification:new', onNotif);
      socket.off('user:updated', onUserUpdated);
      socket.off('tournament:updated', onTournamentUpdated);
    };
  }, [user]);

  // Global chat-message listener — track unread per room + play sound platform-wide
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;
    const onChatMsg = msg => {
      if (!msg?.room) return;
      const isMyMsg = msg.user_id === user.id;
      const isViewing = tab === 'chat' && activeChatRoom === msg.room && document.visibilityState === 'visible';
      if (isMyMsg || isViewing) return;
      setChatUnreadByRoom(prev => ({ ...prev, [msg.room]: (prev[msg.room] || 0) + 1 }));
      setChatLastMsgs(prev => ({ ...prev, [msg.room]: msg }));
      setBellShake(true);
      setTimeout(() => setBellShake(false), 700);
      if (soundOn) playMsgSound();
    };
    socket.on('message:new', onChatMsg);
    return () => socket.off('message:new', onChatMsg);
  }, [user, tab, activeChatRoom, soundOn]);

  // Request browser notification permission once user is loaded
  useEffect(() => {
    if (!user) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshCurrentUser().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user]);

  // Close panel on outside click or Escape
  useEffect(() => {
    if (!notifOpen) return;
    const onMouse = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    const onKey   = e => { if (e.key === 'Escape') setNotifOpen(false); };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown',   onKey);
    return () => { document.removeEventListener('mousedown', onMouse); document.removeEventListener('keydown', onKey); };
  }, [notifOpen]);


  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      markNotificationRead(notif.id).catch(() => {});
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    // Team invite: expand inline, do NOT navigate
    if (notif.link_tab && notif.link_tab.startsWith('team_invite:')) return;
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

  const handleDeleteAll = (e) => {
    e.stopPropagation();
    deleteAllNotifications().catch(() => {});
    setNotifications([]);
  };

  const filteredNotifications = notifications.filter(n => {
    if (notifFilter === 'tournaments') return n.link_tab === 'tournaments' || n.type === 'tournament';
    if (notifFilter === 'system')      return !n.link_tab || n.type === 'system';
    if (notifFilter === 'admin')       return n.link_tab === 'admin';
    if (notifFilter === 'chat')        return false;
    return true;
  });

  // Build pseudo-notifications from unread chat rooms (for "chat" filter tab)
  const chatNotifItems = Object.entries(chatUnreadByRoom)
    .filter(([, count]) => count > 0)
    .map(([roomId, count]) => {
      const last = chatLastMsgs[roomId];
      const baseRoom = BASE_ROOMS.find(r => r.id === roomId);
      const teamName = roomId.startsWith('team_')
        ? myTeams.find(t => `team_${t.id}` === roomId)?.name
        : null;
      const roomLabel = baseRoom?.label
        || (teamName ? teamName : roomId.startsWith('team_') ? `Команда #${roomId.slice(5)}` : `# ${roomId}`);
      let preview = '';
      if (last) {
        const text = last.text || '';
        if (text.startsWith(STICKER_PREFIX)) preview = '🖼 Стікер';
        else if (parseFileUrls(last.file_url).length > 0 && !text) preview = '📎 Зображення';
        else preview = text.slice(0, 80);
      }
      return {
        id: `chat-${roomId}`,
        roomId,
        count,
        roomLabel,
        username: last?.username || '',
        preview,
        created_at: last?.created_at,
      };
    })
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const handleChatNotifClick = (roomId) => {
    setTab('chat');
    setNotifOpen(false);
    setActiveChatRoom(roomId);
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

  const tabLabel = tab.startsWith('team_')
    ? (myTeams.find(t => `team_${t.id}` === tab)?.name ?? 'Команда')
    : TABS.find(t => t.id === tab)?.label ?? '';

  const isBanned = user && hasRole(user, 'banned');
  const isMuted  = user && hasRole(user, 'muted');

  return (
    <div className="db-page">

      {/* ── Ban wall — unclosable, covers everything ── */}
      {isBanned && (
        <div className="db-ban-overlay">
          <div className="db-ban-modal">
            <div className="db-ban-icon">🚫</div>
            <h2 className="db-ban-title">Акаунт заблоковано</h2>
            <p className="db-ban-desc">
              Ваш акаунт було заблоковано адміністратором платформи.<br />
              Доступ до дашборду та будь-яких функцій обмежено.
            </p>
            <p className="db-ban-sub">
              Якщо ви вважаєте, що це помилка — зверніться до підтримки.
            </p>
            <button className="db-btn db-btn-ghost db-ban-logout-btn" onClick={handleLogout}>
              Вийти з акаунту
            </button>
          </div>
        </div>
      )}

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
              {id === 'chat' && chatUnreadTotal > 0 && tab !== 'chat' && (
                <span className="db-nav-badge chat-unread chat-unread-count">
                  {chatUnreadTotal > 99 ? '99+' : chatUnreadTotal}
                </span>
              )}
            </button>
          ))}

          {/* Team tabs — shown after separator when user is in any teams */}
          {!loading && myTeams.length > 0 && (
            <>
              <div className="db-nav-separator">
                <span className="db-nav-separator-label">Мої команди</span>
              </div>
              {myTeams.slice(0, 5).map((team) => {
                const teamTabId = `team_${team.id}`;
                const isActive = tab === teamTabId;
                const statusColor = getStatusMeta(team.tournament_status).color;
                return (
                  <button
                    key={teamTabId}
                    className={`db-nav-item db-nav-team-item${isActive ? ' active' : ''}`}
                    onClick={() => setTab(teamTabId)}
                    title={`${team.name} · ${team.tournament_name}`}
                  >
                    <span className="db-nav-team-avatar" style={{ background: `linear-gradient(135deg, ${statusColor}44, ${statusColor}22)`, color: statusColor }}>
                      {team.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="db-nav-team-info">
                      <span className="db-nav-team-name">{team.name}</span>
                      <span className="db-nav-team-tour">{team.tournament_name}</span>
                    </span>
                    <span className="db-nav-team-status-dot" style={{ background: statusColor }} />
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {!loading && user && (
          <div className="db-sidebar-user" onClick={() => setTab('profile')} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setTab('profile')}>
            <UserAvatar user={user} size={34} showStatus={true} />
            <div className="db-sidebar-info">
              <span className="db-sidebar-name">{user.username || user.email}</span>
              <span className="db-sidebar-role">
                {hasRole(user, 'admin') ? '⚙ Адмін' : hasRole(user, 'organizer') ? '🗂 Організатор' : hasRole(user, 'jury') ? '⚖ Журі' : '👤 Учасник'}
              </span>
              {user?.auth_provider === 'github' && (
                <span className="db-sidebar-github"><IconGithub width="12" height="12" /> {user.github_username || 'GitHub'}</span>
              )}
            </div>
            <button className="db-sidebar-logout" title="Вийти" onClick={e => { e.stopPropagation(); handleLogout(); }}>
              <IconLogout />
            </button>
          </div>
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
            <div ref={notifRef} className={`db-topbar-icon-btn db-bell-wrap${notifOpen ? ' open' : ''}${bellShake ? ' shake' : ''}`}
              onClick={() => { setNotifOpen(p => { if (!p) loadNotifications(); return !p; }); setMiniProfile(false); }}>
              <IconBell />
              {(unreadCount + chatUnreadTotal) > 0 && (
                <span className={`db-bell-dot${chatUnreadTotal > 0 ? ' has-chat' : ''}`}>
                  {(unreadCount + chatUnreadTotal) > 99 ? '99+' : (unreadCount + chatUnreadTotal)}
                </span>
              )}
              {notifOpen && (
                <div className="db-notif-panel" onClick={e => e.stopPropagation()}>
                  <div className="db-notif-header">
                    <div className="db-notif-header-top">
                      <p className="db-notif-title">Сповіщення{unreadCount > 0 && <span className="db-notif-badge">{unreadCount}</span>}</p>
                      <div className="db-notif-actions">
                        {unreadCount > 0 && <button className="db-notif-read-all" onClick={handleMarkAllRead}>Прочитати всі</button>}
                        {notifications.length > 0 && <button className="db-notif-del-all" title="Видалити всі" onClick={handleDeleteAll}><IconTrash style={{ width: 14, height: 14 }} /></button>}
                      </div>
                    </div>
                    <div className="db-notif-filter-tabs">
                      {[
                        ['all','Всі', 0],
                        ['chat','Чат', chatUnreadTotal],
                        ['tournaments','Турніри', 0],
                        ['system','Система', 0],
                        ...(hasRole(user, 'admin') ? [['admin','Адмін', 0]] : []),
                      ].map(([key, label, badge]) => (
                        <button key={key}
                          className={`db-notif-ftab${notifFilter === key ? ' active' : ''}${key === 'chat' && badge > 0 ? ' has-unread' : ''}`}
                          onClick={e => { e.stopPropagation(); setNotifFilter(key); }}>
                          {label}
                          {badge > 0 && <span className="db-notif-ftab-badge">{badge > 99 ? '99+' : badge}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  {notifFilter === 'chat' ? (
                    chatNotifItems.length === 0 ? (
                      <div className="db-notif-empty">
                        <span className="db-notif-empty-icon"><IconChatBubble style={{ width: 22, height: 22 }} /></span>
                        <span>Немає непрочитаних повідомлень</span>
                      </div>
                    ) : (
                      <div className="db-notif-list">
                        {chatNotifItems.map(c => (
                          <div key={c.id} className="db-notif-item db-notif-item--chat"
                            onClick={() => handleChatNotifClick(c.roomId)}>
                            <span className="db-notif-icon"><IconChatBubble style={{ width: 18, height: 18 }} /></span>
                            <div className="db-notif-body">
                              <span className="db-notif-text">
                                <strong>{c.roomLabel}</strong>
                                {c.username && <span style={{ color: '#888' }}> · {c.username}</span>}
                              </span>
                              {c.preview && <span className="db-notif-time" style={{ color: '#666', fontSize: 12 }}>{c.preview}</span>}
                              {c.created_at && <span className="db-notif-time">{relativeTime(c.created_at)}</span>}
                            </div>
                            <span className="db-notif-chat-count">{c.count > 99 ? '99+' : c.count}</span>
                          </div>
                        ))}
                      </div>
                    )
                  ) : notifLoading ? (
                    <div style={{ padding: '16px 0', textAlign: 'center', color: '#888', fontSize: 13 }}>Завантаження...</div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="db-notif-empty">
                      <span className="db-notif-empty-icon">🔔</span>
                      <span>{notifications.length === 0 ? 'Немає сповіщень' : 'Немає сповіщень у цій категорії'}</span>
                    </div>
                  ) : (
                    <div className="db-notif-list">
                      {filteredNotifications.map(n => {
                        if (n.link_tab && n.link_tab.startsWith('team_invite:')) {
                          return (
                            <TeamInviteCard key={n.id} notif={n} toast={toast}
                              onResolved={() => {
                                if (!n.is_read) {
                                  markNotificationRead(n.id).catch(() => {});
                                  setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                                }
                              }} />
                          );
                        }
                        return (
                          <div key={n.id} className={`db-notif-item${n.is_read ? ' read' : ''}${newNotifIds.has(n.id) ? ' new-item' : ''}`}
                            onClick={() => handleNotifClick(n)}>
                            <span className="db-notif-icon">{notifIcon(n.icon)}</span>
                            <div className="db-notif-body">
                              <span className="db-notif-text">{n.message}</span>
                              {n.created_at && <span className="db-notif-time">{relativeTime(n.created_at)}</span>}
                            </div>
                            <button className="db-notif-del" title="Видалити" onClick={e => handleNotifDelete(e, n.id)}>✕</button>
                          </div>
                        );
                      })}
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
                    onGoProfile={() => { setTab('profile'); setMiniProfile(false); }}
                    onLogout={handleLogout} />
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
              {tab !== 'chat' && !tab.startsWith('team_') && <TabTip tab={tab} />}
              {tab === 'overview'    && <TabOverview    user={user} toast={toast} onNavigate={setTab} />}
              {tab === 'tournaments' && <TabTournaments user={user} toast={toast} />}
              {tab === 'teams'       && <TabTeams       toast={toast} setTab={setTab} />}
              {tab === 'leaderboard' && <TabLeaderboard user={user} toast={toast} />}
              {/* TabChat stays mounted on every tab so messages stream in live in the background.
                  Hidden via display:none when not on chat tab — state, sockets and listeners survive. */}
              {user && (
                <div style={{ display: tab === 'chat' ? 'contents' : 'none' }}>
                  <TabChat user={user} toast={toast} userId={user?.id}
                    setTab={setTab} isMuted={isMuted} isActive={tab === 'chat'}
                    chatUnreadByRoom={chatUnreadByRoom} setChatUnreadByRoom={setChatUnreadByRoom}
                    setActiveChatRoom={setActiveChatRoom}
                    soundOn={soundOn} setSoundOn={setSoundOn} />
                </div>
              )}
              {tab === 'profile'     && <TabProfile     user={user} setUser={setUser} toast={toast} onLogout={handleLogout} setTab={setTab} />}
              {tab.startsWith('team_') && (() => {
                const tid = Number(tab.slice(5));
                return !isNaN(tid) && <TabTeamWorkspace teamId={tid} toast={toast} onBack={() => setTab('teams')} />;
              })()}
              {tab === 'jury'      && (hasRole(user, 'admin') || hasRole(user, 'jury'))      && <TabJury      user={user} toast={toast} />}
              {tab === 'organizer' && (hasRole(user, 'admin') || hasRole(user, 'organizer')) && <TabOrganizer toast={toast} user={user} />}
              {tab === 'admin'     && hasRole(user, 'admin')                                  && <TabAdmin     toast={toast} />}
            </>
          )}
        </main>
      </div>

      {userSearchOpen && <UserSearchModal onClose={() => setUserSearchOpen(false)} />}
    </div>
  );
}

/**
 * db.shared.jsx
 * Shared constants, helpers, and small UI components used across all Dashboard tabs.
 */
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { searchUsers, API_BASE, CHECK_BACKEND, getToken } from '@utils/authApi';

/* ══════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════ */
export const STATUS_LABEL = {
  draft:        { label: 'Чернетка',   color: '#888',    bg: '#f0f0f0' },
  registration: { label: 'Реєстрація', color: '#7c5ff5', bg: '#eee9ff' },
  running:      { label: 'Активний',   color: '#16a34a', bg: '#dcfce7' },
  finished:     { label: 'Завершений', color: '#0ea5e9', bg: '#e0f2fe' },
};

export const ACCENT = {
  draft:        ['#888','#f0f0f0'],
  registration: ['#AC9EF8','#2d1f6e'],
  running:      ['#4ade80','#163028'],
  finished:     ['#0ea5e9','#0c2a3b'],
};

export const BANNER_PRESETS = ['#1e1b2e','#0f172a','#0d1117','#16213e','#1a1a2e','#0e2240','#2d1b69','#1b4332'];

export const ROLE_LABELS = { user: '👤 Учасник', jury: '⚖️ Журі', admin: '⚙️ Адмін', banned: '🚫 Бан' };

export const BASE_ROOMS = [
  { id: 'general',     label: '# загальний',  locked: false },
  { id: 'tournaments', label: '# турніри',    locked: false },
  { id: 'offtopic',    label: '# офф-топік',  locked: false },
];

export const EMOJI_QUICK = ['😀','😂','❤️','🔥','👍','🎉','😮','👏','😢','🤔','😎','👀','🙌','🤩','💯','🫡'];
export const EMOJI_REACT = ['👍','❤️','🔥','😂','😮','👏','😢','🎉'];
export const EMOJI_RE = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uFE0F|\u200D|\u20E3|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?)+$/u;

export const EVAL_CRITERIA = [
  { key: 'backend',      label: 'Backend / Код',    desc: 'Якість коду, патерни, ООП, тести',   icon: '⚙️', group: 'tech' },
  { key: 'database',     label: 'База даних',        desc: 'Наявність, структура, налаштування', icon: '🗄️', group: 'tech' },
  { key: 'frontend',     label: 'Frontend / UX',     desc: 'UI, патерни, відсутність помилок',   icon: '🎨', group: 'tech' },
  { key: 'requirements', label: 'Вимоги завдання',   desc: 'Виконання must-have критеріїв',      icon: '✅', group: 'func' },
  { key: 'stability',    label: 'Стабільність',      desc: 'Роботоздатність, відсутність багів', icon: '🛡️', group: 'func' },
  { key: 'usability',    label: 'Зручність',         desc: 'UX, навігація, зручність роботи',    icon: '👁️', group: 'func' },
];

export const TAB_TIPS = {
  overview:    { icon: '🏠', title: 'Огляд',     text: 'Тут зібрана вся важлива інформація: ваші турніри, команди та швидка навігація.' },
  tournaments: { icon: '🏆', title: 'Турніри',   text: 'Переглядайте актуальні змагання, фільтруйте за статусом та реєструйте команди.' },
  teams:       { icon: '👥', title: 'Команди',   text: 'Усі ваші команди в одному місці. Команди прив\'язані до конкретних турнірів.' },
  leaderboard: { icon: '📊', title: 'Лідерборд', text: 'Рейтинг команд по кожному турніру. Оберіть турнір щоб побачити результати.' },
  chat:        { icon: '💬', title: 'Чат',       text: 'Загальний чат та приватні кімнати для вашої команди. ПКМ на повідомлення — дії.' },
  profile:     { icon: '👤', title: 'Профіль',   text: 'Налаштуйте нікнейм, аватар, банер та опис профілю.' },
  admin:       { icon: '⚙️', title: 'Адмін',     text: 'Управляйте турнірами, користувачами та чатом платформи.' },
};

/* ══════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════ */
export function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysLeft(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

export function avatarUrl(user) {
  if (!user) return null;
  if (user.user_avatar_url) return API_BASE + user.user_avatar_url;
  return null;
}

export function hasRole(user, role) {
  return !!(user?.role?.split(',').map(r => r.trim()).includes(role));
}

export function isEmojiOnly(text) {
  const t = (text || '').trim().replace(/\s/g, '');
  return t.length > 0 && t.length <= 12 && EMOJI_RE.test(t);
}

export function compressImage(file, quality = 0.5) {
  return new Promise(resolve => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(objUrl);
      canvas.toBlob(
        blob => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(file); };
    img.src = objUrl;
  });
}

export function parseFileUrls(fileUrl) {
  if (!fileUrl) return [];
  if (fileUrl.startsWith('[')) { try { return JSON.parse(fileUrl); } catch { return [fileUrl]; } }
  return [fileUrl];
}

/* ══════════════════════════════════════════════════
   SHARED UI COMPONENTS
══════════════════════════════════════════════════ */
export function StatusBadge({ status }) {
  const s = STATUS_LABEL[status] || { label: status, color: '#888', bg: '#eee' };
  return <span className="db-status-badge" style={{ color: s.color, background: s.bg }}>{s.label}</span>;
}

export function RoleBadges({ role }) {
  return <>{(role || '').split(',').map(r => r.trim()).filter(Boolean).map(r => (
    <span key={r} className={`db-role-badge role-${r}`}>{ROLE_LABELS[r] || r}</span>
  ))}</>;
}

export function UserAvatar({ user, size = 36, onClick, className = '' }) {
  const url = avatarUrl(user);
  const initials = user?.username ? user.username.slice(0,2).toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? '?');
  const style = { width: size, height: size, borderRadius: '50%', cursor: onClick ? 'pointer' : 'default', flexShrink: 0 };
  if (url) return <img src={url} alt="" style={{ ...style, objectFit: 'cover', display: 'block' }} onClick={onClick} className={className} />;
  return (
    <div style={{
      ...style,
      background: 'var(--main_color)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 700,
      fontSize: Math.round(size * 0.36),
      lineHeight: 1,
      letterSpacing: '0.03em',
      color: '#191A23',
      userSelect: 'none',
      WebkitFontSmoothing: 'antialiased',
    }}
      onClick={onClick} className={className}>
      {initials}
    </div>
  );
}

export function CustomSelect({ value, onChange, options, placeholder = '— Оберіть —' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);
  const selected = options.find(o => String(o.value) === String(value));
  return (
    <div className={`db-custom-select${open ? ' open' : ''}`} ref={ref}>
      <button type="button" className="db-cs-trigger" onClick={() => setOpen(p => !p)}>
        <span className="db-cs-value">{selected ? selected.label : placeholder}</span>
        <span className="db-cs-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="db-cs-dropdown">
          <div className="db-cs-option disabled" onClick={() => { onChange(''); setOpen(false); }}>{placeholder}</div>
          {options.map(o => (
            <div key={o.value}
              className={`db-cs-option${String(o.value) === String(value) ? ' selected' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}>
              {o.label}
              {o.tag && <span className="db-cs-tag">{o.tag}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConfirmModal({ message, onConfirm, onCancel }) {
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onCancel]);
  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={onCancel}>
      <div className="db-confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="db-confirm-icon">⚠️</div>
        <p className="db-confirm-message">{message}</p>
        <div className="db-confirm-actions">
          <button className="db-btn db-btn-ghost" onClick={onCancel}>Скасувати</button>
          <button className="db-btn db-btn-danger" onClick={onConfirm}>Підтвердити</button>
        </div>
      </div>
    </div>
  );
}

export function TabTip({ tab }) {
  const tip = TAB_TIPS[tab];
  if (!tip) return null;
  return (
    <div className="db-tab-tip">
      <span className="db-tab-tip-icon">{tip.icon}</span>
      <div className="db-tab-tip-body">
        <strong>{tip.title}</strong>
        <p>{tip.text}</p>
      </div>
    </div>
  );
}

export function MiniProfileModal({ user, onClose, onGoProfile }) {
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onClose]);

  const bannerStyle = user.banner_url
    ? { backgroundImage: `url(${API_BASE + user.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: user.banner_color || '#1e1b2e' };

  return (
    <div className="db-mini-profile" ref={ref} onClick={e => e.stopPropagation()}>
      <div className="db-mp-banner" style={bannerStyle} />
      <div className="db-mp-body">
        <div className="db-mp-avatar-wrap"><UserAvatar user={user} size={56} /></div>
        <div className="db-mp-info">
          <strong>{user.username || user.email}</strong>
          <span className="db-role-badge" style={{ display:'inline-block', marginTop:4 }}>{user.role}</span>
        </div>
        {user.user_description && <p className="db-mp-desc">{user.user_description}</p>}
        <div className="db-mp-footer">
          <span style={{ fontSize:12, color:'#aaa' }}>Реєстрація: {formatDate(user.created_at)}</span>
          <button className="db-btn db-btn-primary db-btn-sm" onClick={onGoProfile}>Редагувати профіль</button>
        </div>
      </div>
    </div>
  );
}

function UserProfileViewModal({ user, onClose }) {
  const bannerStyle = user.banner_url
    ? { backgroundImage: `url(${API_BASE + user.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: user.banner_color || '#1e1b2e' };
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: 0, overflow: 'hidden' }}>
        <div className="db-upv-banner" style={bannerStyle} />
        <div className="db-upv-body">
          <button className="modal-close" onClick={onClose}>✕</button>
          <div className="db-upv-head">
            <UserAvatar user={user} size={64} />
            <div>
              <h3 style={{ margin: 0 }}>{user.username}</h3>
              <span className="db-role-badge">{user.role}</span>
            </div>
          </div>
          {user.user_description && <p className="db-upv-desc">{user.user_description}</p>}
          <div className="db-field-row" style={{ marginTop: 12 }}>
            <label>Реєстрація</label>
            <span>{new Date(user.created_at).toLocaleDateString('uk-UA')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UserSearchModal({ onClose }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected,setSelected]= useState(null);
  const ref       = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onClose]);

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const handleSearch = q => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try { setResults(await searchUsers(q)); }
      catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="db-user-search-modal" ref={ref} onClick={e => e.stopPropagation()}>
        <div className="db-usm-header">
          <h3>Пошук користувачів</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <input autoFocus className="db-usm-input" placeholder="Введіть нікнейм (мін. 2 символи)..."
          value={query} onChange={e => handleSearch(e.target.value)} />
        <div className="db-usm-results">
          {loading && <div className="db-loading"><div className="db-spinner" /></div>}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="db-usm-empty">Нікого не знайдено</p>
          )}
          {!loading && results.map(u => (
            <div key={u.id} className="db-usm-card" onClick={() => setSelected(u)}>
              <UserAvatar user={u} size={40} />
              <div className="db-usm-info">
                <strong>{u.username}</strong>
                <span className="db-role-badge" style={{ marginLeft: 6 }}>{u.role}</span>
              </div>
              {u.user_description && <p className="db-usm-desc">{u.user_description}</p>}
            </div>
          ))}
        </div>
      </div>
      {selected && <UserProfileViewModal user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export function UserProfileModal({ profile, meId, onClose, onGoOwnProfile }) {
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const bannerStyle = profile.banner_url
    ? { backgroundImage: `url(${API_BASE + profile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: profile.banner_color || 'linear-gradient(135deg, #2d1b6e 0%, #191A23 100%)' };
  const isAdmin = profile.role === 'admin';

  return (
    <div className="modal-overlay db-upm-overlay" style={{ zIndex: 10000 }} onClick={onClose}>
      <div className="db-upm-card" onClick={e => e.stopPropagation()}>
        <div className="db-upm-banner" style={bannerStyle}>
          <button className="db-upm-close" onClick={onClose}>✕</button>
        </div>
        <div className="db-upm-body">
          <div className={`db-upm-avatar${isAdmin ? ' admin' : ''}`}>
            {profile.user_avatar_url
              ? <img src={API_BASE + profile.user_avatar_url} alt={profile.username} className="db-upm-avatar-img" />
              : <span className="db-upm-avatar-initials">{(profile.username || '?').slice(0, 2).toUpperCase()}</span>
            }
          </div>
          <div className="db-upm-name-row">
            <span className="db-upm-name">{profile.username || 'Anonymous'}</span>
            {isAdmin && <span className="db-upm-badge admin">⚙ Admin</span>}
          </div>
          {profile.user_description && <p className="db-upm-desc">{profile.user_description}</p>}
          {profile.created_at && (
            <div className="db-upm-meta">
              📅 На платформі з {new Date(profile.created_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          )}
          <div className="db-upm-divider" />
          <div className="db-upm-actions">
            {profile.user_id === meId
              ? <button className="db-upm-btn primary" onClick={onGoOwnProfile}>✏ Редагувати профіль</button>
              : <button className="db-upm-btn ghost" onClick={onClose}>Закрити</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   SOCKET.IO
══════════════════════════════════════════════════ */
let _socket = null;

export function getSocket() {
  if (!CHECK_BACKEND) return null;
  if (!_socket) _socket = io(API_BASE, { auth: { token: getToken() }, autoConnect: true });
  return _socket;
}

export function playMsgSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => ctx.close();
  } catch {}
}

/* Дашборд - спільні константи, хелпери та компоненти для всього дашборду */
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { searchUsers, API_BASE, CHECK_BACKEND, getToken } from '@utils/authApi';
import IconGithub from '@images/dashboard_components/github.svg?react';

import emote1 from '@images/emote/emote.png';
import emote2 from '@images/emote/emote2.png';
import emote3 from '@images/emote/emote3.png';
import emote4 from '@images/emote/emote4.png';
import emote5 from '@images/emote/emote5.png';
import emote6 from '@images/emote/emote6.png';

import badge1Img from '@images/pin/bage1.png';
import badge2Img from '@images/pin/bage2.png';

export const STICKERS = [emote1, emote2, emote3, emote4, emote5, emote6];
export const STICKER_PREFIX = '__sticker__:';

/* constants */
export const STATUS_LABEL = {
  draft:        { label: 'Draft',   color: '#888',    bg: '#f0f0f0' },
  registration: { label: 'Registration', color: '#7c5ff5', bg: '#eee9ff' },
  running:      { label: 'Running',   color: '#16a34a', bg: '#dcfce7' },
  finished:     { label: 'Finished', color: '#0ea5e9', bg: '#e0f2fe' },
};

export const ACCENT = {
  draft:        ['#191A23','#2a2a3a'],  // темно-сірий/чорний для draft
  registration: ['#AC9EF8','#2d1f6e'],    // фіолетовий
  running:      ['#4ade80','#163028'],   // зелений
  finished:     ['#0ea5e9','#0c2a3b'],   // синій
};

export const BANNER_PRESETS = ['#0d1117', '#191A23', '#1a1a2e', '#1e1b2e', '#231b2e', '#2e231b', '#1b3b2e', '#2e1b3b'];
/* в ролі додав емодзі шоб разбавити скучні svg icons */
export const ROLE_LABELS = { user: '👤 User', jury: '⚖️ Jury', organizer: '🗂️ Organizer', admin: '⚙️ Admin', banned: '🚫 Banned' };

export const BASE_ROOMS = [
  { id: 'general',     label: '# загальний',  locked: false },
  { id: 'tournaments', label: '# турніри',    locked: false },
  { id: 'offtopic',    label: '# офф-топік',  locked: false },
];

export const TOURNAMENT_EMOJIS = [
  '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '👑', '⭐', '🌟', '🔥', '💯',
  '💻', '⌨️', '🖱️', '🖥️', '📱', '🧑‍💻', '👨‍💻', '👩‍💻', '🤖', '🧠', '📞',
  '⚙️', '🛠️', '🔧', '🔩', '🧰', '📦', '🗂️', '📊', '📈', '📉', '📧',
  '🧩', '🎯', '🎲', '♟️', '🧠', '💡', '🔍', '📐', '📏', '🧮', '🔗',
  '🐛', '🐞', '🔎', '🧪', '✅', '❌', '⚠️', '🚫', '🧹', '🧯', '🧬',
  '🚀', '⚡', '💥', '✨', '🛸', '🛰️', '🌐', '🔌', '💾', '💿', '✅',
  '🏢', '💼', '📋', '📄', '📝', '📌', '📍', '🤝', '🪪', '💬', '❌',
  '🔐', '🔒', '🛡️', '🗄️', '🗃️', '🧱', '🌍', '☁️', '📡', '🛰️', '⚠️',
  '🎨', '🖌️', '🖍️', '✏️', '🖼️', '📐', '🧵', '🎭', '🪄', '🚀', '🔥',
  '🎮', '🕹️', '👾', '🎰', '🎪', '🎊', '🎉', '🎈', '🎁', '🎀', '🪐',
  '⚔️', '🛡️', '🗡️', '🏹', '🥊', '💪', '⏱️', '⏳', '🚦', '🏁', '📡',
  '📚', '📖', '🎓', '🧑‍🏫', '🔬', '⚗️', '🧪', '📝', '💡', '🧭', '🌍',
  '👥', '🧑‍🤝‍🧑', '🤝', '💬', '📣', '📢', '📨', '🌐', '💙', '💜', '🖤',
];

export const EMOJI_QUICK = [
  '😀','😂','😭','🥹','😤','😡','🤯','🥵','🥶','😴','🤢','🤮','😱','🤩','😎','🤓',
  '👍','👎','👏','🙌','🤝','💪','🫡','🫶','✌️','🤙','☝️','🖕',
  '❤️','🧡','💛','💚','💙','💜','🖤','💯','⭐','✨','🔥','⚡','💥','❄️','🌊','💫',
  '🏆','🥇','🥈','🥉','🎯','🎮','🕹️','⚔️','🛡️','🧠','💻','🐛','💀','👑','🚀','🤖',
  '🎉','🎊','🎁','🎈','🥳','🍾','🥂','🎶',
];
/* Швидкі реакції на повідомлення */
export const EMOJI_REACT = ['👍','❤️','🔥','😂','😭','💯','🏆','⚡'];

/* Бейджі в профілі */
export const ALL_BADGES = [
  {
    id: 'identity_confirmed',
    image: badge1Img,
    name: 'Підтвердив особу',
    description: 'Ви заповнили своє ПІБ у профілі.',
    color: '#7c5ff5',
    condition: 'Заповніть Прізвище, Ім\'я та По батькові в профілі',
    secret: false,
  },
  {
    id: 'team_member',
    image: badge2Img,
    name: 'Командний гравець',
    description: 'Ви вступили до своєї першої команди на турнірі.',
    color: '#16a34a',
    condition: 'Вступіть до будь-якої команди',
    secret: false,
  },
];
export const EMOJI_RE = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uFE0F|\u200D|\u20E3|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?)+$/u;

export const EVAL_CRITERIA = [
  // tech — технічна якість
  { key: 'backend',       label: 'Backend / Код',    desc: 'Якість коду, патерни, ООП, тести',        icon: '⚙️',  group: 'tech' },
  { key: 'database',      label: 'База даних',        desc: 'Наявність, структура, налаштування',      icon: '🗄️',  group: 'tech' },
  { key: 'frontend',      label: 'Frontend / UX',     desc: 'UI, патерни, відсутність помилок',        icon: '🎨',  group: 'tech' },
  { key: 'documentation', label: 'Документація',      desc: 'README, коментарі, опис API та рішень',   icon: '📝',  group: 'tech' },
  // func — функціональна відповідність
  { key: 'requirements',  label: 'Вимоги завдання',   desc: 'Виконання must-have критеріїв ТЗ',        icon: '✅',  group: 'func' },
  { key: 'stability',     label: 'Стабільність',      desc: 'Роботоздатність, відсутність багів',      icon: '🛡️',  group: 'func' },
  { key: 'usability',     label: 'Зручність',         desc: 'UX, навігація, зручність роботи',         icon: '👁️',  group: 'func' },
  // soft — захист та подача
  { key: 'presentation',  label: 'Презентація',       desc: 'Якість захисту, демо та пояснень команди', icon: '🎤', group: 'soft' },
  { key: 'creativity',    label: 'Оригінальність',    desc: 'Нестандартні рішення, інноваційний підхід',icon: '💡', group: 'soft' },
];

export const TAB_TIPS = {
  overview:    { icon: '🏠', title: 'Головна',     text: 'Тут зібрана вся важлива інформація: ваші турніри, команди та швидка навігація.' },
  tournaments: { icon: '🏆', title: 'Турніри',   text: 'Переглядайте актуальні змагання, фільтруйте за статусом та реєструйте команди.' },
  teams:       { icon: '👥', title: 'Команди',   text: 'Усі ваші команди в одному місці. Команди прив\'язані до конкретних турнірів.' },
  leaderboard: { icon: '📊', title: 'Лідерборд', text: 'Рейтинг команд по кожному турніру. Оберіть турнір щоб побачити результати.' },
  chat:        { icon: '💬', title: 'Чат',       text: 'Загальний чат та приватні кімнати для вашої команди. ПКМ на повідомлення — дії.' },
  profile:     { icon: '👤', title: 'Профіль',   text: 'Налаштуйте нікнейм, аватар, банер та опис профілю.' },
  admin:       { icon: '⚙️', title: 'Адмін',        text: 'Управляйте турнірами, користувачами та чатом платформи.' },
  organizer:   { icon: '🗂️', title: 'Організатор', text: 'Створюйте турніри, керуйте раундами та переглядайте команди.' },
};

/* Helpers (хелперы) (вдруг не понял с первого раза) */

export function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysLeft(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

/** Resolves a raw avatar URL — avoids doubling BASE when URL is already absolute. */
export function resolveAvatarUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : API_BASE + url;
}

export function avatarUrl(user) {
  if (!user) return null;
  // Проверяем оба варианта поля (user_avatar_url для /me, avatar_url для admin/users)
  const url = user.user_avatar_url || user.avatar_url;
  if (url) return resolveAvatarUrl(url);
  // Fallback: GitHub avatar по github_username
  if (user.github_username) return `https://avatars.githubusercontent.com/${user.github_username}`;
  return null;
}

export function hasRole(user, role) {
  return !!(user?.role?.split(',').map(r => r.trim()).includes(role));
}

/** Returns PIB (last + first) if available, otherwise username, otherwise email. */
export function displayName(user) {
  if (!user) return 'Anonymous';
  const pib = [user.last_name, user.first_name].filter(Boolean).join(' ');
  return pib || user.username || user.email || 'Anonymous';
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

export function UserAvatar({ user, size = 36, onClick, className = '', showStatus = false }) {
  const [imgError, setImgError] = useState(false);
  const url = avatarUrl(user);
  useEffect(() => { setImgError(false); }, [url]);
  const initials = user?.username ? user.username.slice(0,2).toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? '?');
  const style = { width: size, height: size, borderRadius: '50%', cursor: onClick ? 'pointer' : 'default', flexShrink: 0 };
  const status = user?.status || 'offline';
  
  const avatarContent = url && !imgError ? (
    <img 
      src={url} 
      alt={user?.username || 'User'} 
      title={user?.username || user?.email}
      style={{ ...style, objectFit: 'cover', display: 'block' }} 
      onClick={onClick} 
      className={`db-avatar-img ${className}`} 
      onError={() => setImgError(true)} 
    />
  ) : (
    <div 
      style={{
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
      title={user?.username || user?.email}
      onClick={onClick} 
      className={`db-avatar-fallback ${className}`}>
      {initials}
    </div>
  );
  
  if (!showStatus) return avatarContent;
  
  return (
    <div className="db-avatar-with-status" style={{ position: 'relative', display: 'inline-block' }}>
      {avatarContent}
      <div className={`db-avatar-status db-avatar-status--${status}`} />
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
        <div className="db-mp-avatar-wrap"><UserAvatar user={user} size={56} showStatus={true} /></div>
        <div className="db-mp-info">
          <strong>{displayName(user)}</strong>
          {(user.first_name || user.last_name) && <span style={{ fontSize: 12, color: '#aaa', display: 'block' }}>@{user.username}</span>}
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
            <UserAvatar user={user} size={64} showStatus={true} />
            <div>
              <h3 style={{ margin: 0 }}>{displayName(user)}</h3>
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
              <UserAvatar user={u} size={40} showStatus={true} />
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
            {avatarUrl(profile)
              ? <img src={avatarUrl(profile)} alt={profile.username} className="db-upm-avatar-img"
                  onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling.style.removeProperty('display'); }} />
              : null
            }
            <span className="db-upm-avatar-initials" style={avatarUrl(profile) ? { display: 'none' } : undefined}>{(profile.username || '?').slice(0, 2).toUpperCase()}</span>
          </div>
          <div className="db-upm-name-row">
            <span className="db-upm-name">{displayName(profile)}</span>
            {(profile.first_name || profile.last_name) && <span style={{ fontSize: 12, color: '#aaa', marginLeft: 6 }}>@{profile.username}</span>}
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
  if (!_socket) {
    // Strip accidental "Bearer " prefix — backend jwt expects raw token
    const raw = (getToken() || '').replace(/^Bearer\s+/i, '');
    // Connect to /chat namespace — backend @WebSocketGateway({ namespace: '/chat' })
    _socket = io(`${API_BASE}/chat`, {
      auth: { token: raw },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
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

/* ══════════════════════════════════════════════════
   JURY SEARCH SELECTOR
   Пошук користувачів з фільтрацією за ролями (organizer/jury)
══════════════════════════════════════════════════ */
function JurySearchSelector({ selectedJury, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const debounceRef = useRef(null);

  // Завантажуємо деталі обраних журі
  useEffect(() => {
    const loadSelected = async () => {
      if (selectedJury.length === 0) {
        setSelectedUsers([]);
        return;
      }
      try {
        const users = await Promise.all(
          selectedJury.map(id => 
            fetch(`${API_BASE}/users/${id}`).then(r => r.json())
          )
        );
        setSelectedUsers(users.filter(u => u && u.id));
      } catch {
        setSelectedUsers([]);
      }
    };
    loadSelected();
  }, [selectedJury]);

  // Пошук з debounce
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const all = await searchUsers(query);
        // Фільтруємо тільки organizer та jury
        const filtered = all.filter(u => 
          (u.role === 'organizer' || u.role === 'jury' || u.role === 'admin') &&
          !selectedJury.includes(u.id)
        );
        setResults(filtered);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selectedJury]);

  const addJury = (user) => {
    if (!selectedJury.includes(user.id)) {
      onChange([...selectedJury, user.id]);
    }
    setQuery('');
    setResults([]);
  };

  const removeJury = (id) => {
    onChange(selectedJury.filter(jid => jid !== id));
  };

  const getRoleBadge = (role) => {
    switch(role) {
      case 'admin': return '⚙️ Адмін';
      case 'organizer': return '🗂️ Організатор';
      case 'jury': return '⚖️ Журі';
      default: return '👤 Користувач';
    }
  };

  return (
    <div className="db-jury-search-selector">
      {/* Обрані журі чіпси */}
      <div className="db-jury-chips">
        {selectedUsers.length === 0 ? (
          <span className="db-jury-empty">Журі не призначено</span>
        ) : (
          selectedUsers.map(user => (
            <span key={user.id} className="db-jury-chip">
              <UserAvatar user={user} size={20} />
              <span>{user.username}</span>
              <small>({getRoleBadge(user.role)})</small>
              <button type="button" onClick={() => removeJury(user.id)}>✕</button>
            </span>
          ))
        )}
      </div>

      {/* Пошук */}
      <div className="db-jury-search-wrap">
        <input
          type="text"
          className="db-input db-jury-search-input"
          placeholder="Пошук організаторів та журі..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {loading && <span className="db-jury-search-loading">⏳</span>}
        
        {/* Результати пошуку */}
        {results.length > 0 && (
          <div className="db-jury-search-results">
            {results.map(user => (
              <div 
                key={user.id} 
                className="db-jury-search-item"
                onClick={() => addJury(user)}
              >
                <UserAvatar user={user} size={32} />
                <div className="db-jury-search-info">
                  <strong>{user.username}</strong>
                  <span>{user.email}</span>
                </div>
                <span className="db-jury-search-role">{getRoleBadge(user.role)}</span>
              </div>
            ))}
          </div>
        )}
        
        {query.trim().length >= 2 && !loading && results.length === 0 && (
          <div className="db-jury-search-empty">
            Не знайдено користувачів з ролями організатор/журі
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MARKDOWN RENDERER
══════════════════════════════════════════════════ */
function MarkdownRenderer({ text }) {
  const formatMarkdown = (txt) => {
    if (!txt) return '';
    let html = txt
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/<li>(.*?)<\/li>/g, (match) => match)
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n/g, '<br/>');
    return html;
  };

  return (
    <div 
      className="db-markdown-rendered" 
      dangerouslySetInnerHTML={{ __html: formatMarkdown(text) }}
    />
  );
}

/* ══════════════════════════════════════════════════
   UNIFIED TOURNAMENT FORM (Create / Edit)
══════════════════════════════════════════════════ */

export function TournamentForm({
  mode = 'edit', // 'create' | 'edit'
  tournament = null,
  onSubmit,
  onCancel,
  submitLabel = null,
  loading = false,
  extraFields = null, // дополнительные поля для админа/организатора
}) {
  const isCreate = mode === 'create';
  const t = tournament || {};

  // Form state
  const [name, setName] = useState(t.name || '');
  const [description, setDescription] = useState(t.description || '');
  const [rules, setRules] = useState(t.rules || '');
  const [startDate, setStartDate] = useState(toDateInput(t.start_date));
  const [endDate, setEndDate] = useState(toDateInput(t.end_date));
  const [regStart, setRegStart] = useState(toDateInput(t.registration_start));
  const [regEnd, setRegEnd] = useState(toDateInput(t.registration_end));
  const [teamsLimit, setTeamsLimit] = useState(t.teams_limit ?? '');
  const [minSize, setMinSize] = useState(t.min_team_size ?? 2);
  const [maxSize, setMaxSize] = useState(t.max_team_size ?? 5);
  const [roundsCount, setRoundsCount] = useState(t.rounds_count ?? 1);
  const [emoji, setEmoji] = useState(t.emoji || '🏆');
  const [status, setStatus] = useState(t.status || 'draft');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // ELO/EXP rewards
  const [eloParticipation, setEloParticipation] = useState(t.elo_participation ?? 10);
  const [eloPerRound, setEloPerRound] = useState(t.elo_per_round ?? 20);
  const [eloWinner, setEloWinner] = useState(t.elo_winner ?? 100);
  
  // TZ / Technical task
  const [tz, setTz] = useState(t.tz || t.technical_task || '');
  const [showPreview, setShowPreview] = useState(false);
  
  // GitHub integration
  const [githubUrl, setGithubUrl] = useState(t.github_url || '');
  const [githubBranch, setGithubBranch] = useState(t.github_branch || 'main');
  const [liveDemoUrl, setLiveDemoUrl] = useState(t.live_demo_url || '');
  const [videoUrl, setVideoUrl] = useState(t.video_url || '');
  
  // Jury selection (for admin/organizer)
  const [selectedJury, setSelectedJury] = useState(t.jury_ids || []);
  const [juryOptions, setJuryOptions] = useState([]);
  const [juryLoading, setJuryLoading] = useState(false);
  const [jurySearchQuery, setJurySearchQuery] = useState('');
  const [jurySearchResults, setJurySearchResults] = useState([]);
  const [jurySearchLoading, setJurySearchLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      rules: rules.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      registration_start: regStart || null,
      registration_end: regEnd || null,
      teams_limit: teamsLimit === '' ? null : Number(teamsLimit),
      min_team_size: Number(minSize),
      max_team_size: Number(maxSize),
      rounds_count: Number(roundsCount),
      emoji: emoji || '🏆',
      elo_participation: Number(eloParticipation),
      elo_per_round: Number(eloPerRound),
      elo_winner: Number(eloWinner),
      tz: tz.trim() || null,
      jury_ids: selectedJury.length > 0 ? selectedJury : null,
      github_url: githubUrl.trim() || null,
      github_branch: githubBranch.trim() || 'main',
      live_demo_url: liveDemoUrl.trim() || null,
      video_url: videoUrl.trim() || null,
    };

    // Для создания добавляем статус
    if (isCreate) {
      payload.status = status;
    }

    await onSubmit(payload);
  };

  const ac = ACCENT[isCreate ? status : t.status] || ACCENT.draft;
  const formTitle = isCreate ? 'Створення турніру' : (t.name || 'Редагування');
  const btnText = submitLabel || (isCreate ? 'Створити турнір' : (loading ? 'Збереження...' : '💾 Зберегти'));

  return (
    <form className="db-edit-tournament-form" onSubmit={handleSubmit}>
      <div className="db-edit-header">
        <h3 className="db-edit-title">{formTitle}</h3>
        {!isCreate && <span className="db-edit-id">id #{t.id}</span>}
      </div>

      {/* Іконка турніру (emoji) - показываем всегда */}
      <div className="db-edit-field">
        <label className="db-edit-label">Іконка турніру</label>
        <div className="db-emoji-preview" style={{ background: ac[0] }}>
          <span className="db-emoji-preview-icon">{emoji}</span>
        </div>
        <div className="db-emoji-picker-toggle">
          <button
            type="button"
            className="db-btn db-btn-ghost db-btn-sm"
            onClick={() => setShowEmojiPicker(v => !v)}
          >
            {showEmojiPicker ? 'Сховати емоджі' : 'Обрати емоджі 🎨'}
          </button>
        </div>
        {showEmojiPicker && (
          <div className="db-emoji-grid">
            {TOURNAMENT_EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                className={`db-emoji-item${emoji === e ? ' active' : ''}`}
                onClick={() => setEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Статус - только при создании */}
      {isCreate && (
        <div className="db-edit-field">
          <label className="db-edit-label">Статус <span className="db-required">*</span></label>
          <CustomSelect
            value={status}
            onChange={setStatus}
            options={[
              { value: 'draft', label: 'Draft (чернетка)' },
              { value: 'registration', label: 'Registration (реєстрація)' },
              { value: 'running', label: 'Running (активний)' },
              { value: 'finished', label: 'Finished (завершений)' },
            ]}
          />
        </div>
      )}

      <div className="db-edit-field">
        <label className="db-edit-label">Назва <span className="db-required">*</span></label>
        <input
          className="db-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Назва турніру"
          required
        />
      </div>

      <div className="db-edit-field">
        <label className="db-edit-label">Опис</label>
        <textarea
          className="db-input db-textarea"
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Опис турніру..."
        />
      </div>

      <div className="db-edit-field">
        <label className="db-edit-label">Правила</label>
        <textarea
          className="db-input db-textarea"
          rows={3}
          value={rules}
          onChange={e => setRules(e.target.value)}
          placeholder="Правила турніру..."
        />
      </div>

      {/* TZ Section - Technical Task */}
      <div className="db-edit-section db-edit-section-tz">
        <h4 className="db-edit-section-title">📋 Технічне завдання (ТЗ)</h4>
        <div className="db-edit-field">
          <label className="db-edit-label">Опис завдання</label>
          
          {/* Rich Text Editor Toolbar */}
          <div className="db-rt-toolbar">
            <div className="db-rt-group">
              <button type="button" className="db-rt-btn" title="Жирний (Ctrl+B)" onClick={() => {
                const ta = document.getElementById('tz-textarea');
                if (ta) {
                  const start = ta.selectionStart;
                  const end = ta.selectionEnd;
                  const selected = ta.value.substring(start, end);
                  if (selected) {
                    const newVal = ta.value.substring(0, start) + `**${selected}**` + ta.value.substring(end);
                    setTz(newVal);
                  }
                }
              }}><b>B</b></button>
              <button type="button" className="db-rt-btn" title="Курсив (Ctrl+I)" onClick={() => {
                const ta = document.getElementById('tz-textarea');
                if (ta) {
                  const start = ta.selectionStart;
                  const end = ta.selectionEnd;
                  const selected = ta.value.substring(start, end);
                  if (selected) {
                    const newVal = ta.value.substring(0, start) + `*${selected}*` + ta.value.substring(end);
                    setTz(newVal);
                  }
                }
              }}><i>I</i></button>
              <button type="button" className="db-rt-btn" title="Підкреслення" onClick={() => {
                const ta = document.getElementById('tz-textarea');
                if (ta) {
                  const start = ta.selectionStart;
                  const end = ta.selectionEnd;
                  const selected = ta.value.substring(start, end);
                  if (selected) {
                    const newVal = ta.value.substring(0, start) + `__${selected}__` + ta.value.substring(end);
                    setTz(newVal);
                  }
                }
              }}><u>U</u></button>
              <button type="button" className="db-rt-btn" title="Закреслення" onClick={() => {
                const ta = document.getElementById('tz-textarea');
                if (ta) {
                  const start = ta.selectionStart;
                  const end = ta.selectionEnd;
                  const selected = ta.value.substring(start, end);
                  if (selected) {
                    const newVal = ta.value.substring(0, start) + `~~${selected}~~` + ta.value.substring(end);
                    setTz(newVal);
                  }
                }
              }}><s>S</s></button>
            </div>
            <div className="db-rt-divider" />
            <div className="db-rt-group">
              <button type="button" className="db-rt-btn db-rt-btn-small" title="Заголовок" onClick={() => {
                const ta = document.getElementById('tz-textarea');
                if (ta) {
                  const start = ta.selectionStart;
                  const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
                  const newVal = ta.value.substring(0, lineStart) + '## ' + ta.value.substring(lineStart);
                  setTz(newVal);
                }
              }}>H</button>
              <button type="button" className="db-rt-btn" title="Список" onClick={() => {
                const ta = document.getElementById('tz-textarea');
                if (ta) {
                  const start = ta.selectionStart;
                  const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
                  const newVal = ta.value.substring(0, lineStart) + '- ' + ta.value.substring(lineStart);
                  setTz(newVal);
                }
              }}>☰</button>
              <button type="button" className="db-rt-btn" title="Посилання" onClick={() => {
                const url = prompt('Введіть URL:');
                if (url) {
                  const ta = document.getElementById('tz-textarea');
                  if (ta) {
                    const start = ta.selectionStart;
                    const end = ta.selectionEnd;
                    const selected = ta.value.substring(start, end) || 'посилання';
                    const newVal = ta.value.substring(0, start) + `[${selected}](${url})` + ta.value.substring(end);
                    setTz(newVal);
                  }
                }
              }}>🔗</button>
              <button type="button" className="db-rt-btn" title="Код" onClick={() => {
                const ta = document.getElementById('tz-textarea');
                if (ta) {
                  const start = ta.selectionStart;
                  const end = ta.selectionEnd;
                  const selected = ta.value.substring(start, end);
                  if (selected) {
                    const newVal = ta.value.substring(0, start) + `\`\`\`\n${selected}\n\`\`\`` + ta.value.substring(end);
                    setTz(newVal);
                  }
                }
              }}>{'<>'}</button>
            </div>
            <div className="db-rt-divider" />
            <div className="db-rt-group">
              <button type="button" className="db-rt-btn db-rt-btn-preview" title="Попередній перегляд" onClick={() => setShowPreview(true)}>👁</button>
            </div>
          </div>
          
          {/* Preview Modal */}
          {showPreview && (
            <div className="modal-overlay" onClick={() => setShowPreview(false)}>
              <div className="db-preview-modal" onClick={e => e.stopPropagation()}>
                <div className="db-preview-header">
                  <h4>Попередній перегляд ТЗ</h4>
                  <button type="button" className="db-preview-close" onClick={() => setShowPreview(false)}>✕</button>
                </div>
                <div className="db-preview-content">
                  <MarkdownRenderer text={tz || '*(Технічне завдання порожнє)*'} />
                </div>
                <div className="db-preview-footer">
                  <button type="button" className="db-btn db-btn-ghost" onClick={() => setShowPreview(false)}>Закрити</button>
                </div>
              </div>
            </div>
          )}
          
          {/* Resizable Textarea */}
          <div className="db-rt-editor">
            <textarea
              id="tz-textarea"
              className="db-input db-textarea db-tz-textarea"
              rows={6}
              value={tz}
              onChange={e => setTz(e.target.value)}
              placeholder="Опишіть технічне завдання для учасників...&#10;&#10;Наприклад:&#10;- Створіть кліматичну модель прогнозування&#10;- Використовуйте наданий датасет&#10;- Результат: робочий прототип + презентація"
            />
            <div className="db-rt-resize-handle" title="Потягніть щоб змінити розмір">
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path d="M9 9L3 3M9 6L6 3M6 9L3 6" stroke="#999" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          
          <small className="db-field-hint">
            💡 Підтримує Markdown: **жирний**, *курсив*, `код`, ## заголовок<br/>
            💡 ТЗ буде доступне всім учасникам після старту турніру
          </small>
        </div>
        
        {/* GitHub Integration */}
        <div className="db-tz-github-preview">
          <div className="db-tz-github-header">
            <IconGithub width="20" height="20" />
            <span>GitHub інтеграція <span className="db-tz-github-badge">вже доступно</span></span>
          </div>
          <div className="db-tz-github-fields">
            <div className="db-edit-field">
              <label className="db-edit-label">🔗 GitHub Repository URL</label>
              <input 
                type="url"
                className="db-input"
                value={githubUrl}
                onChange={e => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username/repo"
              />
              <small className="db-field-hint">Посилання на репозиторій для автоматичної перевірки</small>
            </div>
            <div className="db-edit-field">
              <label className="db-edit-label">🌿 Branch / Tag</label>
              <input 
                type="text"
                className="db-input"
                value={githubBranch}
                onChange={e => setGithubBranch(e.target.value)}
                placeholder="main"
              />
              <small className="db-field-hint">Вітка для сабміту (за замовчуванням: main)</small>
            </div>
            <div className="db-edit-row-2">
              <div className="db-edit-field">
                <label className="db-edit-label">🚀 Live Demo URL</label>
                <input 
                  type="url"
                  className="db-input"
                  value={liveDemoUrl}
                  onChange={e => setLiveDemoUrl(e.target.value)}
                  placeholder="https://my-project.vercel.app"
                />
                <small className="db-field-hint">Посилання на робочий прототип</small>
              </div>
              <div className="db-edit-field">
                <label className="db-edit-label">🎥 Pitch Video URL</label>
                <input 
                  type="url"
                  className="db-input"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                />
                <small className="db-field-hint">Відео-презентація проєкту</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Jury Selection */}
      <div className="db-edit-section db-edit-section-jury">
        <h4 className="db-edit-section-title">⚖️ Призначення журі</h4>
        <div className="db-edit-field">
          <label className="db-edit-label">Виберіть журі для оцінювання</label>
          <JurySearchSelector 
            selectedJury={selectedJury}
            onChange={setSelectedJury}
          />
          <small className="db-field-hint">
            💡 Журі зможуть оцінювати проєкти у всіх раундах цього турніру. Можна призначати користувачів з ролями Організатор або Журі.
          </small>
        </div>
      </div>

      <div className="db-edit-row-2">
        <div className="db-edit-field">
          <label className="db-edit-label">Дата старту</label>
          <input type="date" className="db-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="db-edit-field">
          <label className="db-edit-label">Дата закінчення</label>
          <input type="date" className="db-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="db-edit-row-2">
        <div className="db-edit-field">
          <label className="db-edit-label">Реєстрація від</label>
          <input type="date" className="db-input" value={regStart} onChange={e => setRegStart(e.target.value)} />
        </div>
        <div className="db-edit-field">
          <label className="db-edit-label">Реєстрація до</label>
          <input type="date" className="db-input" value={regEnd} onChange={e => setRegEnd(e.target.value)} />
        </div>
      </div>

      <div className="db-edit-row-3">
        <div className="db-edit-field">
          <label className="db-edit-label">Макс. команд</label>
          <input type="number" className="db-input" min={0} value={teamsLimit} onChange={e => setTeamsLimit(e.target.value)} placeholder="∞" />
        </div>
        <div className="db-edit-field">
          <label className="db-edit-label">Мін. осіб</label>
          <input type="number" className="db-input" min={1} value={minSize} onChange={e => setMinSize(e.target.value)} />
        </div>
        <div className="db-edit-field">
          <label className="db-edit-label">Макс. осіб</label>
          <input type="number" className="db-input" min={1} value={maxSize} onChange={e => setMaxSize(e.target.value)} />
        </div>
      </div>

      <div className="db-edit-field">
        <label className="db-edit-label">Кількість раундів</label>
        <input type="number" className="db-input" min={1} value={roundsCount} onChange={e => setRoundsCount(e.target.value)} />
      </div>

      {/* ELO настройки */}
      <div className="db-edit-section">
        <h4 className="db-edit-section-title">🏆 Нагороди ELO</h4>
        <div className="db-edit-row-3">
          <div className="db-edit-field">
            <label className="db-edit-label">За участь</label>
            <input 
              type="number" 
              className="db-input" 
              min={0} 
              value={eloParticipation} 
              onChange={e => setEloParticipation(e.target.value)}
              placeholder="10"
            />
            <small className="db-field-hint">Базові очки</small>
          </div>
          <div className="db-edit-field">
            <label className="db-edit-label">За раунд</label>
            <input 
              type="number" 
              className="db-input" 
              min={0} 
              value={eloPerRound} 
              onChange={e => setEloPerRound(e.target.value)}
              placeholder="20"
            />
            <small className="db-field-hint">× номер раунду</small>
          </div>
          <div className="db-edit-field">
            <label className="db-edit-label">За перемогу</label>
            <input 
              type="number" 
              className="db-input" 
              min={0} 
              value={eloWinner} 
              onChange={e => setEloWinner(e.target.value)}
              placeholder="100"
            />
            <small className="db-field-hint">1-ше місце</small>
          </div>
        </div>
        <p className="db-elo-preview">
          💡 Формула: <strong>{eloParticipation}</strong> + (раунд × <strong>{eloPerRound}</strong>) + <strong>{eloWinner}</strong> за 1-ше місце
        </p>
      </div>

      {/* Дополнительные поля от родителя (для админа/организатора) */}
      {extraFields}

      <div className="db-edit-actions">
        <button type="button" className="db-btn db-btn-ghost" onClick={onCancel}>Скасувати</button>
        <button type="submit" className="db-btn db-btn-primary db-btn-submit" disabled={loading || !name.trim()}>
          {btnText}
        </button>
      </div>
    </form>
  );
}

// Helper для конвертации даты в input[type=date]
function toDateInput(d) {
  if (!d) return '';
  try { return new Date(d).toISOString().slice(0, 10); } catch { return ''; }
}

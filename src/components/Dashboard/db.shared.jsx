/* Дашборд - спільні константи, хелпери та компоненти для всього дашборду */
import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
const PublicProfileModal = lazy(() =>
  import('./PublicProfilePage.jsx').then(m => ({ default: m.PublicProfileModal }))
);
import { io } from 'socket.io-client';
import { searchUsers, getUserProfile, getTournaments, getTournament, getTournamentFiles, API_BASE, CHECK_BACKEND, getToken } from '@utils/authApi';

import IconGithubSm  from '@images/dashboard_components/icon_github.svg?react';
import IconLogoutSm  from '@images/dashboard_components/icon_logout.svg?react';
import IconProfileSm from '@images/dashboard_components/icon_profile.svg?react';
import IconChatBubble from '@images/dashboard_components/chat.svg?react';
import IconUserSvg    from '@images/dashboard_components/icon_user.svg?react';
import IconOglad      from '@images/dashboard_components/oglad.svg?react';
import IconTime       from '@images/dashboard_components/time.svg?react';
import IconSave       from '@images/dashboard_components/save.svg?react';

import emote1 from '@images/emote/emote.png';
import emote2 from '@images/emote/emote2.png';
import emote3 from '@images/emote/emote3.png';
import emote4 from '@images/emote/emote4.png';
import emote5 from '@images/emote/emote5.png';
import emote6 from '@images/emote/emote6.png';
import emote7 from '@images/emote/emote7.svg';
import emote8 from '@images/emote/emote8.svg';
import emote9 from '@images/emote/emote9.svg';
import emote10 from '@images/emote/emote10.svg';
import emote11 from '@images/emote/emote11.svg';
import emote12 from '@images/emote/emote12.svg';
import emote13 from '@images/emote/emote13.svg';
import emote14 from '@images/emote/emote14.svg';
import emote15 from '@images/emote/emote15.svg';
import emote16 from '@images/emote/emote16.svg';
import emote17 from '@images/emote/emote17.svg';
import emote18 from '@images/emote/emote18.svg';
import emote19 from '@images/emote/emote19.svg';
import emote20 from '@images/emote/emote20.svg';
import emote21 from '@images/emote/emote21.svg';
import emote22 from '@images/emote/emote22.svg';
import emote23 from '@images/emote/emote23.svg';
import emote24 from '@images/emote/emote24.svg';
import emote25 from '@images/emote/emote25.svg';
import emote26 from '@images/emote/emote26.svg';
import emote27 from '@images/emote/emote27.svg';
import emote28 from '@images/emote/emote28.svg';
import emote29 from '@images/emote/emote29.svg';
import emote30 from '@images/emote/emote30.svg';


import badge1Img from '@images/pin/bage1.png';
import badge2Img from '@images/pin/bage2.png';

export const STICKERS = [emote1, emote2, emote3, emote4, emote5, emote6, emote7, emote8, emote9, emote10, emote11, emote12, emote13, emote14, emote15, emote16, emote17, emote18, emote19, emote20, emote21, emote22, emote23, emote24, emote25, emote26, emote27, emote28, emote29, emote30];
export const STICKER_PREFIX = '__sticker__:';

/* ──────────── User presence (online/away/dnd/offline) ──────────── */
export const PRESENCE = {
  online:  { label: 'Онлайн',        color: '#16a34a', bg: 'rgba(34,197,94,.13)',   dot: '#22c55e' },
  away:    { label: 'Відійшов',     color: '#d97706', bg: 'rgba(245,158,11,.13)',  dot: '#f59e0b' },
  dnd:     { label: 'Не турбувати', color: '#b91c1c', bg: 'rgba(239,68,68,.13)',   dot: '#ef4444' },
  offline: { label: 'Офлайн',        color: '#6b7280', bg: 'rgba(107,114,128,.13)', dot: '#9ca3af' },
};

/** Frontend safety net: if backend says "online" but last_seen is stale (e.g. user
 *  closed the tab and our beacon didn't reach), treat them as offline. */
const PRESENCE_STALE_MS = 2 * 60 * 1000;
export function presenceOf(user) {
  if (!user) return 'offline';
  const raw = (user.status || 'offline').toLowerCase();
  if (!PRESENCE[raw]) return 'offline';
  if (raw === 'offline') return 'offline';
  const last = user.last_seen_at ? new Date(user.last_seen_at).getTime() : 0;
  if (last && Date.now() - last > PRESENCE_STALE_MS) return 'offline';
  return raw;
}

export function PresenceBadge({ user, withDot = true, className = '' }) {
  const key = presenceOf(user);
  const p = PRESENCE[key];
  return (
    <span className={`db-presence-badge db-presence-badge--${key} ${className}`}
          style={{ color: p.color, background: p.bg }}>
      {withDot && <span className="db-presence-dot" style={{ background: p.dot }} />}
      {p.label}
    </span>
  );
}

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
  overview:    { icon: '🏠', title: 'Головна',     text: 'Тут зібрана вся важлива інформація: ваші турніри, команди та навігація.' },
  tournaments: { icon: '🏆', title: 'Турніри',   text: 'Переглядайте актуальні змагання, турніри та реєструйтесь!.' },
  teams:       { icon: <IconUserSvg style={{ width: 20, height: 20, color: '#7c5ff5' }} />, title: 'Команди',   text: 'Усі ваші команди в одному місці. Команди прив\'язані до конкретних турнірів.' },
  leaderboard: { icon: <IconOglad style={{ width: 20, height: 20 }} />, title: 'Лідерборд', text: 'Рейтинг команд по кожному турніру. Оберіть турнір щоб побачити результати.' },
  chat:        { icon: <IconChatBubble style={{ width: 20, height: 20 }} />, title: 'Чат',       text: 'Загальний чат та приватні кімнати для вашої команди. ПКМ на повідомлення — дії.' },
  profile:     { icon: '👤', title: 'Профіль',   text: 'Налаштуйте нікнейм, аватар, банер та опис профілю.' },
  organizer:   { icon: '🗂️', title: 'Організатор', text: 'Створюйте турніри, керуйте раундами та переглядайте команди.' },
  admin:       { icon: '⚙️', title: 'Адмін',        text: 'Керуйте усіма аспектами платформи. :)' },
};

/* Helpers (хелперы) (вдруг не понял с первого раза) */

export function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
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

/** Pick the most relevant round for display/submission.
 *  Priority: currently running by date → status=active → next upcoming → last past */
export function pickCurrentRound(rounds) {
  if (!Array.isArray(rounds) || rounds.length === 0) return null;
  const now = Date.now();
  const sorted = [...rounds].sort((a, b) => new Date(a.start_date || 0) - new Date(b.start_date || 0));
  // 1. Round currently running by date
  const byDate = sorted.find(r => {
    const s = new Date(r.start_date || 0).getTime();
    const e = new Date(r.end_date || 0).getTime();
    return s <= now && now < e;
  });
  if (byDate) return byDate;
  // 2. Round with status=active
  const byStatus = sorted.find(r => r.status === 'active');
  if (byStatus) return byStatus;
  // 3. Next upcoming round
  const upcoming = sorted.find(r => new Date(r.start_date || 0).getTime() > now);
  if (upcoming) return upcoming;
  // 4. Last round (all past)
  return sorted[sorted.length - 1];
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
  const status = presenceOf(user);
  
  const avatarContent = url && !imgError ? (
    <img
      src={url}
      alt={user?.username || 'User'}
      title={user?.username || user?.email}
      referrerPolicy="no-referrer"
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
    <div className="db-avatar-with-status" style={{ position: 'relative' }}>
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

const ROLE_CONFIG = {
  admin:     { label: 'Адмін',       color: '#f59e0b', bg: 'rgba(245,158,11,.13)' },
  organizer: { label: 'Організатор', color: '#0ea5e9', bg: 'rgba(14,165,233,.13)' },
  jury:      { label: 'Журі',        color: '#6366f1', bg: 'rgba(99,102,241,.13)'  },
  banned:    { label: 'Заблок.',     color: '#ef4444', bg: 'rgba(239,68,68,.13)'   },
};

export function MiniProfileModal({ user, onClose, onGoProfile, onLogout }) {
  const ref = useRef(null);
  const [copied,  setCopied]  = useState(false);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const onMouse = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey   = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown',   onKey);
    return () => { document.removeEventListener('mousedown', onMouse); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const dotPositions = useMemo(() =>
    [...Array(18)].map(() => ({
      left:  `${Math.random() * 100}%`,
      top:   `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      size:  `${2 + Math.random() * 3}px`,
    })), []);

  const bannerStyle = user.banner_url
    ? { backgroundImage: `url(${resolveAvatarUrl(user.banner_url)})`, backgroundSize: 'cover', backgroundPosition: 'center top' }
    : { background: `linear-gradient(135deg, ${user.banner_color || '#1e1b2e'} 0%, #191A23 100%)` };

  const roleConf = ROLE_CONFIG[user.role] || { label: 'Учасник', color: '#AC9EF8', bg: 'rgba(172,158,248,.13)' };
  const name = displayName(user);

  const handleCopyUsername = () => {
    if (!user.username) return;
    navigator.clipboard.writeText(user.username).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleBannerMouseMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setGlowPos({
      x: ((e.clientX - r.left) / r.width)  * 100,
      y: ((e.clientY - r.top)  / r.height) * 100,
    });
  };

  return (
    <div className="db-mini-profile" ref={ref} onClick={e => e.stopPropagation()}>

      {/* ── Banner ── */}
      <div className="db-mp-banner" style={bannerStyle}
        onMouseMove={!user.banner_url ? handleBannerMouseMove : undefined}
        onMouseLeave={!user.banner_url ? () => setGlowPos({ x: 50, y: 50 }) : undefined}>
        {!user.banner_url && (
          <div className="db-mp-effects">
            <div className="db-mp-glow" style={{
              top:   `${-60 + (glowPos.y / 100) * 50}px`,
              right: `${-20 + ((100 - glowPos.x) / 100) * 50}px`,
              transition: 'top .5s ease, right .5s ease',
            }} />
            <div className="db-mp-glow db-mp-glow-2" style={{
              bottom: `${-30 + ((100 - glowPos.y) / 100) * 30}px`,
              left:   `${15 + (glowPos.x / 100) * 30}%`,
              transition: 'bottom .5s ease, left .5s ease',
            }} />
          </div>
        )}
        <button className="db-mp-banner-edit" onClick={onGoProfile} title="Редагувати профіль">
          ✏ Змінити
        </button>
      </div>

      {/* ── Identity zone (avatar overflows banner) ── */}
      <div className="db-mp-identity">
        <div className="db-mp-avatar-wrap">
          <UserAvatar user={user} size={66} showStatus={true} />
        </div>
        <div className="db-mp-id-info">
          <div className="db-mp-id-top">
            <strong className="db-mp-name">{name}</strong>
            <span className="db-mp-role-tag" style={{ color: roleConf.color, background: roleConf.bg }}>
              {roleConf.label}
            </span>
          </div>
          {user.username && (
            <button className={`db-mp-at${copied ? ' copied' : ''}`} onClick={handleCopyUsername} title="Натисни щоб скопіювати">
              {copied ? '✓ Скопійовано' : `@${user.username}`}
            </button>
          )}
        </div>
      </div>

      {/* ── Bio ── */}
      {user.user_description && (
        <p className="db-mp-bio">{user.user_description}</p>
      )}

      {/* ── GitHub ── */}
      {user.auth_provider === 'github' && user.github_username && (
        <div className="db-mp-github-row">
          <IconGithubSm className="db-mp-github-icon" />
          <span>{user.github_username}</span>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="db-mp-actions">
        <button className="db-mp-action" onClick={onGoProfile}>
          <IconProfileSm className="db-mp-action-icon" />
          <span>Мій профіль</span>
        </button>
        {onLogout && (
          <button className="db-mp-action danger" onClick={onLogout}>
            <IconLogoutSm className="db-mp-action-icon" />
            <span>Вийти з акаунту</span>
          </button>
        )}
      </div>

      {/* ── Meta ── */}
      <div className="db-mp-meta">
        З нами з {formatDate(user.created_at)}
      </div>

    </div>
  );
}

function UserProfileViewModal({ user, onClose }) {
  const bannerStyle = user.banner_url
    ? { backgroundImage: `url(${API_BASE + user.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center top' }
    : { background: `linear-gradient(135deg, ${user.banner_color || '#1e1b2e'} 0%, #191A23 100%)` };
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
  const [showPublic, setShowPublic] = useState(false);

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const bannerStyle = profile.banner_url
    ? { backgroundImage: `url(${API_BASE + profile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center top' }
    : { background: `linear-gradient(135deg, ${profile.banner_color || '#1e1b2e'} 0%, #191A23 100%)` };
  const isAdmin = profile.role === 'admin';

  return (
    <>
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
            {profile.user_id === meId ? (
              <button className="db-upm-btn primary" onClick={onGoOwnProfile}>✏ Редагувати профіль</button>
            ) : (
              <>
                <button className="db-upm-btn primary" onClick={() => setShowPublic(true)}>
                  Повний профіль →
                </button>
                <button className="db-upm-btn ghost" onClick={onClose}>Закрити</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    {showPublic && profile.username && (
      <Suspense fallback={null}>
        <PublicProfileModal username={profile.username} onClose={() => setShowPublic(false)} />
      </Suspense>
    )}
    </>
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

/** Generic tone helper — used by the chat-action sound effects below. */
function playTone({ freq = 880, duration = 0.18, volume = 0.1, type = 'sine', sweepTo = null }) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (sweepTo !== null) {
      osc.frequency.exponentialRampToValueAtTime(sweepTo, ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => ctx.close();
  } catch {}
}

/** When the user replies (sends a reply) — short upward swoosh. */
export function playReplySound() {
  playTone({ freq: 520, sweepTo: 880, duration: 0.16, volume: 0.09, type: 'triangle' });
}

/** When the user adds a reaction — soft pop. */
export function playReactionSound() {
  playTone({ freq: 1100, sweepTo: 1500, duration: 0.1, volume: 0.08, type: 'sine' });
  setTimeout(() => playTone({ freq: 1700, duration: 0.06, volume: 0.05, type: 'sine' }), 60);
}

/** When a message is deleted — short downward whoosh. */
export function playDeleteSound() {
  playTone({ freq: 520, sweepTo: 180, duration: 0.22, volume: 0.09, type: 'sawtooth' });
}

/* ══════════════════════════════════════════════════
   JURY SEARCH SELECTOR
   Пошук користувачів з фільтрацією за ролями (organizer/jury)
══════════════════════════════════════════════════ */
function JurySearchSelector({ selectedJury, onChange, initialUsers = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState(initialUsers);
  const debounceRef = useRef(null);

  // Завантажуємо деталі обраних журі
  useEffect(() => {
    setSelectedUsers(prev => {
      const map = new Map(prev.map(u => [Number(u.id), u]));
      initialUsers.forEach(u => {
        if (u?.id) map.set(Number(u.id), u);
      });
      return selectedJury.map(id => map.get(Number(id)) || { id, username: `#${id}`, role: 'jury' });
    });
  }, [initialUsers, selectedJury]);

  useEffect(() => {
    const missingIds = selectedJury.filter(id => !selectedUsers.some(u => Number(u.id) === Number(id)));
    if (missingIds.length === 0) return;
    const loadSelected = async () => {
      try {
        const users = await Promise.all(missingIds.map(id => getUserProfile(id)));
        setSelectedUsers(prev => {
          const map = new Map(prev.map(u => [Number(u.id), u]));
          users.filter(u => u && u.id).forEach(u => map.set(Number(u.id), u));
          return selectedJury.map(id => map.get(Number(id)) || { id, username: `#${id}`, role: 'jury' });
        });
      } catch {
        setSelectedUsers(prev => selectedJury.map(id => prev.find(u => Number(u.id) === Number(id)) || { id, username: `#${id}`, role: 'jury' }));
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
        const filtered = all.filter(u => !selectedJury.includes(u.id));
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
      setSelectedUsers(prev => [...prev.filter(u => Number(u.id) !== Number(user.id)), user]);
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
        {loading && <span className="db-jury-search-loading"><IconTime style={{ width: 16, height: 16 }} /></span>}
        
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
export function MarkdownRenderer({ text }) {
  const formatMarkdown = (txt) => {
    if (!txt) return '';
    const escapeHtml = (value) => String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const inline = (value) => escapeHtml(value)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

    const lines = String(txt).replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let paragraph = [];
    let list = [];
    let inCode = false;
    let codeLang = '';
    let codeLines = [];

    const flushParagraph = () => {
      if (!paragraph.length) return;
      out.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    };

    const flushList = () => {
      if (!list.length) return;
      out.push(`<ul>${list.map(item => `<li>${inline(item)}</li>`).join('')}</ul>`);
      list = [];
    };

    for (const line of lines) {
      const codeMatch = line.match(/^```(\w+)?\s*$/);
      if (codeMatch) {
        if (inCode) {
          out.push(`<pre><code${codeLang ? ` data-lang="${escapeHtml(codeLang)}"` : ''}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
          inCode = false;
          codeLang = '';
          codeLines = [];
        } else {
          flushParagraph();
          flushList();
          inCode = true;
          codeLang = codeMatch[1] || '';
        }
        continue;
      }

      if (inCode) {
        codeLines.push(line);
        continue;
      }

      if (!line.trim()) {
        flushParagraph();
        flushList();
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        flushList();
        const level = Math.min(heading[1].length, 3);
        out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
        continue;
      }

      const item = line.match(/^\s*[-*]\s+(.+)$/);
      if (item) {
        flushParagraph();
        list.push(item[1].trim());
        continue;
      }

      paragraph.push(line.trim());
    }

    if (inCode) out.push(`<pre><code${codeLang ? ` data-lang="${escapeHtml(codeLang)}"` : ''}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    flushParagraph();
    flushList();
    return out.join('');
  };

  return (
    <div 
      className="db-markdown-rendered" 
      dangerouslySetInnerHTML={{ __html: formatMarkdown(text) }}
    />
  );
}

/* ══════════════════════════════════════════════════
   UNIFIED TOURNAMENT FORM (Create / Edit) — Wizard
══════════════════════════════════════════════════ */

const WIZARD_STEPS = [
  { id: 1, icon: '📋', label: 'Основне' },
  { id: 2, icon: '📜', label: 'Правила' },
  { id: 3, icon: '🗂️', label: 'ТЗ' },
  { id: 4, icon: '⚖️', label: 'Журі' },
  { id: 5, icon: '📅', label: 'Налаштування' },
  { id: 6, icon: '🏆', label: 'Нагороди' },
];

const RULES_ACCEPTED = '.doc,.docx,.pdf,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown';
const TZ_ACCEPTED = '.zip,.txt,.md,.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif';

function fileNameFromUrl(url) {
  if (!url) return '';
  const raw = String(url).split('/').pop() || '';
  try { return decodeURIComponent(raw); } catch { return raw; }
}

function parsePrizeList(value) {
  const fallback = [{ place: 1, description: '' }, { place: 2, description: '' }, { place: 3, description: '' }];
  if (!value) return fallback;
  if (Array.isArray(value)) return value.length ? value : fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function normalizeTournamentJury(tournament) {
  const users =
    tournament?.jury_members ||
    tournament?.juryMembers ||
    tournament?.assigned_jury ||
    tournament?.assignedJury ||
    tournament?.judges ||
    tournament?.jury ||
    [];
  if (!Array.isArray(users)) return [];
  return users.filter(u => u && u.id).map(u => ({
    ...u,
    username: u.username || u.full_name || u.name || u.email || `#${u.id}`,
  }));
}

function normalizeTournamentJuryIds(tournament) {
  if (Array.isArray(tournament?.jury_ids)) return tournament.jury_ids.map(Number).filter(Boolean);
  if (Array.isArray(tournament?.juryIds)) return tournament.juryIds.map(Number).filter(Boolean);
  if (Array.isArray(tournament?.assigned_jury_ids)) return tournament.assigned_jury_ids.map(Number).filter(Boolean);
  if (Array.isArray(tournament?.judge_ids)) return tournament.judge_ids.map(Number).filter(Boolean);
  return normalizeTournamentJury(tournament).map(u => Number(u.id)).filter(Boolean);
}

function firstDefined(...values) {
  return values.find(v => v !== undefined && v !== null && v !== '');
}

function tournamentField(tournament, ...keys) {
  return firstDefined(...keys.map(key => tournament?.[key]));
}

function insertMd(textareaId, before, after, setFn, currentVal) {
  const ta = document.getElementById(textareaId);
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = currentVal.substring(start, end);
  const newVal = currentVal.substring(0, start) + before + (selected || 'текст') + after + currentVal.substring(end);
  setFn(newVal);
  setTimeout(() => {
    ta.focus();
    const cur = start + before.length;
    ta.setSelectionRange(cur, cur + (selected || 'текст').length);
  }, 0);
}

export function TournamentForm({
  mode = 'edit',
  tournament = null,
  onSubmit,
  onCancel,
  submitLabel = null,
  loading = false,
}) {
  const isCreate = mode === 'create';
  const t = tournament || {};
  const initialRules = tournamentField(t, 'rules', 'tournament_rules', 'rules_text', 'rulesText');
  const initialTz = tournamentField(t, 'tz', 'tournament_tz', 'technical_task', 'technicalTask', 'task_text', 'taskText');

  const [step, setStep] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 1 — Основне
  const [emoji, setEmoji] = useState(t.emoji || '🏆');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [status, setStatus] = useState(t.status || 'draft');
  const [name, setName] = useState(t.name || '');
  const [description, setDescription] = useState(t.description || '');
  const [parentTournamentId, setParentTournamentId] = useState(t.parent_tournament_id || '');
  const [parentTournaments, setParentTournaments] = useState([]);

  // Step 2 — Правила
  const [rulesMode, setRulesMode] = useState(t.rules_mode || (initialRules ? 'text' : 'file'));
  const [rulesText, setRulesText] = useState(initialRules || '');
  const [rulesFile, setRulesFile] = useState(null);
  const [rulesFileName, setRulesFileName] = useState(
    t.rules_file_url ? fileNameFromUrl(t.rules_file_url) : ''
  );
  const [rulesFileRemoved, setRulesFileRemoved] = useState(false);

  // Step 3 — ТЗ
  const [tzMode, setTzMode] = useState(initialTz ? 'text' : (!isCreate && t.id ? 'file' : 'text'));
  const [tz, setTz] = useState(initialTz || '');
  const [tzMainFile, setTzMainFile] = useState(null);
  const [tzFiles, setTzFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState({ rules: [], tz: [], misc: [] });
  const [removedFiles, setRemovedFiles] = useState([]);
  const [showTzPreview, setShowTzPreview] = useState(false);

  // Step 4 — Журі
  const [selectedJury, setSelectedJury] = useState(normalizeTournamentJuryIds(t));
  const [initialJuryUsers, setInitialJuryUsers] = useState(normalizeTournamentJury(t));

  // Step 5 — Налаштування
  const [startDate, setStartDate] = useState(toDateTimeInput(tournamentField(t, 'start_date', 'tournament_start', 'startDate')));
  const [endDate, setEndDate] = useState(toDateTimeInput(tournamentField(t, 'end_date', 'tournament_end', 'endDate')));
  const [regStart, setRegStart] = useState(toDateTimeInput(tournamentField(t, 'registration_start', 'registrationStart', 'registration_start_date')));
  const [regEnd, setRegEnd] = useState(toDateTimeInput(tournamentField(t, 'registration_end', 'registrationEnd', 'registration_end_date')));
  const [subStart, setSubStart] = useState(toDateTimeInput(tournamentField(t, 'submission_start', 'tournament_submission_start', 'submissionStart')));
  const [subEnd, setSubEnd] = useState(toDateTimeInput(tournamentField(t, 'submission_end', 'tournament_submission_end', 'submissionEnd')));
  const [teamsLimit, setTeamsLimit] = useState(t.teams_limit ?? '');
  const [minSize, setMinSize] = useState(t.min_team_size ?? 2);
  const [maxSize, setMaxSize] = useState(t.max_team_size ?? 5);
  const [roundsCount, setRoundsCount] = useState(t.rounds_count ?? 1);

  // Step 6 — Нагороди
  const [eloParticipation, setEloParticipation] = useState(t.elo_participation ?? 10);
  const [eloPerRound, setEloPerRound] = useState(t.elo_per_round ?? 20);
  const [eloWinner, setEloWinner] = useState(t.elo_winner ?? 100);
  const [hasAdditionalPrizes, setHasAdditionalPrizes] = useState(() => (
    parsePrizeList(t.additional_prizes).some(p => String(p?.description || '').trim())
  ));
  const [additionalPrizes, setAdditionalPrizes] = useState(() => parsePrizeList(t.additional_prizes));

  useEffect(() => {
    if (isCreate || !t.id) return;
    let cancelled = false;

    getTournament(t.id)
      .then(detail => {
        if (cancelled || !detail) return;

        const detailRules = tournamentField(detail, 'rules', 'tournament_rules', 'rules_text', 'rulesText');
        const detailTz = tournamentField(detail, 'tz', 'tournament_tz', 'technical_task', 'technicalTask', 'task_text', 'taskText');
        if (!rulesText && detailRules) {
          setRulesText(detailRules);
          setRulesMode('text');
        }
        if (!tz && detailTz) {
          setTz(detailTz);
          setTzMode('text');
        }

        const nextStart = toDateTimeInput(tournamentField(detail, 'start_date', 'tournament_start', 'startDate'));
        const nextEnd = toDateTimeInput(tournamentField(detail, 'end_date', 'tournament_end', 'endDate'));
        const nextRegStart = toDateTimeInput(tournamentField(detail, 'registration_start', 'registrationStart', 'registration_start_date'));
        const nextRegEnd = toDateTimeInput(tournamentField(detail, 'registration_end', 'registrationEnd', 'registration_end_date'));
        const nextSubStart = toDateTimeInput(tournamentField(detail, 'submission_start', 'tournament_submission_start', 'submissionStart'));
        const nextSubEnd = toDateTimeInput(tournamentField(detail, 'submission_end', 'tournament_submission_end', 'submissionEnd'));

        if (!startDate && nextStart) setStartDate(nextStart);
        if (!endDate && nextEnd) setEndDate(nextEnd);
        if (!regStart && nextRegStart) setRegStart(nextRegStart);
        if (!regEnd && nextRegEnd) setRegEnd(nextRegEnd);
        if (!subStart && nextSubStart) setSubStart(nextSubStart);
        if (!subEnd && nextSubEnd) setSubEnd(nextSubEnd);

        const detailJury = normalizeTournamentJury(detail);
        const detailJuryIds = normalizeTournamentJuryIds(detail);
        if (detailJury.length) {
          setInitialJuryUsers(detailJury);
          setSelectedJury(detailJuryIds.length ? detailJuryIds : detailJury.map(u => Number(u.id)).filter(Boolean));
        } else if (detailJuryIds.length) {
          setSelectedJury(detailJuryIds);
        }
      })
      .catch(() => {});

    getTournamentFiles(t.id)
      .then(data => {
        if (cancelled) return;
        const grouped = { rules: [], tz: [], misc: [] };
        (data?.files || []).forEach(group => {
          if (!group?.type) return;
          grouped[group.type] = Array.isArray(group.files) ? group.files : [];
        });
        setExistingFiles(grouped);
        if (!tz && grouped.tz?.length) setTzMode('file');
        if (!rulesFileName && grouped.rules?.[0]?.name) setRulesFileName(grouped.rules[0].name);
      })
      .catch(() => {});

    fetch(`${API_BASE}/tournaments/${t.id}/jury`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const users = Array.isArray(data)
          ? data
          : (data?.jury_members || data?.juryMembers || data?.assigned_jury || data?.assignedJury || data?.judges || data?.jury || []);
        if (cancelled || !Array.isArray(users)) return;
        const normalized = users.filter(u => u?.id).map(u => ({
          ...u,
          username: u.username || u.full_name || u.name || u.email || `#${u.id}`,
        }));
        const normalizedIds = normalized.map(u => Number(u.id)).filter(Boolean);
        setInitialJuryUsers(normalized);
        setSelectedJury(normalizedIds);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [isCreate, t.id]);

  const markExistingFileRemoved = (type, file) => {
    if (!file?.name) return;
    setRemovedFiles(prev => (
      prev.some(item => item.type === type && item.name === file.name) ? prev : [...prev, { type, name: file.name }]
    ));
    setExistingFiles(prev => ({
      ...prev,
      [type]: (prev[type] || []).filter(item => item.name !== file.name),
    }));
  };

  const canNext = () => {
    if (step === 1) return name.trim().length > 0;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      rules: rulesMode === 'text' ? (rulesText.trim() || null) : null,
      rules_mode: rulesMode,
      start_date: startDate || null,
      end_date: endDate || null,
      registration_start: regStart || null,
      registration_end: regEnd || null,
      submission_start: subStart || null,
      submission_end: subEnd || null,
      teams_limit: teamsLimit === '' ? null : Number(teamsLimit),
      min_team_size: Number(minSize),
      max_team_size: Number(maxSize),
      rounds_count: Number(roundsCount),
      emoji: emoji || '🏆',
      elo_participation: Number(eloParticipation),
      elo_per_round: Number(eloPerRound),
      elo_winner: Number(eloWinner),
      tz: tz.trim() || null,
      tz_enabled: tzMode === 'text' ? Boolean(tz.trim()) : (Boolean(tzMainFile) || tzFiles.length > 0 || existingFiles.tz.length > 0),
      additional_prizes: hasAdditionalPrizes
        ? JSON.stringify(additionalPrizes.filter(p => p.description.trim()))
        : null,
    };

    if (rulesFileRemoved && !rulesFile) payload.rules_file_url = null;
    if (!isCreate || selectedJury.length > 0) payload.jury_ids = selectedJury;
    if (isCreate) payload.status = status;
    if (parentTournamentId) payload.parent_tournament_id = Number(parentTournamentId);

    const files = {
      rules: rulesMode === 'file' ? rulesFile : null,
      tz: tzMode === 'file' && tzMainFile ? [tzMainFile, ...tzFiles] : tzFiles,
    };
    await onSubmit(payload, files, { removedFiles });
  };

  // Load available parent tournaments (only for create mode, exclude current)
  useEffect(() => {
    if (!isCreate) return;
    getTournaments().then(list => {
      const opts = (list || []).filter(x => x.id !== t.id);
      setParentTournaments(opts);
    }).catch(() => {});
  }, [isCreate, t.id]);

  const ac = ACCENT[isCreate ? status : (t.status || 'draft')] || ACCENT.draft;

  return (
    <div className="db-wizard-wrap">
      {/* Header */}
      <div className="db-wizard-header" style={{ background: `linear-gradient(135deg,${ac[0]},${ac[1]})` }}>
        <div className="db-wizard-header-left">
          <span className="db-wizard-emoji">{emoji}</span>
          <div>
            <h3 className="db-wizard-title">{name.trim() || (isCreate ? 'Новий турнір' : 'Редагування')}</h3>
            {!isCreate && <span className="db-wizard-id">id #{t.id}</span>}
          </div>
        </div>
        <button type="button" className="db-wizard-cancel" onClick={onCancel}>✕</button>
      </div>

      {/* Step indicators */}
      <div className="db-wizard-steps">
        {WIZARD_STEPS.map(s => (
          <button
            key={s.id}
            type="button"
            className={`db-wizard-step${step === s.id ? ' active' : ''}${step > s.id ? ' done' : ''}`}
            onClick={() => step > s.id && setStep(s.id)}
            title={s.label}
          >
            <span className="db-wizard-step-icon">{step > s.id ? '✓' : s.icon}</span>
            <span className="db-wizard-step-label">{s.label}</span>
          </button>
        ))}
      </div>

      <form className="db-wizard-body" onSubmit={handleSubmit}>

        {/* ── КРОК 1: Основна інформація ─────────────── */}
        {step === 1 && (
          <div className="db-wizard-step-content">
            <h4 className="db-wizard-step-title">📋 Основна інформація</h4>

            {/* Emoji */}
            <div className="db-edit-field">
              <label className="db-edit-label">Іконка турніру</label>
              <div className="db-emoji-row">
                <div className="db-emoji-preview" style={{ background: ac[0] }}>
                  <span className="db-emoji-preview-icon">{emoji}</span>
                </div>
                <button
                  type="button"
                  className="db-btn db-wizard-emoji-btn"
                  onClick={() => setShowEmojiPicker(v => !v)}
                >
                  {showEmojiPicker ? '✕ Сховати' : '🎨 Обрати'}
                </button>
              </div>
              {showEmojiPicker && (
                <div className="db-emoji-grid">
                  {TOURNAMENT_EMOJIS.map(e => (
                    <button
                      key={e}
                      type="button"
                      className={`db-emoji-item${emoji === e ? ' active' : ''}`}
                      onClick={() => { setEmoji(e); setShowEmojiPicker(false); }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status — only draft/registration on create */}
            {isCreate && (
              <div className="db-edit-field">
                <label className="db-edit-label">Початковий статус <span className="db-required">*</span></label>
                <div className="db-status-radio-group">
                  {[
                    { v: 'draft', label: 'Draft', desc: 'Чернетка — не видна учасникам', color: '#888' },
                    { v: 'registration', label: 'Registration', desc: 'Відразу відкрити реєстрацію', color: '#7c5ff5' },
                  ].map(opt => (
                    <label
                      key={opt.v}
                      className={`db-status-radio${status === opt.v ? ' selected' : ''}`}
                      style={{ '--radio-color': opt.color }}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={opt.v}
                        checked={status === opt.v}
                        onChange={() => setStatus(opt.v)}
                      />
                      <span className="db-status-radio-dot" style={{ background: opt.color }} />
                      <span className="db-status-radio-label" style={{ color: opt.color }}>{opt.label}</span>
                      <span className="db-status-radio-desc">{opt.desc}</span>
                    </label>
                  ))}
                </div>
                <small className="db-field-hint">
                  ⚙️ Статус турніру автоматично змінится з "Registration" → "Running" в вказаний вами день.
                </small>
              </div>
            )}

            <div className="db-edit-field">
              <label className="db-edit-label">Назва <span className="db-required">*</span></label>
              <input
                className="db-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Наприклад: Code League 2025"
                required
                autoFocus
              />
            </div>

            <div className="db-edit-field">
              <label className="db-edit-label">Опис</label>
              <textarea
                className="db-input db-textarea"
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Загальний опис турніру, теми, цільова аудиторія..."
              />
            </div>

            {isCreate && (
              <div className="db-edit-field" style={{ marginTop: 12 }}>
                <label className="db-edit-label">🔗 Батьківський турнір (якщо це раунд)</label>
                <select
                  className="db-input db-select"
                  value={parentTournamentId}
                  onChange={e => setParentTournamentId(e.target.value)}
                >
                  <option value="">— Самостійний турнір —</option>
                  {parentTournaments.map(pt => (
                    <option key={pt.id} value={pt.id}>{pt.emoji || '🏆'} {pt.name}</option>
                  ))}
                </select>
                <small className="db-field-hint">
                  Якщо цей турнір є раундом іншого турніру, він автоматично додасться як раунд у батьківський.
                </small>
              </div>
            )}
          </div>
        )}

        {/* ── КРОК 2: Правила ────────────────────────── */}
        {step === 2 && (
          <div className="db-wizard-step-content">
            <h4 className="db-wizard-step-title">📜 Правила турніру</h4>

            <div className="db-rules-mode-toggle">
              <button
                type="button"
                className={`db-rules-mode-btn${rulesMode === 'file' ? ' active' : ''}`}
                onClick={() => setRulesMode('file')}
              >
                📎 Завантажити файл
              </button>
              <button
                type="button"
                className={`db-rules-mode-btn${rulesMode === 'text' ? ' active' : ''}`}
                onClick={() => setRulesMode('text')}
              >
                ✏️ Текстове поле
              </button>
            </div>

            {rulesMode === 'file' ? (
              <div className="db-edit-field">
                <label className="db-edit-label">Файл з правилами</label>
                <label className="db-file-drop-zone">
                  <input
                    type="file"
                    accept={RULES_ACCEPTED}
                    style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) { setRulesFile(f); setRulesFileName(f.name); setRulesFileRemoved(false); }
                    }}
                  />
                  <span className="db-file-drop-icon">📄</span>
                  {rulesFileName ? (
                    <span className="db-file-drop-name">{rulesFileName}</span>
                  ) : (
                    <>
                      <span className="db-file-drop-text">Натисніть або перетягніть файл</span>
                      <span className="db-file-drop-hint">.doc, .docx, .pdf, .txt, .md — до 20 МБ</span>
                    </>
                  )}
                </label>
                {rulesFileName && (rulesFile || !t.rules_file_url || rulesFileRemoved) && (
                  <div className="db-file-attached">
                    <span>📎 {rulesFileName}</span>
                    <button
                      type="button"
                      className="db-file-remove"
                      onClick={() => { setRulesFile(null); setRulesFileName(''); setRulesFileRemoved(true); }}
                    >✕</button>
                  </div>
                )}
                {t.rules_file_url && !rulesFile && !rulesFileRemoved && (
                  <div className="db-file-existing">
                    <span>📎 Поточний файл:</span>
                    <a href={t.rules_file_url} target="_blank" rel="noopener noreferrer">
                      {fileNameFromUrl(t.rules_file_url)}
                    </a>
                    <button
                      type="button"
                      className="db-file-action"
                      onClick={() => {
                        markExistingFileRemoved('rules', { name: fileNameFromUrl(t.rules_file_url) });
                        setRulesFileRemoved(true);
                        setRulesFileName('');
                      }}
                    >
                      Видалити
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="db-edit-field">
                <label className="db-edit-label">
                  Текст правил
                  <span className={`db-char-counter${rulesText.length > 480 ? ' warn' : ''}`}>
                    {rulesText.length}/512
                  </span>
                </label>
                <textarea
                  className="db-input db-textarea db-rules-textarea"
                  value={rulesText}
                  maxLength={512}
                  onChange={e => {
                    setRulesText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  placeholder="Опишіть основні правила турніру...&#10;&#10;• Умови участі&#10;• Формат змагань&#10;• Критерії оцінювання&#10;• Заборонені дії"
                  rows={6}
                />
                <small className="db-field-hint">Максимум 512 символів.</small>
              </div>
            )}
          </div>
        )}

        {/* ── КРОК 3: Технічне завдання ──────────────── */}
        {step === 3 && (
          <div className="db-wizard-step-content">
            <h4 className="db-wizard-step-title">🗂️ Технічне завдання (ТЗ)</h4>

            {/* Mode toggle: text vs file */}
            <div className="db-rules-mode-toggle">
              <button type="button" className={`db-rules-mode-btn${tzMode === 'text' ? ' active' : ''}`} onClick={() => setTzMode('text')}>
                ✏️ Текст
              </button>
              <button type="button" className={`db-rules-mode-btn${tzMode === 'file' ? ' active' : ''}`} onClick={() => setTzMode('file')}>
                📎 Файл
              </button>
            </div>

            {tzMode === 'file' ? (
              <div className="db-edit-field">
                <label className="db-edit-label">Файл ТЗ</label>
                <label className="db-file-drop-zone">
                  <input type="file" accept={RULES_ACCEPTED} style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) setTzMainFile(f); }} />
                  {tzMainFile ? (
                    <span className="db-file-drop-name">📄 {tzMainFile.name}</span>
                  ) : (
                    <>
                      <span className="db-file-drop-icon">📂</span>
                      <span className="db-file-drop-text">Перетягніть або клікніть для вибору</span>
                      <span className="db-file-drop-hint">.pdf, .doc, .docx, .txt, .md — до 20 МБ</span>
                    </>
                  )}
                </label>
                {tzMainFile && (
                  <div className="db-file-attached">
                    <span>📎 {tzMainFile.name}</span>
                    <button type="button" className="db-file-remove" onClick={() => setTzMainFile(null)}>✕</button>
                  </div>
                )}
              </div>
            ) : (
            <div className="db-edit-field">
              <label className="db-edit-label">Текст ТЗ</label>

              {/* Toolbar */}
              <div className="db-rt-toolbar">
                <div className="db-rt-group">
                  {[
                    ['B', () => insertMd('tz-textarea', '**', '**', setTz, tz), 'Жирний', { fontWeight: 700 }],
                    ['I', () => insertMd('tz-textarea', '*', '*', setTz, tz), 'Курсив', { fontStyle: 'italic' }],
                    ['U', () => insertMd('tz-textarea', '__', '__', setTz, tz), 'Підкреслення', { textDecoration: 'underline' }],
                    ['S', () => insertMd('tz-textarea', '~~', '~~', setTz, tz), 'Закреслення', { textDecoration: 'line-through' }],
                  ].map(([lbl, fn, title, style]) => (
                    <button key={lbl} type="button" className="db-rt-btn" title={title} onClick={fn}>
                      <span style={style}>{lbl}</span>
                    </button>
                  ))}
                </div>
                <div className="db-rt-divider" />
                <div className="db-rt-group">
                  <button type="button" className="db-rt-btn" title="Заголовок" onClick={() => {
                    const ta = document.getElementById('tz-textarea');
                    if (!ta) return;
                    const s = ta.selectionStart;
                    const ln = tz.lastIndexOf('\n', s - 1) + 1;
                    setTz(tz.substring(0, ln) + '## ' + tz.substring(ln));
                  }}>H</button>
                  <button type="button" className="db-rt-btn" title="Список" onClick={() => {
                    const ta = document.getElementById('tz-textarea');
                    if (!ta) return;
                    const s = ta.selectionStart;
                    const ln = tz.lastIndexOf('\n', s - 1) + 1;
                    setTz(tz.substring(0, ln) + '- ' + tz.substring(ln));
                  }}>☰</button>
                  <button type="button" className="db-rt-btn" title="Посилання" onClick={() => {
                    const url = prompt('URL:');
                    if (!url) return;
                    const ta = document.getElementById('tz-textarea');
                    if (!ta) return;
                    const s = ta.selectionStart, e2 = ta.selectionEnd;
                    const sel = tz.substring(s, e2) || 'посилання';
                    setTz(tz.substring(0, s) + `[${sel}](${url})` + tz.substring(e2));
                  }}>🔗</button>
                  <button type="button" className="db-rt-btn" title="Код" onClick={() => insertMd('tz-textarea', '`', '`', setTz, tz)}>{'<>'}</button>
                </div>
                <div className="db-rt-divider" />
                <button type="button" className="db-rt-btn db-rt-btn-preview" title="Попередній перегляд" onClick={() => setShowTzPreview(true)}>Попередній перегляд</button>
              </div>

              {showTzPreview && (
                <div className="modal-overlay" onClick={() => setShowTzPreview(false)}>
                  <div className="db-preview-modal db-preview-modal--tz-live db-preview-modal--tz-side" onClick={e => e.stopPropagation()}>
                    <div className="db-preview-header">
                      <h4>Попередній перегляд ТЗ</h4>
                      <button type="button" className="db-preview-close" onClick={() => setShowTzPreview(false)}>✕</button>
                    </div>
                    <div className="db-preview-content db-preview-content--live">
                      <div className="db-preview-pane-title">Предпросмотр</div>
                      <div className="db-preview-paper">
                        <MarkdownRenderer text={tz || '*(Технічне завдання порожнє)*'} />
                      </div>
                    </div>
                    <div className="db-preview-footer">
                      <button type="button" className="db-btn db-btn-ghost" onClick={() => setShowTzPreview(false)}>Закрити</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="db-rt-editor">
                <textarea
                  id="tz-textarea"
                  className="db-input db-textarea db-tz-textarea"
                  rows={8}
                  value={tz}
                  onChange={e => setTz(e.target.value)}
                  placeholder="Опишіть технічне завдання...&#10;&#10;## Завдання&#10;- Що потрібно зробити&#10;&#10;## Must Have&#10;- Обов'язкові вимоги&#10;&#10;## Матеріали&#10;- Посилання на датасети, API..."
                />
              </div>
              <small className="db-field-hint">
                📝 Підтримує Markdown. ТЗ стає доступним учасникам після старту турніру.
              </small>
            </div>
            )}

            {/* File attachments */}
            <div className="db-edit-field">
              <label className="db-edit-label">Матеріали та файли</label>
              <label className="db-file-drop-zone db-file-drop-zone--multi">
                <input
                  type="file"
                  multiple
                  accept={TZ_ACCEPTED}
                  style={{ display: 'none' }}
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    setTzFiles(prev => [...prev, ...files]);
                  }}
                />
                <span className="db-file-drop-icon">📎</span>
                <span className="db-file-drop-text">Додати файли матеріалів</span>
                <span className="db-file-drop-hint">.zip, .pdf, .txt, .md, .doc, зображення — до 20 МБ кожен</span>
              </label>
              {existingFiles.tz.length > 0 && (
                <div className="db-tz-files-list">
                  {existingFiles.tz.map(file => (
                    <div key={file.name} className="db-file-attached db-file-attached--existing">
                      <a href={file.url} target="_blank" rel="noopener noreferrer">Поточний файл: {file.name}</a>
                      <button
                        type="button"
                        className="db-file-action"
                        onClick={() => markExistingFileRemoved('tz', file)}
                      >
                        Видалити
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {tzFiles.length > 0 && (
                <div className="db-tz-files-list">
                  {tzFiles.map((f, i) => (
                    <div key={i} className="db-file-attached">
                      <span>📎 {f.name}</span>
                      <button type="button" className="db-file-remove" onClick={() => setTzFiles(p => p.filter((_, idx) => idx !== i))}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── КРОК 4: Журі ──────────────────────────── */}
        {step === 4 && (
          <div className="db-wizard-step-content">
            <h4 className="db-wizard-step-title">⚖️ Призначення журі</h4>
            <div className="db-edit-field">
              <label className="db-edit-label">Виберіть журі для оцінювання</label>
              <JurySearchSelector selectedJury={selectedJury} onChange={setSelectedJury} initialUsers={initialJuryUsers} />
              <small className="db-field-hint">
                💡 Журі зможуть оцінювати проєкти у всіх раундах цього турніру. Журі доступний окремий розділ зі списком команд та формою оцінювання.
              </small>
            </div>
          </div>
        )}

        {/* ── КРОК 5: Налаштування ──────────────────── */}
        {step === 5 && (
          <div className="db-wizard-step-content">
            <h4 className="db-wizard-step-title">📅 Налаштування турніру</h4>

            <div className="db-wizard-date-section">
              <p className="db-wizard-section-subtitle">1. Реєстрація команд</p>
              <div className="db-edit-row-2">
                <div className="db-edit-field">
                  <label className="db-edit-label">Відкрити реєстрацію <span className="db-required">*</span></label>
                  <input type="datetime-local" className="db-input" value={regStart} onChange={e => setRegStart(e.target.value)} />
                  <small className="db-field-hint">З цього моменту учасники бачать кнопку реєстрації та можуть створювати команду.</small>
                </div>
                <div className="db-edit-field">
                  <label className="db-edit-label">Закрити реєстрацію <span className="db-required">*</span></label>
                  <input type="datetime-local" className="db-input" value={regEnd} onChange={e => setRegEnd(e.target.value)} />
                  <small className="db-field-hint">Після цього часу нові команди вже не зможуть податися на турнір.</small>
                </div>
              </div>

              <p className="db-wizard-section-subtitle" style={{ marginTop: 16 }}>2. Проведення турніру</p>
              <div className="db-edit-row-2">
                <div className="db-edit-field">
                  <label className="db-edit-label">Старт турніру <span className="db-required">*</span></label>
                  <input type="datetime-local" className="db-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  <small className="db-field-hint">У цей час турнір переходить у робочий етап: команди бачать ТЗ, матеріали та починають роботу.</small>
                </div>
                <div className="db-edit-field">
                  <label className="db-edit-label">Фініш турніру <span className="db-required">*</span></label>
                  <input type="datetime-local" className="db-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  <small className="db-field-hint">Фінальна дата турніру. Після неї турнір вважається завершеним.</small>
                </div>
              </div>

              <p className="db-wizard-section-subtitle" style={{ marginTop: 16 }}>3. Здача робіт</p>
              <div className="db-edit-row-2">
                <div className="db-edit-field">
                  <label className="db-edit-label">Відкрити здачу</label>
                  <input type="datetime-local" className="db-input" value={subStart} onChange={e => setSubStart(e.target.value)} />
                  <small className="db-field-hint">З цього часу команда бачить форму подачі роботи: GitHub, демо, відео та опис.</small>
                </div>
                <div className="db-edit-field">
                  <label className="db-edit-label">Дедлайн здачі</label>
                  <input type="datetime-local" className="db-input" value={subEnd} onChange={e => setSubEnd(e.target.value)} />
                  <small className="db-field-hint">Після цього часу роботи більше не приймаються, а журі може фінально оцінювати подані проєкти.</small>
                </div>
              </div>
            </div>

            <div className="db-edit-row-3" style={{ marginTop: 16 }}>
              <div className="db-edit-field">
                <label className="db-edit-label">Макс. команд</label>
                <input type="number" className="db-input" min={0} value={teamsLimit} onChange={e => setTeamsLimit(e.target.value)} placeholder="∞ необмежено" />
              </div>
              <div className="db-edit-field">
                <label className="db-edit-label">Мін. учасників</label>
                <input type="number" className="db-input" min={2} value={minSize} onChange={e => setMinSize(e.target.value)} />
              </div>
              <div className="db-edit-field">
                <label className="db-edit-label">Макс. учасників</label>
                <input type="number" className="db-input" min={1} value={maxSize} onChange={e => setMaxSize(e.target.value)} />
              </div>
            </div>

            <div className="db-edit-field" style={{ marginTop: 12 }}>
              <label className="db-edit-label">Кількість раундів</label>
              <input type="number" className="db-input" min={1} max={10} value={roundsCount} onChange={e => setRoundsCount(e.target.value)} />
              <small className="db-field-hint">Кожен раунд має свій дедлайн здачі роботи</small>
            </div>
          </div>
        )}

        {/* ── КРОК 6: Нагороди ──────────────────────── */}
        {step === 6 && (
          <div className="db-wizard-step-content">
            <h4 className="db-wizard-step-title">🏆 Нагороди</h4>

            <div className="db-edit-section">
              <p className="db-wizard-section-subtitle">ELO / Очки досвіду</p>
              <div className="db-edit-row-3">
                <div className="db-edit-field">
                  <label className="db-edit-label">За участь</label>
                  <input type="number" className="db-input" min={0} value={eloParticipation}
                    onChange={e => setEloParticipation(e.target.value)} placeholder="10" />
                  <small className="db-field-hint">Базові очки</small>
                </div>
                <div className="db-edit-field">
                  <label className="db-edit-label">За раунд</label>
                  <input type="number" className="db-input" min={0} value={eloPerRound}
                    onChange={e => setEloPerRound(e.target.value)} placeholder="20" />
                  <small className="db-field-hint">× номер раунду</small>
                </div>
                <div className="db-edit-field">
                  <label className="db-edit-label">За 1-ше місце</label>
                  <input type="number" className="db-input" min={0} value={eloWinner}
                    onChange={e => setEloWinner(e.target.value)} placeholder="100" />
                  <small className="db-field-hint">Бонус переможцю</small>
                </div>
              </div>
              <div className="db-elo-preview">
                💡 Формула: <strong>{eloParticipation}</strong> + (раунд × <strong>{eloPerRound}</strong>) + <strong>{eloWinner}</strong> за перемогу
              </div>
            </div>

            {/* Additional prizes */}
            <div className="db-edit-section" style={{ marginTop: 20 }}>
              <label className="db-additional-prizes-toggle">
                <input
                  type="checkbox"
                  checked={hasAdditionalPrizes}
                  onChange={e => setHasAdditionalPrizes(e.target.checked)}
                />
                <span className="db-additional-prizes-toggle-label">🎁 Додаткові призи від організаторів</span>
              </label>

              {hasAdditionalPrizes && (
                <div className="db-prizes-list">
                  {additionalPrizes.map((prize, i) => (
                    <div key={i} className="db-prize-row">
                      <div className="db-prize-place">
                        {['🥇', '🥈', '🥉'][i] || `#${prize.place}`}
                        <span>{prize.place} місце</span>
                      </div>
                      <input
                        className="db-input"
                        value={prize.description}
                        onChange={e => setAdditionalPrizes(prev =>
                          prev.map((p, idx) => idx === i ? { ...p, description: e.target.value } : p)
                        )}
                        placeholder={`Опис призу за ${prize.place}-е місце...`}
                      />
                      {additionalPrizes.length > 1 && (
                        <button type="button" className="db-file-remove"
                          onClick={() => setAdditionalPrizes(p => p.filter((_, idx) => idx !== i))}>✕</button>
                      )}
                    </div>
                  ))}
                  {additionalPrizes.length < 10 && (
                    <button
                      type="button"
                      className="db-btn db-btn-ghost db-btn-sm"
                      onClick={() => setAdditionalPrizes(p => [...p, { place: p.length + 1, description: '' }])}
                    >
                      + Додати призове місце
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Navigation ────────────────────────────── */}
        <div className="db-wizard-nav">
          <button
            type="button"
            className="db-btn db-btn-ghost"
            onClick={() => step === 1 ? onCancel() : setStep(s => s - 1)}
          >
            {step === 1 ? 'Скасувати' : '← Назад'}
          </button>

          <div className="db-wizard-progress-dots">
            {WIZARD_STEPS.map(s => (
              <span
                key={s.id}
                className={`db-wizard-dot${step === s.id ? ' active' : ''}${step > s.id ? ' done' : ''}`}
              />
            ))}
          </div>

          {step < WIZARD_STEPS.length ? (
            <button
              type="button"
              className="db-btn db-btn-primary"
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
            >
              Далі →
            </button>
          ) : isCreate ? (
            <button
              type="button"
              className="db-btn db-btn-primary db-btn-submit"
              disabled={loading || !name.trim()}
              onClick={() => setShowConfirm(true)}
            >
              {loading ? 'Збереження...' : (submitLabel || '🚀 Створити турнір')}
            </button>
          ) : (
            <button
              type="submit"
              className="db-btn db-btn-primary db-btn-submit"
              disabled={loading || !name.trim()}
            >
              {loading ? 'Збереження...' : (submitLabel || <><IconSave style={{ width: 14, height: 14, verticalAlign: -2, marginRight: 5 }} /> Зберегти</>)}
            </button>
          )}
        </div>
      </form>

      {/* ── Create confirmation modal */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => !loading && setShowConfirm(false)}>
          <div className="modal-box modal-box--light db-wizard-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="db-wizard-confirm-icon">{emoji}</div>
            <h3 className="db-wizard-confirm-title">Створити турнір?</h3>
            <p className="db-wizard-confirm-name">«{name}»</p>
            <div className="db-wizard-confirm-meta">
              <span className="db-wizard-confirm-chip">
                <span className="db-sp-dot" style={{ background: status === 'registration' ? '#7c5ff5' : '#888', width: 7, height: 7, borderRadius: '50%', display: 'inline-block', marginRight: 5 }} />
                {status === 'registration' ? 'Реєстрація відразу відкрита' : 'Чернетка'}
              </span>
              {startDate && <span className="db-wizard-confirm-chip">📅 Старт: {new Date(startDate).toLocaleDateString('uk-UA')}</span>}
              {regEnd   && <span className="db-wizard-confirm-chip">⏱ Реєстрація до: {new Date(regEnd).toLocaleDateString('uk-UA')}</span>}
            </div>
            <div className="db-wizard-confirm-actions">
              <button className="db-btn db-btn-ghost" onClick={() => setShowConfirm(false)} disabled={loading}>
                Повернутись
              </button>
              <button
                className="db-btn db-btn-primary"
                disabled={loading}
                onClick={e => { setShowConfirm(false); handleSubmit({ preventDefault: () => {} }); }}
              >
                {loading ? 'Створення...' : '🚀 Підтвердити'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// datetime-local helper
function toDateTimeInput(d) {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch { return ''; }
}

// Kept for backward compat with any remaining date-only usages
function toDateInput(d) {
  if (!d) return '';
  try { return new Date(d).toISOString().slice(0, 10); } catch { return ''; }
}

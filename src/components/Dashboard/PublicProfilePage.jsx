import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { getUserProfileByUsername } from '@utils/authApi';
import {
  UserAvatar, PresenceBadge, displayName, formatDate, hasRole, resolveAvatarUrl,
} from './db.shared.jsx';
import IconUser     from '@images/dashboard_components/icon_user_cube.svg?react';
import IconCalendar from '@images/dashboard_components/icon_calendar_card.svg?react';
import IconClock    from '@images/dashboard_components/icon_clock_diamond.svg?react';
import IconStar     from '@images/dashboard_components/icon_star_badge.svg?react';

function lastSeenUk(dateStr) {
  if (!dateStr) return 'ніколи';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (diffSec < 60)        return 'щойно';
  const min = Math.floor(diffSec / 60);
  if (min < 60)            return `${min} хв тому`;
  const h = Math.floor(min / 60);
  if (h < 24)              return `${h} год тому`;
  const days = Math.floor(h / 24);
  if (days < 7)            return `${days} дн тому`;
  return formatDate(dateStr);
}

function ProfileContent({ profile }) {
  const bannerStyle = profile.banner_url
    ? { backgroundImage: `url(${resolveAvatarUrl(profile.banner_url)})`, backgroundSize: 'cover', backgroundPosition: 'center top' }
    : { background: `linear-gradient(135deg, ${profile.banner_color || '#1e1b2e'} 0%, #191A23 100%)` };

  const roleLabel = hasRole(profile, 'admin') ? '🛡️ Адмін'
    : hasRole(profile, 'organizer')            ? '🗂️ Організатор'
    : hasRole(profile, 'jury')                 ? '⚖ Журі'
    : '👤 Учасник';

  return (
    <>
      <div className="db-pp-banner" style={bannerStyle} />

      <div className="db-pp-header">
        <div className="db-pp-avatar">
          <UserAvatar user={profile} size={100} showStatus={true} />
        </div>
        <div className="db-pp-identity">
          <h1 className="db-pp-name">{displayName(profile)}</h1>
          <div className="db-pp-handle">@{profile.username}</div>
          <div className="db-pp-chips">
            <span className="db-role-badge">{roleLabel}</span>
            <PresenceBadge user={profile} />
          </div>
        </div>
      </div>

      {profile.user_description && (
        <div className="db-pp-section">
          <h3 className="db-pp-section-title">Про користувача</h3>
          <p className="db-pp-bio">{profile.user_description}</p>
        </div>
      )}

      <div className="db-pp-section">
        <h3 className="db-pp-section-title">Деталі</h3>
        <div className="db-pp-fields">
          <div className="db-pp-field">
            <span className="db-pp-field-label"><IconUser />Username</span>
            <span className="db-pp-field-value" style={{ fontFamily: 'monospace' }}>@{profile.username}</span>
          </div>
          <div className="db-pp-field">
            <span className="db-pp-field-label"><IconStar />ELO</span>
            <span className="db-pp-field-value">{profile.elo ?? 0}</span>
          </div>
          <div className="db-pp-field">
            <span className="db-pp-field-label"><IconCalendar />На платформі з</span>
            <span className="db-pp-field-value">{formatDate(profile.created_at)}</span>
          </div>
          <div className="db-pp-field">
            <span className="db-pp-field-label"><IconClock />Останній вхід</span>
            <span className="db-pp-field-value">{lastSeenUk(profile.last_seen_at)}</span>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Modal version ── */
export function PublicProfileModal({ username, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    getUserProfileByUsername(username)
      .then(p  => { if (alive) setProfile(p); })
      .catch(e  => { if (alive) setError(e.message || 'Не знайдено'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [username]);

  const handleKey = useCallback(e => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return createPortal(
    <div className="db-pp-overlay" onClick={onClose}>
      <div className="db-pp-modal" onClick={e => e.stopPropagation()}>
        <button className="db-pp-modal-close" onClick={onClose} aria-label="Закрити">✕</button>

        {loading && (
          <div className="db-skeleton-stack db-skeleton-page">
            <div className="db-card-skeleton" style={{ height: 120, borderRadius: 18 }} />
            <div className="db-card-skeleton db-skeleton-avatar" style={{ width: 72, height: 72, marginTop: -48 }} />
            <div className="db-card-skeleton db-skeleton-line" style={{ width: 180, height: 18 }} />
            <div className="db-card-skeleton db-skeleton-line" style={{ width: '70%' }} />
          </div>
        )}
        {error && (
          <div className="db-pp-modal-error">
            <p>Користувача не знайдено</p>
            <span>{error}</span>
          </div>
        )}
        {profile && !loading && <ProfileContent profile={profile} />}
      </div>
    </div>,
    document.body,
  );
}

/* ── Standalone page version ── */
export default function PublicProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    getUserProfileByUsername(username)
      .then(p  => { if (alive) setProfile(p); })
      .catch(e  => { if (alive) setError(e.message || 'Користувача не знайдено'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [username]);

  if (loading) return (
    <div className="db-public-profile-page">
      <div className="db-skeleton-stack db-skeleton-page">
        <div className="db-card-skeleton" style={{ height: 220, borderRadius: 24 }} />
        <div className="db-skeleton-grid">
          {[1, 2, 3].map(i => <div key={i} className="db-card-skeleton" style={{ height: 92 }} />)}
        </div>
      </div>
    </div>
  );
  if (error || !profile) return (
    <div className="db-public-profile-page">
      <div className="db-public-profile-empty">
        <h2>Користувача не знайдено</h2>
        <p>{error || `Профіль @${username} недоступний`}</p>
        <Link to="/dashboard" className="db-btn db-btn-primary">← На дашборд</Link>
      </div>
    </div>
  );

  return (
    <div className="db-public-profile-page">
      <div className="db-pp-card">
        <button className="db-pp-back" onClick={() => navigate(-1)}>← Назад</button>
        <ProfileContent profile={profile} />
      </div>
    </div>
  );
}

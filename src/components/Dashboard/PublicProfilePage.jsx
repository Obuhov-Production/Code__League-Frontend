import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
      .then(p => { if (alive) setProfile(p); })
      .catch(err => { if (alive) setError(err.message || 'Користувача не знайдено'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [username]);

  if (loading) {
    return (
      <div className="db-public-profile-page">
        <div className="db-public-profile-loading"><div className="db-spinner" /></div>
      </div>
    );
  }
  if (error || !profile) {
    return (
      <div className="db-public-profile-page">
        <div className="db-public-profile-empty">
          <h2>Користувача не знайдено</h2>
          <p>{error || `Профіль @${username} недоступний`}</p>
          <Link to="/dashboard" className="db-btn db-btn-primary">← На дашборд</Link>
        </div>
      </div>
    );
  }

  const bannerStyle = profile.banner_url
    ? { backgroundImage: `url(${resolveAvatarUrl(profile.banner_url)})`, backgroundSize: 'cover', backgroundPosition: 'center top' }
    : { background: `linear-gradient(135deg, ${profile.banner_color || '#1e1b2e'} 0%, #191A23 100%)` };

  const roleLabel = hasRole(profile, 'admin') ? '🛡️ Адмін'
    : hasRole(profile, 'organizer')          ? '🗂️ Організатор'
    : hasRole(profile, 'jury')               ? '⚖ Журі'
    : '👤 Учасник';

  return (
    <div className="db-public-profile-page">
      <div className="db-public-profile-card">
        <button className="db-public-profile-back" onClick={() => navigate(-1)}>← Назад</button>

        <div className="db-public-profile-banner" style={bannerStyle} />

        <div className="db-public-profile-header">
          <div className="db-public-profile-avatar">
            <UserAvatar user={profile} size={110} showStatus={true} />
          </div>
          <div className="db-public-profile-identity">
            <h1 className="db-public-profile-name">{displayName(profile)}</h1>
            <div className="db-public-profile-handle">@{profile.username}</div>
            <div className="db-public-profile-chips">
              <span className="db-role-badge">{roleLabel}</span>
              <PresenceBadge user={profile} />
            </div>
          </div>
        </div>

        {profile.user_description && (
          <div className="db-public-profile-section">
            <h3>Про користувача</h3>
            <p className="db-public-profile-bio">{profile.user_description}</p>
          </div>
        )}

        <div className="db-public-profile-section">
          <h3>Деталі</h3>
          <div className="db-field-list">
            <div className="db-field-row">
              <label><IconUser /> Username</label>
              <span style={{ fontFamily: 'monospace' }}>@{profile.username}</span>
            </div>
            <div className="db-field-row">
              <label><IconStar /> ELO</label>
              <span>{profile.elo ?? 0}</span>
            </div>
            <div className="db-field-row">
              <label><IconCalendar /> На платформі з</label>
              <span>{formatDate(profile.created_at)}</span>
            </div>
            <div className="db-field-row">
              <label><IconClock /> Останній вхід</label>
              <span>{lastSeenUk(profile.last_seen_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

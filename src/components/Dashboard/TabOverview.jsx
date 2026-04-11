import { useState, useEffect, useMemo } from 'react';

import StatTrophy   from '@images/dashboard_components/icon_stat_trophy.svg?react';
import StatTeam     from '@images/dashboard_components/icon_stat_team.svg?react';
import StatStar     from '@images/dashboard_components/icon_stat_star.svg?react';
import StatCalendar from '@images/dashboard_components/icon_stat_calendar.svg?react';
import IconTournaments from '@images/dashboard_components/icon_tournaments.svg?react';
import IconChat        from '@images/dashboard_components/icon_chat.svg?react';
import IconLeaderboard from '@images/dashboard_components/icon_leaderboard.svg?react';
import IconProfile     from '@images/dashboard_components/icon_profile.svg?react';

import { getTournaments, getMyTeams } from '@utils/authApi';
import { StatusBadge, UserAvatar, formatDate } from './db.shared.jsx';

function CountdownBanner({ tournament, d, h, m, s }) {
  const [time, setTime] = useState({ d, h, m, s });
  useEffect(() => {
    const target = tournament.status === 'registration' ? tournament.registration_end : tournament.end_date;
    const t = setInterval(() => {
      const ms = new Date(target) - new Date();
      if (ms <= 0) { clearInterval(t); return; }
      setTime({
        d: Math.floor(ms / 86400000),
        h: Math.floor((ms % 86400000) / 3600000),
        m: Math.floor((ms % 3600000) / 60000),
        s: Math.floor((ms % 60000) / 1000),
      });
    }, 1000);
    return () => clearInterval(t);
  }, [tournament]);
  const label = tournament.status === 'registration' ? 'реєстраціи' : 'кінця турніру';
  return (
    <div className="db-countdown-banner">
      <div className="db-countdown-info">
        <span className="db-countdown-tag">До {label}</span>
        <strong>{tournament.name}</strong>
      </div>
      <div className="db-countdown-digits">
        {[{ v: time.d, l: 'д' }, { v: time.h, l: 'г' }, { v: time.m, l: 'хв' }, { v: time.s, l: 'с' }].map(({ v, l }) => (
          <div key={l} className="db-countdown-cell">
            <span className="db-countdown-num">{String(v).padStart(2,'0')}</span>
            <span className="db-countdown-lbl">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TabOverview({ user, toast, onNavigate }) {
  const [tournaments, setTournaments] = useState([]);
  const [myTeams,     setMyTeams]     = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([getTournaments(), getMyTeams()])
      .then(([t, m]) => { setTournaments(t); setMyTeams(m); })
      .catch(() => toast.error('Помилка завантаження'))
      .finally(() => setLoading(false));
  }, [toast]);

  const openRegistrations = useMemo(() => tournaments.filter(t => t.status === 'registration'), [tournaments]);
  const activeTournaments = useMemo(() => tournaments.filter(t => t.status === 'running'), [tournaments]);

  const STATS = [
    { label: 'Усього турнірів',  value: tournaments.length,       Icon: StatTrophy,   color: '#AC9EF8' },
    { label: 'Мої команди',      value: myTeams.length,           Icon: StatTeam,     color: '#4ade80' },
    { label: 'Активні зараз',    value: activeTournaments.length, Icon: StatStar,     color: '#f59e0b' },
    { label: 'Відкрита реєстр.', value: openRegistrations.length, Icon: StatCalendar, color: '#0ea5e9' },
  ];

  return (
    <div className="db-tab">
      <div className="db-welcome-banner">
        <div className="db-welcome-text">
          <span className="db-welcome-hi">Привіт,</span>
          <h2>{user?.username || user?.email}! 👋</h2>
          <p>Тут зібрано все про ваші турніри та команди.</p>
        </div>
        <UserAvatar user={user} size={72} />
      </div>

      {loading ? (
        <div className="db-stats-grid">
          {[1,2,3,4].map(i => <div key={i} className="db-card-skeleton" style={{ height: 96 }} />)}
        </div>
      ) : (
        <div className="db-stats-grid">
          {STATS.map(({ label, value, Icon, color }) => (
            <div key={label} className="db-stat-card" style={{ '--accent': color }}>
              <div className="db-stat-icon"><Icon /></div>
              <div className="db-stat-info">
                <span className="db-stat-value">{value}</span>
                <span className="db-stat-label">{label}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <>
          {(() => {
            const nearest = [...tournaments]
              .filter(t => t.status === 'registration' || t.status === 'running')
              .sort((a,b) => new Date(a.start_date) - new Date(b.start_date))[0];
            if (!nearest) return null;
            const target = nearest.status === 'registration' ? nearest.registration_end : nearest.end_date;
            const msLeft = new Date(target) - new Date();
            if (msLeft <= 0) return null;
            const d = Math.floor(msLeft / 86400000);
            const h = Math.floor((msLeft % 86400000) / 3600000);
            const m = Math.floor((msLeft % 3600000) / 60000);
            const s = Math.floor((msLeft % 60000) / 1000);
            return <CountdownBanner tournament={nearest} d={d} h={h} m={m} s={s} />;
          })()}
          <div className="db-overview-grid">
            <div className="db-ov-section">
              <h3 className="db-ov-title">Відкрита реєстрація</h3>
              {openRegistrations.length === 0 ? (
                <p className="db-ov-empty">Зараз відкритих реєстрацій немає</p>
              ) : openRegistrations.slice(0,4).map(t => (
                <div key={t.id} className="db-ov-item" onClick={() => onNavigate('tournaments')}>
                  <div className="db-ov-dot" style={{ background: '#AC9EF8' }} />
                  <div className="db-ov-item-text">
                    <strong>{t.name}</strong>
                    <span>до {formatDate(t.registration_end)}</span>
                  </div>
                  <span className="db-ov-arrow">›</span>
                </div>
              ))}
            </div>

            <div className="db-ov-section">
              <h3 className="db-ov-title">Мої активні команди</h3>
              {myTeams.length === 0 ? (
                <p className="db-ov-empty">Ви ще не зареєстровані в жодному турнірі</p>
              ) : myTeams.slice(0,4).map(t => (
                <div key={t.id} className="db-ov-item" onClick={() => onNavigate('teams')}>
                  <div className="db-ov-dot" style={{ background: '#4ade80' }} />
                  <div className="db-ov-item-text">
                    <strong>{t.name}</strong>
                    <span>{t.tournament_name}</span>
                  </div>
                  <StatusBadge status={t.tournament_status} />
                </div>
              ))}
            </div>

            <div className="db-ov-section">
              <h3 className="db-ov-title">Швидкі дії</h3>
              <button className="db-qa-btn" onClick={() => onNavigate('tournaments')}><IconTournaments /> Переглянути турніри</button>
              <button className="db-qa-btn" onClick={() => onNavigate('chat')}><IconChat /> Відкрити чат</button>
              <button className="db-qa-btn" onClick={() => onNavigate('leaderboard')}><IconLeaderboard /> Лідерборд</button>
              <button className="db-qa-btn" onClick={() => onNavigate('profile')}><IconProfile /> Мій профіль</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

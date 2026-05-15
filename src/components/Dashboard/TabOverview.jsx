import { useState, useEffect, useMemo } from 'react';

import StatTrophy   from '@images/dashboard_components/tournaments.svg?react';
import StatTeam     from '@images/dashboard_components/icon_stat_team.svg?react';
import StatStar     from '@images/dashboard_components/active.svg?react';
import StatCalendar from '@images/dashboard_components/icon_stat_calendar.svg?react';
import IconTournaments from '@images/dashboard_components/icon_tournaments.svg?react';
import IconChat        from '@images/dashboard_components/icon_chat.svg?react';
import IconLeaderboard from '@images/dashboard_components/icon_leaderboard.svg?react';
import IconProfile     from '@images/dashboard_components/icon_profile.svg?react';
import IconTrendUp     from '@images/dashboard_components/icon_trend_up.svg?react';
import IconTrendDown   from '@images/dashboard_components/icon_trend_down.svg?react';
import IconElo         from '@images/dashboard_components/icon_stat_star.svg?react';

import { getTournaments, getMyTeams } from '@utils/authApi';
import { StatusBadge, UserAvatar, formatDate, ACCENT } from './db.shared.jsx';

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

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
  
  /* Турніри де користувач приймає участь */
  const myTournamentIds = useMemo(() => 
    [...new Set(myTeams.map(t => t.tournament_id || t.tournamentId).filter(Boolean))],
    [myTeams]
  );
  const myTournaments = useMemo(() => 
    tournaments.filter(t => myTournamentIds.includes(t.id)),
    [tournaments, myTournamentIds]
  );

  const userElo = user?.elo ?? user?.exp ?? 0;
  
  const STATS = [
    { label: 'Усього турнірів',  value: tournaments.length,       Icon: StatTrophy,   color: '#3a15f0' },
    { label: 'Мої команди',      value: myTeams.length,           Icon: StatTeam,     color: '#4ade80' },
    { label: 'Активні турніри',    value: activeTournaments.length, Icon: StatStar,     color: '#f50b0b' },
    { label: 'Відкрита реєстрація', value: openRegistrations.length, Icon: StatCalendar, color: '#0ea5e9' },
  ];
  
  const ELO_STAT = { label: 'ELO Рейтинг', value: userElo, Icon: IconElo, color: '#f59e0b', isElo: true };

  // Получаем ближайший турнир для отображения
  const nearestTournament = useMemo(() => {
    return [...tournaments]
      .filter(t => t.status === 'registration' || t.status === 'running')
      .sort((a,b) => new Date(a.start_date) - new Date(b.start_date))[0];
  }, [tournaments]);

  // Dynamic banner style based on user's banner_color (like in profile)
  const bannerStyle = user?.banner_color 
    ? { background: `linear-gradient(135deg, ${user.banner_color} 0%, #191A23 100%)` }
    : {};

  // Фиксируем позиции точек чтобы анимация не сбрасывалась при ререндере
  const dotPositions = useMemo(() => 
    [...Array(20)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      size: `${2 + Math.random() * 4}px`
    })),
    [] // пустой массив зависимостей - создаем один раз
  );

  return (
    <div className="db-tab">
      {/* Улучшенный приветственный баннер с динамическим цветом */}
      <div className="db-welcome-banner" style={bannerStyle}>
        {/* Decorative dots pattern - звезды как в профиле */}
        <div className="db-welcome-dots">
          {dotPositions.map((dot, i) => (
            <span key={i} className="db-welcome-dot" style={{ 
              left: dot.left, 
              top: dot.top,
              width: dot.size,
              height: dot.size,
              animationDelay: dot.delay
            }} />
          ))}
        </div>
        <div className="db-welcome-bg-effects">
          <div className="db-welcome-glow"></div>
          <div className="db-welcome-glow db-welcome-glow-2"></div>
        </div>
        <div className="db-welcome-content">
          <div className="db-welcome-text">
            <span className="db-welcome-hi">Привіт,</span>
            <h2>{user?.username || user?.email}! <span className="db-welcome-wave">👋</span></h2>
            <p>Тут показано всі ваші турніри та ваші команди.</p>
            {nearestTournament && (
              <div className="db-welcome-next">
                <span>Наступний:</span>
                <strong>{nearestTournament.emoji || '🏆'} {nearestTournament.name}</strong>
              </div>
            )}
          </div>
          <div className="db-welcome-avatar-wrap">
            <UserAvatar user={user} size={80} />
            <div className={`db-user-status db-user-status--${user?.status || 'offline'}`}>
              <span className="db-status-dot"></span>
            </div>
          </div>
        </div>
      </div>

      {/* ELO / Статистика */}
      {loading ? (
        <div className="db-stats-grid">
          {[1,2,3,4,5].map(i => <div key={i} className="db-card-skeleton" style={{ height: 96 }} />)}
        </div>
      ) : (
        <div className="db-stats-grid">
          {/* ELO Рейтинг - всегда первая */}
          <div 
            className="db-stat-card db-stat-card-elo" 
            style={{ '--accent': ELO_STAT.color, animationDelay: `0s` }}
          >
            <div className="db-stat-glow" style={{ background: ELO_STAT.color }}></div>
            <div className="db-stat-icon"><IconElo /></div>
            <div className="db-stat-info">
              <span className="db-stat-value">{ELO_STAT.value}</span>
              <span className="db-stat-label">{ELO_STAT.label}</span>
            </div>
            <div className="db-stat-trend">
              <IconTrendUp />
            </div>
          </div>
          {STATS.map(({ label, value, Icon, color }, index) => (
            <div 
              key={label} 
              className="db-stat-card" 
              style={{ '--accent': color, animationDelay: `${(index + 1) * 0.1}s` }}
            >
              <div className="db-stat-glow" style={{ background: color }}></div>
              <div className="db-stat-icon"><Icon /></div>
              <div className="db-stat-info">
                <span className="db-stat-value">{value}</span>
                <span className="db-stat-label">{label}</span>
              </div>
              <div className="db-stat-trend">
                <IconTrendUp />
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

            {/* Красивые быстрые действия */}
            <div className="db-ov-section db-ov-section-actions">
              <h3 className="db-ov-title">Швидкі дії</h3>
              <div className="db-quick-actions-grid">
                <button className="db-qa-card db-qa-card-purple" onClick={() => onNavigate('tournaments')}>
                  <div className="db-qa-icon"><IconTournaments /></div>
                  <span>Турніри</span>
                </button>
                <button className="db-qa-card db-qa-card-green" onClick={() => onNavigate('chat')}>
                  <div className="db-qa-icon"><IconChat /></div>
                  <span>Чат</span>
                </button>
                <button className="db-qa-card db-qa-card-orange" onClick={() => onNavigate('leaderboard')}>
                  <div className="db-qa-icon"><IconLeaderboard /></div>
                  <span>Лідерборд</span>
                </button>
                <button className="db-qa-card db-qa-card-blue" onClick={() => onNavigate('profile')}>
                  <div className="db-qa-icon"><IconProfile /></div>
                  <span>Профіль</span>
                </button>
              </div>
            </div>

            {/* Календар дедлайнів */}
            <div className="db-ov-section">
              <h3 className="db-ov-title">Календар дедлайнів</h3>
              {(() => {
                const events = tournaments.flatMap(t => {
                  const items = [];
                  if (t.registration_end) items.push({ label: 'Реєстрація', date: t.registration_end, name: t.name, color: '#AC9EF8' });
                  if (t.end_date) items.push({ label: 'Кінець турніру', date: t.end_date, name: t.name, color: '#f59e0b' });
                  return items;
                }).filter(e => new Date(e.date) > new Date()).sort((a, b) => new Date(a.date) - new Date(b.date));
                if (events.length === 0) return <p className="db-ov-empty">Немає майбутніх подій</p>;
                return events.slice(0, 5).map((e, i) => (
                  <div key={i} className="db-ov-item" onClick={() => onNavigate('tournaments')}>
                    <div className="db-ov-dot" style={{ background: e.color }} />
                    <div className="db-ov-item-text">
                      <strong>{e.name}</strong>
                      <span>{e.label} — {formatDateTime(e.date)}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Прогресс активности - только мои турниры и команды */}
            <div className="db-ov-section db-ov-section-progress">
              <h3 className="db-ov-title">Моя активність</h3>
              <div className="db-activity-ring">
                <svg viewBox="0 0 36 36">
                  <defs>
                    <linearGradient id="activityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#AC9EF8" />
                      <stop offset="100%" stopColor="#4ade80" />
                    </linearGradient>
                  </defs>
                  <path className="db-activity-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path 
                    className="db-activity-fill" 
                    strokeDasharray={`${Math.min(100, (myTournaments.length + myTeams.length) * 15)}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                  />
                </svg>
                <div className="db-activity-center">
                  <span>{myTournaments.length + myTeams.length}</span>
                  <small>участь</small>
                </div>
              </div>
              <div className="db-activity-legend">
                <div><span style={{background: ACCENT.running[0]}}></span>Мої турніри: {myTournaments.length}</div>
                <div><span style={{background: ACCENT.registration[0]}}></span>Команди: {myTeams.length}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

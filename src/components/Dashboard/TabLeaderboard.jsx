import { useState, useEffect, useMemo } from 'react';

import IconLeaderboard from '@images/dashboard_components/icon_leaderboard.svg?react';

import { getTournaments, getLeaderboard, getMyTeams } from '@utils/authApi';
import { CustomSelect, STATUS_LABEL, formatDate, hasRole } from './db.shared.jsx';
import CertificateGenerator from './CertificateGenerator.jsx';

function getCriteriaItems(criteria) {
  if (!criteria || typeof criteria !== 'object') return [];

  return Object.entries(criteria)
    .map(([key, raw]) => {
      if (raw && typeof raw === 'object') {
        const score = Number(raw.score ?? raw.value ?? raw.total);
        if (!Number.isFinite(score)) return null;
        return {
          key,
          label: String(raw.label ?? raw.key ?? key),
          score,
        };
      }

      const score = Number(raw);
      if (!Number.isFinite(score)) return null;
      return { key, label: key, score };
    })
    .filter(Boolean);
}

export default function TabLeaderboard({ user, toast }) {
  const [tournaments,  setTournaments]  = useState([]);
  const [selected,     setSelected]     = useState('');
  const [leaderboard,  setLeaderboard]  = useState([]);
  const [loadingList,  setLoadingList]  = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [expandedRow,  setExpandedRow]  = useState(null);
  const [myTeams,      setMyTeams]      = useState([]);

  const isOrganizer = user && (hasRole(user, 'admin') || hasRole(user, 'organizer'));
  const userTeamIds = useMemo(() => new Set(myTeams.map(t => t.id)), [myTeams]);
  const selectedTournament = useMemo(
    () => tournaments.find(t => String(t.id) === selected),
    [tournaments, selected]
  );

  useEffect(() => {
    getMyTeams().then(setMyTeams).catch(() => {});
  }, []);

  useEffect(() => {
    getTournaments()
      .then(t => {
        setTournaments(t);
        const def = t.find(x => x.status === 'finished') || t.find(x => x.status === 'running');
        if (def) setSelected(String(def.id));
      })
      .catch(() => toast.error('Помилка'))
      .finally(() => setLoadingList(false));
  }, [toast]);

  useEffect(() => {
    if (!selected) return;
    setLoadingBoard(true);
    getLeaderboard(selected).then(setLeaderboard).catch(() => toast.error('Помилка лідерборду')).finally(() => setLoadingBoard(false));
    // Near-realtime refresh every 15s
    const interval = setInterval(() => {
      getLeaderboard(selected).then(setLeaderboard).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [selected, toast]);

  const maxScore = useMemo(() => leaderboard.reduce((m, r) => Math.max(m, Number(r.total_score)), 0), [leaderboard]);
  const MEDALS = ['🥇','🥈','🥉'];
  const averageScore = useMemo(() => {
    if (leaderboard.length === 0) return 0;
    return leaderboard.reduce((sum, row) => sum + Number(row.total_score || 0), 0) / leaderboard.length;
  }, [leaderboard]);

  const downloadCSV = () => {
    const t = tournaments.find(x => String(x.id) === selected);
    const rows = [
      ['#','Команда','Місто','Бали','Рейтинг %'],
      ...leaderboard.map((r, i) => [i+1, r.team_name, r.city || '', Number(r.total_score).toFixed(1), maxScore > 0 ? Math.round((Number(r.total_score)/maxScore)*100) + '%' : '0%'])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t?.name || 'leaderboard'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="db-tab db-leaderboard-page">
      <div className="db-tab-header db-lb-toolbar">
        <div>
          <h1>Лідерборд</h1>
          <p className="db-lb-subtitle">Рейтинг команд, бали та деталі оцінювання</p>
        </div>
        <div className="db-lb-controls">
          {!loadingList && (
            <CustomSelect
            value={selected}
            onChange={setSelected}
            placeholder="— Оберіть турнір —"
              options={tournaments.filter(t => t.status !== 'draft').map(t => ({
                value: t.id,
                label: t.name,
                tag: STATUS_LABEL[t.status]?.label,
              }))}
            />
          )}
          {isOrganizer && leaderboard.length > 0 && (
            <button className="db-btn db-btn-ghost db-btn-sm db-lb-csv-btn" onClick={downloadCSV} title="Експорт CSV">
              Експорт CSV
            </button>
          )}
        </div>
      </div>
      {selected && !loadingBoard && leaderboard.length > 0 && (
        <div className="db-lb-summary">
          <div className="db-lb-summary-main">
            <div className="db-lb-summary-icon">{selectedTournament?.emoji || '🏆'}</div>
            <div>
              <div className="db-lb-summary-label">Активний турнір</div>
              <strong>{selectedTournament?.name || 'Code League Tournament'}</strong>
            </div>
          </div>
          <div className="db-lb-summary-stat">
            <span>Команд</span>
            <strong>{leaderboard.length}</strong>
          </div>
          <div className="db-lb-summary-stat">
            <span>Лідер</span>
            <strong>{maxScore.toFixed(1)}</strong>
          </div>
          <div className="db-lb-summary-stat">
            <span>Середнє</span>
            <strong>{averageScore.toFixed(1)}</strong>
          </div>
        </div>
      )}
      {!selected ? (
        <div className="db-empty"><IconLeaderboard /><p>Оберіть турнір</p></div>
      ) : loadingBoard ? (
        <div className="db-leaderboard db-leaderboard-loading">{[1,2,3].map(i => <div key={i} className="db-card-skeleton db-lb-skeleton" />)}</div>
      ) : leaderboard.length === 0 ? (
        <div className="db-empty"><IconLeaderboard /><p>Результатів ще немає</p></div>
      ) : (
        <div className="db-leaderboard">
          <div className="db-leaderboard-header"><span>#</span><span>Команда</span><span>Рейтинг</span><span>Балів</span><span className="db-lb-actions-head">Дії</span></div>
          {leaderboard.map((row, i) => {
            const score = Number(row.total_score || 0);
            const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
            const isExpanded = expandedRow === row.team_id;
            const criteriaItems = getCriteriaItems(row.criteria_breakdown);
            return (
              <div key={row.team_id} className={`db-leaderboard-row${i < 3 ? ' top' : ''}${userTeamIds.has(row.team_id) ? ' mine' : ''}`}>
                <span className={`db-rank db-rank-${i + 1}`}>{MEDALS[i] || i + 1}</span>
                <div className="db-lb-team">
                  <strong>{row.team_name}</strong>
                  <span>{row.city || 'CodeLeague'}</span>
                </div>
                <div className="db-lb-bar-wrap">
                  <div className="db-lb-bar-meta">
                    <span>Прогрес</span>
                    <strong>{pct}%</strong>
                  </div>
                  <div className="db-lb-bar"><div className="db-lb-bar-fill" style={{ width:`${pct}%` }} /></div>
                </div>
                <span className="db-lb-score">{score.toFixed(1)}</span>
                <div className="db-lb-actions">
                  {userTeamIds.has(row.team_id) && (
                    <CertificateGenerator
                      teamName={row.team_name}
                      tournamentName={selectedTournament?.name}
                      tournamentIcon={selectedTournament?.emoji}
                      place={i + 1}
                      score={score}
                      date={formatDate(new Date())}
                    />
                  )}
                  {criteriaItems.length > 0 && (
                    <button
                      type="button"
                      className="db-btn db-btn-ghost db-btn-sm db-lb-expand-btn"
                      onClick={() => setExpandedRow(isExpanded ? null : row.team_id)}
                      title={isExpanded ? 'Сховати деталі' : 'Показати деталі'}
                      aria-expanded={isExpanded}
                    >
                      Деталі
                    </button>
                  )}
                </div>
                {isExpanded && criteriaItems.length > 0 && (
                  <div className="db-lb-criteria">
                    {criteriaItems.map(item => (
                      <div key={item.key} className="db-lb-crit-item">
                        <span>{item.label}</span>
                        <strong>{item.score.toFixed(1)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

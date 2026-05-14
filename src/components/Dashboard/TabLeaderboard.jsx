import { useState, useEffect, useMemo } from 'react';

import IconLeaderboard from '@images/dashboard_components/icon_leaderboard.svg?react';

import { getTournaments, getLeaderboard, getMyTeams } from '@utils/authApi';
import { CustomSelect, STATUS_LABEL, formatDate, hasRole } from './db.shared.jsx';
import CertificateGenerator from './CertificateGenerator.jsx';

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
    <div className="db-tab">
      <div className="db-tab-header">
        <h1>Лідерборд</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
          <button className="db-btn db-btn-ghost db-btn-sm" onClick={downloadCSV} title="Експорт CSV">
            <span style={{ marginRight: 4 }}>📥</span>CSV
          </button>
        )}
        </div>
      </div>
      {!selected ? (
        <div className="db-empty"><IconLeaderboard /><p>Оберіть турнір</p></div>
      ) : loadingBoard ? (
        <div className="db-team-list">{[1,2,3].map(i => <div key={i} className="db-card-skeleton" style={{ height:72 }} />)}</div>
      ) : leaderboard.length === 0 ? (
        <div className="db-empty"><IconLeaderboard /><p>Результатів ще немає</p></div>
      ) : (
        <div className="db-leaderboard">
          <div className="db-leaderboard-header"><span>#</span><span>Команда</span><span>Рейтинг</span><span>Балів</span><span className="db-lb-actions-head">Дії</span></div>
          {leaderboard.map((row, i) => {
            const score = Number(row.total_score);
            const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
            const isExpanded = expandedRow === row.team_id;
            const criteria = row.criteria_breakdown || {};
            const criteriaKeys = Object.keys(criteria);
            return (
              <div key={row.team_id} className={`db-leaderboard-row${i < 3 ? ' top' : ''}`} style={{ flexWrap: 'wrap' }}>
                <span className="db-rank">{MEDALS[i] || `${i+1}.`}</span>
                <div className="db-lb-team"><strong>{row.team_name}</strong>{row.city && <span>{row.city}</span>}</div>
                <div className="db-lb-bar-wrap"><div className="db-lb-bar"><div className="db-lb-bar-fill" style={{ width:`${pct}%` }} /></div></div>
                <span className="db-lb-score">{score.toFixed(1)}</span>
                <div className="db-lb-actions">
                  {userTeamIds.has(row.team_id) && (
                    <CertificateGenerator
                      teamName={row.team_name}
                      tournamentName={tournaments.find(t => String(t.id) === selected)?.name}
                      place={i + 1}
                      score={score}
                      date={formatDate(new Date())}
                    />
                  )}
                  {criteriaKeys.length > 0 && (
                    <button
                      type="button"
                      className="db-btn db-btn-ghost db-btn-sm db-lb-expand-btn"
                      onClick={() => setExpandedRow(isExpanded ? null : row.team_id)}
                      title={isExpanded ? 'Сховати деталі' : 'Показати деталі'}
                    >
                      {isExpanded ? '▲ Деталі' : '▼ Деталі'}
                    </button>
                  )}
                </div>
                {isExpanded && criteriaKeys.length > 0 && (
                  <div className="db-lb-criteria" style={{ width: '100%', marginTop: 8, paddingLeft: 48, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {criteriaKeys.map(key => (
                      <div key={key} className="db-lb-crit-item" style={{ background: '#1a1a2e', padding: '6px 12px', borderRadius: 8, border: '1px solid #ffffff10' }}>
                        <span style={{ color: '#888', fontSize: 12 }}>{key}</span>
                        <span style={{ color: '#fff', fontWeight: 600, marginLeft: 8 }}>{Number(criteria[key]).toFixed(1)}</span>
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

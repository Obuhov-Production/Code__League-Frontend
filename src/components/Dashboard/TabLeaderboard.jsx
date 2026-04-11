import { useState, useEffect, useMemo } from 'react';

import IconLeaderboard from '@images/dashboard_components/icon_leaderboard.svg?react';

import { getTournaments, getLeaderboard } from '@utils/authApi';
import { CustomSelect, STATUS_LABEL } from './db.shared.jsx';

export default function TabLeaderboard({ toast }) {
  const [tournaments,  setTournaments]  = useState([]);
  const [selected,     setSelected]     = useState('');
  const [leaderboard,  setLeaderboard]  = useState([]);
  const [loadingList,  setLoadingList]  = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);

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
  }, [selected, toast]);

  const maxScore = useMemo(() => leaderboard.reduce((m, r) => Math.max(m, Number(r.total_score)), 0), [leaderboard]);
  const MEDALS = ['🥇','🥈','🥉'];

  return (
    <div className="db-tab">
      <div className="db-tab-header">
        <h1>Лідерборд</h1>
        {!loadingList && (
          <CustomSelect
            value={selected}
            onChange={setSelected}
            placeholder="— Оберіть турнір —"
            options={tournaments.map(t => ({
              value: t.id,
              label: t.name,
              tag: STATUS_LABEL[t.status]?.label,
            }))}
          />
        )}
      </div>
      {!selected ? (
        <div className="db-empty"><IconLeaderboard /><p>Оберіть турнір</p></div>
      ) : loadingBoard ? (
        <div className="db-team-list">{[1,2,3].map(i => <div key={i} className="db-card-skeleton" style={{ height:72 }} />)}</div>
      ) : leaderboard.length === 0 ? (
        <div className="db-empty"><IconLeaderboard /><p>Результатів ще немає</p></div>
      ) : (
        <div className="db-leaderboard">
          <div className="db-leaderboard-header"><span>#</span><span>Команда</span><span>Рейтинг</span><span>Балів</span></div>
          {leaderboard.map((row, i) => {
            const score = Number(row.total_score);
            const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
            return (
              <div key={row.team_id} className={`db-leaderboard-row${i < 3 ? ' top' : ''}`}>
                <span className="db-rank">{MEDALS[i] || `${i+1}.`}</span>
                <div className="db-lb-team"><strong>{row.team_name}</strong>{row.city && <span>{row.city}</span>}</div>
                <div className="db-lb-bar-wrap"><div className="db-lb-bar"><div className="db-lb-bar-fill" style={{ width:`${pct}%` }} /></div></div>
                <span className="db-lb-score">{score.toFixed(1)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

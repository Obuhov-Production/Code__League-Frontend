import { useState, useEffect, useCallback, useRef } from 'react';

import IconTeams from '@images/dashboard_components/icon_teams.svg?react';

import { getMyTeams, getTeamById, updateTeam, searchUsers } from '@utils/authApi';
import { StatusBadge } from './db.shared.jsx';

function EditTeamModal({ team, toast, onClose, onSuccess }) {
  const [name,     setName]     = useState(team.name || '');
  const [city,     setCity]     = useState(team.city || '');
  const [school,   setSchool]   = useState(team.school || '');
  const [telegram, setTelegram] = useState(team.telegram_username || '');
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const min = 2;
  const max = 5;
  const searchTimers = useRef({});

  useEffect(() => {
    getTeamById(team.id).then(t => {
      setMembers((t.members || []).map(m => ({
        full_name: m.full_name, email: m.email,
        linkedUser: null, platformQuery: '', platformUser: null, searching: false,
      })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [team.id]);

  const updateMember = (i, patch) =>
    setMembers(m => m.map((x, idx) => idx === i ? { ...x, ...patch } : x));

  const handlePlatformSearch = (i, q) => {
    updateMember(i, { platformQuery: q, platformUser: null });
    clearTimeout(searchTimers.current[i]);
    if (q.trim().length < 2) return;
    searchTimers.current[i] = setTimeout(async () => {
      updateMember(i, { searching: true });
      try {
        const results = await searchUsers(q.trim());
        updateMember(i, { searching: false, platformUser: results[0] || null });
      } catch { updateMember(i, { searching: false }); }
    }, 400);
  };

  const addPlatformUser = (i) => {
    const m = members[i];
    if (!m.platformUser) return;
    updateMember(i, {
      linkedUser: { username: m.platformUser.username, email: m.platformUser.email || '' },
      platformUser: null, platformQuery: '', onPlatform: true,
    });
  };

  const unlinkPlatformUser = (i) =>
    updateMember(i, { linkedUser: null, full_name: '', email: '' });

  const handleSave = async e => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Введіть назву команди'); return; }
    setSaving(true);
    const cleanMembers = members.map(m => ({
      full_name: m.linkedUser ? m.linkedUser.username : m.full_name,
      email:     m.linkedUser ? m.linkedUser.email     : m.email,
    }));
    try {
      await updateTeam(team.id, { name: name.trim(), city, school, telegram_username: telegram, members: cleanMembers });
      onSuccess();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--light" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>Редагувати команду</h2>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Завантаження...</div> : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="db-form-row"><label>Назва *</label><input className="db-input" value={name} onChange={e => setName(e.target.value)} required /></div>
            <div className="db-form-row-2">
              <div className="db-form-row"><label>Місто</label><input className="db-input" value={city} onChange={e => setCity(e.target.value)} /></div>
              <div className="db-form-row"><label>Школа</label><input className="db-input" value={school} onChange={e => setSchool(e.target.value)} /></div>
            </div>
            <div className="db-form-row"><label>Telegram</label><input className="db-input" value={telegram} onChange={e => setTelegram(e.target.value)} /></div>
            <div className="db-members-section">
              <div className="db-members-header">
                <h5>Учасники ({members.length}/{max})</h5>
                {members.length < max && (
                  <button type="button" className="db-btn db-btn-ghost db-btn-sm"
                    onClick={() => setMembers(m => [...m, { full_name: '', email: '', linkedUser: null, platformQuery: '', platformUser: null, searching: false }])}>+ Додати</button>
                )}
              </div>
              {members.map((m, i) => (
                <div key={i} className="db-member-wrap">
                  {m.linkedUser ? (
                    <div className="db-member-linked-card">
                      <span className="db-member-num">{i + 1}</span>
                      <div className="db-member-linked-avatar">{m.linkedUser.username.slice(0,2).toUpperCase()}</div>
                      <div className="db-member-linked-info">
                        <span className="db-member-linked-name">{m.linkedUser.username}</span>
                        {m.linkedUser.email && <span className="db-member-linked-email">{m.linkedUser.email}</span>}
                      </div>
                      <span className="db-member-linked-badge">На платформі</span>
                      <button type="button" className="db-member-remove" onClick={() => unlinkPlatformUser(i)}>✕</button>
                    </div>
                  ) : (
                    <>
                      <div className="db-member-row">
                        <span className="db-member-num">{i + 1}</span>
                        <input className="db-input" value={m.full_name}
                          onChange={e => updateMember(i, { full_name: e.target.value })}
                          placeholder="ПІБ" required />
                        <input className="db-input" type="email" value={m.email}
                          onChange={e => updateMember(i, { email: e.target.value })}
                          placeholder="Email" required />
                        {members.length > min && (
                          <button type="button" className="db-member-remove"
                            onClick={() => setMembers(ms => ms.filter((_,idx) => idx !== i))}>✕</button>
                        )}
                      </div>
                      <div className="db-member-platform-wrap">
                        <input className="db-input db-input-sm" value={m.platformQuery}
                          onChange={e => handlePlatformSearch(i, e.target.value)}
                          placeholder="🔍 Знайти на платформі" />
                        {m.searching && <span className="db-member-searching">...</span>}
                        {m.platformUser && !m.searching && (
                          <div className="db-platform-suggestion" onClick={() => addPlatformUser(i)}>
                            <span className="db-ps-avatar">{m.platformUser.username.slice(0,2).toUpperCase()}</span>
                            <span className="db-ps-name">{m.platformUser.username}</span>
                            <span className="db-ps-add">+ Додати</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="db-form-actions">
              <button type="button" className="db-btn db-btn-ghost" onClick={onClose}>Скасувати</button>
              <button type="submit" className="db-btn db-btn-primary" disabled={saving}>{saving ? 'Збереження...' : 'Зберегти'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function TabTeams({ toast }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [editTeam, setEditTeam] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTeams(await getMyTeams()); } catch { toast.error('Помилка'); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="db-tab">
      <div className="db-tab-header"><h1>Мої команди</h1></div>
      {loading ? (
        <div className="db-team-list">{[1,2].map(i => <div key={i} className="db-card-skeleton" style={{ height:90 }} />)}</div>
      ) : teams.length === 0 ? (
        <div className="db-empty"><IconTeams /><p>У вас ще немає команд</p><small>Перейдіть у Турніри та зареєструйтесь</small></div>
      ) : (
        <div className="db-team-list">
          {teams.map(t => {
            const isExp = expanded === t.id;
            const canEdit = t.tournament_status === 'registration';
            return (
              <div key={t.id} className={`db-team-card${isExp ? ' expanded' : ''}`}>
                <div className="db-team-card-main" onClick={() => setExpanded(isExp ? null : t.id)}>
                  <div className="db-team-card-left">
                    <div className="db-team-avatar">{t.name.slice(0,2).toUpperCase()}</div>
                    <div>
                      <h3>{t.name}</h3>
                      <p className="db-team-tournament">{t.tournament_name}</p>
                      {t.city && <p className="db-team-city">📍 {t.city}</p>}
                    </div>
                  </div>
                  <div className="db-team-card-right">
                    <StatusBadge status={t.tournament_status} />
                    {canEdit && (
                      <button className="db-btn db-btn-ghost db-btn-sm" onClick={e => { e.stopPropagation(); setEditTeam(t); }}>
                        ✏️ Редагувати
                      </button>
                    )}
                    <span className={`db-expand-btn${isExp ? ' open' : ''}`}>›</span>
                  </div>
                </div>
                {isExp && (
                  <div className="db-team-details">
                    <div className="db-team-detail-row">
                      {t.school && <span><strong>Школа:</strong> {t.school}</span>}
                      {t.telegram_username && <span><strong>Telegram:</strong> {t.telegram_username}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {editTeam && (
        <EditTeamModal team={editTeam} toast={toast}
          onClose={() => setEditTeam(null)}
          onSuccess={() => { setEditTeam(null); load(); toast.success('Команду оновлено!'); }} />
      )}
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import {
  getTournaments, getAdminUsers, getAdminStats, getAdminTeams,
  createTournament, updateTournament,
  updateTournamentStatus, deleteTournament,
  setUserRole, deleteAdminUser, setUserPassword, adminDeleteTeam,
  clearChatRoom, getCustomChatRooms, createChatRoom, deleteChatRoom,
  getChatRoomSettings, setChatRoomSettings, postChatAnnouncement,
  getAdminOrganizerApplications, reviewOrganizerApplication,
  getAdminUserBadges, adminGrantBadge, adminRevokeBadge,
} from '@utils/authApi';
import { StatusBadge, RoleBadges, CustomSelect, ConfirmModal, formatDate, STATUS_LABEL, UserAvatar, UserProfileModal, ALL_BADGES } from './db.shared.jsx';

/* ── Options for tournament form ───────────────────── */
const CATEGORY_OPTIONS = [
  { value: 'hackathon',  label: '⚡ Хакатон' },
  { value: 'olympiad',   label: '🎓 Олімпіада' },
  { value: 'marathon',   label: '🏃 Марафон' },
  { value: 'sprint',     label: '⏱ Спринт' },
  { value: 'challenge',  label: '🎯 Челендж' },
  { value: 'other',      label: '📦 Інше' },
];

const FORMAT_OPTIONS = [
  { value: 'online',  label: '🌐 Онлайн' },
  { value: 'offline', label: '📍 Офлайн' },
  { value: 'hybrid',  label: '🔀 Гібрид' },
];

const TOUR_STATUS_OPTS = [
  { value: 'draft',        label: 'Draft',   color: '#888' },
  { value: 'registration', label: 'Registration', color: '#7c5ff5' },
  { value: 'running',      label: 'Running',   color: '#16a34a' },
  { value: 'finished',     label: 'Finished', color: '#0ea5e9' },
];

/* ── StatusPicker — custom colored status dropdown ─── */
function StatusPicker({ value, onChange, compact = false }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });

  const current = TOUR_STATUS_OPTS.find(o => o.value === value) || TOUR_STATUS_OPTS[0];

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 6, left: r.left, width: r.width });
    }
    setOpen(p => !p);
  };

  useEffect(() => {
    if (!open) return;
    const fn = e => setOpen(false);
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  return (
    <div className={`db-status-picker${compact ? ' db-status-picker--compact' : ''}`}>
      <button ref={btnRef} type="button" className="db-status-picker-trigger" onClick={handleOpen}>
        <span className="db-sp-dot" style={{ background: current.color }} />
        <span className="db-sp-label" style={{ color: current.color }}>{current.label}</span>
        <span className="db-cs-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div
          className="db-sp-portal-drop"
          style={{ top: dropPos.top, left: dropPos.left, minWidth: Math.max(dropPos.width, 170) }}
          onMouseDown={e => e.stopPropagation()}
        >
          {TOUR_STATUS_OPTS.map(o => (
            <div
              key={o.value}
              className={`db-sp-option${o.value === value ? ' active' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              <span className="db-sp-dot" style={{ background: o.color }} />
              <span style={{ flex: 1, color: o.color, fontWeight: 500 }}>{o.label}</span>
              {o.value === value && <span className="db-sp-check">✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Manage User Modal ──────────────────────────────── */
function ManageUserModal({ user, toast, onClose, onRoleChange, onDelete }) {
  const [newPassword,  setNewPassword]  = useState('');
  const [savingPwd,    setSavingPwd]    = useState(false);
  const [savingRoles,  setSavingRoles]  = useState(false);
  const [currentRoles, setCurrentRoles] = useState(
    (user.role || 'user').split(',').map(r => r.trim()).filter(Boolean)
  );
  const [userBadges,   setUserBadges]   = useState([]);
  const [badgeLoading, setBadgeLoading] = useState(false);

  useEffect(() => {
    setBadgeLoading(true);
    getAdminUserBadges(user.id).then(setUserBadges).catch(() => {}).finally(() => setBadgeLoading(false));
  }, [user.id]);

  const hasBadge = (id) => userBadges.some(b => b.badge_id === id);

  const handleToggleBadge = async (badgeId) => {
    try {
      if (hasBadge(badgeId)) {
        await adminRevokeBadge(user.id, badgeId);
        setUserBadges(prev => prev.filter(b => b.badge_id !== badgeId));
        toast.success('Досягнення відкликано');
      } else {
        await adminGrantBadge(user.id, badgeId);
        setUserBadges(prev => [...prev, { badge_id: badgeId }]);
        toast.success('Досягнення видано');
      }
    } catch (err) { toast.error(err.message); }
  };

  const ROLE_OPTIONS_FULL = [
    { value: 'user',      label: '👤 Учасник' },
    { value: 'jury',      label: '⚖️ Журі' },
    { value: 'organizer', label: '🗂️ Організатор' },
    { value: 'admin',     label: '🛡️ Адмін', danger: true },
    { value: 'banned',    label: '🚫 Бан', danger: true },
  ];

  const toggleRole = (r) => {
    if (r === 'banned') {
      setCurrentRoles(p => p.includes('banned') ? ['user'] : ['banned']);
    } else {
      setCurrentRoles(prev => {
        const withoutBan = prev.filter(x => x !== 'banned');
        const next = withoutBan.includes(r) ? withoutBan.filter(x => x !== r) : [...withoutBan, r];
        return next.length ? next : ['user'];
      });
    }
  };

  const handleSaveRoles = async () => {
    const roles = [...currentRoles].sort().join(',') || 'user';
    setSavingRoles(true);
    try { await onRoleChange(user.id, roles); toast.success('Ролі збережено'); }
    catch (err) { toast.error(err.message); }
    finally { setSavingRoles(false); }
  };

  const handlePasswordSave = async e => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('Пароль мінімум 6 символів'); return; }
    setSavingPwd(true);
    try {
      await setUserPassword(user.id, newPassword);
      setNewPassword('');
      toast.success('Пароль змінено');
    } catch (err) { toast.error(err.message); }
    finally { setSavingPwd(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--light db-manage-user-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: 0, overflow: 'hidden' }}>
        <div className="db-mu-header">
          <div className="db-mu-avatar">{(user.username || '?').slice(0,2).toUpperCase()}</div>
          <div>
            <div className="db-mu-name">{user.username}</div>
            <div className="db-mu-email">{user.email}</div>
          </div>
          <button className="db-mu-close" onClick={onClose}>✕</button>
        </div>
        <div className="db-mu-body">
          <div className="db-mu-section">
            <label className="db-mu-label">Ролі (можна кілька)</label>
            <div className="db-mu-role-btns">
              {ROLE_OPTIONS_FULL.map(r => (
                <button key={r.value}
                  className={`db-mu-role-btn${currentRoles.includes(r.value) ? ' active' : ''}${r.danger ? ' danger' : ''}`}
                  onClick={() => toggleRole(r.value)}>
                  {r.label}
                </button>
              ))}
            </div>
            <button className="db-btn db-btn-primary db-btn-sm" style={{ marginTop: 10 }}
              onClick={handleSaveRoles} disabled={savingRoles}>
              {savingRoles ? '...' : 'Зберегти ролі'}
            </button>
          </div>
          <div className="db-mu-section">
            <label className="db-mu-label">Новий пароль</label>
            <form onSubmit={handlePasswordSave} style={{ display: 'flex', gap: 8 }}>
              <input className="db-input" type="password" value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Мінімум 6 символів" style={{ flex: 1 }} />
              <button type="submit" className="db-btn db-btn-primary db-btn-sm" disabled={savingPwd}>
                {savingPwd ? '...' : 'Змінити'}
              </button>
            </form>
          </div>
          <div className="db-mu-section">
            <label className="db-mu-label">🏅 Досягнення</label>
            {badgeLoading ? <div style={{ color: '#888', fontSize: 13 }}>Завантаження...</div> : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {ALL_BADGES.map(b => (
                  <button key={b.id}
                    title={b.name}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      background: hasBadge(b.id) ? 'rgba(124,95,245,.15)' : 'rgba(255,255,255,.05)',
                      border: `1px solid ${hasBadge(b.id) ? '#7c5ff5' : '#444'}`,
                      borderRadius: 10, padding: '8px 12px', cursor: 'pointer', minWidth: 80,
                    }}
                    onClick={() => handleToggleBadge(b.id)}>
                    <img src={b.image} alt={b.name}
                      style={{ width: 36, height: 36, objectFit: 'contain', filter: hasBadge(b.id) ? 'none' : 'grayscale(1) opacity(.4)' }} />
                    <span style={{ fontSize: 11, color: hasBadge(b.id) ? '#7c5ff5' : '#888', textAlign: 'center' }}>{b.name}</span>
                    <span style={{ fontSize: 10, color: hasBadge(b.id) ? '#4ade80' : '#f87171' }}>
                      {hasBadge(b.id) ? '✓ є' : '+ видати'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="db-mu-section db-mu-danger">
            <label className="db-mu-label" style={{ color: '#ef4444' }}>Небезпечна зона</label>
            <button className="db-btn db-btn-danger db-btn-full" onClick={() => onDelete(user.id, user.username)}>
              🗑 Видалити акаунт назавжди
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Edit Tournament Modal ──────────────────────────── */
function EditTournamentModal({ tournament, allTeams, toast, onClose, onSuccess, onDeleteTeam }) {
  const today = new Date().toISOString().split('T')[0];
  const [f, setF] = useState({
    name:               tournament.name               || '',
    description:        tournament.description        || '',
    rules:              tournament.rules              || '',
    start_date:         tournament.start_date         || today,
    end_date:           tournament.end_date           || '',
    registration_start: tournament.registration_start || today,
    registration_end:   tournament.registration_end   || '',
    teams_limit:        tournament.teams_limit        || '',
    min_team_size:      tournament.min_team_size      || 2,
    max_team_size:      tournament.max_team_size      || 5,
  });
  const [loading,      setLoading]      = useState(false);
  const [activeTab,    setActiveTab]    = useState('info');
  const [tourTeams,    setTourTeams]    = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const upd = (k, v) => setF(x => ({ ...x, [k]: v }));

  useEffect(() => {
    if (activeTab === 'teams') {
      if (allTeams && allTeams.length > 0) {
        setTourTeams(allTeams.filter(t => String(t.tournament_id) === String(tournament.id)));
      } else {
        setTeamsLoading(true);
        getAdminTeams()
          .then(teams => setTourTeams(teams.filter(t => String(t.tournament_id) === String(tournament.id))))
          .catch(() => {})
          .finally(() => setTeamsLoading(false));
      }
    }
  }, [activeTab, allTeams, tournament.id]);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateTournament(tournament.id, {
        ...f,
        teams_limit:   f.teams_limit ? Number(f.teams_limit) : null,
        min_team_size: Number(f.min_team_size),
        max_team_size: Number(f.max_team_size),
      });
      onSuccess();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="db-et-modal" onClick={e => e.stopPropagation()}>
        <div className="db-et-header">
          <div>
            <div className="db-et-title">{f.name || 'Редагування турніру'}</div>
            <div className="db-et-subtitle">id #{tournament.id}</div>
          </div>
          <button className="db-mu-close" onClick={onClose}>✕</button>
        </div>
        <div className="db-et-tabs">
          {[['info','📋 Інформація'], ['teams','👫 Команди']].map(([id, lbl]) => (
            <button key={id} className={`db-et-tab-btn${activeTab === id ? ' active' : ''}`} onClick={() => setActiveTab(id)}>{lbl}</button>
          ))}
        </div>
        <div className="db-et-body">
          {activeTab === 'info' && (
            <form onSubmit={handleSubmit}>
              <div className="db-form-row"><label>Назва *</label><input className="db-input" value={f.name} onChange={e => upd('name', e.target.value)} required /></div>
              <div className="db-form-row"><label>Опис</label><textarea className="db-input" rows={2} value={f.description} onChange={e => upd('description', e.target.value)} /></div>
              <div className="db-form-row"><label>Правила</label><textarea className="db-input" rows={2} value={f.rules} onChange={e => upd('rules', e.target.value)} /></div>
              <div className="db-form-row-2">
                <div className="db-form-row"><label>Старт</label><input className="db-input" type="date" value={f.start_date} onChange={e => upd('start_date', e.target.value)} /></div>
                <div className="db-form-row"><label>Кінець</label><input className="db-input" type="date" value={f.end_date} onChange={e => upd('end_date', e.target.value)} /></div>
              </div>
              <div className="db-form-row-2">
                <div className="db-form-row"><label>Реєстрація від</label><input className="db-input" type="date" value={f.registration_start} onChange={e => upd('registration_start', e.target.value)} /></div>
                <div className="db-form-row"><label>Реєстрація до</label><input className="db-input" type="date" value={f.registration_end} onChange={e => upd('registration_end', e.target.value)} /></div>
              </div>
              <div className="db-form-row-3">
                <div className="db-form-row"><label>Макс. команд</label><input className="db-input" type="number" min="1" value={f.teams_limit} onChange={e => upd('teams_limit', e.target.value)} placeholder="∞" /></div>
                <div className="db-form-row"><label>Мін. осіб</label><input className="db-input" type="number" min="1" max="20" value={f.min_team_size} onChange={e => upd('min_team_size', e.target.value)} /></div>
                <div className="db-form-row"><label>Макс. осіб</label><input className="db-input" type="number" min="1" max="20" value={f.max_team_size} onChange={e => upd('max_team_size', e.target.value)} /></div>
              </div>
              <div className="db-form-actions" style={{ marginTop: 16 }}>
                <button type="button" className="db-btn db-btn-ghost" onClick={onClose}>Скасувати</button>
                <button type="submit" className="db-btn db-btn-primary" disabled={loading}>{loading ? 'Збереження...' : '💾 Зберегти'}</button>
              </div>
            </form>
          )}
          {activeTab === 'teams' && (
            <div>
              {teamsLoading ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#aaa' }}>Завантаження...</div>
              ) : tourTeams.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#aaa' }}>Немає команд у цьому турнірі</div>
              ) : (
                <table className="db-admin-table">
                  <thead><tr><th>#</th><th>Команда</th><th>Капітан</th><th>Учасників</th><th>Місто</th><th></th></tr></thead>
                  <tbody>
                    {tourTeams.map(t => (
                      <tr key={t.id}>
                        <td style={{ color: '#bbb', fontSize: 12 }}>{t.id}</td>
                        <td><strong>{t.name}</strong></td>
                        <td style={{ fontSize: 13, color: '#666' }}>{t.captain_name}</td>
                        <td>{t.members_count}</td>
                        <td style={{ fontSize: 13 }}>{t.city || '—'}</td>
                        <td>
                          <button className="db-btn db-btn-danger db-btn-sm" onClick={() => {
                            onDeleteTeam(t.id, t.name);
                            setTourTeams(prev => prev.filter(x => x.id !== t.id));
                          }}>🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Create Tournament Form ─────────────────────────── */
function CreateTournamentForm({ toast, onSuccess, onCancel }) {
  const today = new Date().toISOString().split('T')[0];
  const [f, setF] = useState({
    name: '', description: '', rules: '', prize: '',
    category: 'hackathon', format: 'online', status: 'draft',
    start_date: today, end_date: '',
    registration_start: today, registration_end: '',
    teams_limit: '', rounds_count: 1, min_team_size: 2, max_team_size: 5,
  });
  const [loading, setLoading] = useState(false);
  const upd = (k, v) => setF(x => ({ ...x, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await createTournament({
        ...f,
        teams_limit:   f.teams_limit ? Number(f.teams_limit) : null,
        rounds_count:  Number(f.rounds_count),
        min_team_size: Number(f.min_team_size),
        max_team_size: Number(f.max_team_size),
      });
      onSuccess();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form className="db-create-form" onSubmit={handleSubmit}>

      {/* Header */}
      <div className="db-create-form-header">
        <div className="db-create-form-icon">🏆</div>
        <div>
          <h3>Новий турнір</h3>
          <p>Заповніть інформацію для створення турніру</p>
        </div>
      </div>

      {/* Section: Основна інформація */}
      <div className="db-cfs-section">
        <div className="db-cfs-title"><span className="db-cfs-icon">📋</span> Основна інформація</div>
        <div className="db-form-row">
          <label>Назва *</label>
          <input placeholder="Введіть назву турніру" value={f.name} onChange={e => upd('name', e.target.value)} required />
        </div>
        <div className="db-form-row-2">
          <div className="db-form-row">
            <label>Категорія</label>
            <CustomSelect value={f.category} onChange={v => upd('category', v)} options={CATEGORY_OPTIONS} placeholder="Оберіть категорію" />
          </div>
          <div className="db-form-row">
            <label>Формат</label>
            <CustomSelect value={f.format} onChange={v => upd('format', v)} options={FORMAT_OPTIONS} placeholder="Оберіть формат" />
          </div>
        </div>
        <div className="db-form-row">
          <label>Опис</label>
          <textarea rows={2} placeholder="Короткий опис турніру..." value={f.description} onChange={e => upd('description', e.target.value)} />
        </div>
        <div className="db-form-row">
          <label>Правила участі</label>
          <textarea rows={2} placeholder="Умови участі, критерії оцінювання..." value={f.rules} onChange={e => upd('rules', e.target.value)} />
        </div>
      </div>

      {/* Section: Дати */}
      <div className="db-cfs-section">
        <div className="db-cfs-title"><span className="db-cfs-icon">📅</span> Дати</div>
        <div className="db-form-row-2">
          <div className="db-form-row"><label>Реєстрація від *</label><input type="date" value={f.registration_start} onChange={e => upd('registration_start', e.target.value)} required /></div>
          <div className="db-form-row"><label>Реєстрація до *</label><input type="date" value={f.registration_end} onChange={e => upd('registration_end', e.target.value)} required /></div>
        </div>
        <div className="db-form-row-2">
          <div className="db-form-row"><label>Старт *</label><input type="date" value={f.start_date} onChange={e => upd('start_date', e.target.value)} required /></div>
          <div className="db-form-row"><label>Кінець *</label><input type="date" value={f.end_date} onChange={e => upd('end_date', e.target.value)} required /></div>
        </div>
      </div>

      {/* Section: Команди */}
      <div className="db-cfs-section">
        <div className="db-cfs-title"><span className="db-cfs-icon">👥</span> Команди</div>
        <div className="db-form-row-3">
          <div className="db-form-row"><label>Макс. команд</label><input type="number" min="1" value={f.teams_limit} onChange={e => upd('teams_limit', e.target.value)} placeholder="∞" /></div>
          <div className="db-form-row"><label>Мін. учасників</label><input type="number" min="1" max="20" value={f.min_team_size} onChange={e => upd('min_team_size', e.target.value)} /></div>
          <div className="db-form-row"><label>Макс. учасників</label><input type="number" min="1" max="20" value={f.max_team_size} onChange={e => upd('max_team_size', e.target.value)} /></div>
        </div>
        <div className="db-form-row" style={{ maxWidth: 160 }}>
          <label>Кількість раундів</label>
          <input type="number" min="1" max="10" value={f.rounds_count} onChange={e => upd('rounds_count', e.target.value)} />
        </div>
      </div>

      {/* Section: Статус та нагорода */}
      <div className="db-cfs-section">
        <div className="db-cfs-title"><span className="db-cfs-icon">🏷</span> Статус та нагорода</div>
        <div className="db-form-row-2">
          <div className="db-form-row">
            <label>Початковий статус</label>
            <StatusPicker value={f.status} onChange={v => upd('status', v)} />
          </div>
          <div className="db-form-row">
            <label>Нагорода / Призи</label>
            <input placeholder="Опис призів переможцям..." value={f.prize} onChange={e => upd('prize', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="db-form-actions">
        <button type="button" className="db-btn db-btn-ghost" onClick={onCancel}>Скасувати</button>
        <button type="submit" className="db-btn db-btn-primary" disabled={loading}>
          {loading ? 'Збереження...' : '🏆 Створити турнір'}
        </button>
      </div>
    </form>
  );
}

/* ── Application View Modal ──────────────────── */
function ApplicationViewModal({ app, onClose, onAccept, onDecline }) {
  const STATUS_COLOR = { pending: '#f59e0b', accepted: '#16a34a', rejected: '#ef4444' };
  const STATUS_LABEL_MAP = { pending: 'Очікує', accepted: 'Прийнято', rejected: 'Відхилено' };
  const [viewProfile, setViewProfile] = useState(null);

  return (
    <>
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--light" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, padding: 0, overflow: 'hidden' }}>
        <div className="db-mu-header" style={{ background: 'rgba(124,95,245,.1)' }}>
          <div style={{ cursor: 'pointer' }} onClick={() => setViewProfile(app)} title="Переглянути профіль">
            <UserAvatar user={app} size={44} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="db-mu-name" style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
              onClick={() => setViewProfile(app)} title="Переглянути профіль">
              {app.username}
            </div>
            <div className="db-mu-email">{app.email}</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLOR[app.status] || '#888', background: 'rgba(0,0,0,.2)', padding: '3px 10px', borderRadius: 20 }}>
            {STATUS_LABEL_MAP[app.status] || app.status}
          </span>
          <button className="db-mu-close" onClick={onClose}>✕</button>
        </div>
        <div className="db-mu-body">
          <div className="db-mu-section">
            <label className="db-mu-label">💬 Мотивація</label>
            <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 8, padding: '12px 14px', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {app.motivation || '—'}
            </div>
          </div>
          <div className="db-mu-section">
            <label className="db-mu-label">💼 Досвід та навички</label>
            <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 8, padding: '12px 14px', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: app.experience ? 'inherit' : '#666' }}>
              {app.experience || '—'}
            </div>
          </div>
          <div className="db-mu-section" style={{ color: '#888', fontSize: 12 }}>
            📅 Подано: {formatDate(app.created_at)}
          </div>
          {app.status === 'pending' && (
            <div className="db-form-actions" style={{ padding: '0 0 4px' }}>
              <button className="db-btn db-btn-danger" onClick={() => { onDecline(app.id); onClose(); }}>❌ Відхилити</button>
              <button className="db-btn db-btn-primary" style={{ background: '#16a34a' }} onClick={() => { onAccept(app.id); onClose(); }}>✓ Прийняти</button>
            </div>
          )}
        </div>
      </div>
    </div>
    {viewProfile && (
      <UserProfileModal
        profile={{ ...viewProfile, user_id: viewProfile.user_id || viewProfile.id }}
        meId={-1}
        onClose={() => setViewProfile(null)}
        onGoOwnProfile={() => setViewProfile(null)}
      />
    )}
    </>
  );
}

/* ══════════════════════════════════════════════════
   TabAdmin — Адмін панель
══════════════════════════════════════════════════ */
export default function TabAdmin({ toast }) {
  const [adminTab,    setAdminTab]    = useState('overview');
  const [tournaments, setTournaments] = useState([]);
  const [users,       setUsers]       = useState([]);
  const [adminTeams,  setAdminTeams]  = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,     setShowCreate]     = useState(false);
  const [roleLoading,    setRoleLoading]    = useState(null);
  const [manageUser,     setManageUser]     = useState(null);
  const [filterTour,     setFilterTour]     = useState('');
  const [editTournament, setEditTournament] = useState(null);
  const [confirmModal,   setConfirmModal]   = useState(null);

  // Applications state
  const [applications,        setApplications]        = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [viewApplication,     setViewApplication]     = useState(null);
  const [appFilter,           setAppFilter]           = useState('pending');

  // Chat management state
  const [customRooms,    setCustomRooms]    = useState([]);
  const [newRoomName,    setNewRoomName]    = useState('');
  const [newRoomLabel,   setNewRoomLabel]   = useState('');
  const [roomSettings,   setRoomSettings]   = useState({});
  const [announceRoom,   setAnnounceRoom]   = useState('general');
  const [announceText,   setAnnounceText]   = useState('');
  const [settingsRoom,   setSettingsRoom]   = useState('general');
  const [savingSettings, setSavingSettings] = useState(false);
  const [creatingRoom,   setCreatingRoom]   = useState(false);

  const ALL_CHAT_ROOMS = useMemo(() => [
    { id: 'general',     label: '# загальний' },
    { id: 'tournaments', label: '# турніри' },
    { id: 'offtopic',    label: '# офф-топік' },
    ...customRooms.map(r => ({ id: r.name, label: `# ${r.label}`, customId: r.id })),
  ], [customRooms]);

  const loadChatData = useCallback(async () => {
    try { setCustomRooms(await getCustomChatRooms()); } catch {}
  }, []);

  const loadRoomSettings = useCallback(async room => {
    try {
      const s = await getChatRoomSettings(room);
      setRoomSettings(prev => ({ ...prev, [room]: s }));
    } catch {}
  }, []);

  const loadApplications = useCallback(async () => {
    setApplicationsLoading(true);
    try { setApplications(await getAdminOrganizerApplications()); } catch {}
    finally { setApplicationsLoading(false); }
  }, []);

  useEffect(() => { if (adminTab === 'chat') loadChatData(); }, [adminTab, loadChatData]);
  useEffect(() => { if (adminTab === 'chat') loadRoomSettings(settingsRoom); }, [adminTab, settingsRoom, loadRoomSettings]);
  useEffect(() => { if (adminTab === 'applications') loadApplications(); }, [adminTab, loadApplications]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [t, u, s] = await Promise.all([getTournaments(), getAdminUsers(), getAdminStats()]);
      setTournaments(t); setUsers(u); setStats(s);
    } catch { toast.error('Помилка завантаження'); }
    finally { setLoading(false); }
  }, [toast]);

  const loadTeams = useCallback(async () => {
    try { setAdminTeams(await getAdminTeams()); } catch {}
  }, []);

  useEffect(() => { if (adminTab === 'teams') loadTeams(); }, [adminTab, loadTeams]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTournaments(await getTournaments()); } catch { toast.error('Помилка'); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const confirmAction = (message, onConfirm) => setConfirmModal({ message, onConfirm });

  const handleStatus = async (id, status) => {
    try { await updateTournamentStatus(id, status); toast.success('Статус оновлено'); load(); }
    catch (err) { toast.error(err.message); }
  };
  const handleDelete = async (id, name) => {
    confirmAction(`Видалити турнір "${name}"?`, async () => {
      try { await deleteTournament(id); toast.success('Видалено'); load(); }
      catch (err) { toast.error(err.message); }
    });
  };

  const handleRoleChange = async (uid, role) => {
    setRoleLoading(uid);
    try {
      await setUserRole(uid, role);
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, role } : u));
      toast.success('Роль змінено');
    } catch (err) { toast.error(err.message); }
    finally { setRoleLoading(null); }
  };

  const handleDeleteUser = async (uid, uname) => {
    confirmAction(`Видалити користувача "${uname}"? Цю дію не можна скасувати.`, async () => {
      try {
        await deleteAdminUser(uid);
        setUsers(prev => prev.filter(u => u.id !== uid));
        setManageUser(null);
        toast.success('Користувача видалено');
      } catch (err) { toast.error(err.message); }
    });
  };

  const handleAcceptApplication = async (id) => {
    try {
      await reviewOrganizerApplication(id, 'accepted');
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'accepted' } : a));
      toast.success('Заявку прийнято — користувач отримав роль Організатора');
    } catch (err) { toast.error(err.message); }
  };

  const handleDeclineApplication = async (id) => {
    try {
      await reviewOrganizerApplication(id, 'rejected');
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
      toast.info('Заявку відхилено');
    } catch (err) { toast.error(err.message); }
  };

  const handleDeleteAdminTeam = async (id, name) => {
    confirmAction(`Видалити команду "${name}"?`, async () => {
      try {
        await adminDeleteTeam(id);
        setAdminTeams(prev => prev.filter(t => t.id !== id));
        toast.success('Команду видалено');
      } catch (err) { toast.error(err.message); }
    });
  };

  const handleClearChat = async room => {
    confirmAction(`Очистити чат «${room}»?`, async () => {
      try { await clearChatRoom(room); toast.success('Чат очищено'); }
      catch (err) { toast.error(err.message); }
    });
  };

  const handleCreateRoom = async e => {
    e.preventDefault();
    if (!newRoomName.trim() || !newRoomLabel.trim()) return;
    setCreatingRoom(true);
    try {
      const created = await createChatRoom(newRoomName.trim(), newRoomLabel.trim());
      setCustomRooms(prev => [...prev, created]);
      setNewRoomName(''); setNewRoomLabel('');
      toast.success(`Кімнату «${created.label}» створено`);
    } catch (err) { toast.error(err.message); }
    finally { setCreatingRoom(false); }
  };

  const handleDeleteRoom = async (id, label) => {
    confirmAction(`Видалити кімнату «${label}»?`, async () => {
      try {
        await deleteChatRoom(id);
        setCustomRooms(prev => prev.filter(r => r.id !== id));
        toast.success('Кімнату видалено');
      } catch (err) { toast.error(err.message); }
    });
  };

  const handleSaveSettings = async e => {
    e.preventDefault();
    setSavingSettings(true);
    const cur = roomSettings[settingsRoom] || {};
    try {
      await setChatRoomSettings(settingsRoom, {
        locked:    cur.locked    || false,
        time_from: cur.time_from || null,
        time_to:   cur.time_to   || null,
      });
      toast.success('Налаштування збережено');
    } catch (err) { toast.error(err.message); }
    finally { setSavingSettings(false); }
  };

  const handleSendAnnouncement = async e => {
    e.preventDefault();
    if (!announceText.trim()) return;
    try {
      await postChatAnnouncement(announceRoom, announceText.trim());
      setAnnounceText('');
      toast.success('Оголошення надіслано');
    } catch (err) { toast.error(err.message); }
  };

  const curSettings = roomSettings[settingsRoom] || { locked: false, time_from: '', time_to: '' };
  const updSetting  = (k, v) => setRoomSettings(prev => ({
    ...prev, [settingsRoom]: { ...(prev[settingsRoom] || {}), [k]: v },
  }));

  const adminStats = stats ? [
    { label: 'Користувачів', value: stats.users,      color: '#AC9EF8', icon: '👤' },
    { label: 'Команд',       value: stats.teams,       color: '#7c5ff5', icon: '👥' },
    { label: 'Турнірів',     value: stats.tournaments, color: '#4ade80', icon: '🏆' },
    { label: 'Повідомлень',  value: stats.messages,    color: '#0ea5e9', icon: '💬' },
    { label: 'Заблоковано',  value: stats.banned,      color: '#f87171', icon: '🚫' },
  ] : [];

  const pendingAppsCount = applications.filter(a => a.status === 'pending').length;
  const filteredApps = applications.filter(a => appFilter === 'all' || a.status === appFilter);

  return (
    <div className="db-tab">
      <div className="db-tab-header">
        <h1>Адмін панель</h1>
        {adminTab === 'tournaments' && (
          <button className="db-btn db-btn-primary" onClick={() => setShowCreate(p => !p)}>
            {showCreate ? '✕ Скасувати' : '+ Новий турнір'}
          </button>
        )}
        {adminTab === 'applications' && (
          <button className="db-btn db-btn-ghost" onClick={loadApplications}>↻ Оновити</button>
        )}
      </div>

      <div className="db-admin-tabs">
        {[
          ['overview',     '📊 Огляд'],
          ['applications', '📄 Заявки'],
          ['tournaments',  '🏆 Турніри'],
          ['users',        '👥 Користувачі'],
          ['teams',        '👫 Команди'],
          ['chat',         '💬 Чат'],
        ].map(([id, lbl]) => (
          <button key={id} className={`db-admin-tab-btn${adminTab === id ? ' active' : ''}`} onClick={() => setAdminTab(id)}>
            {lbl}
            {id === 'applications' && pendingAppsCount > 0 && (
              <span className="db-admin-tab-badge">{pendingAppsCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="db-team-list">{[1,2,3].map(i => <div key={i} className="db-card-skeleton" style={{ height: 56 }} />)}</div>
      ) : (
        <>
          {/* ─── OVERVIEW ─── */}
          {adminTab === 'overview' && (
            <div>
              <div className="db-admin-stats" style={{ marginBottom: 24 }}>
                {adminStats.map(s => (
                  <div key={s.label} className="db-admin-stat" style={{ '--c': s.color }}>
                    <span className="db-admin-stat-icon">{s.icon}</span>
                    <span className="db-admin-stat-val">{s.value ?? '—'}</span>
                    <span className="db-admin-stat-label">{s.label}</span>
                  </div>
                ))}
              </div>
              <div className="db-admin-chat-grid">
                <div className="db-admin-card">
                  <div className="db-admin-card-header">
                    <div className="db-admin-card-icon" style={{ background: 'rgba(172,158,248,.15)' }}>🏆</div>
                    <div className="db-admin-card-header-text">
                      <h3 className="db-admin-card-title">Турніри</h3>
                      <p className="db-admin-card-sub">Швидкі дії</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button className="db-panel-access-btn" onClick={() => setAdminTab('tournaments')}>
                      <span className="db-pab-icon">➕</span>
                      <div className="db-pab-text"><strong>Створити турнір</strong><span>Відкрити форму створення</span></div>
                      <span className="db-pab-arrow">→</span>
                    </button>
                    <button className="db-panel-access-btn" onClick={() => { setAdminTab('tournaments'); }}>
                      <span className="db-pab-icon">✏️</span>
                      <div className="db-pab-text"><strong>Керувати турнірами</strong><span>Редагування, статуси, команди</span></div>
                      <span className="db-pab-arrow">→</span>
                    </button>
                  </div>
                </div>
                <div className="db-admin-card">
                  <div className="db-admin-card-header">
                    <div className="db-admin-card-icon" style={{ background: 'rgba(74,222,128,.1)' }}>👤</div>
                    <div className="db-admin-card-header-text">
                      <h3 className="db-admin-card-title">Користувачі</h3>
                      <p className="db-admin-card-sub">Швидкі дії</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button className="db-panel-access-btn" onClick={() => setAdminTab('users')}>
                      <span className="db-pab-icon">👥</span>
                      <div className="db-pab-text"><strong>Усі користувачі</strong><span>Управління ролями</span></div>
                      <span className="db-pab-arrow">→</span>
                    </button>
                    <button className="db-panel-access-btn" onClick={() => setAdminTab('applications')}>
                      <span className="db-pab-icon">🗂️</span>
                      <div className="db-pab-text">
                        <strong>Заявки організатора{pendingAppsCount > 0 ? ` (${pendingAppsCount})` : ''}</strong>
                        <span>Очікують розгляду</span>
                      </div>
                      <span className="db-pab-arrow">→</span>
                    </button>
                  </div>
                </div>
                <div className="db-admin-card">
                  <div className="db-admin-card-header">
                    <div className="db-admin-card-icon" style={{ background: 'rgba(14,165,233,.1)' }}>💬</div>
                    <div className="db-admin-card-header-text">
                      <h3 className="db-admin-card-title">Чат та команди</h3>
                      <p className="db-admin-card-sub">Швидкі дії</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button className="db-panel-access-btn" onClick={() => setAdminTab('chat')}>
                      <span className="db-pab-icon">📬</span>
                      <div className="db-pab-text"><strong>Управління чатом</strong><span>Кімнати, оголошення</span></div>
                      <span className="db-pab-arrow">→</span>
                    </button>
                    <button className="db-panel-access-btn" onClick={() => setAdminTab('teams')}>
                      <span className="db-pab-icon">👫</span>
                      <div className="db-pab-text"><strong>Команди</strong><span>Усі учасники</span></div>
                      <span className="db-pab-arrow">→</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── APPLICATIONS ─── */}
          {adminTab === 'applications' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#888' }}>Фільтр:</span>
                {[['pending','⏳ Очікують'], ['accepted','✓ Прийняті'], ['rejected','✗ Відхилені'], ['all','Усі']].map(([v, l]) => (
                  <button key={v}
                    className={`db-admin-tab-btn${appFilter === v ? ' active' : ''}`}
                    style={{ padding: '4px 12px', fontSize: 13 }}
                    onClick={() => setAppFilter(v)}>
                    {l}
                  </button>
                ))}
              </div>
              {applicationsLoading ? (
                <div className="db-team-list">{[1,2,3].map(i => <div key={i} className="db-card-skeleton" style={{ height: 56 }} />)}</div>
              ) : filteredApps.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#666', fontSize: 14 }}>
                  {appFilter === 'pending' ? '🎉 Немає нових заявок' : 'Немає заявок в цьому фільтрі'}
                </div>
              ) : (
                <div className="db-admin-table-wrap">
                  <table className="db-admin-table">
                    <thead>
                      <tr>
                        <th>Користувач</th>
                        <th>Email</th>
                        <th>Мотивація</th>
                        <th>Дата</th>
                        <th>Статус</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApps.map(a => (
                        <tr key={a.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <UserAvatar user={a} size={28} />
                              <strong>{a.username}</strong>
                            </div>
                          </td>
                          <td style={{ fontSize: 13, color: '#888' }}>{a.email}</td>
                          <td style={{ maxWidth: 220 }}>
                            <span style={{ fontSize: 13, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {a.motivation}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>{formatDate(a.created_at)}</td>
                          <td>
                            {a.status === 'pending' && <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: 12 }}>⏳ Очікує</span>}
                            {a.status === 'accepted' && <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 12 }}>✓ Прийнято</span>}
                            {a.status === 'rejected' && <span style={{ color: '#ef4444', fontWeight: 600, fontSize: 12 }}>✗ Відхилено</span>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="db-btn db-btn-ghost db-btn-sm" onClick={() => setViewApplication(a)}>👁 Переглянути</button>
                              {a.status === 'pending' && (<>
                                <button className="db-btn db-btn-sm" style={{ background: '#16a34a', color: '#fff' }} onClick={() => handleAcceptApplication(a.id)}>✓</button>
                                <button className="db-btn db-btn-danger db-btn-sm" onClick={() => handleDeclineApplication(a.id)}>✗</button>
                              </>)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── TOURNAMENTS ─── */}
          {adminTab === 'tournaments' && (
            <>
              {showCreate && (
                <CreateTournamentForm toast={toast}
                  onSuccess={() => { setShowCreate(false); load(); loadAll(); toast.success('Турнір створено!'); }}
                  onCancel={() => setShowCreate(false)} />
              )}
              <div className="db-admin-table-wrap">
                <table className="db-admin-table">
                  <thead><tr><th>Назва</th><th>Статус</th><th>Команд</th><th>Реєстрація</th><th>Змінити статус</th><th></th></tr></thead>
                  <tbody>
                    {tournaments.map(t => (
                      <tr key={t.id}>
                        <td><strong>{t.name}</strong></td>
                        <td><StatusBadge status={t.status} /></td>
                        <td>{t.teams_count || 0}{t.teams_limit ? `/${t.teams_limit}` : ''}</td>
                        <td style={{ fontSize: 13 }}>{formatDate(t.registration_start)} – {formatDate(t.registration_end)}</td>
                        <td>
                          <StatusPicker compact value={t.status} onChange={status => handleStatus(t.id, status)} />
                        </td>
                        <td style={{ display:'flex', gap:6 }}>
                          <button className="db-btn db-btn-ghost db-btn-sm" onClick={() => setEditTournament(t)}>✏ Редагувати</button>
                          <button className="db-btn db-btn-danger db-btn-sm" onClick={() => handleDelete(t.id, t.name)}>Видалити</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ─── USERS ─── */}
          {adminTab === 'users' && (
            <div className="db-admin-table-wrap">
              <table className="db-admin-table">
                <thead><tr><th>#</th><th>Нікнейм</th><th>Email</th><th>Ролі</th><th>Реєстрація</th><th></th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className={u.role?.includes('banned') ? 'row-banned' : ''}>
                      <td style={{ color: '#bbb', fontSize: 12 }}>{u.id}</td>
                      <td><strong>{u.username}</strong></td>
                      <td style={{ fontSize: 13, color: '#888' }}>{u.email}</td>
                      <td><RoleBadges role={u.role} /></td>
                      <td style={{ fontSize: 13 }}>{formatDate(u.created_at)}</td>
                      <td>
                        <button className="db-btn db-btn-ghost db-btn-sm" onClick={() => setManageUser(u)}>Керувати</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ─── TEAMS ─── */}
          {adminTab === 'teams' && (
            <div className="db-admin-table-wrap">
              <div style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                <label style={{ fontSize: 13, color: '#666' }}>Турнір:</label>
                <select className="db-select db-select-sm" value={filterTour} onChange={e => setFilterTour(e.target.value)}>
                  <option value="">— Усі —</option>
                  {[...new Map(adminTeams.map(t => [t.tournament_id, t.tournament_name])).entries()].map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
              <table className="db-admin-table">
                <thead><tr><th>#</th><th>Команда</th><th>Турнір</th><th>Капітан</th><th>Учасників</th><th>Статус</th><th></th></tr></thead>
                <tbody>
                  {adminTeams
                    .filter(t => !filterTour || String(t.tournament_id) === String(filterTour))
                    .map(t => (
                      <tr key={t.id}>
                        <td style={{ color: '#bbb', fontSize: 12 }}>{t.id}</td>
                        <td><strong>{t.name}</strong></td>
                        <td style={{ fontSize: 13 }}>{t.tournament_name}</td>
                        <td style={{ fontSize: 13, color: '#666' }}>{t.captain_name}</td>
                        <td>{t.members_count}</td>
                        <td><StatusBadge status={t.tournament_status} /></td>
                        <td>
                          <button className="db-btn db-btn-danger db-btn-sm" onClick={() => handleDeleteAdminTeam(t.id, t.name)}>🗑 Видалити</button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}

          {/* ─── CHAT ─── */}
          {adminTab === 'chat' && (
            <div className="db-admin-chat-grid">

              {/* ── CARD 1: Rooms ── */}
              <div className="db-admin-card">
                <div className="db-admin-card-header">
                  <div className="db-admin-card-icon" style={{ background: 'rgba(172,158,248,.15)' }}>💬</div>
                  <div className="db-admin-card-header-text">
                    <h3 className="db-admin-card-title">Кімнати чату</h3>
                    <p className="db-admin-card-sub">Системні та кастомні кімнати</p>
                  </div>
                  <span className="db-admin-card-badge">{ALL_CHAT_ROOMS.length}</span>
                </div>

                <div className="db-admin-chat-rooms">
                  <div className="db-admin-rooms-group-label">Системні</div>
                  {ALL_CHAT_ROOMS.filter(r => !r.customId).map(r => (
                    <div key={r.id} className="db-admin-chat-room-row">
                      <div className="db-admin-room-info">
                        <span className="db-admin-chat-room-label">{r.label}</span>
                        <span className="db-admin-room-tag db-admin-room-tag--sys">Системна</span>
                        {roomSettings[r.id]?.locked && <span className="db-admin-room-tag db-admin-room-tag--locked">🔒 Заблоковано</span>}
                      </div>
                      <button className="db-btn db-btn-danger db-btn-sm" onClick={() => handleClearChat(r.id)}>🧹 Очистити</button>
                    </div>
                  ))}

                  {customRooms.length > 0 && <>
                    <div className="db-admin-rooms-group-label" style={{ marginTop: 10 }}>Кастомні</div>
                    {ALL_CHAT_ROOMS.filter(r => r.customId).map(r => (
                      <div key={r.id} className="db-admin-chat-room-row">
                        <div className="db-admin-room-info">
                          <span className="db-admin-chat-room-label">{r.label}</span>
                          <span className="db-admin-room-tag db-admin-room-tag--custom">Кастомна</span>
                          {roomSettings[r.id]?.locked && <span className="db-admin-room-tag db-admin-room-tag--locked">🔒</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="db-btn db-btn-ghost db-btn-sm" title="Видалити кімнату" onClick={() => handleDeleteRoom(r.customId, r.label)}>🗑</button>
                          <button className="db-btn db-btn-danger db-btn-sm" onClick={() => handleClearChat(r.id)}>🧹</button>
                        </div>
                      </div>
                    ))}
                  </>}
                </div>

                <div className="db-admin-new-room-section">
                  <div className="db-admin-new-room-header">
                    <span className="db-admin-new-room-icon">＋</span>
                    <span>Нова кімната</span>
                  </div>
                  <form className="db-admin-new-room" onSubmit={handleCreateRoom}>
                    <div className="db-admin-new-room-fields">
                      <div className="db-admin-new-room-field">
                        <label>Ідентифікатор (латиниця)</label>
                        <input className="db-input" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="design-talk" pattern="[a-z0-9_-]+" />
                      </div>
                      <div className="db-admin-new-room-field">
                        <label>Назва для відображення</label>
                        <input className="db-input" value={newRoomLabel} onChange={e => setNewRoomLabel(e.target.value)} placeholder="Бест чат" />
                      </div>
                    </div>
                    <button type="submit" className="db-btn db-btn-primary" disabled={creatingRoom || !newRoomName.trim() || !newRoomLabel.trim()}>
                      {creatingRoom ? 'Створення...' : 'Створити кімнату'}
                    </button>
                  </form>
                </div>
              </div>

              {/* ── CARD 2: Room settings ── */}
              <div className="db-admin-card">
                <div className="db-admin-card-header">
                  <div className="db-admin-card-icon" style={{ background: 'rgba(239,68,68,.1)' }}>⚙️</div>
                  <div className="db-admin-card-header-text">
                    <h3 className="db-admin-card-title">Обмеження кімнати</h3>
                    <p className="db-admin-card-sub">Доступ та часовий графік</p>
                  </div>
                </div>

                <div className="db-form-row" style={{ marginBottom: 18 }}>
                  <label className="db-admin-field-label">КІМНАТА</label>
                  <CustomSelect value={settingsRoom} onChange={v => setSettingsRoom(v)}
                    options={ALL_CHAT_ROOMS.map(r => ({ value: r.id, label: r.label }))} />
                </div>

                <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="db-admin-setting-row">
                    <div className="db-admin-setting-info">
                      <span className="db-admin-setting-icon">🔒</span>
                      <div>
                        <div className="db-admin-setting-title">Заблокувати чат</div>
                        <div className="db-admin-setting-desc">Лише адмін може писати у цій кімнаті</div>
                      </div>
                    </div>
                    <button type="button" className={`db-toggle-btn${curSettings.locked ? ' on' : ''}`}
                      onClick={() => updSetting('locked', !curSettings.locked)}>
                      {curSettings.locked ? 'Заблоковано' : 'Увімкнено'}
                    </button>
                  </div>

                  <div className="db-admin-setting-row db-admin-setting-row--block">
                    <div className="db-admin-setting-info">
                      <span className="db-admin-setting-icon">⏰</span>
                      <div>
                        <div className="db-admin-setting-title">Часові обмеження</div>
                        <div className="db-admin-setting-desc">Дозволити писати лише у вказаний час</div>
                      </div>
                    </div>
                    <div className="db-admin-time-range">
                      <div className="db-admin-time-field">
                        <label>ПИСАТИ ВІД (ГГ:ХХ)</label>
                        <input className="db-input" type="time" value={curSettings.time_from || ''} onChange={e => updSetting('time_from', e.target.value || null)} />
                      </div>
                      <div className="db-admin-time-sep">—</div>
                      <div className="db-admin-time-field">
                        <label>ДО (ГГ:ХХ)</label>
                        <input className="db-input" type="time" value={curSettings.time_to || ''} onChange={e => updSetting('time_to', e.target.value || null)} />
                      </div>
                    </div>
                  </div>

                  {!curSettings.time_from && !curSettings.time_to && (
                    <div className="db-admin-tip">💡 Поля часу порожні — обмеження за часом вимкнено</div>
                  )}

                  <button type="submit" className="db-btn db-btn-primary" style={{ alignSelf: 'flex-start' }} disabled={savingSettings}>
                    {savingSettings ? 'Збереження...' : '💾 Зберегти налаштування'}
                  </button>
                </form>
              </div>

              {/* ── CARD 3: Announcement ── */}
              <div className="db-admin-card">
                <div className="db-admin-card-header">
                  <div className="db-admin-card-icon" style={{ background: 'rgba(245,158,11,.12)' }}>📣</div>
                  <div className="db-admin-card-header-text">
                    <h3 className="db-admin-card-title">Оголошення</h3>
                    <p className="db-admin-card-sub">Системне повідомлення в чаті</p>
                  </div>
                </div>

                <form onSubmit={handleSendAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="db-form-row">
                    <label className="db-admin-field-label">КІМНАТА</label>
                    <CustomSelect value={announceRoom} onChange={setAnnounceRoom}
                      options={ALL_CHAT_ROOMS.map(r => ({ value: r.id, label: r.label }))} />
                  </div>
                  <div className="db-form-row">
                    <label className="db-admin-field-label">ТЕКСТ ОГОЛОШЕННЯ</label>
                    <textarea className="db-input db-announce-textarea" rows={4}
                      value={announceText} onChange={e => setAnnounceText(e.target.value)}
                      placeholder="Шановні учасники..." maxLength={500} />
                    <div className="db-admin-char-count" style={{ color: announceText.length > 450 ? '#ef4444' : undefined }}>
                      {announceText.length} / 500
                    </div>
                  </div>

                  {announceText.trim() && (
                    <div className="db-admin-announce-preview">
                      <span className="db-admin-preview-badge">📣 Попередній перегляд</span>
                      <p>{announceText}</p>
                    </div>
                  )}

                  <button type="submit" className="db-btn db-btn-primary" style={{ alignSelf: 'flex-start' }}
                    disabled={!announceText.trim() || announceText.length > 500}>
                    📣 Надіслати оголошення
                  </button>
                </form>
              </div>

            </div>
          )}
        </>
      )}

      {manageUser && (
        <ManageUserModal user={manageUser} toast={toast} onClose={() => setManageUser(null)}
          onRoleChange={(uid, role) => { handleRoleChange(uid, role); setManageUser(u => ({ ...u, role })); }}
          onDelete={handleDeleteUser} />
      )}
      {viewApplication && (
        <ApplicationViewModal
          app={viewApplication}
          onClose={() => setViewApplication(null)}
          onAccept={handleAcceptApplication}
          onDecline={handleDeclineApplication}
        />
      )}
      {editTournament && (
        <EditTournamentModal tournament={editTournament} allTeams={adminTeams} toast={toast}
          onClose={() => setEditTournament(null)}
          onSuccess={() => { setEditTournament(null); loadAll(); loadTeams(); toast.success('Турнір оновлено!'); }}
          onDeleteTeam={handleDeleteAdminTeam} />
      )}
      {confirmModal && (
        <ConfirmModal message={confirmModal.message}
          onConfirm={() => { setConfirmModal(null); confirmModal.onConfirm(); }}
          onCancel={() => setConfirmModal(null)} />
      )}
    </div>
  );
}

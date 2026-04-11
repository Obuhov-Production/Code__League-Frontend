import { useState, useEffect, useCallback, useMemo } from 'react';

import {
  getTournaments, getAdminUsers, getAdminStats, getAdminTeams,
  createTournament, updateTournament,
  updateTournamentStatus, deleteTournament,
  setUserRole, deleteAdminUser, setUserPassword, adminDeleteTeam,
  clearChatRoom, getCustomChatRooms, createChatRoom, deleteChatRoom,
  getChatRoomSettings, setChatRoomSettings, postChatAnnouncement,
} from '@utils/authApi';
import { StatusBadge, RoleBadges, CustomSelect, ConfirmModal, formatDate, STATUS_LABEL } from './db.shared.jsx';

/* ── Manage User Modal ──────────────────────────────── */
function ManageUserModal({ user, toast, onClose, onRoleChange, onDelete }) {
  const [newPassword,  setNewPassword]  = useState('');
  const [savingPwd,    setSavingPwd]    = useState(false);
  const [savingRoles,  setSavingRoles]  = useState(false);
  const [currentRoles, setCurrentRoles] = useState(
    (user.role || 'user').split(',').map(r => r.trim()).filter(Boolean)
  );

  const ROLE_OPTIONS_FULL = [
    { value: 'user',   label: '👤 Учасник' },
    { value: 'jury',   label: '⚖️ Журі' },
    { value: 'admin',  label: '🛡️ Адмін', danger: true },
    { value: 'banned', label: '🚫 Бан', danger: true },
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
  const [f, setF] = useState({ name:'', description:'', rules:'', start_date:today, end_date:'', registration_start:today, registration_end:'', teams_limit:'', rounds_count:1, min_team_size:2, max_team_size:5 });
  const [loading, setLoading] = useState(false);
  const upd = (k,v) => setF(x => ({ ...x, [k]: v }));
  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true);
    try {
      await createTournament({ ...f, teams_limit: f.teams_limit ? Number(f.teams_limit) : null, rounds_count: Number(f.rounds_count), min_team_size: Number(f.min_team_size), max_team_size: Number(f.max_team_size) });
      onSuccess();
    } catch (err) { toast.error(err.message); } finally { setLoading(false); }
  };
  return (
    <form className="db-create-form" onSubmit={handleSubmit}>
      <h3>Новий турнір</h3>
      <div className="db-form-row"><label>Назва *</label><input value={f.name} onChange={e => upd('name',e.target.value)} required /></div>
      <div className="db-form-row"><label>Опис</label><textarea rows={2} value={f.description} onChange={e => upd('description',e.target.value)} /></div>
      <div className="db-form-row"><label>Правила</label><textarea rows={2} value={f.rules} onChange={e => upd('rules',e.target.value)} /></div>
      <div className="db-form-row-2">
        <div className="db-form-row"><label>Старт *</label><input type="date" value={f.start_date} onChange={e => upd('start_date',e.target.value)} required /></div>
        <div className="db-form-row"><label>Кінець *</label><input type="date" value={f.end_date} onChange={e => upd('end_date',e.target.value)} required /></div>
      </div>
      <div className="db-form-row-2">
        <div className="db-form-row"><label>Реєстрація від *</label><input type="date" value={f.registration_start} onChange={e => upd('registration_start',e.target.value)} required /></div>
        <div className="db-form-row"><label>Реєстрація до *</label><input type="date" value={f.registration_end} onChange={e => upd('registration_end',e.target.value)} required /></div>
      </div>
      <div className="db-form-row-3">
        <div className="db-form-row"><label>Макс. команд</label><input type="number" min="1" value={f.teams_limit} onChange={e => upd('teams_limit',e.target.value)} placeholder="∞" /></div>
        <div className="db-form-row"><label>Мін. осіб</label><input type="number" min="1" max="20" value={f.min_team_size} onChange={e => upd('min_team_size',e.target.value)} /></div>
        <div className="db-form-row"><label>Макс. осіб</label><input type="number" min="1" max="20" value={f.max_team_size} onChange={e => upd('max_team_size',e.target.value)} /></div>
      </div>
      <div className="db-form-actions">
        <button type="button" className="db-btn db-btn-ghost" onClick={onCancel}>Скасувати</button>
        <button type="submit" className="db-btn db-btn-primary" disabled={loading}>{loading ? 'Збереження...' : 'Створити'}</button>
      </div>
    </form>
  );
}

/* ══════════════════════════════════════════════════
   TabAdmin — Адмін панель
══════════════════════════════════════════════════ */
export default function TabAdmin({ toast }) {
  const [adminTab,    setAdminTab]    = useState('tournaments');
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

  useEffect(() => { if (adminTab === 'chat') loadChatData(); }, [adminTab, loadChatData]);
  useEffect(() => { if (adminTab === 'chat') loadRoomSettings(settingsRoom); }, [adminTab, settingsRoom, loadRoomSettings]);

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
    { label: 'Користувачів', value: stats.users,      color: '#AC9EF8' },
    { label: 'Команд',       value: stats.teams,       color: '#7c5ff5' },
    { label: 'Турнірів',     value: stats.tournaments, color: '#4ade80' },
    { label: 'Повідомлень',  value: stats.messages,    color: '#0ea5e9' },
    { label: 'Заблоковано',  value: stats.banned,      color: '#f87171' },
  ] : [];

  const STATUS_OPTIONS = ['draft','registration','running','finished'];

  return (
    <div className="db-tab">
      <div className="db-tab-header">
        <h1>Адмін панель</h1>
        {adminTab === 'tournaments' && (
          <button className="db-btn db-btn-primary" onClick={() => setShowCreate(p => !p)}>
            {showCreate ? '✕ Скасувати' : '+ Новий турнір'}
          </button>
        )}
      </div>

      {adminStats.length > 0 && (
        <div className="db-admin-stats">
          {adminStats.map(s => (
            <div key={s.label} className="db-admin-stat" style={{ '--c': s.color }}>
              <span className="db-admin-stat-val">{s.value}</span>
              <span className="db-admin-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="db-admin-tabs">
        {[['tournaments','🏆 Турніри'], ['users','👥 Користувачі'], ['teams','👫 Команди'], ['chat','💬 Чат']].map(([id, lbl]) => (
          <button key={id} className={`db-admin-tab-btn${adminTab === id ? ' active' : ''}`} onClick={() => setAdminTab(id)}>{lbl}</button>
        ))}
      </div>

      {loading ? (
        <div className="db-team-list">{[1,2,3].map(i => <div key={i} className="db-card-skeleton" style={{ height: 56 }} />)}</div>
      ) : (
        <>
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
                          <select className="db-select db-select-sm" value={t.status} onChange={e => handleStatus(t.id, e.target.value)}>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]?.label || s}</option>)}
                          </select>
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
              <div className="db-admin-card">
                <h3>Кімнати чату</h3>
                <p className="db-admin-hint">Системні та кастомні кімнати. «Очистити» видалить всі повідомлення.</p>
                <div className="db-admin-chat-rooms">
                  {ALL_CHAT_ROOMS.map(r => (
                    <div key={r.id} className="db-admin-chat-room-row">
                      <span className="db-admin-chat-room-label">{r.label}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {r.customId && (
                          <button className="db-btn db-btn-ghost db-btn-sm" onClick={() => handleDeleteRoom(r.customId, r.label)}>🗑 Видалити</button>
                        )}
                        <button className="db-btn db-btn-danger db-btn-sm" onClick={() => handleClearChat(r.id)}>🧹 Очистити</button>
                      </div>
                    </div>
                  ))}
                </div>
                <form className="db-admin-new-room" onSubmit={handleCreateRoom}>
                  <h4>+ Нова кімната</h4>
                  <div className="db-form-row-2">
                    <div className="db-form-row">
                      <label>Ідентифікатор (латиниця)</label>
                      <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="design-talk" pattern="[a-z0-9_-]+" />
                    </div>
                    <div className="db-form-row">
                      <label>Назва для відображення</label>
                      <input value={newRoomLabel} onChange={e => setNewRoomLabel(e.target.value)} placeholder="Бест чат" />
                    </div>
                  </div>
                  <button type="submit" className="db-btn db-btn-primary" disabled={creatingRoom}>
                    {creatingRoom ? 'Створення...' : 'Створити кімнату'}
                  </button>
                </form>
              </div>

              <div className="db-admin-card">
                <h3>Обмеження кімнати</h3>
                <p className="db-admin-hint">«Заблокувати» — тільки адмін може писати.</p>
                <div className="db-form-row" style={{ marginBottom: 14 }}>
                  <label>Кімната</label>
                  <CustomSelect value={settingsRoom} onChange={v => setSettingsRoom(v)}
                    options={ALL_CHAT_ROOMS.map(r => ({ value: r.id, label: r.label }))} />
                </div>
                <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <label className="db-admin-toggle-row">
                    <span>🔒 Заблокувати чат (лише адмін може писати)</span>
                    <button type="button" className={`db-toggle-btn${curSettings.locked ? ' on' : ''}`}
                      onClick={() => updSetting('locked', !curSettings.locked)}>
                      {curSettings.locked ? 'Заблоковано' : 'Увімкнено'}
                    </button>
                  </label>
                  <div className="db-form-row-2">
                    <div className="db-form-row"><label>⏰ Писати від (HH:MM)</label>
                      <input type="time" value={curSettings.time_from || ''} onChange={e => updSetting('time_from', e.target.value || null)} />
                    </div>
                    <div className="db-form-row"><label>До (HH:MM)</label>
                      <input type="time" value={curSettings.time_to || ''} onChange={e => updSetting('time_to', e.target.value || null)} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>Якщо поля часу порожні — обмеження за часом вимкнено.</div>
                  <button type="submit" className="db-btn db-btn-primary" style={{ alignSelf: 'flex-start' }} disabled={savingSettings}>
                    {savingSettings ? 'Збереження...' : 'Зберегти налаштування'}
                  </button>
                </form>
              </div>

              <div className="db-admin-card">
                <h3>📣 Оголошення</h3>
                <p className="db-admin-hint">Повідомлення виглядатиме як системне оголошення в чаті.</p>
                <form onSubmit={handleSendAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="db-form-row">
                    <label>Кімната</label>
                    <CustomSelect value={announceRoom} onChange={setAnnounceRoom}
                      options={ALL_CHAT_ROOMS.map(r => ({ value: r.id, label: r.label }))} />
                  </div>
                  <div className="db-form-row">
                    <label>Текст оголошення</label>
                    <textarea rows={3} value={announceText} onChange={e => setAnnounceText(e.target.value)} placeholder="Шановні учасники..." />
                  </div>
                  <button type="submit" className="db-btn db-btn-primary" style={{ alignSelf: 'flex-start' }} disabled={!announceText.trim()}>
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

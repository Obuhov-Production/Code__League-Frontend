import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  getTournaments,
  createTournament, updateTournament,
  updateTournamentStatus, deleteTournament,
  getAdminTeams, getTeamById, uploadTournamentFile, deleteTournamentFile,
  getTournamentRounds, createRound, updateRound, deleteRound,
  advanceRound, uploadRoundFile,
} from '@utils/authApi';
import { StatusBadge, ConfirmModal, formatDate, TournamentForm, UserAvatar, CustomSelect } from './db.shared.jsx';
import IconTeams from '@images/dashboard_components/icon_teams.svg?react';
import IconLock  from '@images/dashboard_components/icon_lock_shield.svg?react';

const TOUR_STATUS_OPTS = [
  { value: 'draft',        label: 'Draft',        color: '#888' },
  { value: 'registration', label: 'Registration', color: '#7c5ff5' },
  { value: 'running',      label: 'Running',      color: '#16a34a' },
  { value: 'finished',     label: 'Finished',     color: '#0ea5e9' },
  { value: 'cancelled',    label: 'Cancelled',    color: '#ef4444' },
];

/* ── StatusPicker ──────────────────────────────────── */
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
    const fn = () => setOpen(false);
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

const ROUND_STATUS_COLORS = {
  draft: '#888',
  active: '#16a34a',
  submission_closed: '#f59e0b',
  evaluated: '#0ea5e9',
};

/* ── RoundManager — round navigation & CRUD ────────── */
function RoundManager({ tournament, toast, onRoundsChange }) {
  const [rounds, setRounds]       = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc]   = useState('');
  const [newTech, setNewTech]   = useState('');
  const [newMust, setNewMust]   = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd]     = useState('');
  const [newMaxTeams, setNewMaxTeams] = useState('');
  const [newRulesFile, setNewRulesFile] = useState(null);
  const [newTzFile, setNewTzFile]       = useState(null);

  const loadRounds = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getTournamentRounds(tournament.id);
      setRounds(r);
      const ai = r.findIndex(x => x.status === 'active');
      setActiveIdx(ai >= 0 ? ai : 0);
      onRoundsChange?.(r);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [tournament.id, toast]);

  useEffect(() => { loadRounds(); }, [loadRounds]);

  const handleAdvance = async (dir) => {
    const label = dir > 0 ? 'наступний' : 'попередній';
    setConfirmModal({
      message: `Перейти на ${label} раунд? ${dir > 0 ? 'Поточний раунд буде закрито для здачі.' : 'Поточний раунд повернеться в чернетку.'}`,
      onConfirm: async () => {
        setSaving(true);
        try {
          const res = await advanceRound(tournament.id, dir);
          toast.success(`Активний раунд: ${res.active_round?.title}`);
          await loadRounds();
        } catch (e) { toast.error(e.message); }
        finally { setSaving(false); setConfirmModal(null); }
      },
    });
  };

  const handleSave = async () => {
    if (!newTitle.trim() || !newStart || !newEnd) { toast.error('Заповніть назву та дати'); return; }
    setSaving(true);
    try {
      if (editMode && current) {
        // UPDATE existing round
        await updateRound(current.id, {
          title: newTitle,
          description: newDesc || null,
          tech_requirements: newTech || null,
          must_have_items: newMust ? newMust.split('\n').map(s => s.trim()).filter(Boolean) : [],
          starts_at: new Date(newStart).toISOString(),
          deadline_at: new Date(newEnd).toISOString(),
          max_teams_pass: newMaxTeams === '' ? null : Number(newMaxTeams),
        });
        if (newRulesFile) await uploadRoundFile(current.id, 'rules', newRulesFile);
        if (newTzFile) await uploadRoundFile(current.id, 'tz', newTzFile);
        toast.success('Раунд оновлено');
        setEditMode(false);
      } else {
        // CREATE new round
        const created = await createRound(tournament.id, {
          title: newTitle,
          description: newDesc || null,
          tech_requirements: newTech || null,
          must_have_items: newMust ? newMust.split('\n').map(s => s.trim()).filter(Boolean) : [],
          starts_at: new Date(newStart).toISOString(),
          deadline_at: new Date(newEnd).toISOString(),
          sort_order: rounds.length,
          status: 'draft',
          max_teams_pass: newMaxTeams === '' ? null : Number(newMaxTeams),
        });
        if (newRulesFile && created?.id) await uploadRoundFile(created.id, 'rules', newRulesFile);
        if (newTzFile && created?.id) await uploadRoundFile(created.id, 'tz', newTzFile);
        toast.success('Раунд створено');
        setShowCreate(false);
      }
      setNewTitle(''); setNewDesc(''); setNewTech(''); setNewMust(''); setNewStart(''); setNewEnd(''); setNewMaxTeams(''); setNewRulesFile(null); setNewTzFile(null);
      await loadRounds();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleEditStart = () => {
    if (!current) return;
    setNewTitle(current.title || '');
    setNewDesc(current.description || '');
    setNewTech(current.tech_requirements || '');
    setNewMust((current.must_have_items || []).join('\n'));
    setNewStart(current.starts_at ? new Date(current.starts_at).toISOString().slice(0, 16) : '');
    setNewEnd(current.deadline_at ? new Date(current.deadline_at).toISOString().slice(0, 16) : '');
    setNewMaxTeams(current.max_teams_pass ?? '');
    setNewRulesFile(null);
    setNewTzFile(null);
    setEditMode(true);
    setShowCreate(true);
  };

  const handleDeleteRound = (roundId, title) => {
    setConfirmModal({
      message: `Видалити раунд "${title}"? Це видалить всі пов'язані здачі.`,
      onConfirm: async () => {
        try { await deleteRound(roundId); toast.success('Видалено'); await loadRounds(); }
        catch (e) { toast.error(e.message); }
        finally { setConfirmModal(null); }
      },
    });
  };

  const handleReorder = async (dir) => {
    if (!current || rounds.length < 2) return;
    const swapIdx = activeIdx + dir;
    if (swapIdx < 0 || swapIdx >= rounds.length) return;
    const a = rounds[activeIdx];
    const b = rounds[swapIdx];
    setSaving(true);
    try {
      await Promise.all([
        updateRound(a.id, { sort_order: b.sort_order ?? swapIdx }),
        updateRound(b.id, { sort_order: a.sort_order ?? activeIdx }),
      ]);
      toast.success('Порядок раундів оновлено');
      await loadRounds();
      setActiveIdx(swapIdx);
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const current = rounds[activeIdx];

  if (loading) return <div className="db-loading" style={{ padding: 32 }}><div className="db-spinner" /></div>;

  return (
    <div className="org-round-manager">
      {/* Navigation bar:  ‹ Round 1 of 3 › */}
      <div className="org-round-nav">
        <button
          className="org-round-nav-btn"
          disabled={activeIdx <= 0 || saving}
          onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
        >‹</button>
        <div className="org-round-nav-info">
          {rounds.length === 0 ? (
            <span style={{ color: '#888' }}>Раундів ще немає</span>
          ) : (
            <>
              <span className="org-round-nav-title">{current?.title || `Раунд ${activeIdx + 1}`}</span>
              <span className="org-round-nav-count">{activeIdx + 1} / {rounds.length}</span>
            </>
          )}
        </div>
        <button
          className="org-round-nav-btn"
          disabled={activeIdx >= rounds.length - 1 || saving}
          onClick={() => setActiveIdx(i => Math.min(rounds.length - 1, i + 1))}
        >›</button>
      </div>

      {/* Round status controls */}
      {current && (
        <div className="org-round-controls">
          <span className="org-round-status" style={{ color: ROUND_STATUS_COLORS[current.status] || '#888' }}>
            ● {current.status === 'active' ? 'Активний' : current.status === 'draft' ? 'Чернетка' : current.status === 'submission_closed' ? 'Здача закрита' : 'Оцінено'}
          </span>
          <div className="org-round-actions">
            <button className="db-btn db-btn-ghost db-btn-sm" disabled={saving || activeIdx <= 0} onClick={() => handleReorder(-1)} title="Вгору">↑</button>
            <button className="db-btn db-btn-ghost db-btn-sm" disabled={saving || activeIdx >= rounds.length - 1} onClick={() => handleReorder(1)} title="Вниз">↓</button>
            <button className="db-btn db-btn-ghost db-btn-sm" disabled={saving} onClick={() => handleAdvance(-1)} title="Попередній раунд">
              ⏪ Попередній
            </button>
            <button className="db-btn db-btn-primary db-btn-sm" disabled={saving} onClick={() => handleAdvance(1)} title="Наступний раунд">
              Наступний ⏩
            </button>
          </div>
        </div>
      )}

      {/* Round details */}
      {current && (
        <div className="org-round-details">
          {current.max_teams_pass && (
            <div className="org-round-field">
              <label>👥 Макс. команд що проходять</label>
              <p>{current.max_teams_pass}</p>
            </div>
          )}
          {current.description && (
            <div className="org-round-field">
              <label>Опис / Завдання</label>
              <p>{current.description}</p>
            </div>
          )}
          {current.tech_requirements && (
            <div className="org-round-field">
              <label>Технічні вимоги</label>
              <p>{current.tech_requirements}</p>
            </div>
          )}
          {current.must_have_items?.length > 0 && (
            <div className="org-round-field">
              <label>Обов'язкові елементи</label>
              <ul>{current.must_have_items.map((item, i) => <li key={i}>{item}</li>)}</ul>
            </div>
          )}
          <div className="org-round-files">
            {current.rules_file_url && (
              <a href={current.rules_file_url} target="_blank" rel="noreferrer" className="org-round-file-link">
                📜 Правила
              </a>
            )}
            {current.tz_file_url && (
              <a href={current.tz_file_url} target="_blank" rel="noreferrer" className="org-round-file-link">
                📋 ТЗ
              </a>
            )}
          </div>
          <div className="org-round-dates">
            <span>📅 {new Date(current.starts_at).toLocaleString('uk-UA')} — {new Date(current.deadline_at).toLocaleString('uk-UA')}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="db-btn db-btn-ghost db-btn-sm" onClick={handleEditStart}>✏ Редагувати</button>
            <button className="db-btn db-btn-danger db-btn-sm" onClick={() => handleDeleteRound(current.id, current.title)}>🗑 Видалити</button>
          </div>
        </div>
      )}

      {/* Create / Edit round toggle */}
      <button className="db-btn db-btn-ghost" style={{ marginTop: 12 }} onClick={() => {
        if (showCreate && editMode) { setEditMode(false); setShowCreate(false); }
        else if (showCreate) { setShowCreate(false); }
        else { setShowCreate(true); setEditMode(false); setNewTitle(''); setNewDesc(''); setNewTech(''); setNewMust(''); setNewStart(''); setNewEnd(''); setNewMaxTeams(''); setNewRulesFile(null); setNewTzFile(null); }
      }}>
        {showCreate ? '✕ Скасувати' : '+ Додати раунд'}
      </button>

      {showCreate && (
        <div className="org-round-create-form">
          {editMode && (
            <div style={{ fontSize: 14, fontWeight: 600, color: '#3b82f6', marginBottom: 8 }}>
              ✏ Редагування раунду «{current?.title}»
            </div>
          )}
          <input className="db-input" placeholder="Назва раунду *" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          <textarea className="db-input" rows={3} placeholder="Опис (завдання, правила...)" value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{ resize: 'vertical' }} />
          <textarea className="db-input" rows={2} placeholder="Технічні вимоги" value={newTech} onChange={e => setNewTech(e.target.value)} style={{ resize: 'vertical' }} />
          <textarea className="db-input" rows={2} placeholder="Обов'язкові елементи (кожен з нового рядка)" value={newMust} onChange={e => setNewMust(e.target.value)} style={{ resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: '#888' }}>Початок</label>
              <input className="db-input" type="datetime-local" value={newStart} onChange={e => setNewStart(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: '#888' }}>Дедлайн</label>
              <input className="db-input" type="datetime-local" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: '#888' }}>Макс. команд що проходять</label>
              <input className="db-input" type="number" min={1} placeholder="∞" value={newMaxTeams} onChange={e => setNewMaxTeams(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: '#888' }}>{editMode ? 'Новий файл правил (опціонально)' : 'Файл правил'}</label>
              <input type="file" accept=".pdf,.doc,.docx,.txt,.md" onChange={e => setNewRulesFile(e.target.files?.[0] || null)} style={{ color: '#ccc', fontSize: 13 }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: '#888' }}>{editMode ? 'Новий файл ТЗ (опціонально)' : 'Файл ТЗ'}</label>
              <input type="file" accept=".pdf,.zip,.txt,.md,.doc,.docx,.png,.jpg,.gif" onChange={e => setNewTzFile(e.target.files?.[0] || null)} style={{ color: '#ccc', fontSize: 13 }} />
            </div>
          </div>
          <button className="db-btn db-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Зберігаю...' : (editMode ? '💾 Зберегти зміни' : 'Створити раунд')}
          </button>
        </div>
      )}

      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}

/* ── Edit Tournament Modal ─────────────────────────── */
function EditTournamentModal({ tournament, toast, onClose, onSuccess }) {
  const [saving, setSaving] = useState(false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--light db-tournament-modal" onClick={e => e.stopPropagation()}>
        <div className="db-modal-scroll-body">
          <TournamentForm
            mode="edit"
            tournament={tournament}
            loading={saving}
            onSubmit={async (payload, files, meta = {}) => {
              setSaving(true);
              try {
                await updateTournament(tournament.id, payload);
                if (meta?.removedFiles?.length) {
                  for (const file of meta.removedFiles) {
                    await deleteTournamentFile(tournament.id, file.type, file.name).catch(() => {});
                  }
                }
                if (files?.rules) {
                  await uploadTournamentFile(tournament.id, 'rules', files.rules);
                }
                if (files?.tz?.length) {
                  for (const f of files.tz) await uploadTournamentFile(tournament.id, 'tz', f);
                }
                toast.success('Турнір оновлено!');
                onSuccess();
              } catch (err) {
                toast.error(err.message);
              } finally {
                setSaving(false);
              }
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TabOrganizer — Панель організатора
   Доступ: create/edit/delete tournaments, view teams & results.
   Без управління користувачами та чатом (лише для Admin).
══════════════════════════════════════════════════ */
const teamText = (value, fallback = '—') => {
  const text = value == null ? '' : String(value).trim();
  return text || fallback;
};

const teamMemberName = (member) => (
  member?.full_name || member?.fullName || member?.username || member?.user?.username || member?.email || 'Учасник'
);

const teamMemberAvatarUser = (member) => ({
  username: teamMemberName(member),
  email: member?.email || member?.user?.email || null,
  user_avatar_url: member?.user_avatar_url || member?.avatar_url || member?.user?.user_avatar_url || member?.user?.avatar_url || null,
  avatar_url: member?.avatar_url || member?.user?.avatar_url || null,
  status: member?.presence || member?.status || member?.user?.status || null,
});

function OrganizerTeamPanel({ team, detail, loading, expanded, onToggle }) {
  const data = detail || team;
  const members = Array.isArray(data?.members) ? data.members : [];
  const captainId = data?.captain_id ?? data?.captain?.id ?? team?.captain_id ?? null;
  const captain = data?.captain || members.find(m => String(m.user_id ?? m.user?.id ?? m.id ?? '') === String(captainId ?? '')) || {};
  const leaderEmail = teamText(data?.captain_email || captain?.email || data?.leader_email, 'Не вказано');
  const telegram = teamText(data?.telegram_username || data?.telegram || data?.captain_telegram, 'Не вказано');

  return (
    <div className={`org-team-card${expanded ? ' expanded' : ''}`}>
      <button type="button" className="org-team-head" onClick={onToggle}>
        <span className="org-team-avatar">{teamText(team.name, '?').slice(0, 2).toUpperCase()}</span>
        <span className="org-team-main">
          <strong>{teamText(team.name, 'Без назви')}</strong>
          <small>{teamText(team.tournament_name, 'Турнір не вказано')}</small>
        </span>
        <span className="org-team-tags">
          {team.city && <span>{team.city}</span>}
          {team.school && <span>{team.school}</span>}
          <span>{Number(team.members_count ?? members.length ?? 0)} уч.</span>
        </span>
        <span className="org-team-chevron">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="org-team-details">
          {loading ? (
            <div className="org-team-loading">Завантаження команди...</div>
          ) : (
            <>
              <div className="org-team-info-grid">
                <div><span>Капітан</span><strong>{teamText(data?.captain_name || team.captain_name || teamMemberName(captain))}</strong></div>
                <div><span>Email лідера</span><strong>{leaderEmail}</strong></div>
                <div><span>Telegram</span><strong>{telegram === 'Не вказано' ? telegram : `@${telegram.replace(/^@+/, '')}`}</strong></div>
                <div><span>Місто</span><strong>{teamText(data?.city || team.city)}</strong></div>
                <div><span>Заклад</span><strong>{teamText(data?.school || team.school)}</strong></div>
                <div><span>Статус турніру</span><strong>{teamText(team.tournament_status)}</strong></div>
              </div>

              <div className="org-team-members-head">
                <h4>Склад команди</h4>
                <span>{members.length} учасників</span>
              </div>
              {members.length > 0 ? (
                <div className="org-team-members">
                  {members.map((member, index) => {
                    const memberId = member.user_id ?? member.user?.id ?? member.id;
                    const isCaptain = captainId != null && String(memberId) === String(captainId);
                    return (
                      <div key={`${memberId || index}-${index}`} className="org-team-member">
                        <UserAvatar
                          user={teamMemberAvatarUser(member)}
                          size={34}
                          className="org-team-member-avatar"
                          showStatus={Boolean(member.presence || member.user?.status)}
                        />
                        <span className="org-team-member-body">
                          <strong>{teamMemberName(member)} {isCaptain && <b>Капітан</b>}</strong>
                          <small>{teamText(member.email || member.user?.email, 'Email не вказано')}</small>
                        </span>
                        <span className="org-team-member-status">{member.status || 'accepted'}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="org-team-empty">Склад команди ще не підтягнувся</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function TabOrganizer({ toast, user }) {
  const isAdmin = (user?.role || '').toLowerCase().split(',').map(r => r.trim()).includes('admin');
  const canEditTournament = (t) => {
    if (isAdmin) return true;
    const ownerId = t.created_by_id ?? t.created_by?.id ?? null;
    return !!user?.id && ownerId === user.id;
  };

  const [orgTab,         setOrgTab]         = useState('tournaments');
  const [tournaments,    setTournaments]    = useState([]);
  const [teams,          setTeams]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showCreate,     setShowCreate]     = useState(false);
  const [creating,       setCreating]       = useState(false);
  const [editTournament, setEditTournament] = useState(null);
  const [confirmModal,   setConfirmModal]   = useState(null);
  const [filterTour,     setFilterTour]     = useState('');
  const [search,         setSearch]         = useState('');
  const [teamSearch,     setTeamSearch]     = useState('');
  const [teamSort,       setTeamSort]       = useState('name');
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [teamDetails,    setTeamDetails]    = useState({});
  const [teamDetailLoading, setTeamDetailLoading] = useState({});

  const confirmAction = (message, onConfirm) => setConfirmModal({ message, onConfirm });

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    try { setTournaments(await getTournaments()); }
    catch { toast.error('Помилка завантаження'); }
    finally { setLoading(false); }
  }, [toast]);

  const loadTeams = useCallback(async () => {
    try { setTeams(await getAdminTeams()); } catch {}
  }, []);

  useEffect(() => { loadTournaments(); }, [loadTournaments]);
  useEffect(() => { if (orgTab === 'teams') loadTeams(); }, [orgTab, loadTeams]);

  const handleStatus = async (id, status) => {
    try { await updateTournamentStatus(id, status); toast.success('Статус оновлено'); loadTournaments(); window.location.reload(); }
    catch (err) { toast.error(err.message); }
  };

  const handleDelete = (id, name) => {
    confirmAction(`Видалити турнір "${name}"?`, async () => {
      try { await deleteTournament(id); toast.success('Видалено'); loadTournaments(); }
      catch (err) { toast.error(err.message); }
    });
  };

  const filteredTournaments = tournaments.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  const visibleTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    const filtered = teams.filter(team => {
      const tourOk = !filterTour || String(team.tournament_id) === String(filterTour);
      const queryOk = !q || [
        team.name,
        team.tournament_name,
        team.captain_name,
        team.captain_email,
        team.city,
        team.school,
        team.telegram_username,
      ].filter(Boolean).some(value => String(value).toLowerCase().includes(q));
      return tourOk && queryOk;
    });

    return [...filtered].sort((a, b) => {
      if (teamSort === 'members') return Number(b.members_count || 0) - Number(a.members_count || 0);
      if (teamSort === 'captain') return teamText(a.captain_name).localeCompare(teamText(b.captain_name), 'uk');
      if (teamSort === 'tournament') return teamText(a.tournament_name).localeCompare(teamText(b.tournament_name), 'uk');
      return teamText(a.name).localeCompare(teamText(b.name), 'uk');
    });
  }, [teams, filterTour, teamSearch, teamSort]);

  const teamTournamentOptions = useMemo(() => (
    [...new Map(teams
      .filter(t => t.tournament_id != null)
      .map(t => [t.tournament_id, t.tournament_name || 'Без назви'])
    ).entries()].map(([id, name]) => ({ value: id, label: name }))
  ), [teams]);

  const teamSortOptions = [
    { value: 'name', label: 'За назвою' },
    { value: 'tournament', label: 'За турніром' },
    { value: 'captain', label: 'За капітаном' },
    { value: 'members', label: 'За кількістю учасників' },
  ];

  const toggleTeam = async (team) => {
    const nextId = expandedTeamId === team.id ? null : team.id;
    setExpandedTeamId(nextId);
    if (!nextId || teamDetails[team.id]) return;
    setTeamDetailLoading(prev => ({ ...prev, [team.id]: true }));
    try {
      const detail = await getTeamById(team.id);
      setTeamDetails(prev => ({ ...prev, [team.id]: detail }));
    } catch {
      toast.error('Не вдалося завантажити склад команди');
    } finally {
      setTeamDetailLoading(prev => ({ ...prev, [team.id]: false }));
    }
  };

  return (
    <div className="db-tab">
      <div className="db-tab-header">
        <h1>Панель організатора</h1>
        {orgTab === 'tournaments' && !showCreate && (
          <button className="db-btn db-btn-primary" onClick={() => setShowCreate(true)}>
            + Новий турнір
          </button>
        )}
      </div>

      <div className="db-admin-tip" style={{ marginBottom: 16 }}>
        🗂️ Організатор може створювати та керувати турнірами і переглядати команди.
      </div>

      {/* Create form — full-screen overlay wizard */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => !creating && setShowCreate(false)}>
          <div className="modal-box modal-box--light db-tournament-modal" onClick={e => e.stopPropagation()}>
            <div className="db-modal-scroll-body">
              <TournamentForm
                mode="create"
                loading={creating}
                onSubmit={async (payload, files) => {
                  setCreating(true);
                  try {
                    const result = await createTournament(payload);
                    const id = result?.id ?? result;
                    if (id && files?.rules) {
                      await uploadTournamentFile(id, 'rules', files.rules).catch(() => {});
                    }
                    if (id && files?.tz?.length) {
                      for (const f of files.tz) await uploadTournamentFile(id, 'tz', f).catch(() => {});
                    }
                    setShowCreate(false);
                    await loadTournaments();
                    toast.success('Турнір створено!');
                  } catch (err) {
                    toast.error(err.message);
                  } finally {
                    setCreating(false);
                  }
                }}
                onCancel={() => setShowCreate(false)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="db-admin-tabs">
        {[['tournaments', '🏆 Турніри'], ['rounds', '🔄 Раунди'], ['teams', <><IconTeams style={{ width: 14, height: 14, verticalAlign: -2, marginRight: 5, color: '#60a5fa' }} /> Команди</>]].map(([id, lbl]) => (
          <button
            key={id}
            className={`db-admin-tab-btn${orgTab === id ? ' active' : ''}`}
            onClick={() => setOrgTab(id)}
          >
            {lbl}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="db-team-list">
          {[1, 2, 3].map(i => <div key={i} className="db-card-skeleton" style={{ height: 56 }} />)}
        </div>
      ) : (
        <>
          {/* ─── TOURNAMENTS ─── */}
          {orgTab === 'tournaments' && (
            <>
              <div className="db-organizer-toolbar">
                <input
                  className="db-input db-search-input"
                  placeholder="🔍 Пошук турнірів..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ maxWidth: 280 }}
                />
                <span className="db-organizer-count">{filteredTournaments.length} турнірів</span>
              </div>

              <div className="db-admin-table-wrap">
                <table className="db-admin-table">
                  <thead>
                    <tr>
                      <th>Назва</th>
                      <th>Статус</th>
                      <th>Команди</th>
                      <th>Реєстрація</th>
                      <th>Змінити статус</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTournaments.map(t => (
                      <tr key={t.id}>
                        <td>
                          <span style={{ marginRight: 6 }}>{t.emoji || '🏆'}</span>
                          <strong>{t.name}</strong>
                        </td>
                        <td><StatusBadge status={t.status} /></td>
                        <td>{t.teams_count || 0}{t.teams_limit ? `/${t.teams_limit}` : ''}</td>
                        <td style={{ fontSize: 13 }}>
                          {formatDate(t.registration_start)} – {formatDate(t.registration_end)}
                        </td>
                        <td>
                          {canEditTournament(t)
                            ? <StatusPicker compact value={t.status} onChange={status => handleStatus(t.id, status)} />
                            : <span style={{ fontSize: 12, color: '#aaa' }}>—</span>}
                        </td>
                        <td style={{ display: 'flex', gap: 6 }}>
                          {canEditTournament(t) ? (
                            <>
                              <button className="db-btn db-btn-ghost db-btn-sm" onClick={() => setEditTournament(t)}>
                                ✏ Редагувати
                              </button>
                              <button className="db-btn db-btn-danger db-btn-sm" onClick={() => handleDelete(t.id, t.name)}>
                                Видалити
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: 12, color: '#aaa', alignSelf: 'center' }}
                                  title={`Створив: ${t.creator_name || '—'}`}>
                              <IconLock style={{ width: 12, height: 12, verticalAlign: -1, marginRight: 4 }} /> Чужий турнір
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredTournaments.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: '32px 0', fontSize: 14 }}>
                          {search ? 'Турнірів не знайдено' : 'Ще немає турнірів'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ─── ROUNDS ─── */}
          {orgTab === 'rounds' && (
            <>
              <div className="org-round-tournament-picker">
                <label style={{ fontSize: 13, color: '#666' }}>Турнір:</label>
                <CustomSelect
                  value={filterTour}
                  onChange={setFilterTour}
                  placeholder="— Оберіть турнір —"
                  options={tournaments.filter(t => canEditTournament(t)).map(t => ({
                    value: t.id,
                    label: `${t.emoji || '🏆'} ${t.name} (${t.status})`,
                  }))}
                />
              </div>
              {filterTour ? (
                <RoundManager
                  key={filterTour}
                  tournament={tournaments.find(t => String(t.id) === String(filterTour))}
                  toast={toast}
                  onRoundsChange={() => {}}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>Оберіть турнір для управління раундами</div>
              )}
            </>
          )}

          {/* ─── TEAMS (read-only view) ─── */}
          {orgTab === 'teams' && (
            <div className="org-teams-panel">
              <div className="org-teams-view">
                <div className="org-teams-toolbar org-teams-toolbar--new">
                  <div className="org-teams-title">
                    <strong>{visibleTeams.length}</strong>
                    <span>команд у вибірці</span>
                  </div>
                  <input
                    className="db-input"
                    value={teamSearch}
                    onChange={e => setTeamSearch(e.target.value)}
                    placeholder="Пошук: команда, капітан, місто, заклад..."
                  />
                  <CustomSelect
                    value={filterTour}
                    onChange={setFilterTour}
                    placeholder="Усі турніри"
                    options={teamTournamentOptions}
                  />
                  <CustomSelect
                    value={teamSort}
                    onChange={setTeamSort}
                    options={teamSortOptions}
                  />
                </div>

                <div className="org-teams-list">
                  {visibleTeams.length === 0 ? (
                    <div className="org-team-empty">Команд за цими фільтрами немає</div>
                  ) : visibleTeams.map(team => (
                    <OrganizerTeamPanel
                      key={team.id}
                      team={team}
                      detail={teamDetails[team.id]}
                      loading={!!teamDetailLoading[team.id]}
                      expanded={expandedTeamId === team.id}
                      onToggle={() => toggleTeam(team)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {editTournament && (
        <EditTournamentModal
          tournament={editTournament}
          toast={toast}
          onClose={() => setEditTournament(null)}
          onSuccess={() => { setEditTournament(null); loadTournaments(); }}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}

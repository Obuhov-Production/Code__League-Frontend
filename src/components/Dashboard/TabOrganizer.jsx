import { useState, useCallback, useRef, useEffect } from 'react';
import {
  getTournaments,
  createTournament, updateTournament,
  updateTournamentStatus, deleteTournament,
  getAdminTeams, uploadTournamentFile,
} from '@utils/authApi';
import { StatusBadge, ConfirmModal, formatDate, TournamentForm } from './db.shared.jsx';
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
            onSubmit={async (payload, files) => {
              setSaving(true);
              try {
                await updateTournament(tournament.id, payload);
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
    try { await updateTournamentStatus(id, status); toast.success('Статус оновлено'); loadTournaments(); }
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
        {[['tournaments', '🏆 Турніри'], ['teams', <><IconTeams style={{ width: 14, height: 14, verticalAlign: -2, marginRight: 5, color: '#60a5fa' }} /> Команди</>]].map(([id, lbl]) => (
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

          {/* ─── TEAMS (read-only view) ─── */}
          {orgTab === 'teams' && (
            <div className="db-admin-table-wrap">
              <div style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                <label style={{ fontSize: 13, color: '#666' }}>Турнір:</label>
                <select
                  className="db-select db-select-sm"
                  value={filterTour}
                  onChange={e => setFilterTour(e.target.value)}
                >
                  <option value="">— Усі —</option>
                  {[...new Map(teams.map(t => [t.tournament_id, t.tournament_name])).entries()].map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
              <table className="db-admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Команда</th>
                    <th>Турнір</th>
                    <th>Капітан</th>
                    <th>Учасників</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {teams
                    .filter(t => !filterTour || String(t.tournament_id) === String(filterTour))
                    .map(t => (
                      <tr key={t.id}>
                        <td style={{ color: '#bbb', fontSize: 12 }}>{t.id}</td>
                        <td><strong>{t.name}</strong></td>
                        <td style={{ fontSize: 13 }}>{t.tournament_name}</td>
                        <td style={{ fontSize: 13, color: '#666' }}>{t.captain_name}</td>
                        <td>{t.members_count}</td>
                        <td><StatusBadge status={t.tournament_status} /></td>
                      </tr>
                    ))}
                </tbody>
              </table>
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

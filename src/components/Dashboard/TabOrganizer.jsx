import { useState, useCallback, useRef, useEffect } from 'react';
import {
  getTournaments,
  createTournament, updateTournament,
  updateTournamentStatus, deleteTournament,
  getAdminTeams,
} from '@utils/authApi';
import { StatusBadge, CustomSelect, ConfirmModal, formatDate, TournamentForm, TOURNAMENT_EMOJIS } from './db.shared.jsx';

/* ── Options ───────────────────────────────────────── */
const CATEGORY_OPTIONS = [
  { value: 'hackathon', label: '⚡ Хакатон' },
  { value: 'olympiad',  label: '🎓 Олімпіада' },
  { value: 'marathon',  label: '🏃 Марафон' },
  { value: 'sprint',    label: '⏱ Спринт' },
  { value: 'challenge', label: '🎯 Челендж' },
  { value: 'other',     label: '📦 Інше' },
];

const FORMAT_OPTIONS = [
  { value: 'online',  label: '🌐 Онлайн' },
  { value: 'offline', label: '📍 Офлайн' },
  { value: 'hybrid',  label: '🔀 Гібрид' },
];

const TOUR_STATUS_OPTS = [
  { value: 'draft',        label: 'Draft',        color: '#888' },
  { value: 'registration', label: 'Registration', color: '#7c5ff5' },
  { value: 'running',      label: 'Running',      color: '#16a34a' },
  { value: 'finished',     label: 'Finished',     color: '#0ea5e9' },
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
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--light db-tournament-modal" onClick={e => e.stopPropagation()}>
        <button className="db-tm-close" onClick={onClose}>✕</button>
        <div className="db-modal-scroll-body">
          <TournamentForm
            mode="edit"
            tournament={tournament}
            onSubmit={async (payload) => {
              await updateTournament(tournament.id, payload);
              toast.success('Турнір оновлено!');
              onSuccess();
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Create Tournament Form ────────────────────────── */
function CreateTournamentForm({ toast, onSuccess, onCancel }) {
  const today = new Date().toISOString().split('T')[0];
  const [f, setF] = useState({
    name: '', description: '', rules: '', prize: '',
    category: 'hackathon', format: 'online', status: 'draft',
    start_date: today, end_date: '',
    registration_start: today, registration_end: '',
    teams_limit: '', rounds_count: 1, min_team_size: 2, max_team_size: 5,
    emoji: '🏆',
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
        emoji: f.emoji || '🏆',
      });
      onSuccess();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form className="db-create-form" onSubmit={handleSubmit}>
      {/* Header with emoji picker */}
      <div className="db-create-form-header">
        <div className="db-create-form-icon" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => setShowEmojiPicker(v => !v)}>
          {f.emoji}
          <span style={{ position: 'absolute', bottom: -2, right: -2, fontSize: 10 }}>✏️</span>
        </div>
        <div>
          <h3>Новий турнір</h3>
          <p>Заповніть інформацію для створення турніру</p>
        </div>
      </div>

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div className="db-cfs-section">
          <div className="db-cfs-title"><span className="db-cfs-icon">🎨</span> Оберіть іконку турніру</div>
          <div className="db-emoji-grid">
            {TOURNAMENT_EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                className={`db-emoji-item${f.emoji === e ? ' active' : ''}`}
                onClick={() => { upd('emoji', e); setShowEmojiPicker(false); }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

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

/* ══════════════════════════════════════════════════
   TabOrganizer — Панель організатора
   Доступ: create/edit/delete tournaments, view teams & results.
   Без управління користувачами та чатом (лише для Admin).
══════════════════════════════════════════════════ */
export default function TabOrganizer({ toast }) {
  const [orgTab,       setOrgTab]       = useState('tournaments');
  const [tournaments,  setTournaments]  = useState([]);
  const [teams,        setTeams]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showCreate,   setShowCreate]   = useState(false);
  const [editTournament, setEditTournament] = useState(null);
  const [confirmModal,   setConfirmModal]   = useState(null);
  const [filterTour,     setFilterTour]     = useState('');

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

  return (
    <div className="db-tab">
      <div className="db-tab-header">
        <h1>Панель організатора</h1>
        {orgTab === 'tournaments' && (
          <button className="db-btn db-btn-primary" onClick={() => setShowCreate(p => !p)}>
            {showCreate ? '✕ Скасувати' : '+ Новий турнір'}
          </button>
        )}
      </div>

      {/* Access scope notice */}
      <div className="db-admin-tip" style={{ marginBottom: 16 }}>
        🗂️ Організатор може створювати та керувати турнірами і переглядати команди. Управління користувачами та чатом доступне лише Адміністратору.
      </div>

      <div className="db-admin-tabs">
        {[['tournaments', '🏆 Турніри'], ['teams', '👫 Команди']].map(([id, lbl]) => (
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
              {showCreate && (
                <CreateTournamentForm
                  toast={toast}
                  onSuccess={() => { setShowCreate(false); loadTournaments(); toast.success('Турнір створено!'); }}
                  onCancel={() => setShowCreate(false)}
                />
              )}
              <div className="db-admin-table-wrap">
                <table className="db-admin-table">
                  <thead>
                    <tr>
                      <th>Назва</th>
                      <th>Статус</th>
                      <th>Команд</th>
                      <th>Реєстрація</th>
                      <th>Змінити статус</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournaments.map(t => (
                      <tr key={t.id}>
                        <td><strong>{t.name}</strong></td>
                        <td><StatusBadge status={t.status} /></td>
                        <td>{t.teams_count || 0}{t.teams_limit ? `/${t.teams_limit}` : ''}</td>
                        <td style={{ fontSize: 13 }}>
                          {formatDate(t.registration_start)} – {formatDate(t.registration_end)}
                        </td>
                        <td>
                          <StatusPicker compact value={t.status} onChange={status => handleStatus(t.id, status)} />
                        </td>
                        <td style={{ display: 'flex', gap: 6 }}>
                          <button className="db-btn db-btn-ghost db-btn-sm" onClick={() => setEditTournament(t)}>
                            ✏ Редагувати
                          </button>
                          <button className="db-btn db-btn-danger db-btn-sm" onClick={() => handleDelete(t.id, t.name)}>
                            Видалити
                          </button>
                        </td>
                      </tr>
                    ))}
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
          onSuccess={() => { setEditTournament(null); loadTournaments(); toast.success('Турнір оновлено!'); }}
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

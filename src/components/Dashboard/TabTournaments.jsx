import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import IconTournaments from '@images/dashboard_components/icon_tournaments.svg?react';
import IconSearch      from '@images/dashboard_components/icon_search.svg?react';
import logoImg         from '@images/logos/logo.png';

import { getTournaments, getMyTeams, registerTeam, updateTeam, searchUsers, updateTournament } from '@utils/authApi';
import { StatusBadge, ACCENT, formatDate, daysLeft, resolveAvatarUrl, hasRole } from './db.shared.jsx';

function TeamRegForm({ tournament, toast, onSuccess, onCancel, user }) {
  const min = tournament.min_team_size || 2;
  const max = tournament.max_team_size || 5;
  const [teamName, setTeamName] = useState('');
  const [city,     setCity]     = useState('');
  const [school,   setSchool]   = useState('');
  const [telegram, setTelegram] = useState('');

  const selfSlot = user ? {
    full_name: '', email: user.email || '',
    onPlatform: true, platformQuery: '', platformUser: null, searching: false,
    linkedUser: { username: user.username, email: user.email || '', userId: user.id },
    isSelf: true,
  } : { full_name: '', email: '', onPlatform: false, platformQuery: '', platformUser: null, searching: false, linkedUser: null };

  const [members, setMembers] = useState(() => {
    const rest = Array.from({ length: Math.max(0, min - 1) }, () => ({
      full_name: '', email: '', onPlatform: false, platformQuery: '', platformUser: null, platformResults: [], searching: false, linkedUser: null,
    }));
    return [selfSlot, ...rest];
  });
  const [loading, setLoading] = useState(false);

  const updateMember = (i, patch) =>
    setMembers(m => m.map((x, idx) => idx === i ? { ...x, ...patch } : x));

  const searchTimers = useRef({});
  const handlePlatformSearch = (i, q) => {
    updateMember(i, { platformQuery: q, platformResults: [], platformUser: null });
    clearTimeout(searchTimers.current[i]);
    if (q.trim().length < 2) { updateMember(i, { platformResults: [] }); return; }
    searchTimers.current[i] = setTimeout(async () => {
      updateMember(i, { searching: true });
      try {
        const results = await searchUsers(q.trim());
        updateMember(i, { searching: false, platformResults: results || [] });
      } catch { updateMember(i, { searching: false, platformResults: [] }); }
    }, 400);
  };

  const addPlatformUser = (i, selectedUser) => {
    if (!selectedUser) return;
    updateMember(i, {
      linkedUser: { username: selectedUser.username, email: selectedUser.email || '', userId: selectedUser.id, missingEmail: !selectedUser.email, avatarUrl: selectedUser.user_avatar_url || null },
      platformUser: null, platformResults: [], platformQuery: '', onPlatform: true,
    });
  };

  const unlinkPlatformUser = (i) => {
    updateMember(i, { linkedUser: null, full_name: '', email: '' });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!teamName.trim()) { toast.error('Введіть назву команди'); return; }
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (m.linkedUser && m.linkedUser.missingEmail && !m.linkedUser.email?.trim()) {
        toast.error(`Учасник ${i + 1}: вкажіть email`); return;
      }
    }
    setLoading(true);
    const cleanMembers = members.map(m => ({
      full_name: m.linkedUser ? (m.linkedUser.full_name?.trim() || m.linkedUser.username) : m.full_name,
      email:     m.linkedUser ? m.linkedUser.email : m.email,
    }));
    try { 
      const newTeam = await registerTeam({ name: teamName.trim(), tournament_id: tournament.id, city, school, telegram_username: telegram }); 
      if (cleanMembers && cleanMembers.length > 0) {
        await updateTeam(newTeam.id, { members: cleanMembers });
      }
      onSuccess(); 
    }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form className="db-reg-form" onSubmit={handleSubmit}>
      <div className="db-reg-card">
        <h5 className="db-reg-card-title">🏷️ Команда</h5>
        <div className="db-form-row"><label>Назва команди <span className="db-required">*</span></label><input className="db-input" value={teamName} onChange={e => setTeamName(e.target.value)} required placeholder="e.g. Code Ninjas" /></div>
      </div>
      <div className="db-reg-card">
        <h5 className="db-reg-card-title">👤 Деталі лідера</h5>
        <div className="db-form-row-2">
          <div className="db-form-row"><label>Місто</label><input className="db-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Київ" /></div>
          <div className="db-form-row"><label>Навчальний заклад</label><input className="db-input" value={school} onChange={e => setSchool(e.target.value)} placeholder="ОМФК..." /></div>
        </div>
        <div className="db-form-row"><label>Telegram</label><input className="db-input" value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="@username" /></div>
      </div>
      <div className="db-reg-card">
        <div className="db-members-header">
          <h5 className="db-reg-card-title">👥 Учасники ({members.length}/{max})</h5>
          {members.length < max && <button type="button" className="db-btn db-btn-ghost db-btn-sm" onClick={() => setMembers(m => [...m, { full_name:'', email:'', onPlatform:false, platformQuery:'', platformUser:null, platformResults:[], searching:false, linkedUser: null }])}>+ Додати</button>}
        </div>
        {members.map((m, i) => (
          <div key={i} className="db-member-wrap">
            {m.linkedUser ? (
              <>
                <div className="db-member-linked-card">
                  <span className="db-member-num">{i + 1}</span>
                  <div className="db-member-linked-avatar">
                    {m.linkedUser.avatarUrl
                      ? <img src={resolveAvatarUrl(m.linkedUser.avatarUrl)} alt="" onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling.style.removeProperty('display'); }} />
                      : null}
                    <span style={m.linkedUser.avatarUrl ? { display: 'none' } : undefined}>{m.linkedUser.username.slice(0,2).toUpperCase()}</span>
                  </div>
                  <div className="db-member-linked-info">
                    <span className="db-member-linked-name">{m.linkedUser.username}</span>
                    {m.linkedUser.email && !m.linkedUser.missingEmail && (
                      <span className="db-member-linked-email">{m.linkedUser.email}</span>
                    )}
                    {m.linkedUser.missingEmail && (
                      <span className="db-member-linked-email" style={{ color: '#e57373' }}>⚠ email не вказано</span>
                    )}
                  </div>
                  <span className="db-member-linked-badge">{m.isSelf ? 'Це ви' : 'На платформі'}</span>
                  {!m.isSelf && (
                    <button type="button" className="db-member-remove" onClick={() => unlinkPlatformUser(i)}>✕</button>
                  )}
                </div>
                {m.linkedUser.missingEmail && (
                  <div className="db-member-extra-fields">
                    <input className="db-input db-input-sm"
                      placeholder="Ініціали / ПІБ (необов'язково)"
                      value={m.linkedUser.full_name || ''}
                      onChange={e => updateMember(i, { linkedUser: { ...m.linkedUser, full_name: e.target.value } })} />
                    <input className="db-input db-input-sm" type="email" required
                      placeholder="Email *"
                      value={m.linkedUser.email || ''}
                      onChange={e => updateMember(i, { linkedUser: { ...m.linkedUser, email: e.target.value } })} />
                  </div>
                )}
                {m.isSelf && !m.linkedUser.email && (
                  <div className="db-member-extra-fields">
                    <input className="db-input db-input-sm" type="email" required
                      placeholder="Ваш Email *"
                      value={m.linkedUser.email || ''}
                      onChange={e => updateMember(i, { linkedUser: { ...m.linkedUser, email: e.target.value } })} />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="db-member-row">
                  <span className="db-member-num">{i + 1}</span>
                  <input className="db-input" value={m.full_name} onChange={e => updateMember(i, { full_name: e.target.value })} placeholder="ПІБ" required />
                  <input className="db-input" type="email" value={m.email} onChange={e => updateMember(i, { email: e.target.value })} placeholder="Email" required />
                  {members.length > min && <button type="button" className="db-member-remove" onClick={() => setMembers(ms => ms.filter((_,idx) => idx !== i))}>✕</button>}
                </div>
                <label className="db-member-platform-check">
                  <input type="checkbox" checked={m.onPlatform} onChange={e => updateMember(i, { onPlatform: e.target.checked, platformQuery: '', platformUser: null })} />
                  <span>Зареєстрований на платформі</span>
                </label>
                {m.onPlatform && (
                  <div className="db-member-platform-search">
                    <div className="db-platform-search-wrap">
                      <input className="db-input" placeholder="Пошук за нікнеймом або email..." value={m.platformQuery}
                        onChange={e => handlePlatformSearch(i, e.target.value)} />
                      {m.searching && <span className="db-platform-searching">Пошук...</span>}
                    </div>
                    {(m.platformResults?.length > 0) && (
                      <div className="db-platform-results-dropdown">
                        {m.platformResults.map((u, ui) => (
                          <div key={u.id || ui} className="db-platform-result-item" onClick={() => addPlatformUser(i, u)}>
                            <div className="db-member-found-avatar">
                              {u.user_avatar_url
                                ? <img src={resolveAvatarUrl(u.user_avatar_url)} alt="" onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling.style.removeProperty('display'); }} />
                                : null}
                              <span style={u.user_avatar_url ? { display: 'none' } : undefined}>{u.username.slice(0,2).toUpperCase()}</span>
                            </div>
                            <div className="db-platform-result-info">
                              <span className="db-member-found-name">{u.username}</span>
                              <span className="db-member-found-sub">{u.email || 'email не вказано'}</span>
                            </div>
                            <span className="db-member-found-add">+ Додати</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {m.platformResults?.length === 0 && !m.searching && m.platformQuery.length >= 2 && (
                      <span className="db-search-hint">Користувача не знайдено</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <div className="db-form-actions-stack">
        <button type="submit" className="db-btn db-btn-primary db-btn-submit" disabled={loading}>{loading ? 'Збереження...' : 'Зареєструвати команду →'}</button>
        <button type="button" className="db-btn-cancel-link" onClick={onCancel}>Скасувати</button>
      </div>
    </form>
  );
}

/* ── helpers ────────────────────────── */
function toDateInput(d) { if (!d) return ''; try { return new Date(d).toISOString().slice(0, 10); } catch { return ''; } }

function TournamentEditForm({ tournament: t, toast, onSaved, onCancel }) {
  const [name, setName]               = useState(t.name || '');
  const [description, setDescription] = useState(t.description || '');
  const [rules, setRules]             = useState(t.rules || '');
  const [startDate, setStartDate]     = useState(toDateInput(t.start_date));
  const [endDate, setEndDate]         = useState(toDateInput(t.end_date));
  const [regStart, setRegStart]       = useState(toDateInput(t.registration_start));
  const [regEnd, setRegEnd]           = useState(toDateInput(t.registration_end));
  const [teamsLimit, setTeamsLimit]    = useState(t.teams_limit ?? '');
  const [minSize, setMinSize]         = useState(t.min_team_size ?? 2);
  const [maxSize, setMaxSize]         = useState(t.max_team_size ?? 5);
  const [roundsCount, setRoundsCount] = useState(t.rounds_count ?? 1);
  const [saving, setSaving]           = useState(false);

  const handleSave = async e => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Назва не може бути порожньою'); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        rules: rules.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        registration_start: regStart || null,
        registration_end: regEnd || null,
        teams_limit: teamsLimit === '' ? null : Number(teamsLimit),
        min_team_size: Number(minSize),
        max_team_size: Number(maxSize),
        rounds_count: Number(roundsCount),
      };
      await updateTournament(t.id, payload);
      toast.success('Турнір оновлено!');
      onSaved();
    } catch (err) { toast.error(err.message || 'Помилка збереження'); }
    finally { setSaving(false); }
  };

  return (
    <form className="db-edit-tournament-form" onSubmit={handleSave}>
      <div className="db-edit-header">
        <h3 className="db-edit-title">{t.name}</h3>
        <span className="db-edit-id">id #{t.id}</span>
      </div>

      <div className="db-edit-field">
        <label className="db-edit-label">Назва <span className="db-required">*</span></label>
        <input className="db-input" value={name} onChange={e => setName(e.target.value)} required />
      </div>

      <div className="db-edit-field">
        <label className="db-edit-label">Опис</label>
        <textarea className="db-input db-textarea" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Опис турніру..." />
      </div>

      <div className="db-edit-field">
        <label className="db-edit-label">Правила</label>
        <textarea className="db-input db-textarea" rows={3} value={rules} onChange={e => setRules(e.target.value)} placeholder="Правила турніру..." />
      </div>

      <div className="db-edit-row-2">
        <div className="db-edit-field">
          <label className="db-edit-label">Старт</label>
          <input type="date" className="db-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="db-edit-field">
          <label className="db-edit-label">Кінець</label>
          <input type="date" className="db-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="db-edit-row-2">
        <div className="db-edit-field">
          <label className="db-edit-label">Реєстрація від</label>
          <input type="date" className="db-input" value={regStart} onChange={e => setRegStart(e.target.value)} />
        </div>
        <div className="db-edit-field">
          <label className="db-edit-label">Реєстрація до</label>
          <input type="date" className="db-input" value={regEnd} onChange={e => setRegEnd(e.target.value)} />
        </div>
      </div>

      <div className="db-edit-row-3">
        <div className="db-edit-field">
          <label className="db-edit-label">Макс. команд</label>
          <input type="number" className="db-input" min={0} value={teamsLimit} onChange={e => setTeamsLimit(e.target.value)} placeholder="—" />
        </div>
        <div className="db-edit-field">
          <label className="db-edit-label">Мін. осіб</label>
          <input type="number" className="db-input" min={1} value={minSize} onChange={e => setMinSize(e.target.value)} />
        </div>
        <div className="db-edit-field">
          <label className="db-edit-label">Макс. осіб</label>
          <input type="number" className="db-input" min={1} value={maxSize} onChange={e => setMaxSize(e.target.value)} />
        </div>
      </div>

      <div className="db-edit-field">
        <label className="db-edit-label">Кількість раундів</label>
        <input type="number" className="db-input" min={1} value={roundsCount} onChange={e => setRoundsCount(e.target.value)} />
      </div>

      <div className="db-edit-actions">
        <button type="button" className="db-btn db-btn-ghost" onClick={onCancel}>Скасувати</button>
        <button type="submit" className="db-btn db-btn-primary db-btn-submit" disabled={saving}>
          {saving ? 'Збереження...' : '💾 Зберегти'}
        </button>
      </div>
    </form>
  );
}

function TournamentModal({ tournament: t, user, toast, initReg, isRegistered, onClose, onRegistered }) {
  const [showReg, setShowReg] = useState(initReg && !isRegistered);
  const [showEdit, setShowEdit] = useState(false);
  const canEdit = user && (hasRole(user, 'admin') || hasRole(user, 'organizer'));
  useEffect(() => {
    const fn = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  if (showEdit && canEdit) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box modal-box--light db-tournament-modal" onClick={e => e.stopPropagation()}>
          <button className="db-tm-close" onClick={onClose}>✕</button>
          <div className="db-modal-scroll-body">
            <TournamentEditForm tournament={t} toast={toast}
              onSaved={() => { onRegistered(); onClose(); }}
              onCancel={() => setShowEdit(false)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--light db-tournament-modal" onClick={e => e.stopPropagation()}>
        <button className="db-tm-close" onClick={onClose}>✕</button>
        <div className="db-modal-scroll-body">
          <div className="db-tm-hero">
            <div className="db-tm-logo-wrap">
              <img src={logoImg} alt="Logo" className="db-tm-logo" />
            </div>
            <h2 className="db-tm-title">{t.name}</h2>
            <p className="db-tm-desc">Заповніть дані нижче, щоб зареєструвати команду на турнір</p>
            <div className="db-tm-subtitle-row">
              <StatusBadge status={t.status} />
              {t.rounds_count > 0 && <span className="db-tm-rounds">{t.rounds_count} раундів</span>}
              <span className="db-tm-size">{t.min_team_size}–{t.max_team_size} осіб</span>
            </div>
          </div>

          <div className="db-tm-dates-strip">
            <div className="db-tm-date-block">
              <span className="db-tm-date-label">Дедлайн</span>
              <span className="db-tm-date-value">{formatDate(t.start_date)} - {formatDate(t.end_date)}</span>
            </div>
            <div className="db-tm-date-divider" />
            <div className="db-tm-date-block">
              <span className="db-tm-date-label">Час на реєстрацію</span>
              <span className="db-tm-date-value">{formatDate(t.registration_start)} - {formatDate(t.registration_end)}</span>
            </div>
            <div className="db-tm-date-divider" />
            <div className="db-tm-date-block">
              <span className="db-tm-date-label">Команди</span>
              <span className="db-tm-date-value">{t.teams_count || 0}{t.teams_limit ? ` / ${t.teams_limit}` : ' (без ліміту)'}</span>
            </div>
          </div>

          {t.description && (
            <div className="db-modal-section db-modal-section--card">
              <h4>Опис</h4>
              <p>{t.description}</p>
            </div>
          )}
          {t.rules && (
            <div className="db-modal-section db-modal-section--card">
              <h4>Правила</h4>
              <p>{t.rules}</p>
            </div>
          )}

          {canEdit && (
            <button className="db-btn db-btn-ghost db-btn-edit-tournament" onClick={() => { setShowEdit(true); setShowReg(false); }}>
              ✏️ Редагувати турнір
            </button>
          )}

          {t.status === 'registration' && !showReg && (
            isRegistered
              ? <div className="db-already-registered">✅ Ви вже зареєструвались на цей турнір</div>
              : <button className="db-btn db-btn-primary db-btn-full" onClick={() => setShowReg(true)}>Зареєструвати команду →</button>
          )}
          {showReg && (
            <TeamRegForm tournament={t} toast={toast} user={user}
              onSuccess={() => { onRegistered(); onClose(); toast.success('Команду зареєстровано!'); }}
              onCancel={() => setShowReg(false)} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function TabTournaments({ user, toast }) {
  const [tournaments, setTournaments] = useState([]);
  const [myTeams,     setMyTeams]     = useState([]);
  const [filter,      setFilter]      = useState('all');
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(null);
  const [openReg,     setOpenReg]     = useState(false);

  const registeredIds = useMemo(() => new Set(myTeams.map(t => t.tournament_id)), [myTeams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, m] = await Promise.all([getTournaments(filter === 'all' ? null : filter), getMyTeams()]);
      setTournaments(t);
      setMyTeams(m);
    }
    catch { toast.error('Не вдалось завантажити турніри'); }
    finally { setLoading(false); }
  }, [filter, toast]);
  useEffect(() => { load(); }, [load]);

  const canSeeDraft = user && (hasRole(user, 'admin') || hasRole(user, 'organizer'));

  const filtered = useMemo(() => {
    let list = tournaments;
    if (!canSeeDraft) list = list.filter(t => t.status !== 'draft');
    if (search.trim()) list = list.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [tournaments, search, canSeeDraft]);

  const FILTERS = [
    { id: 'all', label: 'Всі' }, { id: 'registration', label: 'Реєстрація' },
    { id: 'running', label: 'Активні' }, { id: 'finished', label: 'Завершені' },
    ...(canSeeDraft ? [{ id: 'draft', label: 'Чернетки' }] : []),
  ];

  return (
    <div className="db-tab">
      <div className="db-tab-header">
        <div className="db-search-bar">
          <span className="db-search-icon"><IconSearch /></span>
          <input type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Пошук турніру..." className="db-search-input" />
        </div>
        <div className="db-filter-bar">
          {FILTERS.map(f => (
            <button key={f.id} className={`db-filter-btn${filter === f.id ? ' active' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="db-tournament-grid">
          {[1,2,3].map(i => <div key={i} className="db-card-skeleton" style={{ height: 220 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="db-empty"><IconTournaments /><p>{search ? 'Нічого не знайдено' : 'Турнірів не знайдено'}</p></div>
      ) : (
        <div className="db-tournament-grid">
          {filtered.map(t => {
            const [ac] = ACCENT[t.status] || ['#888'];
            const regFill = t.teams_limit ? Math.min(100, Math.round(((t.teams_count || 0) / t.teams_limit) * 100)) : 0;
            const dl = daysLeft(t.registration_end);
            return (
              <div key={t.id} className="db-tournament-card" onClick={() => { setSelected(t); setOpenReg(false); }}>
                <div className="db-tc-accent" style={{ background: ac }} />
                <div className="db-tc-body">
                  <div className="db-tournament-card-top"><h3>{t.name}</h3><StatusBadge status={t.status} /></div>
                  <p className="db-tournament-desc">{t.description || 'Опис відсутній'}</p>
                  <div className="db-tournament-meta"><span>📅 {formatDate(t.start_date)} — {formatDate(t.end_date)}</span></div>
                  {t.teams_limit > 0 && (
                    <div className="db-progress-wrap">
                      <div className="db-progress-labels"><span>{t.teams_count || 0}/{t.teams_limit} команд</span><span>{regFill}%</span></div>
                      <div className="db-progress-bar"><div className="db-progress-fill" style={{ width:`${regFill}%`, background: ac }} /></div>
                    </div>
                  )}
                  <div className="db-tournament-footer">
                    {t.status === 'registration' && dl !== null && (
                      <span className={`db-deadline${dl <= 3 ? ' urgent' : ''}`}>
                        {dl > 0 ? `⏳ ${dl} дн.` : '🔴 Закрита'}
                      </span>
                    )}
                    {t.status === 'registration' && (
                      registeredIds.has(t.id)
                        ? <span className="db-badge-registered">✓ Зареєстровано</span>
                        : <button className="db-btn db-btn-primary db-btn-sm"
                            onClick={e => { e.stopPropagation(); setSelected(t); setOpenReg(true); }}>
                            Зареєструватись
                          </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {selected && (
        <TournamentModal tournament={selected} user={user} toast={toast} initReg={openReg}
          isRegistered={registeredIds.has(selected.id)}
          onClose={() => { setSelected(null); setOpenReg(false); }} onRegistered={load} />
      )}
    </div>
  );
}

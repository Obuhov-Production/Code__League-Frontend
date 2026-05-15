import { useState, useEffect, useCallback, useRef } from "react";

import IconTeams       from "@images/dashboard_components/icon_teams.svg?react";
import IconPensil      from "@images/dashboard_components/pensil.svg?react";
import IconChatBubble  from "@images/dashboard_components/chat.svg?react";
import IconAdd         from "@images/dashboard_components/add.svg?react";
import IconRemove      from "@images/dashboard_components/remove.svg?react";
import IconTime        from "@images/dashboard_components/time.svg?react";
import IconUserSvg     from "@images/dashboard_components/icon_user.svg?react";
import IconSave        from "@images/dashboard_components/save.svg?react";
import IconGithub      from "@images/dashboard_components/icon_github.svg?react";
import IconSend        from "@images/dashboard_components/send.svg?react";

import { getMyTeams, getTeamById, updateTeam, searchUsers, getTournamentRounds, getTeamSubmissions, createSubmission, updateSubmission, API_BASE } from "@utils/authApi";
import { StatusBadge, UserAvatar, pickCurrentRound, getSocket, CustomSelect } from "./db.shared.jsx";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#AC9EF8,#7c5ff5)",
  "linear-gradient(135deg,#f8a4c8,#e05fa0)",
  "linear-gradient(135deg,#a4d4f8,#3a9de0)",
  "linear-gradient(135deg,#a4f8c4,#2dba6e)",
  "linear-gradient(135deg,#f8d4a4,#e08a20)",
];

function TeamStat({ label, value, accent }) {
  return (
    <div className="db-team-stat">
      <span className="db-team-stat-value" style={accent ? { color: accent } : {}}>{value}</span>
      <span className="db-team-stat-label">{label}</span>
    </div>
  );
}

function deadlineInfo(dateStr) {
  if (!dateStr) return null;
  const now = Date.now();
  const deadline = new Date(dateStr).getTime();
  const diff = deadline - now;
  const isPast = diff < 0;
  const absDiff = Math.abs(diff);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);

  let text;
  if (isPast) {
    text = days > 0 ? `${days}д тому` : hours > 0 ? `${hours}г тому` : 'щойно';
  } else {
    text = days > 0 ? `${days}д` : hours > 0 ? `${hours}г` : `${Math.floor(absDiff / 60000)}хв`;
  }

  return { isPast, text, diff, date: new Date(dateStr) };
}

function DeadlineBadge({ label, dateStr }) {
  const info = deadlineInfo(dateStr);
  if (!info) return null;
  return (
    <div className={`db-deadline-badge${info.isPast ? ' past' : info.diff < 86400000 ? ' urgent' : ''}`}>
      <span className="db-deadline-icon">⏱</span>
      <span className="db-deadline-label">{label}</span>
      <span className="db-deadline-value">
        {info.isPast ? 'Завершено' : `ще ${info.text}`}
      </span>
      <span className="db-deadline-date">
        {info.date.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

function SubmitWorkPanel({ team, toast, onClose, onSaved }) {
  const [repoUrl,    setRepoUrl]    = useState('');
  const [branches,   setBranches]   = useState([]);
  const [branch,     setBranch]     = useState('');
  const [loadingB,   setLoadingB]   = useState(false);
  const [videoUrl,   setVideoUrl]   = useState('');
  const [demoUrl,    setDemoUrl]    = useState('');
  const [desc,       setDesc]       = useState('');
  const [rounds,     setRounds]     = useState([]);
  const [roundId,    setRoundId]    = useState('');
  const [existing,   setExisting]   = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [deadline,   setDeadline]   = useState(null);
  const lastFetchedPath = useRef('');

  useEffect(() => {
    getTournamentRounds(team.tournament_id).then(r => {
      const list = Array.isArray(r) ? r : [];
      setRounds(list);
      const best = pickCurrentRound(list);
      if (best) {
        setRoundId(String(best.id));
        setDeadline(best.end_date || null);
      }
    }).catch(() => {});

    getTeamSubmissions(team.id).then(subs => {
      if (subs && subs.length) {
        const s = subs[0];
        setExisting(s);
        setRepoUrl(s.github_repo_url || '');
        setBranch(s.github_branch || 'main');
        setVideoUrl(s.pitch_video_url || '');
        setDemoUrl(s.live_demo_url || '');
        setDesc(s.description || '');
        if (s.round_id) setRoundId(String(s.round_id));
      }
    }).catch(() => {});
  }, [team.id, team.tournament_id]);

  const deadlineStatus = deadline ? deadlineInfo(deadline) : null;
  const isDeadlinePast = deadlineStatus?.isPast ?? false;

  const now = Date.now();
  const subStart = team.tournament_submission_start ? new Date(team.tournament_submission_start).getTime() : null;
  const subEnd   = team.tournament_submission_end   ? new Date(team.tournament_submission_end).getTime()   : null;
  const inSubmissionWindow = subStart && subEnd
    ? (now >= subStart && now <= subEnd)
    : team.tournament_status === 'running';
  const isSubmissionBlocked = !inSubmissionWindow;
  const blockReason = subStart && subEnd
    ? (now < subStart
      ? `Здача відкриється ${new Date(subStart).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
      : now > subEnd
      ? 'Період здачі завершено'
      : '')
    : (team.tournament_status === 'registration' ? 'Здача відкриється після старту турніру'
    : team.tournament_status === 'finished' ? 'Турнір завершено'
    : '');

  const parseRepoPath = (url) => {
    try {
      const m = url.match(/github\.com\/([^/]+\/[^/]+)/);
      return m ? m[1].replace(/\.git$/, '') : null;
    } catch { return null; }
  };

  const fetchBranches = async () => {
    const path = parseRepoPath(repoUrl);
    if (!path) { toast.error('Невірний формат URL GitHub репозиторію'); return; }
    if (lastFetchedPath.current === path && branches.length > 0) return;
    setLoadingB(true);
    setBranches([]);
    try {
      const res = await fetch(`https://api.github.com/repos/${path}/branches`);
      if (!res.ok) throw new Error('Репозиторій не знайдено або він приватний');
      const data = await res.json();
      setBranches(data.map(b => b.name));
      if (!branch && data.length) setBranch(data[0].name);
      lastFetchedPath.current = path;
      toast.success(`Знайдено ${data.length} гілок`);
    } catch (e) { toast.error(e.message); }
    finally { setLoadingB(false); }
  };

  useEffect(() => {
    const path = parseRepoPath(repoUrl);
    if (!path) {
      setBranches([]);
      lastFetchedPath.current = '';
      return;
    }
    const timer = setTimeout(() => {
      if (path !== lastFetchedPath.current) fetchBranches();
    }, 500);
    return () => clearTimeout(timer);
  }, [repoUrl]);

  const handleSubmit = async e => {
    e.preventDefault();
    // Auto-select best round if none selected
    let finalRoundId = roundId;
    if (!finalRoundId && rounds.length > 0) {
      const best = pickCurrentRound(rounds);
      if (best) finalRoundId = String(best.id);
    }
    if (isSubmissionBlocked) { toast.error(blockReason || 'Здача наразі недоступна'); return; }
    if (isDeadlinePast) { toast.error('Дедлайн здачі роботи минув'); return; }
    if (!repoUrl.trim()) { toast.error('Вкажіть URL репозиторію'); return; }
    if (!branch.trim())  { toast.error('Оберіть гілку'); return; }
    if (!finalRoundId)   { toast.error('Не знайдено жодного раунду'); return; }
    setSaving(true);
    const payload = {
      github_repo_url: repoUrl.trim(),
      github_branch: branch.trim(),
      pitch_video_url: videoUrl.trim() || null,
      live_demo_url: demoUrl.trim() || null,
      description: desc.trim() || null,
    };
    try {
      if (existing) {
        await updateSubmission(existing.id, payload);
        toast.success('Роботу оновлено!');
      } else {
        await createSubmission(Number(finalRoundId), { ...payload, team_id: team.id });
        toast.success('Роботу подано!');
      }
      onSaved?.();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="db-team-submit-panel">
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>
          {existing ? <><IconPensil style={{ width: 16, height: 16, verticalAlign: -3, marginRight: 6 }} /> Оновити роботу</> : <><IconSend style={{ width: 16, height: 16, verticalAlign: -3, marginRight: 6 }} /> Подати роботу</>}
        </h2>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#aaa' }}>{team.name} · {team.tournament_name}</p>

        {isSubmissionBlocked ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#888' }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>�</p>
            <p>{blockReason || 'Здача наразі недоступна'}</p>
          </div>
        ) : isDeadlinePast ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#888' }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>🔒</p>
            <p>Термін здачі роботи минув.</p>
            {existing && (
              <p style={{ fontSize: 13, color: '#666', marginTop: 8 }}>
                Остання здана робота: {existing.github_repo_url}
              </p>
            )}
          </div>
        ) : (
          <>
            {rounds.length > 0 && (
              <div className="db-form-row" style={{ marginBottom: 12 }}>
                <label>Раунд</label>
                <CustomSelect value={roundId} onChange={(value) => {
                  setRoundId(value);
                  const r = rounds.find(r => String(r.id) === String(value));
                  setDeadline(r?.end_date || null);
                }} options={rounds.map(r => ({ value: r.id, label: r.title || `Раунд ${r.order_index ?? r.id}` }))} />
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="db-edit-label"><IconGithub style={{ width: 13, height: 13, verticalAlign: -2, marginRight: 5 }} /> GitHub репозиторій <span className="db-required">*</span></label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="db-input"
                    value={repoUrl}
                    onChange={e => { setRepoUrl(e.target.value); setBranches([]); lastFetchedPath.current = ''; }}
                    onBlur={() => { if (repoUrl.trim()) fetchBranches(); }}
                    placeholder="https://github.com/username/repo"
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="db-btn db-btn-ghost db-btn-sm"
                    onClick={fetchBranches} disabled={loadingB || !repoUrl.trim()}>
                    {loadingB ? <IconTime style={{ width: 14, height: 14 }} /> : '🔍 Гілки'}
                  </button>
                </div>
              </div>

              <div>
                <label className="db-edit-label">🌿 Гілка <span className="db-required">*</span></label>
                {branches.length > 0 ? (
                  <CustomSelect
                    value={branch}
                    onChange={setBranch}
                    options={branches.map(b => ({ value: b, label: b }))}
                  />
                ) : (
                  <input className="db-input" value={branch} onChange={e => setBranch(e.target.value)} placeholder="main" />
                )}
                {branches.length > 0 && <small style={{ color: '#888', fontSize: 12 }}>Знайдено {branches.length} гілок</small>}
              </div>

              <div>
                <label className="db-edit-label">▶ Pitch Video URL</label>
                <input className="db-input" type="url" value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..." />
              </div>

              <div>
                <label className="db-edit-label">🌐 Live Demo URL <span style={{ color: '#888', fontWeight: 400 }}>(необов'язково)</span></label>
                <input className="db-input" type="url" value={demoUrl}
                  onChange={e => setDemoUrl(e.target.value)}
                  placeholder="https://my-project.vercel.app" />
              </div>

              <div>
                <label className="db-edit-label">📝 Опис проєкту</label>
                <textarea className="db-input" rows={3} value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Коротко опишіть проєкт..."
                  style={{ resize: 'vertical' }} />
              </div>

              <div className="db-form-actions">
                <button type="button" className="db-btn db-btn-ghost" onClick={onClose}>Сховати</button>
                <button type="submit" className="db-btn db-btn-primary" disabled={saving || isDeadlinePast || isSubmissionBlocked}>
                  {saving ? 'Збереження...' : (existing ? <><IconSave style={{ width: 14, height: 14, verticalAlign: -2, marginRight: 5 }} /> Оновити</> : <><IconSend style={{ width: 14, height: 14, verticalAlign: -2, marginRight: 5 }} /> Подати роботу</>)}
                </button>
              </div>
            </form>
          </>
        )}
    </div>
  );
}

function EditTeamModal({ team, toast, onClose, onSuccess }) {
  const [name,     setName]     = useState(team.name || "");
  const [city,     setCity]     = useState(team.city || "");
  const [school,   setSchool]   = useState(team.school || "");
  const [telegram, setTelegram] = useState(team.telegram_username || "");
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const min = 2;
  const max = 5;
  const searchTimers = useRef({});

  useEffect(() => {
    getTeamById(team.id).then(t => {
      if (t.city)               setCity(t.city);
      if (t.school)             setSchool(t.school);
      if (t.telegram_username)  setTelegram(t.telegram_username);
      setMembers((t.members || []).map(m => ({
        linkedUser: m.user_id ? {
          id: m.user_id,
          username: m.username || m.full_name,
          email: m.email || '',
          user_avatar_url: m.user_avatar_url || null,
          identity_confirmed: true,
        } : null,
        full_name: m.full_name || '',
        email: m.email || '',
        platformQuery: '',
        platformUser: null,
        searching: false,
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
    if (!m.platformUser.identity_confirmed) {
      toast.error("⚠️ Цей учасник ще не підтвердив своє ПІБ у профілі.");
      return;
    }
    if (members.some((row, idx) => idx !== i && row.linkedUser?.id === m.platformUser.id)) {
      toast.error('Цей користувач вже доданий до команди');
      return;
    }
    updateMember(i, {
      linkedUser: {
        id: m.platformUser.id,
        username: m.platformUser.username,
        email: m.platformUser.email || '',
        user_avatar_url: m.platformUser.user_avatar_url || null,
        identity_confirmed: true,
      },
      platformUser: null, platformQuery: '',
    });
  };

  const handleSave = async e => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Введіть назву команди"); return; }
    const filled = members.filter(m => m.linkedUser);
    if (filled.length < min) { toast.error(`Мінімум ${min} учасника(-ів) у команді`); return; }
    const emails = filled.map(m => m.linkedUser.email?.trim().toLowerCase()).filter(Boolean);
    if (new Set(emails).size !== emails.length) {
      toast.error('Email учасників повинні бути унікальними'); return;
    }
    setSaving(true);
    const cleanMembers = filled.map(m => ({
      full_name: m.linkedUser.username,
      email:     m.linkedUser.email,
      user_id:   m.linkedUser.id,
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
        <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700 }}>Редагувати команду</h2>
        {loading ? <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Завантаження...</div> : (
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                    onClick={() => setMembers(m => [...m, { linkedUser: null, full_name: '', email: '', platformQuery: '', platformUser: null, searching: false }])}>+ Додати</button>
                )}
              </div>
              {members.map((m, i) => (
                <div key={i} className="db-member-wrap">
                  {m.linkedUser ? (
                    <div className="db-member-linked-card">
                      <span className="db-member-num">{i + 1}</span>
                      {m.linkedUser.user_avatar_url ? (
                        <img
                          src={m.linkedUser.user_avatar_url.startsWith('http') ? m.linkedUser.user_avatar_url : `${API_BASE}${m.linkedUser.user_avatar_url}`}
                          alt={m.linkedUser.username} referrerPolicy="no-referrer"
                          className="db-member-linked-avatar db-member-linked-avatar--img"
                        />
                      ) : (
                        <div className="db-member-linked-avatar">{(m.linkedUser.username || '?').slice(0,2).toUpperCase()}</div>
                      )}
                      <div className="db-member-linked-info">
                        <span className="db-member-linked-name">{m.linkedUser.username}</span>
                        {m.linkedUser.email && <span className="db-member-linked-email">{m.linkedUser.email}</span>}
                      </div>
                      <span className="db-member-linked-badge">На платформі</span>
                      {members.length > min && (
                        <button type="button" className="db-member-remove" onClick={() => setMembers(ms => ms.filter((_, idx) => idx !== i))}>
                          <IconRemove style={{ width: 14, height: 14 }} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="db-member-search-card">
                      <div className="db-member-search-head">
                        <span className="db-member-num">{i + 1}</span>
                        <span className="db-member-search-hint">Знайдіть учасника на платформі</span>
                        {members.length > min && (
                          <button type="button" className="db-member-remove" onClick={() => setMembers(ms => ms.filter((_,idx) => idx !== i))}>
                            <IconRemove style={{ width: 14, height: 14 }} />
                          </button>
                        )}
                      </div>
                      <div className="db-member-platform-wrap">
                        <input className="db-input" value={m.platformQuery}
                          onChange={e => handlePlatformSearch(i, e.target.value)}
                          placeholder="🔍 Введіть нік або email" />
                        {m.searching && <span className="db-member-searching">Пошук…</span>}
                        {m.platformUser && !m.searching && (
                          <div className="db-platform-suggestion" onClick={() => addPlatformUser(i)}>
                            {m.platformUser.user_avatar_url ? (
                              <img src={m.platformUser.user_avatar_url.startsWith('http') ? m.platformUser.user_avatar_url : `${API_BASE}${m.platformUser.user_avatar_url}`}
                                alt={m.platformUser.username} referrerPolicy="no-referrer"
                                className="db-ps-avatar db-ps-avatar--img" />
                            ) : (
                              <span className="db-ps-avatar">{(m.platformUser.username || '?').slice(0,2).toUpperCase()}</span>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                              <span className="db-ps-name">{m.platformUser.username}</span>
                              {!m.platformUser.identity_confirmed && <span style={{ fontSize: 11, color: '#e05fa0' }}>⚠️ ПІБ не підтверджено</span>}
                            </div>
                            <span className="db-ps-add">+ Додати</span>
                          </div>
                        )}
                        {m.platformQuery.length >= 2 && !m.searching && !m.platformUser && (
                          <div className="db-member-search-empty">Користувача не знайдено</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="db-form-actions">
              <button type="button" className="db-btn db-btn-ghost" onClick={onClose}>Скасувати</button>
              <button type="submit" className="db-btn db-btn-primary" disabled={saving}>{saving ? "Збереження..." : "Зберегти"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function TabTeams({ toast, setTab }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [editTeam, setEditTeam] = useState(null);
  const [detailCache, setDetailCache] = useState({});
  const [detailLoading, setDetailLoading] = useState({});

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try { setTeams(await getMyTeams()); } catch { if (!silent) toast.error("Помилка"); } finally { if (!silent) setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => {
      setDetailCache({});
      load({ silent: true });
    };
    window.addEventListener('cl:teams:changed', refresh);
    window.addEventListener('focus', refresh);
    socket?.on?.('notification:new', refresh);
    socket?.on?.('status:changed', refresh);
    return () => {
      window.removeEventListener('cl:teams:changed', refresh);
      window.removeEventListener('focus', refresh);
      socket?.off?.('notification:new', refresh);
      socket?.off?.('status:changed', refresh);
    };
  }, [load]);

  const handleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!detailCache[id]) {
      setDetailLoading(p => ({ ...p, [id]: true }));
      try {
        const detail = await getTeamById(id);
        setDetailCache(p => ({ ...p, [id]: detail }));
      } catch {}
      finally { setDetailLoading(p => ({ ...p, [id]: false })); }
    }
  };

  const activeCount = teams.filter(t => t.tournament_status === "running").length;
  const regCount    = teams.filter(t => t.tournament_status === "registration").length;

  return (
    <div className="db-tab">
      <div className="db-tab-header"><h1>Мої команди</h1></div>

      {!loading && teams.length > 0 && (
        <div className="db-team-stats-bar">
          <TeamStat label="Усього команд" value={teams.length} />
          <div className="db-team-stats-divider" />
          <TeamStat label="Активних турнірів" value={activeCount} accent="#2dba6e" />
          <div className="db-team-stats-divider" />
          <TeamStat label="Реєстрація відкрита" value={regCount} accent="#AC9EF8" />
        </div>
      )}

      {loading ? (
        <div className="db-team-list">{[1,2].map(i => <div key={i} className="db-card-skeleton" style={{ height: 96 }} />)}</div>
      ) : teams.length === 0 ? (
        <div className="db-empty"><IconTeams /><p>У вас ще немає команд</p><small>Перейдіть у Турніри та зареєструйтесь</small></div>
      ) : (
        <div className="db-team-list">
          {teams.map((t, idx) => {
            const isExp     = expanded === t.id;
            const canEdit   = t.tournament_status === "registration";
            const tNow = Date.now();
            const tSubStart = t.tournament_submission_start ? new Date(t.tournament_submission_start).getTime() : null;
            const tSubEnd   = t.tournament_submission_end   ? new Date(t.tournament_submission_end).getTime()   : null;
            const inSubWindow = tSubStart && tSubEnd
              ? (tNow >= tSubStart && tNow <= tSubEnd)
              : t.tournament_status === 'running';
            const canSubmit = inSubWindow;
            const detail    = detailCache[t.id];
            const members   = detail?.members || [];
            const gradient  = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];

            // Deadline info
            const regDeadline = t.registration_end ? deadlineInfo(t.registration_end) : null;
            const tourDeadline = t.end_date ? deadlineInfo(t.end_date) : null;
            const submitBlocked = canSubmit && tourDeadline?.isPast;

            return (
              <div key={t.id} className={`db-team-card${isExp ? " expanded" : ""}`}>
                <div className="db-team-card-main" onClick={() => handleExpand(t.id)}>
                  <div className="db-team-card-left">
                    <div className="db-team-avatar" style={{ background: gradient }}>
                      {t.name.slice(0,2).toUpperCase()}
                    </div>
                    <div className="db-team-info">
                      <h3>{t.name}</h3>
                      <div className="db-team-meta">
                        {t.city && <span className="db-team-meta-chip">📍 {t.city}</span>}
                        {t.school && <span className="db-team-meta-chip">🏫 {t.school}</span>}
                        {t.telegram_username && (
                          <span className="db-team-meta-chip">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: "middle", marginRight: 2, opacity: .7 }}>
                              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z" />
                            </svg>
                            @{String(t.telegram_username).replace(/^@+/, '')}
                          </span>
                        )}
                        {/* Deadline chips */}
                        {canEdit && regDeadline && !regDeadline.isPast && (
                          <span className={`db-team-meta-chip db-deadline-chip${regDeadline.diff < 86400000 ? ' urgent' : ''}`}>
                            ⏱ Реєстрація: {regDeadline.text}
                          </span>
                        )}
                        {canSubmit && tourDeadline && !tourDeadline.isPast && (
                          <span className={`db-team-meta-chip db-deadline-chip${tourDeadline.diff < 86400000 ? ' urgent' : ''}`}>
                            ⏱ Здача: {tourDeadline.text}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="db-team-card-right">
                    <div className="db-team-card-right-inner">
                      <p className="db-team-tournament-label">{t.tournament_name}</p>
                      <StatusBadge status={t.tournament_status} />
                    </div>
                    {canEdit && (
                      <button className="db-btn db-btn-ghost db-btn-sm" onClick={e => { e.stopPropagation(); setEditTeam(t); }}>
                        <IconPensil style={{ width: 13, height: 13, verticalAlign: -2, marginRight: 4 }} /> Редагувати
                      </button>
                    )}
                    {canSubmit && (
                      <button
                        className={`db-btn db-btn-sm${submitBlocked ? ' db-btn-ghost' : ' db-btn-primary'}`}
                        onClick={e => { e.stopPropagation(); setTab?.(`team_${t.id}`); }}
                        title={submitBlocked ? 'Дедлайн здачі минув' : ''}
                      >
                        {submitBlocked ? '🔒 Дедлайн минув' : <><IconSend style={{ width: 14, height: 14, verticalAlign: -2, marginRight: 5 }} /> Подати роботу</>}
                      </button>
                    )}
                    <span className={`db-expand-btn${isExp ? " open" : ""}`}>›</span>
                  </div>
                </div>

                {isExp && (
                  <div className="db-team-details">
                    {detailLoading[t.id] ? (
                      <div className="db-team-detail-loading">Завантаження учасників...</div>
                    ) : (() => {
                      const captainId = detail?.captain_id ?? t.captain_id ?? null;
                      const onlineCount = members.filter(m => m.presence === 'online').length;
                      const maxSize = 5;
                      const slotsLeft = Math.max(0, maxSize - members.length);
                      return (
                        <>
                          {/* Deadlines section */}
                          {(t.registration_end || t.end_date) && (
                            <div className="db-team-deadlines">
                              {canEdit && t.registration_end && (
                                <DeadlineBadge label="Реєстрація до" dateStr={t.registration_end} />
                              )}
                              {t.start_date && (
                                <DeadlineBadge label="Старт турніру" dateStr={t.start_date} />
                              )}
                              {t.end_date && (
                                <DeadlineBadge label="Кінець турніру" dateStr={t.end_date} />
                              )}
                            </div>
                          )}

                          <div className="db-team-summary">
                            <div className="db-team-summary-item">
                              <span className="db-team-summary-icon"><IconUserSvg style={{ width: 14, height: 14, color: '#7c5ff5' }} /></span>
                              <span className="db-team-summary-text"><b>{members.length}/{maxSize}</b> учасників</span>
                            </div>
                            <span className="db-team-summary-sep" />
                            <div className="db-team-summary-item">
                              <span className={`db-team-summary-dot${onlineCount > 0 ? ' on' : ''}`} />
                              <span className="db-team-summary-text"><b>{onlineCount}</b> в мережі</span>
                            </div>
                            {slotsLeft > 0 && canEdit && (
                              <>
                                <span className="db-team-summary-sep" />
                                <div className="db-team-summary-item db-team-summary-item--hint">
                                  <span className="db-team-summary-icon"><IconAdd style={{ width: 13, height: 13 }} /></span>
                                  <span className="db-team-summary-text">Вільно місць: <b>{slotsLeft}</b></span>
                                </div>
                              </>
                            )}
                          </div>

                          <div className="db-team-detail-section">
                            <div className="db-team-detail-section-head">
                              <p className="db-team-detail-title">Склад команди</p>
                              <span className="db-team-detail-count">{members.length}</span>
                            </div>
                            {members.length > 0 ? (
                              <div className="db-team-members-grid">
                                {members.map((m, i) => {
                                  const isCaptain = captainId != null && m.user_id === captainId;
                                  const userObj = m.user_id ? { id: m.user_id, username: m.username, user_avatar_url: m.user_avatar_url, status: m.presence } : null;
                                  return (
                                    <div key={i} className={`db-team-member-row${isCaptain ? ' is-captain' : ''}`}>
                                      {userObj ? (
                                        <UserAvatar user={userObj} size={36} showStatus={true} />
                                      ) : (
                                        <div className="db-team-member-avatar" style={{ background: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length] }}>
                                          {(m.full_name || m.username || "?").slice(0,2).toUpperCase()}
                                        </div>
                                      )}
                                      <div className="db-team-member-info">
                                        <span className="db-team-member-name">
                                          {m.full_name || m.username}
                                          {isCaptain && <span className="db-team-member-captain-icon" title="Капітан">👑</span>}
                                        </span>
                                        {m.email && <span className="db-team-member-email">{m.email}</span>}
                                      </div>
                                      <div className="db-team-member-tags">
                                        {isCaptain && <span className="db-team-member-captain-badge">Капітан</span>}
                                        {m.username && !isCaptain && <span className="db-team-member-platform-badge">На платформі</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="db-team-no-members">Немає даних про учасників</p>
                            )}
                          </div>

                          <div className="db-team-action-bar">
                            <button className="db-btn db-btn-primary db-btn-sm" onClick={() => setTab?.('chat')}>
                              <IconChatBubble style={{ width: 14, height: 14, verticalAlign: -2, marginRight: 5 }} /> Відкрити чат команди
                            </button>
                            {canSubmit && (
                              <button
                                className={`db-btn db-btn-sm${submitBlocked ? ' db-btn-ghost' : ' db-btn-ghost'}`}
                                onClick={e => { e.stopPropagation(); setTab?.(`team_${t.id}`); }}
                              >
                                {submitBlocked ? '🔒 Дедлайн минув' : <><IconSend style={{ width: 14, height: 14, verticalAlign: -2, marginRight: 5 }} /> Подати роботу</>}
                              </button>
                            )}
                            {canEdit && (
                              <button className="db-btn db-btn-ghost db-btn-sm" onClick={e => { e.stopPropagation(); setEditTeam(t); }}>
                                <IconPensil style={{ width: 13, height: 13, verticalAlign: -2, marginRight: 4 }} /> Редагувати склад
                              </button>
                            )}
                          </div>
                        </>
                      );
                    })()}
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
          onSuccess={() => { setEditTeam(null); load(); toast.success("Команду оновлено!"); }} />
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import {
  getTeamById, getTournamentRounds, getTeamSubmissions,
  createSubmission, updateSubmission, API_BASE,
} from '@utils/authApi';
import { StatusBadge, UserAvatar } from './db.shared.jsx';

import IconPensil    from '@images/dashboard_components/pensil.svg?react';
import IconTime      from '@images/dashboard_components/time.svg?react';
import IconSave      from '@images/dashboard_components/save.svg?react';
import IconTeams     from '@images/dashboard_components/icon_teams.svg?react';
import IconGithub    from '@images/dashboard_components/icon_github.svg?react';
import IconSend      from '@images/dashboard_components/send.svg?react';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#AC9EF8,#7c5ff5)',
  'linear-gradient(135deg,#f8a4c8,#e05fa0)',
  'linear-gradient(135deg,#a4d4f8,#3a9de0)',
  'linear-gradient(135deg,#a4f8c4,#2dba6e)',
  'linear-gradient(135deg,#f8d4a4,#e08a20)',
];

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

function DeadlineBar({ label, dateStr }) {
  const info = deadlineInfo(dateStr);
  if (!info) return null;
  const isPast = info.isPast;
  const isUrgent = !isPast && info.diff < 86400000;
  return (
    <div className={`tw-deadline-bar${isPast ? ' past' : isUrgent ? ' urgent' : ''}`}>
      <span className="tw-deadline-icon">⏱</span>
      <span className="tw-deadline-label">{label}</span>
      <span className="tw-deadline-value">
        {isPast ? `Минув ${info.text}` : `ще ${info.text}`}
      </span>
      <span className="tw-deadline-date">
        {info.date.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

function MemberAvatarRow({ members, captainId }) {
  return (
    <div className="tw-member-row">
      {members.map((m, i) => {
        const isCaptain = captainId != null && m.user_id === captainId;
        const userObj = m.user_id
          ? { id: m.user_id, username: m.username, user_avatar_url: m.user_avatar_url, status: m.presence }
          : null;
        return (
          <div key={i} className={`tw-member-chip${isCaptain ? ' captain' : ''}`} title={`${m.full_name || m.username}${isCaptain ? ' (Капітан)' : ''}`}>
            {userObj ? (
              <UserAvatar user={userObj} size={28} showStatus={true} />
            ) : (
              <div className="tw-member-initials" style={{ background: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length] }}>
                {(m.full_name || m.username || '?').slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="tw-member-name">{m.full_name || m.username}</span>
            {isCaptain && <span className="tw-captain-crown">👑</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ── Submission section ───────────────────────────── */
function CountdownTimer({ deadline }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, new Date(deadline) - Date.now());
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000)  / 60000);
  const secs  = Math.floor((diff % 60000)    / 1000);
  return (
    <div className="sub-countdown">
      {[[days,'ДНІВ'],[hours,'ГОДИН'],[mins,'ХВИЛИН'],[secs,'СЕК']].map(([v,l]) => (
        <div key={l} className="sub-countdown-unit">
          <span className="sub-countdown-val">{String(v).padStart(2,'0')}</span>
          <span className="sub-countdown-label">{l}</span>
        </div>
      ))}
    </div>
  );
}

function SubmissionSection({ team, toast, rounds, existing, onSaved }) {
  const [repoUrl,   setRepoUrl]   = useState(existing?.github_repo_url || '');
  const [branch,    setBranch]    = useState(existing?.github_branch   || 'main');
  const [videoUrl,  setVideoUrl]  = useState(existing?.pitch_video_url || '');
  const [demoUrl,   setDemoUrl]   = useState(existing?.live_demo_url   || '');
  const [desc,      setDesc]      = useState(existing?.description     || '');
  const [roundId,   setRoundId]   = useState(existing?.round_id ? String(existing.round_id) : '');
  const [branches,  setBranches]  = useState([]);
  const [loadingB,  setLoadingB]  = useState(false);
  const [repoValid, setRepoValid] = useState(null); // null | true | false
  const [saving,    setSaving]    = useState(false);
  const [locked,    setLocked]    = useState(false);
  const [deadline,  setDeadline]  = useState(null);
  const [touched,   setTouched]   = useState({});

  useEffect(() => {
    if (!roundId && rounds.length > 0) {
      const active = rounds.find(r => r.status === 'active' || !r.status) ?? rounds[rounds.length - 1];
      setRoundId(String(active.id));
      setDeadline(active.end_date || null);
    }
  }, [rounds]);

  useEffect(() => {
    if (roundId) {
      const r = rounds.find(r => String(r.id) === roundId);
      setDeadline(r?.end_date || null);
    }
  }, [roundId, rounds]);

  const deadlineStatus = deadline ? deadlineInfo(deadline) : null;
  const isDeadlinePast = deadlineStatus?.isPast ?? false;

  const parseRepoPath = url => {
    try {
      const m = url.match(/github\.com\/([^/]+\/[^/]+)/);
      return m ? m[1].replace(/\.git$/, '') : null;
    } catch { return null; }
  };

  const verifyRepo = async url => {
    const path = parseRepoPath(url);
    if (!path) { setRepoValid(false); return; }
    try {
      const res = await fetch(`https://api.github.com/repos/${path}`);
      setRepoValid(res.ok);
    } catch { setRepoValid(false); }
  };

  const fetchBranches = async () => {
    const path = parseRepoPath(repoUrl);
    if (!path) { toast.error('Невірний формат URL GitHub репозиторію'); return; }
    setLoadingB(true);
    setBranches([]);
    try {
      const res = await fetch(`https://api.github.com/repos/${path}/branches`);
      if (!res.ok) throw new Error('Репозиторій не знайдено або він приватний');
      const data = await res.json();
      setBranches(data.map(b => b.name));
      if (!branch && data.length) setBranch(data[0].name);
      setRepoValid(true);
    } catch (e) { toast.error(e.message); setRepoValid(false); }
    finally { setLoadingB(false); }
  };

  const handleSave = async (e, draft = false) => {
    e?.preventDefault();
    if (isDeadlinePast) { toast.error('Дедлайн здачі роботи минув'); return; }
    if (!repoUrl.trim()) { toast.error('Вкажіть URL репозиторію'); setTouched(t => ({...t, repo: true})); return; }
    if (!branch.trim())  { toast.error('Оберіть гілку'); return; }
    if (!roundId)        { toast.error('Не знайдено активного раунду'); return; }
    setSaving(true);
    const payload = {
      github_repo_url: repoUrl.trim(),
      github_branch:   branch.trim(),
      pitch_video_url: videoUrl.trim() || null,
      live_demo_url:   demoUrl.trim()  || null,
      description:     desc.trim()     || null,
    };
    try {
      if (existing) {
        await updateSubmission(existing.id, payload);
        toast.success(draft ? 'Чернетку збережено!' : 'Роботу оновлено!');
      } else {
        await createSubmission(Number(roundId), { ...payload, team_id: team.id });
        toast.success(draft ? 'Чернетку збережено!' : 'Роботу подано!');
      }
      onSaved?.();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const statusColor = isDeadlinePast ? '#ef4444' : (deadlineStatus?.diff < 3600000 ? '#f59e0b' : '#10b981');
  const statusText  = isDeadlinePast ? 'CLOSED' : 'OPEN';

  return (
    <div className="sub-wrap">
      {/* ── Dark header ── */}
      <div className="sub-hero">
        <div className="sub-hero-left">
          <span className="sub-status-badge" style={{ background: `${statusColor}22`, color: statusColor, borderColor: `${statusColor}55` }}>
            <span className="sub-status-dot" style={{ background: statusColor }} />
            SUBMISSION STATUS: {statusText}
          </span>
          <h2 className="sub-hero-title">Здача проєкту</h2>
          <p className="sub-hero-desc">
            {team.name} · {rounds.length > 1 ? `${rounds.length} раундів` : 'Фінальна здача'}
            {existing && <span className="sub-hero-saved"> · Збережено ✓</span>}
          </p>
          {rounds.length > 1 && (
            <select className="sub-round-select" value={roundId} onChange={e => setRoundId(e.target.value)}>
              {rounds.map(r => <option key={r.id} value={r.id}>{r.title || `Раунд ${r.order_index ?? r.id}`}</option>)}
            </select>
          )}
        </div>
        {deadline && !isDeadlinePast && <CountdownTimer deadline={deadline} />}
        {isDeadlinePast && (
          <div className="sub-locked-badge">🔒 Дедлайн минув</div>
        )}
      </div>

      <form onSubmit={handleSave} className="sub-form">
        {/* ── Repository & Core Links ── */}
        <div className="sub-card">
          <div className="sub-card-accent" style={{ background: '#10b981' }} />
          <h3 className="sub-card-title">Репозиторій та основні посилання</h3>

          <div className="sub-field">
            <label className="sub-label">
              <IconGithub style={{ width: 14, height: 14, verticalAlign: -2, marginRight: 6 }} />
              GitHub репозиторій <span className="db-required">*</span>
            </label>
            <div className="sub-input-row">
              <input
                className={`db-input sub-input${touched.repo && !repoUrl.trim() ? ' sub-input--error' : ''}`}
                value={repoUrl}
                onChange={e => { setRepoUrl(e.target.value); setRepoValid(null); setBranches([]); }}
                onBlur={e => { setTouched(t => ({...t, repo: true})); if (e.target.value.trim()) verifyRepo(e.target.value); }}
                placeholder="https://github.com/username/repo"
              />
              <button type="button" className="sub-verify-btn" onClick={fetchBranches} disabled={loadingB || !repoUrl.trim()}>
                {loadingB ? '...' : '🔍'}
              </button>
            </div>
            {repoValid === true  && <p className="sub-field-hint sub-field-hint--ok">✔ Репозиторій знайдено та доступний</p>}
            {repoValid === false && <p className="sub-field-hint sub-field-hint--err">✖ Репозиторій не знайдено або приватний</p>}
          </div>

          <div className="sub-row-2">
            <div className="sub-field">
              <label className="sub-label">Гілка / Тег <span className="sub-optional">(Необов'язково)</span></label>
              {branches.length > 0 ? (
                <select className="db-input sub-input" value={branch} onChange={e => setBranch(e.target.value)}>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              ) : (
                <div className="sub-input-row">
                  <span className="sub-input-icon">⑂</span>
                  <input className="db-input sub-input sub-input--icon" value={branch} onChange={e => setBranch(e.target.value)} placeholder="main" />
                </div>
              )}
            </div>
            <div className="sub-field">
              <label className="sub-label">🌐 Live Demo URL <span className="db-required">*</span></label>
              <div className="sub-input-row">
                <span className="sub-input-icon">🌐</span>
                <input className="db-input sub-input sub-input--icon" type="url" value={demoUrl}
                  onChange={e => setDemoUrl(e.target.value)} placeholder="https://my-project.vercel.app" />
              </div>
            </div>
          </div>

          <div className="sub-field">
            <label className="sub-label">▶ Pitch Video URL <span className="db-required">*</span></label>
            <div className="sub-input-row">
              <span className="sub-input-icon">▶</span>
              <input
                className={`db-input sub-input sub-input--icon${touched.video && !videoUrl.trim() ? ' sub-input--error' : ''}`}
                type="url" value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                onBlur={() => setTouched(t => ({...t, video: true}))}
                placeholder="YouTube або Vimeo посилання (unlisted)" />
            </div>
            {touched.video && !videoUrl.trim() && (
              <p className="sub-field-hint sub-field-hint--err">✖ Відео URL необхідне для оцінювання</p>
            )}
          </div>
        </div>

        {/* ── Documentation & Notes ── */}
        <div className="sub-card">
          <div className="sub-card-accent" style={{ background: '#3b82f6' }} />
          <h3 className="sub-card-title">Документація та нотатки</h3>

          <div className="sub-field">
            <label className="sub-label">📝 Додаткові нотатки для журі</label>
            <div className="sub-notes-toolbar">
              {[['B','**','**',{fontWeight:700}],['I','*','*',{fontStyle:'italic'}],['≡','- ','',{}],['🔗','[','](url)',{}]].map(([l,p,s,st]) => (
                <button key={l} type="button" className="sub-notes-btn" style={st} onClick={() => {
                  const ta = document.getElementById('sub-desc-ta');
                  if (!ta) return;
                  const start = ta.selectionStart, end = ta.selectionEnd;
                  const sel = desc.substring(start, end);
                  const newVal = desc.substring(0, start) + p + (sel || 'текст') + s + desc.substring(end);
                  setDesc(newVal);
                  setTimeout(() => { ta.focus(); ta.setSelectionRange(start + p.length, start + p.length + (sel || 'текст').length); }, 0);
                }}>{l}</button>
              ))}
            </div>
            <textarea
              id="sub-desc-ta"
              className="db-input sub-textarea"
              rows={5}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Вкажіть інструкції для запуску демо, тестові дані, відомі обмеження..."
            />
          </div>
        </div>

        {/* ── Sticky bottom bar ── */}
        <div className="sub-footer">
          <label className="sub-lock-label">
            <input type="checkbox" className="sub-lock-checkbox" checked={locked} onChange={e => setLocked(e.target.checked)} disabled={isDeadlinePast} />
            <span className="sub-lock-text">
              <strong>Заблокувати для оцінювання</strong>
              <span>Після блокування зміни недоступні до кінця дедлайну</span>
            </span>
          </label>
          <div className="sub-footer-actions">
            <button type="submit" className="sub-submit-btn" disabled={saving || isDeadlinePast}>
              {saving ? 'Збереження...' : existing ? 'Оновити →' : 'Подати роботу →'}
            </button>
            {!isDeadlinePast && (
              <button type="button" className="sub-draft-btn" onClick={e => handleSave(null, true)} disabled={saving}>
                Зберегти чернетку
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

/* ── Notes / Documentation section ───────────────── */
function NotesSection({ notes, setNotes, docUrl, setDocUrl, docFile, setDocFile }) {
  const fileRef = { current: null };

  return (
    <div className="tw-section">
      <div className="tw-section-head">
        <span className="tw-section-icon">📋</span>
        <h3 className="tw-section-title">Документація та нотатки</h3>
        <span className="tw-section-sub">Зберігається локально у вашому браузері</span>
      </div>

      <div className="tw-field">
        <label className="tw-label">🔗 URL документації / звіту</label>
        <input
          className="db-input tw-input"
          type="url"
          value={docUrl}
          onChange={e => setDocUrl(e.target.value)}
          placeholder="https://docs.google.com/..."
        />
      </div>

      <div className="tw-field">
        <label className="tw-label">📎 Прикріпити файл (локально)</label>
        <div
          className="tw-file-drop"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) setDocFile(f);
          }}
        >
          {docFile ? (
            <div className="tw-file-selected">
              <span>📄 {docFile.name}</span>
              <button type="button" className="tw-file-clear" onClick={e => { e.stopPropagation(); setDocFile(null); }}>✕</button>
            </div>
          ) : (
            <span className="tw-file-placeholder">Перетягніть файл або клікніть</span>
          )}
          <input type="file" style={{ display: 'none' }} ref={r => { fileRef.current = r; }}
            onChange={e => setDocFile(e.target.files[0] || null)} />
        </div>
      </div>

      <div className="tw-field">
        <label className="tw-label">🗒 Нотатки команди</label>
        <textarea
          className="db-input tw-input tw-textarea tw-notes"
          rows={6}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Список задач, посилання, нагадування, хто що робить..."
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TabTeamWorkspace — dedicated workspace per team
══════════════════════════════════════════════════ */
export default function TabTeamWorkspace({ teamId, toast, onBack }) {
  const [team,       setTeam]       = useState(null);
  const [rounds,     setRounds]     = useState([]);
  const [submission, setSubmission] = useState(null);
  const [loading,    setLoading]    = useState(true);

  // Local workspace state — persisted to localStorage per team
  const storageKey = `tw_notes_${teamId}`;
  const docUrlKey  = `tw_docurl_${teamId}`;

  const [notes,    setNotes]    = useState(() => localStorage.getItem(storageKey) || '');
  const [docUrl,   setDocUrl]   = useState(() => localStorage.getItem(docUrlKey) || '');
  const [docFile,  setDocFile]  = useState(null);

  useEffect(() => { localStorage.setItem(storageKey, notes); }, [notes]);
  useEffect(() => { localStorage.setItem(docUrlKey, docUrl); }, [docUrl]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, subs] = await Promise.all([
        getTeamById(teamId),
        getTeamSubmissions(teamId).catch(() => []),
      ]);
      setTeam(t);
      setSubmission(subs?.[0] ?? null);
      if (t?.tournament_id) {
        const r = await getTournamentRounds(t.tournament_id).catch(() => []);
        setRounds(r);
      }
    } catch (err) {
      toast.error('Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }, [teamId, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="db-tab">
        <div className="tw-loading">
          <div className="db-spinner" />
          <span>Завантаження робочої області...</span>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="db-tab">
        <div className="db-empty">
          <IconTeams />
          <p>Команду не знайдено</p>
          <button className="db-btn db-btn-ghost db-btn-sm" onClick={onBack}>← Назад</button>
        </div>
      </div>
    );
  }

  const members   = team.members || [];
  const captainId = team.captain_id ?? null;

  const tournStatus = team.tournament_status ?? 'draft';
  const statusColor = tournStatus === 'running'      ? '#2dba6e'
                    : tournStatus === 'registration'  ? '#AC9EF8'
                    : tournStatus === 'finished'      ? '#0ea5e9'
                    : '#888';

  const canSubmit = tournStatus === 'running';
  const canEdit   = tournStatus === 'registration';

  const tourDeadline = team.end_date ? deadlineInfo(team.end_date) : null;
  const regDeadline  = team.registration_end ? deadlineInfo(team.registration_end) : null;

  return (
    <div className="db-tab tw-page">
      {/* ── Header ── */}
      <div className="tw-header">
        <button className="tw-back-btn" onClick={onBack} title="Назад до команд">
          ← Назад
        </button>
        <div className="tw-header-avatar" style={{ background: `linear-gradient(135deg, ${statusColor}55, ${statusColor}22)`, color: statusColor }}>
          {team.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="tw-header-info">
          <h1 className="tw-team-name">{team.name}</h1>
          <div className="tw-header-meta">
            <span className="tw-tournament-name">{team.tournament_name}</span>
            <StatusBadge status={tournStatus} />
            {team.city && <span className="tw-meta-chip">📍 {team.city}</span>}
            {team.school && <span className="tw-meta-chip">🏫 {team.school}</span>}
          </div>
        </div>
      </div>

      {/* ── Members ── */}
      {members.length > 0 && (
        <div className="tw-members-bar">
          <span className="tw-members-label">Команда</span>
          <MemberAvatarRow members={members} captainId={captainId} />
          <span className="tw-members-count">{members.length} уч.</span>
        </div>
      )}

      {/* ── Deadlines ── */}
      {(team.registration_end || team.start_date || team.end_date) && (
        <div className="tw-deadlines">
          {canEdit && team.registration_end && <DeadlineBar label="Реєстрація до" dateStr={team.registration_end} />}
          {team.start_date   && <DeadlineBar label="Старт турніру"  dateStr={team.start_date} />}
          {team.end_date     && <DeadlineBar label="Кінець / здача" dateStr={team.end_date} />}
        </div>
      )}

      {/* ── Main content ── */}
      <div className="tw-content">
        {/* Left: submission + docs */}
        <div className="tw-main-col">
          {/* Submission */}
          {canSubmit ? (
            <SubmissionSection
              team={team}
              toast={toast}
              rounds={rounds}
              existing={submission}
              onSaved={loadData}
            />
          ) : submission ? (
            <div className="tw-section">
              <div className="tw-section-head">
                <span className="tw-section-icon">✅</span>
                <h3 className="tw-section-title">Здана робота</h3>
                <span className="tw-section-badge">Подано</span>
              </div>
              <div className="tw-submitted-info">
                <a href={submission.github_repo_url} target="_blank" rel="noreferrer" className="tw-repo-link">
                  <IconGithub style={{ width: 13, height: 13, verticalAlign: -2, marginRight: 5 }} />{submission.github_repo_url}
                </a>
                <span className="tw-repo-branch">гілка: {submission.github_branch}</span>
                {submission.live_demo_url && (
                  <a href={submission.live_demo_url} target="_blank" rel="noreferrer" className="tw-demo-link">🌐 Live demo</a>
                )}
                {submission.pitch_video_url && (
                  <a href={submission.pitch_video_url} target="_blank" rel="noreferrer" className="tw-demo-link">▶ Pitch video</a>
                )}
                {submission.description && (
                  <p className="tw-submitted-desc">{submission.description}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="tw-section tw-section--muted">
              <div className="tw-section-head">
                <span className="tw-section-icon"><IconSend style={{ width: 18, height: 18 }} /></span>
                <h3 className="tw-section-title">Здача роботи</h3>
              </div>
              <p className="tw-section-note">
                {tournStatus === 'registration'
                  ? 'Здача відкриється після старту турніру'
                  : tournStatus === 'finished'
                  ? 'Турнір завершено. Роботи більше не приймаються.'
                  : 'Здача наразі недоступна'}
              </p>
            </div>
          )}

          {/* Notes & Docs */}
          <NotesSection
            notes={notes}      setNotes={setNotes}
            docUrl={docUrl}    setDocUrl={setDocUrl}
            docFile={docFile}  setDocFile={setDocFile}
          />
        </div>

        {/* Right: quick info */}
        <div className="tw-side-col">
          {/* Members list */}
          <div className="tw-section tw-section--compact">
            <div className="tw-section-head">
              <span className="tw-section-icon">👥</span>
              <h3 className="tw-section-title">Учасники</h3>
              <span className="tw-section-count">{members.length}/5</span>
            </div>
            <div className="tw-members-list">
              {members.map((m, i) => {
                const isCaptain = captainId != null && m.user_id === captainId;
                const userObj = m.user_id
                  ? { id: m.user_id, username: m.username, user_avatar_url: m.user_avatar_url, status: m.presence }
                  : null;
                return (
                  <div key={i} className={`tw-member-item${isCaptain ? ' captain' : ''}`}>
                    {userObj
                      ? <UserAvatar user={userObj} size={32} showStatus={true} />
                      : (
                        <div className="tw-member-initials-sm" style={{ background: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length] }}>
                          {(m.full_name || m.username || '?').slice(0, 2).toUpperCase()}
                        </div>
                      )
                    }
                    <div className="tw-member-item-info">
                      <span className="tw-member-item-name">
                        {m.full_name || m.username}
                        {isCaptain && <span title="Капітан"> 👑</span>}
                      </span>
                      {m.email && <span className="tw-member-item-email">{m.email}</span>}
                    </div>
                    <span className={`tw-presence-dot${m.presence === 'online' ? ' online' : ''}`} title={m.presence === 'online' ? 'Online' : 'Offline'} />
                  </div>
                );
              })}
              {members.length === 0 && <p className="tw-section-note">Немає даних</p>}
            </div>
          </div>

          {/* Quick links */}
          {(team.telegram_username || docUrl || (submission?.live_demo_url) || (submission?.pitch_video_url)) && (
            <div className="tw-section tw-section--compact">
              <div className="tw-section-head">
                <span className="tw-section-icon">🔗</span>
                <h3 className="tw-section-title">Корисні посилання</h3>
              </div>
              <div className="tw-links-list">
                {team.telegram_username && (
                  <a href={`https://t.me/${team.telegram_username.replace(/^@/, '')}`} target="_blank" rel="noreferrer" className="tw-link-item">
                    <span className="tw-link-icon">✈</span> Telegram команди
                  </a>
                )}
                {docUrl && (
                  <a href={docUrl} target="_blank" rel="noreferrer" className="tw-link-item">
                    <span className="tw-link-icon">📄</span> Документація
                  </a>
                )}
                {submission?.live_demo_url && (
                  <a href={submission.live_demo_url} target="_blank" rel="noreferrer" className="tw-link-item">
                    <span className="tw-link-icon">🌐</span> Live Demo
                  </a>
                )}
                {submission?.pitch_video_url && (
                  <a href={submission.pitch_video_url} target="_blank" rel="noreferrer" className="tw-link-item">
                    <span className="tw-link-icon">▶</span> Pitch Video
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Submission status card */}
          <div className="tw-section tw-section--compact">
            <div className="tw-section-head">
              <span className="tw-section-icon">📊</span>
              <h3 className="tw-section-title">Статус здачі</h3>
            </div>
            <div className="tw-status-card">
              {submission ? (
                <>
                  <div className="tw-status-row">
                    <span className="tw-status-dot submitted" />
                    <span>Роботу подано</span>
                  </div>
                  {submission.github_repo_url && (
                    <div className="tw-status-row">
                      <IconGithub style={{ width: 13, height: 13, flexShrink: 0 }} />
                      <a href={submission.github_repo_url} target="_blank" rel="noreferrer" className="tw-repo-link-sm" title={submission.github_repo_url}>
                        {submission.github_repo_url.replace('https://github.com/', '')}
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <div className="tw-status-row">
                  <span className="tw-status-dot pending" />
                  <span>{canSubmit ? 'Ще не подано' : 'Здача недоступна'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

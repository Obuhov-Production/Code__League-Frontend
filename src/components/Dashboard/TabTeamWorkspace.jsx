import { useState, useEffect, useCallback } from 'react';
import {
  getTeamById, getTournamentRounds, getTeamSubmissions,
  createSubmission, updateSubmission, API_BASE,
} from '@utils/authApi';
import { StatusBadge, UserAvatar, pickCurrentRound } from './db.shared.jsx';

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

/* ══════════════════════════════════════════════════
   WorkTaskSection — round/task display
═══════════════════════════════════════════════════ */
function WorkTaskSection({ rounds, submission, canSubmit, tournStatus }) {
  // Determine the round to display
  let currentRound = null;
  if (submission?.round_id) {
    currentRound = rounds.find(r => r.id === submission.round_id || String(r.id) === String(submission.round_id));
  }
  if (!currentRound) {
    currentRound = pickCurrentRound(rounds);
  }

  if (!currentRound) {
    return (
      <div className="tw-section tw-section--muted">
        <div className="tw-section-head">
          <span className="tw-section-icon">📋</span>
          <h3 className="tw-section-title">Задача роботи</h3>
        </div>
        <p className="tw-section-note">
          {tournStatus === 'registration'
            ? "Задача з'явиться після старту турніру"
            : tournStatus === 'finished'
            ? 'Турнір завершено'
            : 'Задача наразі недоступна'}
        </p>
      </div>
    );
  }

  const dInfo = currentRound.end_date ? deadlineInfo(currentRound.end_date) : null;
  const isPast = dInfo?.isPast ?? false;
  const isUrgent = dInfo && !isPast && dInfo.diff < 86400000;
  const statusColor = currentRound.status === 'active' ? '#2dba6e'
    : currentRound.status === 'closed' ? '#ef4444'
    : '#AC9EF8';
  const statusLabel = currentRound.status === 'active' ? 'Активний'
    : currentRound.status === 'closed' ? 'Завершений'
    : 'Чернетка';

  const mustHave = Array.isArray(currentRound.must_have_items) ? currentRound.must_have_items : [];
  const materials = Array.isArray(currentRound.materials) ? currentRound.materials : [];

  return (
    <div className="tw-section tw-task-section">
      <div className="tw-section-head">
        <span className="tw-section-icon">📋</span>
        <h3 className="tw-section-title">Задача роботи</h3>
        <span className="tw-section-badge" style={{ background: `${statusColor}22`, color: statusColor, borderColor: `${statusColor}55` }}>
          {statusLabel}
        </span>
      </div>

      <div className="tw-task-body">
        <h4 className="tw-task-title">{currentRound.title}</h4>

        {currentRound.description && (
          <div className="tw-task-block">
            <span className="tw-task-label">Опис задачі</span>
            <p className="tw-task-text">{currentRound.description}</p>
          </div>
        )}

        {currentRound.tech_requirements && (
          <div className="tw-task-block">
            <span className="tw-task-label">🛠 Технічні вимоги</span>
            <p className="tw-task-text">{currentRound.tech_requirements}</p>
          </div>
        )}

        {mustHave.length > 0 && (
          <div className="tw-task-block">
            <span className="tw-task-label">✅ Обов'язково мати</span>
            <ul className="tw-task-list">
              {mustHave.map((item, i) => (
                <li key={i} className="tw-task-list-item">{item}</li>
              ))}
            </ul>
          </div>
        )}

        {materials.length > 0 && (
          <div className="tw-task-block">
            <span className="tw-task-label">📎 Матеріали</span>
            <ul className="tw-task-materials">
              {materials.map((m, i) => (
                <li key={i}>
                  {m.startsWith('http') ? (
                    <a href={m} target="_blank" rel="noreferrer" className="tw-task-link">🔗 {m}</a>
                  ) : (
                    <span className="tw-task-list-item">{m}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {dInfo && (
          <div className={`tw-task-deadline${isPast ? ' past' : isUrgent ? ' urgent' : ''}`}>
            <span className="tw-task-deadline-icon">⏱</span>
            <span className="tw-task-deadline-text">
              {isPast
                ? `Дедлайн минув (${dInfo.text})`
                : `Дедлайн: ${dInfo.date.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} (ще ${dInfo.text})`
              }
            </span>
          </div>
        )}
      </div>
    </div>
  );
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
      const best = pickCurrentRound(rounds);
      if (best) {
        setRoundId(String(best.id));
        setDeadline(best.end_date || null);
      }
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
    // Auto-select best round if none selected
    let finalRoundId = roundId;
    if (!finalRoundId && rounds.length > 0) {
      const best = pickCurrentRound(rounds);
      if (best) finalRoundId = String(best.id);
    }
    if (isDeadlinePast) { toast.error('Дедлайн здачі роботи минув'); return; }
    if (!repoUrl.trim()) { toast.error('Вкажіть URL репозиторію'); setTouched(t => ({...t, repo: true})); return; }
    if (!branch.trim())  { toast.error('Оберіть гілку'); return; }
    if (!finalRoundId)   { toast.error('Не знайдено жодного раунду'); return; }
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
        await createSubmission(Number(finalRoundId), { ...payload, team_id: team.id });
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
            Статус: {statusText}
          </span>
          <h2 className="sub-hero-title">Підготуйте проект до здачі</h2>
          <p className="sub-hero-desc">
            {team.name} · {rounds.length > 1 ? `${rounds.length} раундів` : team.tournament_name}. Тут ви можете завантажити роботу над своїм проектом.
            {existing && <span className="sub-hero-saved"> · Збережено ✓</span>}
          </p>
          {rounds.length > 0 && (
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
          <h3 className="sub-card-title">Repository & Core Links</h3>

          <div className="sub-field">
            <label className="sub-label">
              <IconGithub style={{ width: 14, height: 14 }} />
              GitHub Repository URL <span className="db-required">*</span>
            </label>
            <div className="sub-input-row">
              <span className="sub-input-icon">🔗</span>
              <input
                value={repoUrl}
                onChange={e => { setRepoUrl(e.target.value); setRepoValid(null); setBranches([]); }}
                onBlur={e => { setTouched(t => ({...t, repo: true})); if (e.target.value.trim()) verifyRepo(e.target.value); }}
                placeholder="https://github.com/username/repo"
              />
            </div>
            {repoValid === true  && <p className="sub-field-hint sub-field-hint--ok">🟢 Repository verified and accessible</p>}
            {repoValid === false && <p className="sub-field-hint sub-field-hint--err">🔴 Repository not found or private</p>}
          </div>

          <div className="sub-row-2">
            <div className="sub-field">
              <label className="sub-label">Branch or Tag <span className="sub-optional">(Optional)</span></label>
              {branches.length > 0 ? (
                <div className="sub-input-row">
                  <span className="sub-input-icon">⇄</span>
                  <select value={branch} onChange={e => setBranch(e.target.value)}>
                    {branches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              ) : (
                <div className="sub-input-row">
                  <span className="sub-input-icon">⑂</span>
                  <input value={branch} onChange={e => setBranch(e.target.value)} placeholder="main" />
                </div>
              )}
            </div>
            <div className="sub-field">
              <label className="sub-label">
                <span style={{ fontSize: 14 }}>🌐</span>
                Live Demo URL <span className="db-required">*</span>
              </label>
              <div className="sub-input-row">
                <span className="sub-input-icon">🌐</span>
                <input type="url" value={demoUrl}
                  onChange={e => setDemoUrl(e.target.value)} placeholder="https://demo.my-project.app" />
              </div>
            </div>
          </div>

          <div className="sub-field">
            <label className="sub-label">
              <span style={{ fontSize: 14 }}>▶</span>
              Pitch Video URL <span className="db-required">*</span>
            </label>
            <div className="sub-input-row">
              <span className="sub-input-icon">▶</span>
              <input
                
                type="url" value={videoUrl}
                placeholder="YouTube Video" />
            </div>
          </div>
        </div>

        {/* ── Documentation & Notes ── */}
        <div className="sub-card">
          <div className="sub-card-accent" style={{ background: '#3b82f6' }} />
          <h3 className="sub-card-title">Documentation & Notes</h3>

          {/* File upload */}
          <div className="sub-field">
            <label className="sub-file-drop">
              <input type="file" style={{ display: 'none' }} />
              <div className="sub-file-drop-icon">☁️</div>
              <p className="sub-file-drop-title">Click to upload or drag and drop</p>
              <p className="sub-file-drop-hint">Architecture diagrams, pitch decks (PDF, PNG, JPG up to 10MB)</p>
            </label>
          </div>

          <div className="sub-field">
            <label className="sub-label">Additional Notes for Judges</label>
            <div className="sub-notes-toolbar">
              {[['B','**','**',{fontWeight:700}],['I','*','*',{fontStyle:'italic'}],['≡','- ','',{}],['🔗','[','](url)',{}]].map(([l,p,s,st]) => (
                <button key={l} type="button" className="sub-notes-btn" style={st} onClick={() => {
                  const ta = document.getElementById('sub-desc-ta');
                  if (!ta) return;
                  const start = ta.selectionStart, end = ta.selectionEnd;
                  const sel = desc.substring(start, end);
                  const newVal = desc.substring(0, start) + p + (sel || 'text') + s + desc.substring(end);
                  setDesc(newVal);
                  setTimeout(() => { ta.focus(); ta.setSelectionRange(start + p.length, start + p.length + (sel || 'text').length); }, 0);
                }}>{l}</button>
              ))}
            </div>
            <textarea
              id="sub-desc-ta"
              className="sub-textarea"
              rows={5}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Provide any specific instructions for running the demo, test credentials, or constraints..."
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* ── Sticky bottom bar ── */}
        <div className="sub-footer">
          <label className="sub-lock-label">
            <input type="checkbox" className="sub-lock-checkbox" checked={locked} onChange={e => setLocked(e.target.checked)} disabled={isDeadlinePast} />
            <span className="sub-lock-text">
              <strong>Lock submission for judging</strong>
              <span>Checking this indicates your project is final. You will not be able to edit these details after the deadline passes.</span>
            </span>
          </label>
          <div className="sub-footer-actions">
            <button type="submit" className="sub-submit-btn" disabled={saving || isDeadlinePast}>
              {saving ? 'Saving...' : (existing ? <><IconSave style={{ width: 14, height: 14 }} /> Update</> : <>Submit Entry →</>)}
            </button>
            {!isDeadlinePast && (
              <button type="button" className="sub-draft-btn" onClick={e => handleSave(null, true)} disabled={saving}>
                Save as Draft
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

  const now = Date.now();
  const subStart = team.tournament_submission_start ? new Date(team.tournament_submission_start).getTime() : null;
  const subEnd   = team.tournament_submission_end   ? new Date(team.tournament_submission_end).getTime()   : null;
  const inSubmissionWindow = subStart && subEnd
    ? (now >= subStart && now <= subEnd)
    : tournStatus === 'running'; // fallback: use running status if no explicit period

  const canSubmit = inSubmissionWindow;
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

      {/* ── Submission (centered full-width) ── */}
      {canSubmit ? (
        <SubmissionSection
          team={team}
          toast={toast}
          rounds={rounds}
          existing={submission}
          onSaved={loadData}
        />
      ) : submission ? (
        <div className="sub-wrap">
          <div className="sub-card" style={{ marginTop: 8 }}>
            <div className="sub-card-accent" style={{ background: '#10b981' }} />
            <h3 className="sub-card-title">Здана робота</h3>
            <div className="tw-submitted-info" style={{ paddingLeft: 12 }}>
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
        </div>
      ) : (
        <div className="sub-wrap">
          <div className="sub-card" style={{ marginTop: 8 }}>
            <div className="sub-card-accent" style={{ background: '#9ca3af' }} />
            <h3 className="sub-card-title">Здача роботи</h3>
            <p className="tw-section-note" style={{ paddingLeft: 12, margin: 0, color: '#6b7280' }}>
              {subStart && subEnd
                ? (now < subStart
                  ? `Здача відкриється ${new Date(subStart).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                  : now > subEnd
                  ? 'Період здачі завершено. Роботи більше не приймаються.'
                  : 'Здача наразі недоступна')
                : tournStatus === 'registration'
                ? 'Здача відкриється після старту турніру'
                : tournStatus === 'finished'
                ? 'Турнір завершено. Роботи більше не приймаються.'
                : 'Здача наразі недоступна'}
            </p>
            {subStart && subEnd && now < subEnd && (
              <div style={{ paddingLeft: 12 }}>
                <DeadlineBar label="Період здачі до" dateStr={new Date(subEnd).toISOString()} />
              </div>
            )}
          </div>
        </div>
      )}
      </div>
  );
}

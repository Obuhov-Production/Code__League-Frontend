import { useState, useEffect, useCallback } from 'react';
import {
  getTeamById, getTournamentRounds, getTeamSubmissions,
  createSubmission, updateSubmission, API_BASE, getTournamentFiles
} from '@utils/authApi';
import { StatusBadge, UserAvatar, pickCurrentRound, getSocket, MarkdownRenderer, CustomSelect } from './db.shared.jsx';

import IconSave      from '@images/dashboard_components/save.svg?react';
import IconTeams     from '@images/dashboard_components/icon_teams.svg?react';
import IconGithub    from '@images/dashboard_components/icon_github.svg?react';
import IconAttach    from '@images/dashboard_components/icon_attach.svg?react';
import IconCalendar  from '@images/dashboard_components/icon_calendar_card.svg?react';
import IconCheck     from '@images/dashboard_components/icon_check_diamond.svg?react';
import IconClock     from '@images/dashboard_components/icon_clock_diamond.svg?react';
import IconExternal  from '@images/dashboard_components/icon_external_link.svg?react';
import IconFolder    from '@images/dashboard_components/icon_folder_panel.svg?react';
import IconPlay      from '@images/dashboard_components/icon_play.svg?react';

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

function WorkspaceCardTitle({ icon: Icon, title, badge, accent = '#7c5ff5' }) {
  return (
    <div className="tw-card-head">
      <span className="tw-card-icon" style={{ '--tw-accent': accent }}>
        {Icon ? <Icon /> : null}
      </span>
      <h3 className="tw-card-title">{title}</h3>
      {badge && <span className="tw-card-badge" style={{ '--tw-accent': accent }}>{badge}</span>}
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

function readSubmissionDraft(teamId) {
  try {
    return JSON.parse(localStorage.getItem(`tw_submission_draft_${teamId}`) || '{}');
  } catch {
    return {};
  }
}

function SubmissionSection({ team, toast, rounds, existing, onSaved }) {
  const initialDraft = !existing ? readSubmissionDraft(team.id) : {};
  const draftKey = `tw_submission_draft_${team.id}`;
  const [repoUrl,   setRepoUrl]   = useState(existing?.github_repo_url || initialDraft.repoUrl || '');
  const [branch,    setBranch]    = useState(existing?.github_branch   || initialDraft.branch || 'main');
  const [videoUrl,  setVideoUrl]  = useState(existing?.pitch_video_url || initialDraft.videoUrl || '');
  const [demoUrl,   setDemoUrl]   = useState(existing?.live_demo_url   || initialDraft.demoUrl || '');
  const [desc,      setDesc]      = useState(existing?.description     || initialDraft.desc || '');
  const [docFileName, setDocFileName] = useState(initialDraft.docFileName || '');
  const [roundId,   setRoundId]   = useState(existing?.round_id ? String(existing.round_id) : '');
  const [branches,  setBranches]  = useState([]);
  const [loadingB,  setLoadingB]  = useState(false);
  const [repoValid, setRepoValid] = useState(null); // null | true | false
  const [saving,    setSaving]    = useState(false);
  const [locked,    setLocked]    = useState(!!existing);
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
    if (draft) {
      localStorage.setItem(draftKey, JSON.stringify({
        repoUrl, branch, videoUrl, demoUrl, desc, docFileName, savedAt: new Date().toISOString()
      }));
      toast.success('Чернетку збережено локально');
      return;
    }

    let finalRoundId = roundId;
    if (!finalRoundId && rounds.length > 0) {
      const best = pickCurrentRound(rounds);
      if (best) finalRoundId = String(best.id);
    }
    if (isDeadlinePast) { toast.error('Дедлайн здачі роботи минув'); return; }
    if (!repoUrl.trim()) { toast.error('Вкажіть URL репозиторію'); setTouched(t => ({...t, repo: true})); return; }
    if (!branch.trim())  { toast.error('Оберіть гілку'); return; }
    if (!demoUrl.trim()) { toast.error('Вкажіть URL живого демо'); return; }
    if (!finalRoundId)   { toast.error('Не знайдено жодного раунду'); return; }
    if (!locked) { toast.error('Підтвердіть, що робота фінальна і готова до оцінювання'); return; }
    
    setSaving(true);
    const payload = {
      github_repo_url: repoUrl.trim(),
      github_branch:   branch.trim(),
      pitch_video_url: videoUrl.trim(),
      live_demo_url:   demoUrl.trim()  || null,
      description:     desc.trim()     || null,
    };
    try {
      if (existing) {
        await updateSubmission(existing.id, payload);
        toast.success(draft ? 'Чернетку збережено!' : 'Роботу оновлено!');
      } else {
        await createSubmission(Number(finalRoundId), payload);
        toast.success('Роботу подано!');
      }
      localStorage.removeItem(draftKey);
      onSaved?.();
      window.dispatchEvent(new CustomEvent('cl:teams:changed', {
        detail: { reason: 'submission-saved', teamId: team.id }
      }));
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const statusColor = isDeadlinePast ? '#ef4444' : (deadlineStatus?.diff < 3600000 ? '#f59e0b' : '#10b981');
  const statusText  = isDeadlinePast ? 'ЗАКРИТО' : 'ВІДКРИТО';

  return (
    <div className="sub-wrap" id="work-submit">
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
            <CustomSelect
              value={roundId}
              onChange={setRoundId}
              options={rounds.map(r => ({
                value: r.id,
                label: r.title || `Раунд ${r.order_index ?? r.id}`,
              }))}
            />
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
          <h3 className="sub-card-title">Репозиторій та гілки</h3>

          <div className="sub-field">
            <label className="sub-label">
              <IconGithub style={{ width: 14, height: 14 }} />
              URL репозиторію GitHub <span className="db-required">*</span>
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
            {repoValid === true  && <p className="sub-field-hint sub-field-hint--ok">🟢 Репозиторій перевірено та він доступний</p>}
            {repoValid === false && <p className="sub-field-hint sub-field-hint--err">🔴 Репозиторій не знайдено або він приватний</p>}
          </div>

          <div className="sub-row-2">
            <div className="sub-field">
              <label className="sub-label">Гілка або тег <span className="sub-optional">(Необов'язково)</span></label>
              {branches.length > 0 ? (
                <div className="sub-input-row">
                  <span className="sub-input-icon">⇄</span>
                  <CustomSelect
                    value={branch}
                    onChange={setBranch}
                    options={branches.map(b => ({ value: b, label: b }))}
                  />
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
                URL живого демо <span className="db-required">*</span>
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
              URL пітч-відео <span className="sub-optional">(Необов'язково)</span>
            </label>
            <div className="sub-input-row">
              <span className="sub-input-icon">▶</span>
              <input
                type="url" value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                placeholder="Відео на YouTube" />
            </div>
          </div>
        </div>

        {/* ── Documentation & Notes ── */}
        <div className="sub-card">
          <div className="sub-card-accent" style={{ background: '#3b82f6' }} />
          <h3 className="sub-card-title">Документація та підказки</h3>

          {/* File upload */}
          <div className="sub-field">
            <label className="sub-file-drop">
              <input
                type="file"
                style={{ display: 'none' }}
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 10 * 1024 * 1024) {
                    toast.error('Файл має бути до 10МБ');
                    return;
                  }
                  setDocFileName(file.name);
                }}
              />
              <div className="sub-file-drop-icon">{docFileName ? '📄' : '☁️'}</div>
              <p className="sub-file-drop-title">{docFileName || 'Клікніть, щоб вибрати файл'}</p>
              <p className="sub-file-drop-hint">PDF, PNG або JPG до 10МБ. Для суддів додайте посилання на файл у нотатках.</p>
            </label>
            {docFileName && (
              <button type="button" className="sub-file-remove-inline" onClick={() => setDocFileName('')}>
                Прибрати файл
              </button>
            )}
          </div>

          <div className="sub-field">
            <label className="sub-label">Додаткові нотатки для суддів</label>
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
              className="sub-textarea"
              rows={5}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Надайте будь-які специфічні інструкції для запуску демо, тестові облікові дані або обмеження..."
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* ── Sticky bottom bar ── */}
        <div className="sub-footer">
          <label className="sub-lock-label">
            <input type="checkbox" className="sub-lock-checkbox" checked={locked} onChange={e => setLocked(e.target.checked)} disabled={isDeadlinePast} />
            <span className="sub-lock-text">
              <strong>Заблокувати роботу для оцінювання</strong>
              <span>Позначивши це, ви підтверджуєте, що проект є фінальним. Ви не зможете редагувати ці дані після дедлайну.</span>
            </span>
          </label>
          <div className="sub-footer-actions">
            <button type="submit" className="sub-submit-btn" disabled={saving || isDeadlinePast}>
              {saving ? 'Збереження...' : (existing ? <><IconSave style={{ width: 14, height: 14 }} /> Оновити</> : <>Подати роботу →</>)}
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
  const [tournamentFiles, setTournamentFiles] = useState([]);

  useEffect(() => { localStorage.setItem(storageKey, notes); }, [notes]);
  useEffect(() => { localStorage.setItem(docUrlKey, docUrl); }, [docUrl]);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [t, subs] = await Promise.all([
        getTeamById(teamId),
        getTeamSubmissions(teamId).catch(() => []),
      ]);
      setTeam(t);
      setSubmission(subs?.[0] ?? null);
      if (t?.tournament_id) {
        const [r, files] = await Promise.all([
          getTournamentRounds(t.tournament_id).catch(() => []),
          getTournamentFiles(t.tournament_id, 'tz').catch(() => ({ files: [] })),
        ]);
        setRounds(r);
        const tzFiles = files.files?.find(g => g.type === 'tz')?.files ?? [];
        setTournamentFiles(tzFiles);
      }
    } catch (err) {
      toast.error('Помилка завантаження');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [teamId, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => loadData({ silent: true });
    const refreshForTeam = (event) => {
      const changedTeamId = event?.detail?.teamId ?? event?.detail?.team?.id ?? event?.teamId ?? event?.team_id;
      if (!changedTeamId || String(changedTeamId) === String(teamId)) refresh();
    };

    window.addEventListener('focus', refresh);
    window.addEventListener('cl:teams:changed', refreshForTeam);
    socket?.on?.('notification:new', refresh);
    socket?.on?.('status:changed', refresh);
    socket?.on?.('team:updated', refreshForTeam);
    socket?.on?.('submission:updated', refreshForTeam);

    const interval = window.setInterval(refresh, 30000);

    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('cl:teams:changed', refreshForTeam);
      socket?.off?.('notification:new', refresh);
      socket?.off?.('status:changed', refresh);
      socket?.off?.('team:updated', refreshForTeam);
      socket?.off?.('submission:updated', refreshForTeam);
      window.clearInterval(interval);
    };
  }, [loadData, teamId]);

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

  const canEdit   = tournStatus === 'registration';

  const tourDeadline = team.end_date ? deadlineInfo(team.end_date) : null;
  const regDeadline  = team.registration_end ? deadlineInfo(team.registration_end) : null;

  // Find the active round to show task/requirements
  const activeRound = rounds.find(r => r.status === 'active') || null;
  const now = Date.now();
  const subStart = team.tournament_submission_start ? new Date(team.tournament_submission_start).getTime() : null;
  const subEnd   = team.tournament_submission_end   ? new Date(team.tournament_submission_end).getTime()   : null;
  const activeRoundEnd = activeRound?.end_date ? new Date(activeRound.end_date).getTime() : null;
  const roundAcceptsSubmission = !!activeRound && activeRound.status === 'active' && (!activeRoundEnd || now <= activeRoundEnd);
  const inSubmissionWindow = subStart && subEnd
    ? (now >= subStart && now <= subEnd)
    : roundAcceptsSubmission;
  const canSubmit = tournStatus === 'running' && inSubmissionWindow && roundAcceptsSubmission;

  // Helper: make relative file URL absolute
  const fileUrl = (relativePath) => {
    if (!relativePath) return null;
    if (relativePath.startsWith('http')) return relativePath;
    const base = API_BASE.replace(/\/api$/, '');
    return base + relativePath;
  };

  // Helper: download TZ text as .md file
  const downloadTzMd = () => {
    if (!team.tournament_tz) return;
    const blob = new Blob([team.tournament_tz], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(team.tournament_name || 'tournament').replace(/\s+/g, '_')}-tz.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hasTournamentMaterials =
    (team.tournament_rules || team.tournament_rules_file_url) ||
    ((team.tournament_tz_enabled && team.tournament_tz) || tournamentFiles.length > 0);

  const scrollToSection = (event, id) => {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submissionBlock = canSubmit ? (
    <SubmissionSection
      team={team}
      toast={toast}
      rounds={rounds}
      existing={submission}
      onSaved={loadData}
    />
  ) : submission ? (
    <div className="sub-wrap" id="work-submit">
      <div className="sub-card tw-info-card">
        <div className="sub-card-accent" style={{ background: '#10b981' }} />
        <WorkspaceCardTitle icon={IconCheck} title="Здана робота" badge="Готово" accent="#10b981" />
        <div className="tw-submitted-info">
          <a href={submission.github_repo_url} target="_blank" rel="noreferrer" className="tw-repo-link">
            <IconGithub />{submission.github_repo_url}
          </a>
          <span className="tw-repo-branch">Гілка: {submission.github_branch}</span>
          {submission.live_demo_url && (
            <a href={submission.live_demo_url} target="_blank" rel="noreferrer" className="tw-demo-link"><IconExternal /> Живе демо</a>
          )}
          {submission.pitch_video_url && (
            <a href={submission.pitch_video_url} target="_blank" rel="noreferrer" className="tw-demo-link"><IconPlay /> Пітч-відео</a>
          )}
          {submission.description && (
            <p className="tw-submitted-desc">{submission.description}</p>
          )}
        </div>
      </div>
    </div>
  ) : tournStatus === 'running' && activeRound ? (
    <div className="sub-wrap" id="work-submit">
      <div className="sub-card tw-info-card">
        <div className="sub-card-accent" style={{ background: '#3b82f6' }} />
        <WorkspaceCardTitle icon={IconClock} title="Робота над проєктом" badge="Очікує здачу" accent="#3b82f6" />
        <div className="tw-soft-panel">
          <p>Зараз ви працюєте над проєктом. Коли відкриється період здачі, тут з'явиться форма для завантаження вашої роботи.</p>
          {subStart && subEnd && (
            <div className="tw-date-strip tw-date-strip--blue">
              <span>
                <IconCalendar /> Період здачі: {new Date(subStart).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} - {new Date(subEnd).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          <div className="tw-work-notes">
            <label>Нотатки команди</label>
            <textarea
              className="db-input"
              rows={4}
              placeholder="Посилання на ресурси, ідеї, todo-лист..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <p>Нотатки зберігаються локально у вашому браузері.</p>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="sub-wrap" id="work-submit">
      <div className="sub-card tw-info-card">
        <div className="sub-card-accent" style={{ background: '#9ca3af' }} />
        <WorkspaceCardTitle icon={IconClock} title="Здача роботи" badge="Недоступно" accent="#9ca3af" />
        <p className="tw-section-note">
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
          <div>
            <DeadlineBar label="Період здачі до" dateStr={new Date(subEnd).toISOString()} />
          </div>
        )}
      </div>
    </div>
  );

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

      <nav className="tw-quick-nav" aria-label="Навігація по сторінці команди">
        <a href="#work-submit" onClick={event => scrollToSection(event, 'work-submit')}>Здача</a>
        {hasTournamentMaterials && <a href="#tournament-materials" onClick={event => scrollToSection(event, 'tournament-materials')}>Матеріали</a>}
      </nav>

      {submissionBlock}

      {/* ── Tournament Materials: Rules + TZ combined ── */}
      {hasTournamentMaterials && (
        <div className="sub-wrap" id="tournament-materials">
          <div className="sub-card tw-info-card">
            <div className="sub-card-accent" style={{ background: '#7c5ff5' }} />
            <WorkspaceCardTitle icon={IconFolder} title="Матеріали турніру" accent="#7c5ff5" />
            <div className="tw-materials-grid">
              {/* ── Left: Rules ── */}
              {team.tournament_rules && (
                <div className="tw-material-col">
                  <h4>Правила</h4>
                  <div className="tw-round-field tw-markdown-card">
                    <MarkdownRenderer text={team.tournament_rules} />
                  </div>
                </div>
              )}

              {/* ── Right: TZ & Materials ── */}
              {((team.tournament_tz_enabled && team.tournament_tz) || tournamentFiles.length > 0) && (
                <div className="tw-material-col">
                  <h4>Технічне завдання</h4>
                  {team.tournament_tz_enabled && team.tournament_tz && (
                    <>
                      <div className="tw-round-field tw-markdown-card">
                        <MarkdownRenderer text={team.tournament_tz} />
                      </div>
                      <div className="tw-link-row">
                        <button type="button" onClick={downloadTzMd} className="tw-file-pill blue">
                          <IconAttach /> Скачати ТЗ як .md
                        </button>
                      </div>
                    </>
                  )}
                  {tournamentFiles.length > 0 && (
                    <div className="tw-round-field tw-files-block">
                      <label>Матеріали до ТЗ</label>
                      <div className="tw-file-list">
                        {tournamentFiles.map((f, i) => (
                          <a key={i} href={fileUrl(f.url)} target="_blank" rel="noreferrer" download className="tw-file-link-card">
                            <IconAttach />
                            <span style={{ flex: 1 }}>{f.name}</span>
                            <small>Відкрити</small>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {team.tournament_rules_file_url && (
              <div className="tw-materials-footer">
                <a href={fileUrl(team.tournament_rules_file_url)} target="_blank" rel="noreferrer" download className="tw-file-pill tw-rules-wide-pill">
                  <IconExternal /> Відкрити правила
                </a>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

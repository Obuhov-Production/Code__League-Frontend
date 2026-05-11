import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

import { getJuryTournaments, getJurySubmissions, evaluateSubmission } from '@utils/authApi';
import { EVAL_CRITERIA, StatusBadge } from './db.shared.jsx';
import IconGithub       from '@images/dashboard_components/icon_github.svg?react';
import IconPlay         from '@images/dashboard_components/icon_play.svg?react';
import IconExternalLink from '@images/dashboard_components/icon_external_link.svg?react';
import IconChatBubble   from '@images/dashboard_components/chat.svg?react';

export default function TabJury({ user, toast }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [expandedT,   setExpandedT]   = useState(null);
  const [expandedR,   setExpandedR]   = useState(null);
  const [submissions, setSubmissions] = useState({});
  const [loadingR,    setLoadingR]    = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm,  setReviewForm]  = useState({ criteria: {}, comment: '' });
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    getJuryTournaments()
      .then(setTournaments)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleT = (id) => { setExpandedT(p => p === id ? null : id); setExpandedR(null); };

  const toggleR = async (roundId) => {
    if (expandedR === roundId) { setExpandedR(null); return; }
    setExpandedR(roundId);
    if (!submissions[roundId]) {
      setLoadingR(roundId);
      try { const d = await getJurySubmissions(roundId); setSubmissions(p => ({ ...p, [roundId]: d })); }
      catch (e) { toast.error(e.message); }
      finally { setLoadingR(null); }
    }
  };

  const openReview = (sub) => {
    setReviewModal(sub);
    const criteriaObj = {};
    if (sub.my_criteria_json) {
      try { JSON.parse(sub.my_criteria_json).forEach(c => { criteriaObj[c.key] = String(c.score); }); } catch {}
    }
    setReviewForm({ criteria: criteriaObj, comment: sub.my_comment ?? '' });
  };

  const computedTotal = useMemo(() => {
    const vals = EVAL_CRITERIA.map(c => { const v = parseFloat(reviewForm.criteria[c.key]); return isNaN(v) ? null : v; });
    const valid = vals.filter(v => v !== null);
    if (!valid.length) return null;
    return Math.round(valid.reduce((a, b) => a + b, 0) / EVAL_CRITERIA.length * 10) / 10;
  }, [reviewForm.criteria]);

  const submitReview = async () => {
    const entries = EVAL_CRITERIA.map(c => ({ key: c.key, label: c.label, score: Number(reviewForm.criteria[c.key] ?? 0) }));
    for (const c of entries) {
      if (isNaN(c.score) || c.score < 0 || c.score > 100) { toast.error(`"${c.label}": оцінка від 0 до 100`); return; }
    }
    const total = Math.round(entries.reduce((s, c) => s + c.score, 0) / entries.length * 10) / 10;
    setSubmitting(true);
    try {
      await evaluateSubmission(reviewModal.id, { total_score: total, comment: reviewForm.comment, criteria: entries });
      toast.success('Оцінку збережено');
      const cJson = JSON.stringify(entries);
      const wasNew = !reviewModal.my_evaluation_id;
      setSubmissions(prev => {
        const u = { ...prev };
        for (const rId of Object.keys(u)) {
          u[rId] = u[rId].map(s =>
            s.id === reviewModal.id ? { ...s, my_score: total, my_comment: reviewForm.comment, my_criteria_json: cJson, my_evaluation_id: s.my_evaluation_id || 1 } : s
          );
        }
        return u;
      });
      if (wasNew) {
        setTournaments(prev => prev.map(t => ({
          ...t,
          rounds: t.rounds.map(r => {
            if ((submissions[r.id] || []).find(s => s.id === reviewModal.id)) return { ...r, my_eval_count: r.my_eval_count + 1 };
            return r;
          }),
        })));
      }
      setReviewModal(null);
    } catch (e) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  const setCrit = (key, val) => setReviewForm(p => ({ ...p, criteria: { ...p.criteria, [key]: val } }));

  if (loading) return <div className="db-loading"><div className="db-spinner" /></div>;

  const techCrit = EVAL_CRITERIA.filter(c => c.group === 'tech');
  const funcCrit = EVAL_CRITERIA.filter(c => c.group === 'func');
  const softCrit = EVAL_CRITERIA.filter(c => c.group === 'soft');
  const allSubs  = tournaments.reduce((s, t) => s + t.rounds.reduce((rs, r) => rs + r.submission_count, 0), 0);
  const allEvals = tournaments.reduce((s, t) => s + t.rounds.reduce((rs, r) => rs + r.my_eval_count, 0), 0);

  return (
    <div className="db-jury-wrap">
      <div className="db-jury-hero">
        <div className="db-jury-hero-icon">⚖️</div>
        <div className="db-jury-hero-text">
          <h2 className="db-jury-hero-title">Перевірка робіт</h2>
          <p className="db-jury-hero-sub">Оцінюйте роботи команд по {EVAL_CRITERIA.length} критеріях</p>
        </div>
        <div className="db-jury-hero-stats">
          <div className="db-jury-hstat"><span className="db-jury-hstat-val">{tournaments.length}</span><span className="db-jury-hstat-lbl">Турніри</span></div>
          <div className="db-jury-hstat"><span className="db-jury-hstat-val">{allSubs}</span><span className="db-jury-hstat-lbl">Роботи</span></div>
          <div className="db-jury-hstat"><span className="db-jury-hstat-val">{allEvals}</span><span className="db-jury-hstat-lbl">Оцінено</span></div>
        </div>
      </div>

      {tournaments.length === 0 && (
        <div className="db-jury-empty">
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          Наразі немає турнірів з поданими роботами
        </div>
      )}

      <div className="db-jury-list">
        {tournaments.map(t => {
          const tSubs  = t.rounds.reduce((s, r) => s + r.submission_count, 0);
          const tEvals = t.rounds.reduce((s, r) => s + r.my_eval_count, 0);
          const tPct   = tSubs ? Math.round(tEvals / tSubs * 100) : 0;
          return (
            <div key={t.id} className={`db-jury-tournament${expandedT === t.id ? ' expanded' : ''}`}>
              <button className="db-jury-t-btn" onClick={() => toggleT(t.id)}>
                <div className="db-jury-t-icon">🏆</div>
                <div className="db-jury-t-info">
                  <div className="db-jury-t-name">{t.name}</div>
                  <div className="db-jury-t-meta">
                    <StatusBadge status={t.status} />
                    <span className="db-jury-t-counts">{t.round_count} раунд{t.round_count === 1 ? '' : 'и'} · {t.team_count} команд{tSubs > 0 ? ` · ${tEvals}/${tSubs} оцінено` : ''}</span>
                  </div>
                </div>
                {tSubs > 0 && (
                  <div className="db-jury-t-prog">
                    <div className="db-jury-progbar"><div className="db-jury-progbar-fill" style={{ width: `${tPct}%` }} /></div>
                    <span className="db-jury-prog-pct">{tPct}%</span>
                  </div>
                )}
                <span className={`db-jury-chevron${expandedT === t.id ? ' open' : ''}`}>▼</span>
              </button>

              {expandedT === t.id && (
                <div className="db-jury-rounds">
                  {t.rounds.length === 0 && <div className="db-jury-no-rounds">Раундів ще немає</div>}
                  {t.rounds.map(r => {
                    const rList  = submissions[r.id];
                    const rSubs  = rList ? rList.length : r.submission_count;
                    const rEvals = rList ? rList.filter(s => s.my_evaluation_id).length : r.my_eval_count;
                    const rPct   = rSubs ? Math.round(rEvals / rSubs * 100) : 0;
                    return (
                      <div key={r.id} className={`db-jury-round${expandedR === r.id ? ' expanded' : ''}`}>
                        <button className="db-jury-r-btn" onClick={() => toggleR(r.id)}>
                          <div className="db-jury-r-info">
                            <div className="db-jury-r-name">{r.title}</div>
                            <div className="db-jury-r-sub">{rSubs > 0 ? `${rEvals} з ${rSubs} оцінено` : 'Немає поданих робіт'}</div>
                          </div>
                          {rSubs > 0 && (
                            <div className="db-jury-r-progwrap">
                              <div className="db-jury-progbar sm"><div className="db-jury-progbar-fill" style={{ width: `${rPct}%` }} /></div>
                            </div>
                          )}
                          <span className={`db-jury-r-badge${rEvals === rSubs && rSubs > 0 ? ' done' : ''}`}>
                            {rEvals === rSubs && rSubs > 0 ? '✓' : rSubs}
                          </span>
                          <span className={`db-jury-chevron${expandedR === r.id ? ' open' : ''}`}>▼</span>
                        </button>

                        {expandedR === r.id && (
                          <div className="db-jury-submissions">
                            {loadingR === r.id && <div className="db-jury-loading"><div className="db-spinner sm" /></div>}
                            {!loadingR && (submissions[r.id] || []).length === 0 && <div className="db-jury-no-subs">Поданих робіт немає</div>}
                            {(submissions[r.id] || []).map(sub => {
                              let criteriaArr = [];
                              try { if (sub.my_criteria_json) criteriaArr = JSON.parse(sub.my_criteria_json); } catch {}
                              return (
                                <div key={sub.id} className={`db-jury-sub-card${sub.my_evaluation_id ? ' reviewed' : ''}`}>
                                  <div className="db-jury-sub-top">
                                    <div>
                                      <div className="db-jury-sub-name">{sub.team_name}</div>
                                      <div className="db-jury-sub-tags">
                                        {sub.city && <span className="db-jury-tag">{sub.city}</span>}
                                        {sub.school && <span className="db-jury-tag">{sub.school}</span>}
                                      </div>
                                    </div>
                                    {sub.my_evaluation_id && (
                                      <div className="db-jury-score-pill">
                                        <span className="db-jury-score-num">{sub.my_score}</span>
                                        <span className="db-jury-score-max">/100</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="db-jury-sub-links">
                                    {sub.github_url && <a href={sub.github_url} target="_blank" rel="noreferrer" className="db-jury-sub-link link-gh">
                                      <IconGithub width="13" height="13" />
                                      GitHub
                                    </a>}
                                    {sub.video_url && <a href={sub.video_url} target="_blank" rel="noreferrer" className="db-jury-sub-link link-vid">
                                      <IconPlay width="13" height="13" />
                                      Відео
                                    </a>}
                                    {sub.live_demo_url && <a href={sub.live_demo_url} target="_blank" rel="noreferrer" className="db-jury-sub-link link-demo">
                                      <IconExternalLink width="13" height="13" />
                                      Демо
                                    </a>}
                                  </div>

                                  {sub.description && <p className="db-jury-sub-desc">{sub.description}</p>}

                                  {criteriaArr.length > 0 && (
                                    <div className="db-jury-criteria-mini">
                                      {criteriaArr.map(c => (
                                        <div key={c.key} className="db-jury-cm-item">
                                          <span className="db-jury-cm-score">{c.score}</span>
                                          <span className="db-jury-cm-label">{c.label}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {sub.my_comment && <p className="db-jury-sub-comment"><IconChatBubble style={{ width: 14, height: 14, verticalAlign: -2, marginRight: 4 }} /> {sub.my_comment}</p>}

                                  <div className="db-jury-sub-foot">
                                    <button className="db-jury-eval-btn" onClick={() => openReview(sub)}>
                                      {sub.my_evaluation_id ? '✏ Змінити оцінку' : '⚖ Оцінити роботу'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {reviewModal && createPortal(
        <div className="db-jury-modal-overlay" onClick={() => setReviewModal(null)}>
          <div className="db-jury-modal" onClick={e => e.stopPropagation()}>
            <div className="db-jury-modal-head">
              <div>
                <h3 className="db-jury-modal-title">Оцінка роботи</h3>
                <p className="db-jury-modal-team">{reviewModal.team_name}{reviewModal.city ? ` · ${reviewModal.city}` : ''}</p>
              </div>
              <button className="db-jury-modal-x" onClick={() => setReviewModal(null)}>✕</button>
            </div>

            <div className="db-jury-modal-body">
              <div className="db-jury-modal-links">
                {reviewModal.github_url    && <a href={reviewModal.github_url}    target="_blank" rel="noreferrer">🔗 GitHub</a>}
                {reviewModal.video_url     && <a href={reviewModal.video_url}     target="_blank" rel="noreferrer">▶ Відео</a>}
                {reviewModal.live_demo_url && <a href={reviewModal.live_demo_url} target="_blank" rel="noreferrer">🌐 Демо</a>}
              </div>

              {reviewModal.description && <p className="db-jury-modal-desc">{reviewModal.description}</p>}

              <div className="db-jury-cgroup">
                <div className="db-jury-cgroup-label">🔧 Технічна частина</div>
                {techCrit.map(c => (
                  <div key={c.key} className="db-jury-crow">
                    <span className="db-jury-cicon">{c.icon}</span>
                    <div className="db-jury-cinfo">
                      <div className="db-jury-cname">{c.label}</div>
                      <div className="db-jury-cdesc">{c.desc}</div>
                    </div>
                    <div className="db-jury-cscore">
                      <input type="number" min="0" max="100" className="db-jury-cinput"
                        value={reviewForm.criteria[c.key] ?? ''}
                        onChange={e => setCrit(c.key, e.target.value)} placeholder="0" />
                      <span className="db-jury-cmax">/100</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="db-jury-cgroup">
                <div className="db-jury-cgroup-label">⚡ Функціональність</div>
                {funcCrit.map(c => (
                  <div key={c.key} className="db-jury-crow">
                    <span className="db-jury-cicon">{c.icon}</span>
                    <div className="db-jury-cinfo">
                      <div className="db-jury-cname">{c.label}</div>
                      <div className="db-jury-cdesc">{c.desc}</div>
                    </div>
                    <div className="db-jury-cscore">
                      <input type="number" min="0" max="100" className="db-jury-cinput"
                        value={reviewForm.criteria[c.key] ?? ''}
                        onChange={e => setCrit(c.key, e.target.value)} placeholder="0" />
                      <span className="db-jury-cmax">/100</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="db-jury-cgroup">
                <div className="db-jury-cgroup-label">🎤 Захист та подача</div>
                {softCrit.map(c => (
                  <div key={c.key} className="db-jury-crow">
                    <span className="db-jury-cicon">{c.icon}</span>
                    <div className="db-jury-cinfo">
                      <div className="db-jury-cname">{c.label}</div>
                      <div className="db-jury-cdesc">{c.desc}</div>
                    </div>
                    <div className="db-jury-cscore">
                      <input type="number" min="0" max="100" className="db-jury-cinput"
                        value={reviewForm.criteria[c.key] ?? ''}
                        onChange={e => setCrit(c.key, e.target.value)} placeholder="0" />
                      <span className="db-jury-cmax">/100</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="db-jury-total-row">
                <span className="db-jury-total-lbl">Підсумковий бал (середнє)</span>
                <span className="db-jury-total-val">{computedTotal !== null ? computedTotal : '—'}</span>
              </div>

              <div>
                <label className="db-jury-comment-lbl">Коментар (необов'язково)</label>
                <textarea className="db-jury-comment-ta" rows={3}
                  value={reviewForm.comment}
                  onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                  placeholder="Ваш відгук про роботу команди..." />
              </div>
            </div>

            <div className="db-jury-modal-foot">
              <button className="db-btn db-btn-ghost" onClick={() => setReviewModal(null)}>Скасувати</button>
              <button className="db-btn db-btn-primary" onClick={submitReview} disabled={submitting}>
                {submitting ? 'Збереження...' : 'Зберегти оцінку'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

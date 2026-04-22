import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from '@components/Header'
import Footer from '@components/Footer'
import '@styles/components/leaderboard-page.css'

const MEDALS = ['🥇', '🥈', '🥉']

// ── .env flag ──────────────────────────────────────────────────────────────
// VITE_LEADERBOARD_FROM_BACKEND=true  → тягне реальні дані з бекенду
// VITE_LEADERBOARD_FROM_BACKEND=false → показує статичні mock-дані (дефолт)
const FROM_BACKEND = import.meta.env.VITE_LEADERBOARD_FROM_BACKEND === 'true'
const API_BASE     = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

// ── Static mock (показується коли FROM_BACKEND=false) ─────────────────────
const MOCK_TOURNAMENTS = [
  { id: 1, name: 'Code League Spring 2026', status: 'finished' },
  { id: 2, name: 'Hackathon UA 2025',       status: 'finished' },
]

const MOCK_DATA = {
  1: [
    { team_id: 1, team_name: 'ByteForce',       city: 'Київ',      total_score: 94.5 },
    { team_id: 2, team_name: 'NullPointers',    city: 'Харків',    total_score: 89.0 },
    { team_id: 3, team_name: 'StackOverflow',   city: 'Львів',     total_score: 83.2 },
    { team_id: 4, team_name: 'DevDynasty',      city: 'Одеса',     total_score: 78.7 },
    { team_id: 5, team_name: 'CipherCrew',      city: 'Дніпро',    total_score: 71.1 },
    { team_id: 6, team_name: 'AlgoRhythm',      city: 'Запоріжжя', total_score: 65.4 },
    { team_id: 7, team_name: 'SyntaxSquad',     city: 'Вінниця',   total_score: 58.9 },
    { team_id: 8, team_name: 'PatchPilots',     city: 'Полтава',   total_score: 52.0 },
  ],
  2: [
    { team_id: 9,  team_name: 'CodeCrafters',   city: 'Київ',      total_score: 97.0 },
    { team_id: 10, team_name: 'HexHunters',     city: 'Суми',      total_score: 91.3 },
    { team_id: 11, team_name: 'BinaryBrigade',  city: 'Миколаїв',  total_score: 85.6 },
    { team_id: 12, team_name: 'LogicLords',     city: 'Черкаси',   total_score: 77.2 },
    { team_id: 13, team_name: 'RuntimeRebels',  city: 'Херсон',    total_score: 69.8 },
  ],
}

const STATUS_LABEL = {
  finished:     { label: 'Завершено',  color: '#6b7280' },
  running:      { label: 'Активний',   color: '#22c55e' },
  registration: { label: 'Реєстрація', color: '#3b82f6' },
  draft:        { label: 'Чернетка',   color: '#f59e0b' },
}

export default function LeaderboardPage() {
  const [tournaments, setTournaments] = useState(FROM_BACKEND ? [] : MOCK_TOURNAMENTS)
  const [selected,    setSelected]    = useState(FROM_BACKEND ? null : 1)
  const [rows,        setRows]        = useState(FROM_BACKEND ? [] : (MOCK_DATA[1] ?? []))
  const [loading,     setLoading]     = useState(FROM_BACKEND)
  const [loadingRows, setLoadingRows] = useState(false)
  const [error,       setError]       = useState(null)

  // ── Завантажити список турнірів з бекенду ────────────────────────────────
  useEffect(() => {
    if (!FROM_BACKEND) return
    setLoading(true)
    fetch(`${API_BASE}/public/tournaments`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setTournaments(list)
        const def = list.find(t => t.status === 'finished') ?? list[0]
        if (def) setSelected(def.id)
      })
      .catch(() => setError('Не вдалося завантажити список турнірів'))
      .finally(() => setLoading(false))
  }, [])

  // ── Завантажити лідерборд обраного турніру ───────────────────────────────
  useEffect(() => {
    if (!selected) return

    if (!FROM_BACKEND) {
      setRows(MOCK_DATA[selected] ?? [])
      return
    }

    setLoadingRows(true)
    fetch(`${API_BASE}/public/leaderboard/${selected}`)
      .then(r => r.json())
      .then(data => setRows(Array.isArray(data) ? data : []))
      .catch(() => setError('Не вдалося завантажити лідерборд'))
      .finally(() => setLoadingRows(false))
  }, [selected])

  const maxScore = rows.reduce((m, r) => Math.max(m, Number(r.total_score)), 0)

  return (
    <div className="lb-page">
      <Header />

      <main className="lb-main container">
        {/* ── Header block ── */}
        <div className="lb-hero">
          <h1 className="lb-hero-title">Таблиця лідерів</h1>
          <p className="lb-hero-sub">
            Публічний перегляд результатів завершених турнірів.<br />
            Для участі та відстеження в реальному часі —&nbsp;
            <Link to="/login" className="lb-hero-link">увійдіть у свій акаунт</Link>.
          </p>
        </div>

        {/* ── Preview badge ── */}
        {!FROM_BACKEND && (
          <div className="lb-preview-badge">👁 Режим перегляду — дані оновлюються після реєстрації</div>
        )}

        {error && <div className="lb-error">{error}</div>}

        {/* ── Tournament tabs ── */}
        {loading ? (
          <div className="lb-tabs">
            {[1, 2].map(i => <div key={i} className="lb-tab-skeleton" />)}
          </div>
        ) : (
          <div className="lb-tabs">
            {tournaments.map(t => {
              const st = STATUS_LABEL[t.status]
              return (
                <button
                  key={t.id}
                  className={`lb-tab${selected === t.id ? ' active' : ''}`}
                  onClick={() => setSelected(t.id)}
                >
                  {t.name}
                  {st && <span className="lb-tab-badge" style={{ color: st.color }}>{st.label}</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Table ── */}
        <div className="lb-board">
          <div className="lb-board-header">
            <span>#</span>
            <span>Команда</span>
            <span>Рейтинг</span>
            <span>Балів</span>
          </div>

          {loadingRows ? (
            [1, 2, 3, 4, 5].map(i => (
              <div key={i} className="lb-board-row">
                <div className="lb-skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                <div className="lb-skeleton" style={{ width: '60%', height: 16 }} />
                <div className="lb-skeleton" style={{ width: '80%', height: 8 }} />
                <div className="lb-skeleton" style={{ width: 40, height: 16 }} />
              </div>
            ))
          ) : rows.map((row, i) => {
            const score = Number(row.total_score)
            const pct   = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
            return (
              <div key={row.team_id} className={`lb-board-row${i < 3 ? ' top' : ''}`}>
                <span className="lb-rank">{MEDALS[i] ?? `${i + 1}.`}</span>
                <div className="lb-team">
                  <strong>{row.team_name}</strong>
                  {row.city && <span>{row.city}</span>}
                </div>
                <div className="lb-bar-wrap">
                  <div className="lb-bar">
                    <div className="lb-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="lb-score">{score.toFixed(1)}</span>
              </div>
            )
          })}
        </div>

        {/* ── CTA ── */}
        <div className="lb-cta">
          <p>Хочеш потрапити до таблиці?</p>
          <Link to="/register" className="lb-cta-btn">Зареєструватись та взяти участь</Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}

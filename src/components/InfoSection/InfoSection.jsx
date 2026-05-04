import { useEffect, useRef, useState } from 'react'
import { getPlatformStats } from '@utils/authApi'

function smartFloor(n) {
  if (n < 10)   return { value: n,                          suffix: '' }
  if (n < 100)  return { value: Math.floor(n / 10)  * 10,  suffix: '+' }
  if (n < 1000) return { value: Math.floor(n / 100) * 100, suffix: '+' }
  return               { value: Math.floor(n / 1000),       suffix: 'K+' }
}

const FALLBACK_STATS = [
  { value: 0, suffix: '', label: 'зареєстрованих учасників' },
  { value: 0, suffix: '', label: 'турнірів на платформі' },
  { value: 0, suffix: '', label: 'завершених турнірів' },
  { value: 0, suffix: '', label: 'усього створено команд' },
]

const STATS_FROM_BACKEND = import.meta.env.VITE_HERO_STATS_FROM_BACKEND === 'true'

function mapBackendStats(data) {
  const entries = [
    { raw: data.participants        ?? 0, label: 'зареєстрованих учасників' },
    { raw: data.tournamentsTotal    ?? 0, label: 'турнірів на платформі' },
    { raw: data.tournamentsFinished ?? 0, label: 'завершених турнірів' },
    { raw: data.teams               ?? 0, label: 'усього створено команд' },
  ]
  return entries.map(({ raw, label }) => ({ ...smartFloor(raw), label }))
}

function useCountUp(target, duration = 1400, started = false) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!started) return
    let startTime = null
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
      else setCount(target)
    }
    requestAnimationFrame(step)
  }, [started, target, duration])

  return count
}

function StatItem({ value, suffix, label, started }) {
  const count = useCountUp(value, 1300, started)
  return (
    <div className="info-stat">
      <span className="info-stat_value">{count}{suffix}</span>
      <span className="info-stat_label">{label}</span>
    </div>
  )
}

function InfoSection() {
  const ref = useRef(null)
  const [started, setStarted] = useState(false)
  const [stats, setStats] = useState(FALLBACK_STATS)

  // Завантаження статистики з бекенду (якщо увімкнено)
  useEffect(() => {
    if (!STATS_FROM_BACKEND) return
    getPlatformStats()
      .then((data) => setStats(mapBackendStats(data)))
      .catch(() => { /* fallback вже встановлений */ })
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect() } },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="info-section" ref={ref}>
      <div className="container">
        <div className="info-content">
          <div className="info-logo">
            <span className="info-logo-text">Code League</span>
          </div>
          <p className="contact_description">
            Платформа для чесних турнірів з програмування. Команди змагаються,
            вдосконалюють навички та демонструють свій рівень у реальних умовах.
          </p>
        </div>

        <div className="info-stats">
          {stats.map((s) => (
            <StatItem key={s.label} {...s} started={started} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default InfoSection

import { useEffect, useRef, useState } from 'react'
import { getPlatformStats } from '@utils/authApi'

/** Округлення вниз до найближчого кратного 100: 536→500, 556→500, 601→600 */
function floorTo100(n) {
  return Math.floor(n / 100) * 100
}

const FALLBACK_STATS = [
  { value: 500,  suffix: '+', label: 'активних учасників' },
  { value: 120,  suffix: '+', label: 'завдань на платформі' },
  { value: 40,   suffix: '+', label: 'проведених турнірів' },
  { value: 98,   suffix: '%', label: 'задоволених командою' },
]

const STATS_FROM_BACKEND = import.meta.env.VITE_HERO_STATS_FROM_BACKEND === 'true'

function mapBackendStats(data) {
  return [
    { value: floorTo100(data.users ?? 500),       suffix: '+', label: 'активних учасників' },
    { value: floorTo100(data.tasks ?? 120),        suffix: '+', label: 'завдань на платформі' },
    { value: floorTo100(data.tournaments ?? 40),   suffix: '+', label: 'проведених турнірів' },
    { value: floorTo100(data.teams ?? 98),         suffix: '+', label: 'активних команд' },
  ]
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

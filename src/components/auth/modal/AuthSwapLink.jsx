import { flushSync } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'

/**
 * Лінк між /login ↔ /register з плавним переходом.
 * - Якщо браузер підтримує View Transitions API → крос-фейд snapshot-ами.
 *   flushSync гарантує що React встиг перерендерити нову сторінку до моменту
 *   коли API робить snapshot — інакше snapshot захопить стару DOM і буде блимання.
 * - Інакше → звичайна навігація + CSS fade-in.
 */
export default function AuthSwapLink({ to, children, ...rest }) {
  const navigate = useNavigate()

  const onClick = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (e.button !== undefined && e.button !== 0) return

    e.preventDefault()

    const supportsVT = typeof document !== 'undefined'
      && typeof document.startViewTransition === 'function'

    if (supportsVT) {
      document.startViewTransition(() => {
        flushSync(() => navigate(to))
      })
    } else {
      navigate(to)
    }
  }

  return (
    <Link to={to} onClick={onClick} {...rest}>
      {children}
    </Link>
  )
}

import { Link } from 'react-router-dom'
import Header from '@components/Header'
import Footer from '@components/Footer'
import '@styles/components/not-found-page.css'

export default function NotFoundPage() {
  return (
    <div className="nf-page">
      <Header />

      <main className="nf-main">
        <section className="nf-hero container">
          <div className="nf-copy">
            <span className="nf-kicker">404 Error</span>
            <h1 className="nf-title">
              Сторінку не знайдено
            </h1>
            <p className="nf-text">
              Сторінку не знайдено. Можливо, вона була видалена або тимчасово недоступна. Спробуйте повернутися на головну сторінку або відкрити панель керування.
            </p>

            <div className="nf-actions">
              <Link to="/" className="nf-btn nf-btn-primary">На головну</Link>
              <Link to="/dashboard" className="nf-btn nf-btn-secondary">Відкрити кабінет</Link>
            </div>
          </div>

          <div className="nf-art" aria-hidden="true">
            <div className="nf-code-bg">404</div>
            <div className="nf-card">
              <div className="nf-card-badge">Not Found</div>
              <div className="nf-card-line" />
              <div className="nf-card-line nf-card-line-short" />
              <div className="nf-card-glow" />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

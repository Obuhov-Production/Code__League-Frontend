import { Link } from 'react-router-dom'
import ctaBlock from '@images/cta/cta-block.svg'

function CTASection() {
  return (
    <section className="cta-section">
      <div className="container">
        <div className="cta-section_content">
          <h2 className="cta-section_title">
            Хто зараз на вершині?
          </h2>
          <p className="cta-section_description">
            Дивись таблицю лідерів, та результати завершених турнірів прямо тут і
            зараз. Хочеш потрапити туди сам? Реєструйся і бери участь! Саме час 
            показати всім, на що ти здатен!
          </p>
          <div className="cta-section_actions">
            <Link to="/leaderboard" className="cta-section_button">Переглянути лідерів</Link>
            <a href="/login" className="cta-section_button cta-section_button--outline">Почати змагатись</a>
          </div>
        </div>
        <img src={ctaBlock} alt="CTA Block" className="cta-section_image" />

      </div>
    </section>
  )
}

export default CTASection

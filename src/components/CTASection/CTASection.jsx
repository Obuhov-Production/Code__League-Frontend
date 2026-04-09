import ctaBlock from '@images/cta/cta-block.svg'

function CTASection() {
  return (
    <section className="cta-section">
      <div className="container">
        <div className="cta-section_content">
          <h2 className="cta-section_title">
            Активна модерація спільноти
          </h2>
          <p className="cta-section_description">
            Ми щодня перевіряємо й фільтруємо весь контент, щоб
            ви не бачили того, чого не хочете. Якщо щось порушує
            правила — воно швидко видаляється, та ваші змагання
            лишається безпечними та комфортними.
          </p>
          <a href="/login" className="cta-section_button">Почати змагатись зараз!</a>
        </div>
        <img src={ctaBlock} alt="CTA Block" className="cta-section_image" />

      </div>
    </section>
  )
}

export default CTASection

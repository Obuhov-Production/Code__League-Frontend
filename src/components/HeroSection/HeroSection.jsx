import heroImg from '@images/hero/hero-img.svg'

function HeroSection() {
  return (
    <section id="home" className="hero">
      <div className="container">
        <div className="hero-content">
          <div className="hero-image">
            <img src={heroImg} alt="Code League Platform" />
          </div>
          
          <div className="hero-text">
            <h1 className="hero-title">
              Code League — платформа для турнірів з програмування
            </h1>
            <p className="hero-description">
              Змагайся, розвивайся та доводь свій рівень у чесному код-турнірі. 
              Реєструй команду, виконуй завдання та піднімайся в таблиці лідерів.
            </p>
            <a href="/login" className="hero-button">Клік* щоб почати</a>
          </div>
        </div>

        <div className="hero-decor hero-decor--1"></div>
        <div className="hero-decor hero-decor--2"></div>
      </div>
    </section>
  )
}

export default HeroSection

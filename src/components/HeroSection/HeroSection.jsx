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
              Code League — арена для справжніх розробників!
            </h1>
            <p className="hero-description">
              Змагайся в турнірах з програмування, збирай команду, 
              виконуй завдання та доводь свій рівень у чесному кодінгу.
            </p>
            <a href="/login" className="hero-button">Почати змагатись →</a>
          </div>
        </div>

        <div className="hero-decor hero-decor--1"></div>
        <div className="hero-decor hero-decor--2"></div>
      </div>
    </section>
  )
}

export default HeroSection

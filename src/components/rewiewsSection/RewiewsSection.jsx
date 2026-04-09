import { useState, useRef, useEffect } from 'react'

const reviewsData = [
  {
    id: 1,
    text: 'Дуже зручна та інтуїтивно зрозуміла платформа. Турніри проходять чесно, а завдання цікаві та різноманітні.',
    author: 'Bershov Kostyantyn',
    role: 'Головний Розробник',
  },
  {
    id: 2,
    text: 'Сижу на чілі разом з степаном.',
    author: 'Goroviy Volodymyr',
    role: 'Фидер команди',
  },
  {
    id: 3,
    text: 'Нам кажуть шо відгуки не справжні, справжні! ми не крутимо їх, ми їх не купуємо, вони просто є, і вони класні!',
    author: 'Parfenov Stepan',
    role: 'Головний баласт команди',
  },
  {
    id: 3,
    text: 'Писав код поки не заснув створив топ проект!',
    author: 'Shkurko Igor',
    role: 'Головний розробник',
  },
  {
    id: 3,
    text: 'Поки робив дізайн задовбався 40 раз сходив в магазин (і це все за 20хв)!',
    author: 'Palamarchuk Michalo',
    role: 'Дизайнер',
  },
]

function ReviewCard({ review }) {
  return (
    <div className="reviews_card">
      <div className="reviews_card-bubble">
        <p className="reviews_card-text">{review.text}</p>
        <div className="reviews_card-tail">
          <svg viewBox="0 0 40 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 0 L20 30 L40 0"
              stroke="var(--main_color)"
              strokeWidth="1.5"
              strokeOpacity="0.35"
              fill="var(--color_dark)"
            />
          </svg>
        </div>
      </div>
      <div className="reviews_card-author">
        <span className="reviews_card-name">{review.author}</span>
        <span className="reviews_card-role">{review.role}</span>
      </div>
    </div>
  )
}

function RewiewsSection() {
  const totalSlides = reviewsData.length
  // Internal index: 0..totalSlides-1 = cloned tail, totalSlides..2*totalSlides-1 = real, 2*totalSlides..3*totalSlides-1 = cloned head
  const [pos, setPos] = useState(totalSlides) // start at 1st real card
  const [isTransitioning, setIsTransitioning] = useState(false)
  const trackRef = useRef(null)

  // Build looped array: [...clonedTail, ...real, ...clonedHead]
  const loopedSlides = [...reviewsData, ...reviewsData, ...reviewsData]

  // Real index for dots (0..totalSlides-1)
  const realIndex = ((pos % totalSlides) + totalSlides) % totalSlides

  const goTo = (newPos) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setPos(newPos)
  }

  const goPrev = () => goTo(pos - 1)
  const goNext = () => goTo(pos + 1)

  // When transition ends, silently jump if we're in clone zone
  const handleTransitionEnd = () => {
    setIsTransitioning(false)
    if (pos < totalSlides) {
      // In cloned tail — jump to real zone (no animation)
      trackRef.current.style.transition = 'none'
      setPos(pos + totalSlides)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (trackRef.current) trackRef.current.style.transition = ''
        })
      })
    } else if (pos >= 2 * totalSlides) {
      // In cloned head — jump to real zone
      trackRef.current.style.transition = 'none'
      setPos(pos - totalSlides)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (trackRef.current) trackRef.current.style.transition = ''
        })
      })
    }
  }

  // Dot click — go to the corresponding real card
  const goToDot = (dotIndex) => {
    if (isTransitioning) return
    const diff = dotIndex - realIndex
    goTo(pos + diff)
  }

  // Touch/swipe support
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext()
      else goPrev()
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  return (
    <section className="reviews-section" id="reviews">
      <div className="container">
        <div className="reviews_wrapper">
          <div
            className="reviews_viewport"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="reviews_track"
              ref={trackRef}
              onTransitionEnd={handleTransitionEnd}
              style={{
                transform: `translateX(calc(-${pos} * (var(--card-width) + var(--card-gap))))`,
              }}
            >
              {loopedSlides.map((review, i) => (
                <ReviewCard key={`${review.id}-${i}`} review={review} />
              ))}
            </div>
          </div>

          <div className="reviews_controls">
            <button
              className="reviews_arrow reviews_arrow--prev"
              onClick={goPrev}
              aria-label="Попередній відгук"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="reviews_dots">
              {reviewsData.map((_, index) => (
                <button
                  key={index}
                  className={`reviews_dot ${realIndex === index ? 'reviews_dot--active' : ''}`}
                  onClick={() => goToDot(index)}
                  aria-label={`Перейти до відгуку ${index + 1}`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0L9.8 5.2L15.6 5.2L10.9 8.8L12.4 14L8 11L3.6 14L5.1 8.8L0.4 5.2L6.2 5.2Z" />
                  </svg>
                </button>
              ))}
            </div>

            <button
              className="reviews_arrow reviews_arrow--next"
              onClick={goNext}
              aria-label="Наступний відгук"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="reviews_cta">
            <button className="reviews_cta-btn">Залишити відгук</button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default RewiewsSection
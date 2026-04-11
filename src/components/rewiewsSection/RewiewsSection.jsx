import { useState, useRef, useEffect } from 'react'

const reviewsData = [
  {
    id: 1,
    rating: 5,
    text: 'Платформа справді зручна: швидко зареєструвався, одразу приєднався до турніру і без проблем відслідковував свій прогрес.',
    author: 'Андрій Коваленко',
    role: 'Користувач',
  },
  {
    id: 2,
    rating: 5,
    text: 'Сподобалась структура завдань: є і прості для розігріву, і складніші на логіку. Інтерфейс чистий, нічого не відволікає.',
    author: 'Марина Савчук',
    role: 'Користувач',
  },
  {
    id: 3,
    rating: 5,
    text: 'Найбільше зайшло те, що результати оновлюються в реальному часі. Видно свій рейтинг і чітко розумієш, що підтягнути.',
    author: 'Дмитро Литвин',
    role: 'Користувач',
  },
  {
    id: 4,
    rating: 5,
    text: 'Використовували Code League для внутрішнього командного челенджу. Все стабільно працювало, а учасники були реально залучені.',
    author: 'Ірина Бойко',
    role: 'Користувач',
  },
  {
    id: 5,
    rating: 5,
    text: 'Окремий плюс за адаптивність: з телефона теж зручно проходити завдання і переглядати статистику без зламаної верстки.',
    author: 'Назар Ткаченко',
    role: 'Користувач',
  },
]

function Stars({ count }) {
  return (
    <div className="reviews_stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`reviews_star${n <= count ? ' reviews_star--on' : ''}`}>★</span>
      ))}
    </div>
  )
}

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
        <div className="reviews_card-author-info">
          <span className="reviews_card-name">{review.author}</span>
          <span className="reviews_card-role">{review.role}</span>
        </div>
        <Stars count={review.rating ?? 5} />
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
            <a href="/reviews" className="reviews_cta-btn">Залишити відгук</a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default RewiewsSection
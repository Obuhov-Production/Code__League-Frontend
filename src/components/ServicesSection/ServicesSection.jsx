import { useState, useEffect, useCallback } from 'react'
import imgMagnifier from '@images/services/magnifier.svg'
import imgMessages from '@images/services/messages.svg'
import imgIllustration from '@images/services/illustration.svg'
import imgBrowser from '@images/services/browser.svg'
import imgEmoticon from '@images/services/emoticon.svg'
import imgAnalytics from '@images/services/analytics.svg'
import arrowPurple from '@images/icons/arrow-purple.svg'
import arrowWhite from '@images/icons/arrow-white.svg'

/**
 * Service card config — data-driven rendering.
 * Each card defines its variant, content and modal detail.
 */
const SERVICES = [
  {
    variant: 'light',
    title: ['Легкий початок', 'на платформі'],
    linkText: 'Почати',
    image: imgMagnifier,
    alt: 'Легкий початок',
    detail: {
      heading: 'Легкий початок на платформі',
      body: 'Code League розроблена так, щоб навіть новачок зміг зареєструватись і одразу взяти участь у своєму першому турнірі протягом кількох хвилин.',
      features: [
        'Реєстрація за пару хвилин',
        'Легкий вибір першого турніру',
        'Інтерактивна платфорама для новачків',
        'Проекти будь-якого рівня складності',
      ],
    },
  },
  {
    variant: 'light',
    title: ['Комунікація', 'гравців'],
    linkText: 'Читати більше',
    image: imgMessages,
    alt: 'Комунікація',
    detail: {
      heading: 'Комунікація гравців',
      body: 'Вбудований чат, командні канали та особисті повідомлення — спілкуйся з іншими учасниками прямо в платформі без сторонніх інструментів.',
      features: [
        'Свій чат для кожного турніру',
        'Окремий чат для нашої спільноти',
        'Сповіщення про виклики та матчі',
        'Кастомізація профілю та статусу',
      ],
    },
  },
  {
    variant: 'purple',
    title: ['Цікавий ігровий', 'контент'],
    linkText: 'Читати більше',
    image: imgIllustration,
    alt: 'Ігровий контент',
    highlightDark: true,
    detail: {
      heading: 'Цікавий ігровий контент',
      body: 'Щотижневі задачі, марафонські хакатони, бос-раунди та сезонні ліги — платформа постійно генерує новий контент, щоб тобі ніколи не було нудно.',
      features: [
        'Щотижневі задачі та марафони',
        'Сезонні ліги з програмуванням',
        'Фінальні турніри на лан зустрічах',
        'Колекційні значки та досягнення',
      ],
    },
  },
  {
    variant: 'purple',
    title: ['Зручність нашої', 'платформи'],
    linkText: 'Читати більше',
    image: imgBrowser,
    alt: 'Зручність платформи',
    highlightDark: true,
    detail: {
      heading: 'Зручність нашої платформи',
      body: 'Зручний інтерфейс, адаптований під всі пристрої. Повноцінний редактор коду прямо в браузері — не потрібно нічого встановлювати.',
      features: [
        'Інтеграції популярних платформ для вашогї зручності',
        'Окремий Workspace для кожного турніру',
        'Зручний дизайн (mobile/tablet/desktop)',
        'Мульти задачність та швидкий доступ до ресурсів',
      ],
    },
  },
  {
    variant: 'dark',
    title: ['Практичний досвід', 'програмування'],
    linkText: 'Читати більше',
    image: imgEmoticon,
    alt: 'Практичний досвід',
    detail: {
      heading: 'Практичний досвід програмування',
      body: 'Реальні задачі з індустрії: алгоритми, структури даних, системне проектування. Кожна задача — це цегла у твоєму портфоліо.',
      features: [
        'Задачі з від реальних програмістів та компаній',
        'Розбір рішень після закінчення раунду',
        'Професійне оцінювання ваших проектів кваліфікованими суддями',
        'Можливість отримати допомогу та поради від спільноти',
      ],
    },
  },
  {
    variant: 'dark',
    title: ['Статистика всіх', 'турнірів'],
    linkText: 'Читати більше',
    image: imgAnalytics,
    alt: 'Статистика турнірів',
    detail: {
      heading: 'Статистика всіх турнірів',
      body: 'Детальна аналітика кожного матчу, рейтингові таблиці, графіки прогресу і порівняння з іншими гравцями — все в одному місці.',
      features: [
        'Персональна статистика та рейтинг ELO',
        'Глобальні та регіональні лідерборди',
        'Поточна статистика ваших турнірів',
        'Звіти після кожного турніру',
      ],
    },
  },
]

/* ─── Service Detail Modal ─────────────────────────────── */
function ServiceModal({ service, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const stopProp = useCallback((e) => e.stopPropagation(), []);
  const { variant, image, alt, detail } = service;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-box modal-box--${variant}`}
        onClick={stopProp}
        role="dialog"
        aria-modal="true"
        aria-label={detail.heading}
      >
        <button className="modal-close" onClick={onClose} aria-label="Закрити">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <img src={image} alt={alt} className="modal-image" />
        <h2 className="modal-title">{detail.heading}</h2>
        <p className="modal-body">{detail.body}</p>

        <ul className="modal-features">
          {detail.features.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>

        <a href="/register" className="modal-cta">
          Почати зараз
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      </div>
    </div>
  )
}

/* ─── Service Card ─────────────────────────────────────── */
function ServiceCard({ variant, title, linkText, image, alt, highlightDark, onOpen }) {
  const isDark = variant === 'dark'
  const highlightClass = highlightDark ? 'highlight highlight--dark' : 'highlight'
  const arrowIcon = isDark ? arrowWhite : arrowPurple
  const linkClass = isDark
    ? 'service-card_link service-card_link--light'
    : 'service-card_link'

  return (
    <div className={`service-card service-card--${variant}`}>
      <div className="service-card_content">
        <h3 className="service-card_title">
          {title.map((line, i) => (
            <span key={i} className={highlightClass}>{line}</span>
          ))}
        </h3>
        <button
          type="button"
          className={linkClass}
          onClick={onOpen}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <img src={arrowIcon} alt="" className="service-card_arrow" />
          {linkText}
        </button>
      </div>
      <div className="service-card_image">
        <img src={image} alt={alt} />
      </div>
    </div>
  )
}

/* ─── Services Section ────────────────────────────────── */
function ServicesSection() {
  const [active, setActive] = useState(null)

  return (
    <section id="services" className="services-section">
      <div className="container">
        <div className="services-grid">
          {SERVICES.map((card, index) => (
            <ServiceCard
              key={index}
              {...card}
              onOpen={() => setActive(card)}
            />
          ))}
        </div>
      </div>

      {active && (
        <ServiceModal
          service={active}
          onClose={() => setActive(null)}
        />
      )}
    </section>
  )
}

export default ServicesSection

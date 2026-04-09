import { useState, useEffect, useCallback } from 'react'
import arrowPurple from '@images/icons/arrow-purple.svg'

/**
 * About column data — data-driven rendering.
 */
const ABOUT_COLUMNS = [
  {
    text: `Наш проект дозволяє програмістам працювати над реальними завданнями,
      отримувати зворотній зв'язок та вдосконалювати свої навички в умовах
      чесної конкуренції. Ми створили платформу, де кожен може знайти
      цікаві виклики, об'єднатися в команди та змагатися за звання найкращого
      програміста.`,
    detail: {
      heading: 'Реальні виклики, реальний ріст',
      body: 'Ми переконані, що найкраще навчання відбувається в умовах справжньої конкуренції. Кожне завдання на платформі — це реальна задача, яку можна зустріти у продакшн-середовищі.',
      features: [
        'Завдання від реальних компаній-партнерів',
        'Peer-review: оцінюй рішення інших',
        'Детальний фідбек після кожного раунду',
        'Система рейтингу та прогресу',
      ],
    },
  },
  {
    text: `Наша платформа — це не просто місце для змагань, а спільнота однодумців,
      які прагнуть розвиватися та вдосконалювати свої навички. Ми віримо,
      що чесна конкуренція та співпраця допомагають програмістам досягати нових висот
      і створювати інноваційні рішення для реальних задач.`,
    detail: {
      heading: 'Спільнота однодумців',
      body: 'Code League — це місце, де ти зустрінеш людей, які так само захоплені програмуванням як і ти. Тут народжуються команди, стартапи і справжні дружби.',
      features: [
        '10 000+ активних учасників',
        'Команди та клани по інтересах',
        'Відкриті та закриті турніри',
        'Менторство від провідних розробників',
      ],
    },
  },
  {
    text: `Ми прагнемо створити середовище, де кожен програміст може знайти підтримку,
      натхнення та можливості для зростання. Наша мета — допомогти вам розкрити
      свій потенціал, знайти однодумців та досягти нових висот у світі програмування.`,
    detail: {
      heading: 'Твій потенціал без обмежень',
      body: 'Незалежно від того, чи ти новачок або досвідчений інженер — тут завжди є місце для росту. Платформа адаптується до твого рівня та допомагає рухатись вперед.',
      features: [
        'Адаптивна складність завдань',
        'Персональна дорожня карта навчання',
        'Сертифікати досягнень',
        'Стипендії та призи переможцям',
      ],
    },
  },
]

/* ─── AboutModal ─────────────────────────────────────── */
function AboutModal({ col, onClose }) {
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box modal-box--dark"
        onClick={stopProp}
        role="dialog"
        aria-modal="true"
        aria-label={col.detail.heading}
      >
        <button className="modal-close" onClick={onClose} aria-label="Закрити">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <h2 className="modal-title">{col.detail.heading}</h2>
        <p className="modal-body">{col.detail.body}</p>

        <ul className="modal-features">
          {col.detail.features.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>

        <a href="/register" className="modal-cta">
          Приєднатись
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      </div>
    </div>
  );
}

/* ─── AboutColumn ────────────────────────────────────── */
function AboutColumn({ col, onOpen }) {
  return (
    <div className="about-box">
      <p className="about-description">{col.text}</p>
      <button
        type="button"
        className="about-link"
        onClick={onOpen}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        Читати більше
        <img src={arrowPurple} alt="" className="about-link_arrow" />
      </button>
    </div>
  );
}

/* ─── AboutSection ───────────────────────────────────── */
function AboutSection() {
  const [active, setActive] = useState(null);

  return (
    <section id="about" className="about-section">
      <div className="about-container">
        <h2 className="about-title">Про наш проект</h2>
        {ABOUT_COLUMNS.map((col, index) => (
          <div key={index} style={{ display: 'contents' }}>
            {index > 0 && <hr className="vertecal-hr" />}
            <AboutColumn col={col} onOpen={() => setActive(col)} />
          </div>
        ))}
      </div>

      {active && (
        <AboutModal col={active} onClose={() => setActive(null)} />
      )}
    </section>
  );
}

export default AboutSection

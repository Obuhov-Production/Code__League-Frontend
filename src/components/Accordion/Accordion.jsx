import { useEffect, useState, useRef, useLayoutEffect } from 'react'

const accordionData = [
  {
    number: '01',
    title: 'Початок',
    summary: 'Реєстрація і налаштування профілю',
    description: 'Реєструєтесь на платформі, налаштовуєте профіль та обираєте рівень складності. Вже за кілька хвилин ви готові до першого турніру.',
  },
  {
    number: '02',
    title: 'Реєстрація на турнір',
    summary: 'Обирай турнір і збирай команду',
    description: 'Знайдіть актуальний турнір зі списку, ознайомтесь з умовами та зареєструйте свою команду або приєднайтесь індивідуально — все в кілька кліків.',
  },
  {
    number: '03',
    title: 'Участь у турнірі',
    summary: 'Кодиш у браузері, змагаєшся в реальному часі',
    description: 'Отримуєте завдання, пишете код прямо в браузері та змагаєтесь у реальному часі. Слідкуйте за рейтинговою таблицею та вдосконалюйте рішення до фіналу.',
  },
  {
    number: '04',
    title: 'Типи завдань',
    summary: 'Алгоритми, веб, аналіз даних та хакатони',
    description: 'Веб-проекти, алгоритмічні задачі, аналіз даних та командні хакатони — різноманітні формати для будь-якого рівня, від джуна до сеньйора.',
  },
]

function AccordionItem({ item, isOpen, onToggle }) {
  const bodyRef = useRef(null)
  const [, rerender] = useState()
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)')
    const onChange = (e) => setIsMobile(e.matches)

    if (media.addEventListener) media.addEventListener('change', onChange)
    else media.addListener(onChange)

    return () => {
      if (media.removeEventListener) media.removeEventListener('change', onChange)
      else media.removeListener(onChange)
    }
  }, [])

  // Force re-render after mount so bodyRef.current is available for scrollHeight
  useLayoutEffect(() => { rerender({}) }, [])

  const bodyStyle = {
    height: isOpen ? bodyRef.current?.scrollHeight ?? 0 : 0,
    paddingBottom: isOpen ? (isMobile ? 14 : 28) : 0,
  }

  return (
    <div className={`accordion-item ${isOpen ? 'accordion-item--active' : ''}`}>
      <button
        className="accordion-item_header"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="accordion-item_number">{item.number}</span>
        <span className="accordion-item_title">
          {item.title}
          <span className={`accordion-item_subtitle ${isOpen ? 'accordion-item_subtitle--hidden' : ''}`}>
            {' — '}
            {item.summary}
          </span>
        </span>
        <span className={`accordion-item_icon ${isOpen ? 'accordion-item_icon--open' : ''}`}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line className="accordion-item_icon-h" x1="0" y1="9" x2="18" y2="9" stroke="currentColor" strokeWidth="2.5" />
            <line className="accordion-item_icon-v" x1="9" y1="0" x2="9" y2="18" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        </span>
      </button>

      <div ref={bodyRef} className="accordion-item_body" style={bodyStyle}>
        <div className="accordion-item_divider"></div>
        <p className="accordion-item_text">{item.description}</p>
      </div>
    </div>
  )
}

function Accordion() {
  const [openIndex, setOpenIndex] = useState(0)

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? -1 : index)
  }

  return (
    <div className="accordion">
      {accordionData.map((item, index) => (
        <AccordionItem
          key={item.number}
          item={item}
          isOpen={openIndex === index}
          onToggle={() => toggle(index)}
        />
      ))}
    </div>
  )
}

export default Accordion

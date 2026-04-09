import { useState, useRef, useLayoutEffect } from 'react'

const accordionData = [
  {
    number: '01',
    title: 'Початок',
    description:
      'Ви реєструєтесь на нашій платформі та налаштовуєте свій профіль. для початку участі в турнірах.',
  },
  {
    number: '02',
    title: 'Реєстрація на турнір',
    description: 'Після створення профіля користувача, ви можете зареєструватися на турнір, вибравши його зі списку доступних турнірів на платформі. та заповнивши необхідну форму.',
  },
  {
    number: '03',
    title: 'Участь у турнірі',
    description: 'Коли турнір розпочинається, ви отримуєте завдання та починаєте змагатися з іншими учасниками. Ви можете виконувати завдання, покращувати свої навички та підніматися в рейтингу турніру.',
  },
  {
    number: '04',
    title: 'Типи завдань',
    description: 'На платформі ви можете зустріти різноманітні типи завдань, такі як розробка веб-проектів, аналіз даних, тестування програмного забезпечення та інші.',
  },
]

function AccordionItem({ item, isOpen, onToggle }) {
  const bodyRef = useRef(null)
  const [, rerender] = useState()

  // Force re-render after mount so bodyRef.current is available for scrollHeight
  useLayoutEffect(() => { rerender({}) }, [])

  const bodyStyle = {
    height: isOpen ? bodyRef.current?.scrollHeight ?? 0 : 0,
    paddingBottom: isOpen ? 28 : 0,
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
            {' - '}
            {item.description}
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

import { useState, useRef, useLayoutEffect } from 'react'
import illustrationSvg from '@images/contact/Illustration.svg'
import { useToast } from '@utils/toast.jsx'

// Лімітувальний індикатор з progress-bar (стиль як на TabProfile)
function CharCounter({ value, max }) {
  const len = value?.length ?? 0
  const pct = Math.min(100, (len / max) * 100)
  const warn = len >= max * 0.9
  return (
    <div className="contact_char-counter">
      <div className="contact_char-bar-wrap">
        <div
          className="contact_char-bar"
          style={{
            width: `${pct}%`,
            background: warn ? '#f87171' : 'var(--main_color)',
          }}
        />
      </div>
      <span className="contact_char-count" style={warn ? { color: '#f87171' } : undefined}>
        {len} / {max}
      </span>
    </div>
  )
}

const MESSAGE_MAX = 256
const DETAILS_MAX = 512

function ProblemForm({ formData, handleChange }) {
  return (
    <>
      <div className="contact_field">
        <label className="contact_label" htmlFor="contact-name">Ваше ім'я*</label>
        <input
          className="contact_input"
          type="text"
          id="contact-name"
          name="name"
          placeholder="Ваше ім'я"
          value={formData.name}
          onChange={handleChange}
        />
      </div>

      <div className="contact_field">
        <label className="contact_label" htmlFor="contact-email">Електронна пошта*</label>
        <input
          className="contact_input"
          type="email"
          id="contact-email"
          name="email"
          placeholder="Електронна пошта"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="contact_field">
        <label className="contact_label" htmlFor="contact-message">Опис проблеми*</label>
        <textarea
          className="contact_textarea"
          id="contact-message"
          name="message"
          placeholder="Опишіть вашу проблему"
          value={formData.message}
          onChange={handleChange}
          required
          rows="5"
          maxLength={MESSAGE_MAX}
        />
        <CharCounter value={formData.message} max={MESSAGE_MAX} />
      </div>
    </>
  )
}

function QuoteForm({ formData, handleChange }) {
  return (
    <>
      <div className="contact_field">
        <label className="contact_label" htmlFor="quote-name">Ваше ім'я*</label>
        <input
          className="contact_input"
          type="text"
          id="quote-name"
          name="name"
          placeholder="Ваше ім'я"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="contact_field">
        <label className="contact_label" htmlFor="quote-email">Електронна пошта*</label>
        <input
          className="contact_input"
          type="email"
          id="quote-email"
          name="email"
          placeholder="Електронна пошта"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="contact_field">
        <label className="contact_label" htmlFor="quote-company">Компанії в яких працювали*</label>
        <input
          className="contact_input"
          type="text"
          id="quote-company"
          name="company"
          placeholder="Компанії в яких працювали"
          value={formData.company}
          onChange={handleChange}
        />
      </div>

      <div className="contact_field">
        <label className="contact_label" htmlFor="quote-budget">Ваш рівень компетенції*</label>
        <input
          className="contact_input"
          type="text"
          id="quote-budget"
          name="budget"
          placeholder="Ваш рівень компетенції"
          value={formData.budget}
          onChange={handleChange}
          required
        />
      </div>

      <div className="contact_field">
        <label className="contact_label" htmlFor="quote-details">Трохи про вас*</label>
        <textarea
          className="contact_textarea"
          id="quote-details"
          name="details"
          placeholder="Розкажіть трохи про себе, ваш досвід та чому ви хочете приєднатись до нашої команди"
          value={formData.details}
          onChange={handleChange}
          required
          rows="4"
          maxLength={DETAILS_MAX}
        />
        <CharCounter value={formData.details} max={DETAILS_MAX} />
      </div>
    </>
  )
}

function ContactSection() {
  const toast = useToast()
  const [formType, setFormType] = useState('problem')
  const [problemData, setProblemData] = useState({ name: '', email: '', message: '' })
  const [joinTeamData, setJoinTeamData] = useState({ name: '', email: '', company: '', budget: '', details: '' })
  const [loading, setLoading] = useState(false)
  const fieldsRef = useRef(null)
  const [fieldsHeight, setFieldsHeight] = useState('auto')
  const isFirstRender = useRef(true)

  useLayoutEffect(() => {
    if (!fieldsRef.current) return
    const el = fieldsRef.current

    if (isFirstRender.current) {
      // First render — just measure, no animation
      setFieldsHeight(el.scrollHeight)
      isFirstRender.current = false
      return
    }

    // Disable transition, set to current rendered height
    const prevHeight = el.offsetHeight
    el.style.transition = 'none'
    el.style.height = prevHeight + 'px'

    // Force reflow, then measure new scrollHeight
    requestAnimationFrame(() => {
      el.style.height = 'auto'
      const newHeight = el.scrollHeight
      el.style.height = prevHeight + 'px'

      requestAnimationFrame(() => {
        el.style.transition = ''
        setFieldsHeight(newHeight)
      })
    })
  }, [formType])

  const handleProblemChange = (e) => {
    setProblemData({ ...problemData, [e.target.name]: e.target.value })
  }

  const handleJoinTeamChange = (e) => {
    setJoinTeamData({ ...joinTeamData, [e.target.name]: e.target.value })
  }

  const validate = (data) => {
    if (!data.name?.trim()) return "Введіть ваше ім'я"
    if (!data.email?.trim()) return 'Введіть електронну пошту'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) return 'Невірний формат email'
    if (formType === 'problem' && !data.message?.trim()) return 'Опишіть вашу проблему'
    if (formType === 'join_team' && !data.budget?.trim()) return 'Вкажіть рівень компетенції'
    if (formType === 'join_team' && !data.details?.trim()) return 'Розкажіть трохи про себе'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const activeData = formType === 'problem' ? problemData : joinTeamData

    const validationError = validate(activeData)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: formType, ...activeData }),
      })

      if (res.ok) {
        toast.success(formType === 'problem' ? 'Повідомлення відправлено!' : 'Заявку відправлено!')
        if (formType === 'problem') {
          setProblemData({ name: '', email: '', message: '' })
        } else {
          setJoinTeamData({ name: '', email: '', company: '', budget: '', details: '' })
        }
      } else if (res.status < 500) {
        const body = await res.json().catch(() => null)
        toast.error(body?.error ?? 'Перевірте введені дані')
      } else {
        toast.error('Серверна помилка, спробуй пізніше')
      }
    } catch {
      toast.error('Серверна помилка, спробуй пізніше')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="contact-section" id="contacts">
      <div className="container">
        <div className="contact_header">
          <h2 className="contact_title">
            <span className="contact_title-highlight">Contact Us</span>
          </h2>
          <p className="contact_description">
            Якщо у вас виникла проблема ви
            <br />
            завжди можете звязатись з нами
          </p>
        </div>

        <div className="contact_body">
          <form className="contact_form" onSubmit={handleSubmit}>
            <div className="contact_radios">
              <label className="contact_radio">
                <input
                  type="radio"
                  name="type"
                  value="problem"
                  checked={formType === 'problem'}
                  onChange={() => setFormType('problem')}
                />
                <span className="contact_radio-custom"></span>
                <span className="contact_radio-label">Проблема?</span>
              </label>
              <label className="contact_radio">
                <input
                  type="radio"
                  name="type"
                  value="join_team"
                  checked={formType === 'join_team'}
                  onChange={() => setFormType('join_team')}
                />
                <span className="contact_radio-custom"></span>
                <span className="contact_radio-label">Стати частиною команди</span>
              </label>
            </div>

            <div
              className="contact_fields-animate"
              ref={fieldsRef}
              style={{ height: fieldsHeight }}
            >
              {formType === 'problem' ? (
                <ProblemForm formData={problemData} handleChange={handleProblemChange} />
              ) : (
                <QuoteForm formData={joinTeamData} handleChange={handleJoinTeamChange} />
              )}
            </div>

            <button className="contact_submit" type="submit" disabled={loading}>
              {loading ? 'Відправляємо...' : formType === 'problem' ? 'Відправити нам' : 'Приєднатись до команди'}
            </button>
          </form>

          <div className="contact_illustration">
            <img src={illustrationSvg} alt="Contact illustration" />
          </div>
        </div>
      </div>
    </section>
  )
}

export default ContactSection

import { useState, useRef, useLayoutEffect } from 'react'
import illustrationSvg from '@images/contact/Illustration.svg'

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
        />
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
        />
      </div>
    </>
  )
}

function ContactSection() {
  const [formType, setFormType] = useState('problem')
  const [problemData, setProblemData] = useState({ name: '', email: '', message: '' })
  const [quoteData, setQuoteData] = useState({ name: '', email: '', company: '', budget: '', details: '' })
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

  const handleQuoteChange = (e) => {
    setQuoteData({ ...quoteData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
  }

  return (
    <section className="contact-section" id="contact">
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
                  value="quote"
                  checked={formType === 'quote'}
                  onChange={() => setFormType('quote')}
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
                <QuoteForm formData={quoteData} handleChange={handleQuoteChange} />
              )}
            </div>

            <button className="contact_submit" type="submit">
              {formType === 'problem' ? 'Не відправити нам' : 'Отримати пропозицію'}
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

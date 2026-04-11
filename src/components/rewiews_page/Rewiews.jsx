import { useEffect, useMemo, useState } from 'react'
import Header from '@components/Header'
import Footer from '@components/Footer'
import illustrationSvg from '@images/contact/Illustration.svg'
import { clearSession, createPublicReview, getMe, getPublicReviews, isLoggedIn } from '@utils/authApi'
import { useToast } from '@utils/toast.jsx'

const REVIEWS_CACHE_KEY = 'cl_reviews_cache_v1'
const STRIP_PROGRESS_KEY = 'cl_reviews_strip_progress_ms_v1'
const REVIEWS_BACKEND_COOLDOWN_KEY = 'cl_reviews_backend_cooldown_until_v1'
const STRIP_ANIMATION_DURATION = 60000
const BACKEND_COOLDOWN_MS = 120000

const PRESET_REVIEWS = [
	{
		id: 'seed-1',
		author: 'Андрій Коваленко',
		role: 'Користувач',
		text: 'Платформа зручна і зрозуміла. Швидко знайшов турнір, підключився і без зайвих кроків пройшов завдання.',
		createdAt: '2026-03-11T10:00:00.000Z',
	},
	{
		id: 'seed-2',
		author: 'Марина Савчук',
		role: 'Користувач',
		text: 'Подобається, що рейтинг і прогрес видно одразу. Це мотивує закривати задачі до кінця.',
		createdAt: '2026-03-15T10:00:00.000Z',
	},
	{
		id: 'seed-3',
		author: 'Дмитро Литвин',
		role: 'Користувач',
		text: 'Дизайн акуратний, все працює плавно і без лагів. З мобільного теж комфортно користуватись.',
		createdAt: '2026-03-20T10:00:00.000Z',
	},
	{
		id: 'seed-4',
		author: 'Ірина Бойко',
		role: 'Користувач',
		text: 'Ми запускали внутрішній командний челендж і всі учасники були залучені від старту до фіналу.',
		createdAt: '2026-03-22T10:00:00.000Z',
	},
	{
		id: 'seed-5',
		author: 'Назар Ткаченко',
		role: 'Користувач',
		text: 'З телефона теж все ок: адаптивність хороша, нічого не ламається, навігація проста.',
		createdAt: '2026-03-24T10:00:00.000Z',
	},
]

function normalizeReview(raw, index) {
	return {
		id: String(raw.id ?? raw._id ?? raw.reviewId ?? `generated-${index}`),
		author: (raw.author ?? raw.name ?? raw.username ?? 'Користувач').trim(),
		role: 'Користувач',
		text: (raw.text ?? raw.message ?? raw.comment ?? '').trim(),
		createdAt: raw.createdAt ?? raw.date ?? new Date().toISOString(),
	}
}

function extractReviews(payload) {
	if (Array.isArray(payload)) return payload
	if (Array.isArray(payload?.reviews)) return payload.reviews
	if (Array.isArray(payload?.data)) return payload.data
	return []
}

function mergeWithPreset(serverReviews) {
	const map = new Map()

	for (const item of PRESET_REVIEWS) {
		map.set(item.id, item)
	}

	for (const item of serverReviews) {
		if (!item.text) continue
		map.set(item.id, item)
	}

	return Array.from(map.values())
}

function buildFixedCount(items, count = 10) {
	const source = items.length ? items : PRESET_REVIEWS
	const out = []
	let i = 0

	while (out.length < count) {
		out.push(source[i % source.length])
		i += 1
	}

	return out
}

function ReviewBubble({ review }) {
	return (
		<article className="reviews-page_bubble">
			<p className="reviews-page_bubble-text">{review.text}</p>
			<div className="reviews-page_bubble-tail" aria-hidden="true" />
			<div className="reviews-page_meta">
				<span className="reviews-page_author">{review.author}</span>
				<span className="reviews-page_role">{review.role}</span>
			</div>
		</article>
	)
}

function RewiewsPage() {
	const toast = useToast()

	const [reviews, setReviews] = useState(PRESET_REVIEWS)
	const [loading, setLoading] = useState(true)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [checkingAuth, setCheckingAuth] = useState(true)
	const [isUserLoggedIn, setIsUserLoggedIn] = useState(isLoggedIn())
	const [savedAnimationMs] = useState(() => {
		const raw = Number(localStorage.getItem(STRIP_PROGRESS_KEY) || 0)
		return Number.isFinite(raw) && raw >= 0 ? raw % STRIP_ANIMATION_DURATION : 0
	})

	const [form, setForm] = useState({
		name: '',
		email: '',
		message: '',
	})

	const loadReviews = async () => {
		const data = await getPublicReviews()
		const normalized = extractReviews(data)
			.map(normalizeReview)
			.filter((item) => item.text)

		const merged = mergeWithPreset(normalized)
		setReviews(merged)
		localStorage.setItem(REVIEWS_CACHE_KEY, JSON.stringify(merged))
		sessionStorage.removeItem(REVIEWS_BACKEND_COOLDOWN_KEY)
	}

	useEffect(() => {
		const boot = async () => {
			const cached = localStorage.getItem(REVIEWS_CACHE_KEY)
			if (cached) {
				try {
					setReviews(JSON.parse(cached))
				} catch {
					setReviews(PRESET_REVIEWS)
				}
			}

			const cooldownUntil = Number(sessionStorage.getItem(REVIEWS_BACKEND_COOLDOWN_KEY) || 0)
			const shouldSkipServerCall = cooldownUntil > Date.now()

			if (shouldSkipServerCall) {
				setLoading(false)
				return
			}

			try {
				await loadReviews()
			} catch {
				sessionStorage.setItem(
					REVIEWS_BACKEND_COOLDOWN_KEY,
					String(Date.now() + BACKEND_COOLDOWN_MS),
				)
				if (!cached) setReviews(PRESET_REVIEWS)
			} finally {
				setLoading(false)
			}
		}

		boot()
	}, [])

	useEffect(() => {
		const startedAt = Date.now()
		const initial = savedAnimationMs

		const saveProgress = () => {
			const elapsed = (initial + (Date.now() - startedAt)) % STRIP_ANIMATION_DURATION
			localStorage.setItem(STRIP_PROGRESS_KEY, String(elapsed))
		}

		const id = setInterval(saveProgress, 1500)
		window.addEventListener('beforeunload', saveProgress)

		return () => {
			saveProgress()
			clearInterval(id)
			window.removeEventListener('beforeunload', saveProgress)
		}
	}, [savedAnimationMs])

	useEffect(() => {
		const checkAuth = async () => {
			if (!isLoggedIn()) {
				setIsUserLoggedIn(false)
				setCheckingAuth(false)
				return
			}

		try {
			const me = await getMe()
			setIsUserLoggedIn(true)
			setForm((prev) => ({
				...prev,
				name: prev.name || me?.username || me?.name || '',
				email: prev.email || me?.email || '',
			}))
		} catch {
			clearSession()
			setIsUserLoggedIn(false)
			toast.info('Сесія завершилась, увійдіть знову щоб залишити відгук')
		} finally {
			setCheckingAuth(false)
		}
	}

	checkAuth()
	}, [toast])

	const rotatingTen = useMemo(() => buildFixedCount(reviews, 10), [reviews])
	const loopedStrip = useMemo(() => [...rotatingTen, ...rotatingTen], [rotatingTen])

	const handleSubmit = async (e) => {
		e.preventDefault()

		if (!isUserLoggedIn) {
			toast.error('Щоб залишити відгук, потрібно увійти в акаунт')
			return
		}

		const name = form.name.trim()
		const email = form.email.trim()
		const message = form.message.trim()

		if (!name || !email || !message) {
			toast.error('Заповніть усі поля форми')
			return
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			toast.error('Вкажіть коректний email')
			return
		}

		setIsSubmitting(true)

		const payload = {
			name,
			email,
			text: message,
			role: 'Користувач',
		}

		try {
			const created = await createPublicReview(payload)
			const normalized = normalizeReview(created, 0)
			setReviews((prev) => {
				const merged = mergeWithPreset([normalized, ...prev])
				localStorage.setItem(REVIEWS_CACHE_KEY, JSON.stringify(merged))
				return merged
			})

			setForm({ name: '', email: '', message: '' })
			toast.success('Відгук успішно надіслано')

			loadReviews().catch(() => {})
		} catch (error) {
			sessionStorage.setItem(
				REVIEWS_BACKEND_COOLDOWN_KEY,
				String(Date.now() + BACKEND_COOLDOWN_MS),
			)
			toast.error(error.message || 'Не вдалося зберегти відгук на сервері')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className="App reviews-page">
			<Header />

			<main className="reviews-page_main">
				<section className="reviews-page_form-wrap" id="reviews">
					<div className="container">
						<div className="contact_body reviews-page_contact-body">
							<form className="contact_form reviews-page_contact-form" onSubmit={handleSubmit}>
								<div className="contact_radios">
									<label className="contact_radio">
										<input type="radio" name="review-form" checked readOnly />
										<span className="contact_radio-custom"></span>
										<span className="contact_radio-label">Створити відгук</span>
									</label>
								</div>

								<div className="contact_field">
									<label className="contact_label" htmlFor="reviews-name">Name</label>
									<input
										id="reviews-name"
										className="contact_input"
										value={form.name}
										onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
										placeholder="Name"
										required
									/>
								</div>

								<div className="contact_field">
									<label className="contact_label" htmlFor="reviews-email">Email*</label>
									<input
										id="reviews-email"
										className="contact_input"
										type="email"
										value={form.email}
										onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
										placeholder="Email"
										required
									/>
								</div>

								<div className="contact_field">
									<label className="contact_label" htmlFor="reviews-message">Message*</label>
									<textarea
										id="reviews-message"
										className="contact_textarea"
										value={form.message}
										onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
										placeholder="Message"
										rows={5}
										required
									/>
								</div>

								<button className="contact_submit" type="submit" disabled={isSubmitting || checkingAuth}>
									{isSubmitting ? 'Надсилаємо...' : 'Відправити відгук'}
								</button>

								{!isUserLoggedIn && !checkingAuth && (
									<p className="reviews-page_login-hint">Щоб залишити відгук, потрібно бути повністю залогіненим у акаунт.</p>
								)}
							</form>

							<div className="contact_illustration reviews-page_illustration">
								<img src={illustrationSvg} alt="Reviews illustration" />
							</div>
							</div>
						</div>
				</section>

				<section className="reviews-page_wall" aria-live="polite">
					{!loading && (
						<div
							className="reviews-page_strip reviews-page_strip--loop"
							style={{ animationDelay: `-${savedAnimationMs}ms` }}
						>
							{loopedStrip.map((review, idx) => (
								<ReviewBubble key={`loop-${review.id}-${idx}`} review={review} />
							))}
						</div>
					)}
				</section>
			</main>

			<Footer id="contacts" />
		</div>
	)
}

export default RewiewsPage

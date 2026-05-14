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
		rating: 5,
		text: 'Платформа зручна і зрозуміла. Швидко знайшов турнір, підключився і без зайвих кроків пройшов завдання.',
		createdAt: '2026-03-11T10:00:00.000Z',
	},
	{
		id: 'seed-2',
		author: 'Марина Савчук',
		role: 'Користувач',
		rating: 5,
		text: 'Подобається, що рейтинг і прогрес видно одразу. Це мотивує закривати задачі до кінця.',
		createdAt: '2026-03-15T10:00:00.000Z',
	},
	{
		id: 'seed-3',
		author: 'Дмитро Литвин',
		role: 'Користувач',
		rating: 5,
		text: 'Дизайн акуратний, все працює плавно і без лагів. З мобільного теж комфортно користуватись.',
		createdAt: '2026-03-20T10:00:00.000Z',
	},
	{
		id: 'seed-4',
		author: 'Ірина Бойко',
		role: 'Користувач',
		rating: 5,
		text: 'Ми запускали внутрішній командний челендж і всі учасники були залучені від старту до фіналу.',
		createdAt: '2026-03-22T10:00:00.000Z',
	},
	{
		id: 'seed-5',
		author: 'Назар Ткаченко',
		role: 'Користувач',
		rating: 5,
		text: 'З телефона теж все ок: адаптивність хороша, нічого не ламається, навігація проста.',
		createdAt: '2026-03-24T10:00:00.000Z',
	},
	{
		id: 'seed-6',
		author: 'Олексій Гриценко',
		role: 'Користувач',
		rating: 5,
		text: 'Реєстрація займає буквально хвилину, а потім одразу можна стартувати. Ніяких зайвих кроків чи підтверджень.',
		createdAt: '2026-03-26T10:00:00.000Z',
	},
	{
		id: 'seed-7',
		author: 'Катерина Мороз',
		role: 'Користувач',
		rating: 4,
		text: 'Завдання добре структуровані за складністю. Видно, що автори думали про навчальний процес, а не просто набір тестів.',
		createdAt: '2026-03-28T10:00:00.000Z',
	},
	{
		id: 'seed-8',
		author: 'Богдан Ільченко',
		role: 'Користувач',
		rating: 5,
		text: 'Лідерборд в реальному часі — це те, що не вистачало на інших платформах. Одразу видно де стоїш серед команди.',
		createdAt: '2026-03-30T10:00:00.000Z',
	},
	{
		id: 'seed-9',
		author: 'Валентина Кузьменко',
		role: 'Користувач',
		rating: 5,
		text: 'Зручна навігація між розділами, все на своєму місці. Не треба гуглити як щось зробити — інтуїтивно зрозуміло.',
		createdAt: '2026-04-01T10:00:00.000Z',
	},
	{
		id: 'seed-10',
		author: 'Роман Василенко',
		role: 'Користувач',
		rating: 4,
		text: 'Брав участь у двох турнірах — обидва пройшли без технічних збоїв. Стабільна платформа, що рідкість.',
		createdAt: '2026-04-02T10:00:00.000Z',
	},
	{
		id: 'seed-11',
		author: 'Оксана Петренко',
		role: 'Користувач',
		rating: 5,
		text: 'Подобається, що є чат між учасниками прямо на платформі. Можна обговорювати задачі без переходу в окремий месенджер.',
		createdAt: '2026-04-03T10:00:00.000Z',
	},
	{
		id: 'seed-12',
		author: 'Михайло Захаренко',
		role: 'Користувач',
		rating: 5,
		text: 'Профіль з прогресом і статистикою дає розуміння де ти зараз і що варто покращити. Дуже мотивує рухатись далі.',
		createdAt: '2026-04-04T10:00:00.000Z',
	},
	{
		id: 'seed-13',
		author: 'Людмила Шевченко',
		role: 'Користувач',
		rating: 5,
		text: 'Все завантажується швидко, інтерфейс не перевантажений. Навіть на старому ноутбуці відкривається без проблем.',
		createdAt: '2026-04-05T10:00:00.000Z',
	},
	{
		id: 'seed-14',
		author: 'Тарас Олексієнко',
		role: 'Користувач',
		rating: 4,
		text: 'Командний режим — це окремий кайф. Чітко видно внесок кожного учасника, і це не дає розслабитись під час турніру.',
		createdAt: '2026-04-06T10:00:00.000Z',
	},
	{
		id: 'seed-15',
		author: 'Надія Романенко',
		role: 'Користувач',
		rating: 5,
		text: 'Форма реєстрації чиста і без зайвих полів. Авторизація через Google теж зайшла — зручно коли не треба ще один пароль.',
		createdAt: '2026-04-07T10:00:00.000Z',
	},
	{
		id: 'seed-16',
		author: 'Євген Данченко',
		role: 'Користувач',
		rating: 5,
		text: 'Особисто мені зайшов дизайн: темна тема, акуратні кольори, нічого не ріже очі навіть після кількох годин роботи.',
		createdAt: '2026-04-08T10:00:00.000Z',
	},
	{
		id: 'seed-17',
		author: 'Аліна Корнієнко',
		role: 'Користувач',
		rating: 5,
		text: 'Тримала відкритою паралельно з редактором коду — зручно і нічого не гальмує. Ресурсів майже не їсть.',
		createdAt: '2026-04-09T10:00:00.000Z',
	},
	{
		id: 'seed-18',
		author: 'Сергій Панченко',
		role: 'Користувач',
		rating: 5,
		text: 'Добра ідея з публічними профілями учасників — можна подивитись на результати інших і підтягнути своє рішення.',
		createdAt: '2026-04-10T10:00:00.000Z',
	},
]

function normalizeReview(raw, index) {
	return {
		id: String(raw.id ?? raw._id ?? raw.reviewId ?? `generated-${index}`),
		author: (raw.author ?? raw.name ?? raw.username ?? 'Користувач').trim(),
		role: 'Користувач',
		rating: Number(raw.rating ?? 5),
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

	// Спочатку серверні — вони мають пріоритет і йдуть першими
	for (const item of serverReviews) {
		if (!item.text) continue
		map.set(item.id, item)
	}

	// Пресети доповнюють тільки якщо такого ID ще немає
	for (const item of PRESET_REVIEWS) {
		if (!map.has(item.id)) map.set(item.id, item)
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

function Stars({ count }) {
	return (
		<div className="reviews-page_stars" aria-label={`${count} з 5`}>
			{[1, 2, 3, 4, 5].map((n) => (
				<span key={n} className={`reviews-page_star${n <= count ? ' reviews-page_star--on' : ''}`}>★</span>
			))}
		</div>
	)
}

function StarPicker({ value, onChange }) {
	const [hovered, setHovered] = useState(null)
	return (
		<div className="reviews-page_star-picker" role="group" aria-label="Оцінка">
			{[1, 2, 3, 4, 5].map((n) => (
				<button
					key={n}
					type="button"
					className={`reviews-page_star-btn${(hovered ?? value) >= n ? ' reviews-page_star-btn--on' : ''}`}
					onClick={() => onChange(n)}
					onMouseEnter={() => setHovered(n)}
					onMouseLeave={() => setHovered(null)}
					aria-label={`${n} зірок`}
				>
					★
				</button>
			))}
		</div>
	)
}

function ReviewBubble({ review }) {
	return (
		<article className="reviews-page_bubble">
			<p className="reviews-page_bubble-text">{review.text}</p>
			<div className="reviews-page_bubble-tail" aria-hidden="true" />
			<div className="reviews-page_meta">
				<div className="reviews-page_meta-info">
					<span className="reviews-page_author">{review.author}</span>
					<span className="reviews-page_role">{review.role}</span>
				</div>
				<Stars count={review.rating ?? 5} />
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
	const [reviewQuery, setReviewQuery] = useState('')
	const [ratingFilter, setRatingFilter] = useState('all')
	const [sortMode, setSortMode] = useState('newest')
	const [sourceFilter, setSourceFilter] = useState('all')
	const [savedAnimationMs] = useState(() => {
		const raw = Number(localStorage.getItem(STRIP_PROGRESS_KEY) || 0)
		return Number.isFinite(raw) && raw >= 0 ? raw % STRIP_ANIMATION_DURATION : 0
	})

	const [form, setForm] = useState({
		name: '',
		email: '',
		message: '',
		rating: 5,
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

	const strips = useMemo(() => {
		const PER_ROW = 6
		const source = reviews.length ? reviews : PRESET_REVIEWS
		const rows = []
		for (let i = 0; i < source.length; i += PER_ROW) {
			const chunk = source.slice(i, i + PER_ROW)
			// Якщо останній рядок неповний — добиваємо до 6 з source
			const padded = chunk.length < PER_ROW
				? [...chunk, ...source.slice(0, PER_ROW - chunk.length)]
				: chunk
			rows.push([...padded, ...padded])
		}
		return rows
	}, [reviews])

	const visibleReviews = useMemo(() => {
		const q = reviewQuery.trim().toLowerCase()
		const filtered = reviews.filter((review) => {
			const ratingOk = ratingFilter === 'all' || Number(review.rating || 0) === Number(ratingFilter)
			const sourceOk = sourceFilter === 'all' || (sourceFilter === 'real' ? !String(review.id).startsWith('seed-') : String(review.id).startsWith('seed-'))
			const queryOk = !q || [review.author, review.role, review.text]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(q))
			return ratingOk && sourceOk && queryOk
		})

		return [...filtered].sort((a, b) => {
			if (sortMode === 'rating-high') return Number(b.rating || 0) - Number(a.rating || 0)
			if (sortMode === 'rating-low') return Number(a.rating || 0) - Number(b.rating || 0)
			if (sortMode === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
			return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
		})
	}, [reviews, reviewQuery, ratingFilter, sortMode, sourceFilter])

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
			rating: form.rating,
		}

		try {
			const created = await createPublicReview(payload)
			const normalized = normalizeReview(created, 0)
			setReviews((prev) => {
				const merged = mergeWithPreset([normalized, ...prev])
				localStorage.setItem(REVIEWS_CACHE_KEY, JSON.stringify(merged))
				return merged
			})

			setForm({ name: '', email: '', message: '', rating: 5 })
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
									<label className="contact_label">Оцінка</label>
									<StarPicker value={form.rating} onChange={(n) => setForm((prev) => ({ ...prev, rating: n }))} />
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
					<div className="container">
						<div className="reviews-page_tools">
							<div>
								<p className="reviews-page_tools-label">Відгуки</p>
								<strong>{visibleReviews.length}</strong>
								<span>з {reviews.length}</span>
							</div>
							<input
								className="reviews-page_search"
								value={reviewQuery}
								onChange={(e) => setReviewQuery(e.target.value)}
								placeholder="Пошук за автором або текстом..."
							/>
							<select className="reviews-page_select" value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
								<option value="all">Усі оцінки</option>
								<option value="5">5 зірок</option>
								<option value="4">4 зірки</option>
								<option value="3">3 зірки</option>
								<option value="2">2 зірки</option>
								<option value="1">1 зірка</option>
							</select>
							<select className="reviews-page_select" value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
								<option value="newest">Нові спочатку</option>
								<option value="oldest">Старі спочатку</option>
								<option value="rating-high">Вища оцінка</option>
								<option value="rating-low">Нижча оцінка</option>
							</select>
							<select className="reviews-page_select" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
								<option value="all">Усі джерела</option>
								<option value="real">Від користувачів</option>
								<option value="preset">Приклади</option>
							</select>
						</div>

						{loading ? (
							<div className="reviews-page_empty">Завантажуємо відгуки...</div>
						) : visibleReviews.length === 0 ? (
							<div className="reviews-page_empty">За цими фільтрами відгуків немає</div>
						) : (
							<div className="reviews-page_grid">
								{visibleReviews.map((review) => (
									<ReviewBubble key={`review-${review.id}`} review={review} />
								))}
							</div>
						)}
					</div>
				</section>
			</main>

			<Footer />
		</div>
	)
}

export default RewiewsPage

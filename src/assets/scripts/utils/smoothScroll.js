/**
 * Smooth Scroll Engine v2 by Abetik:)
 * - Плавний скрол мишкою та touchpad (lerp-based) for pc and laptop
 * - Touch підтримка (mobile swipe) Тож скрол плавний
 * - Keyboard navigation (Space, PageDown, Home/End, стрілки)
 * - Плавне переміщення по якорях
 * - destroy() для повного відключення
 * - Захист від подвійної ініціалізації
 * - prefers-reduced-motion Короче Хелпер для плавного скролу з підтримкою різних методів введення та врахуванням налаштувань користувача щодо анімації. Ідеально підходить для сайтів, де хочеться покращити UX при навігації, не вдаючись до важких бібліотек. Просто виклич initSmoothScroll() і все готово!
 */

// ============ Constants ============

const LERP        = 0.10   // Плавність (0.05 = дуже плавно, 0.15 = швидше буде)
const WHEEL_MULT  = 1.2    // Множник швидкості колеса (спешал фор ю)
const KEY_STEP    = 120    // px — крок при натисканні стрілок ( Доволі плавно і не много)
const PAGE_MULT   = 0.85   // частка viewport для PageUp/PageDown ( Темка под клави 80%+ с нам падом ну якщо вобще хтось так скролить)

// ============ State ============
/* якщо будеш шось мінять суда не треба лізти */

let currentScroll = 0
let targetScroll  = 0
let rafId         = null
let isLerping     = false
let isAnchorScroll = false
let initialized   = false

// Touch state
let touchStartX    = 0
let touchStartY    = 0
let touchLastY     = 0
let touchVelY      = 0
let touchTimestamp = 0
let touchActive    = false   // чи це вертикальний свайп (не горизонтальний)
let touchLocked    = false   // напрямок заблоковано після перших px руху

// Velocity history для більш точного moment (останні {n} семплів)
const VEL_SAMPLES  = 5
const velHistory   = []  // [{ v, t }]

// Callbacks нужна тема бо на ютубі так казали
const listeners = { scrollEnd: [] }

// ============ Utils ============

function lerp(start, end, factor) {
  return start + (end - start) * factor
}

function clampScroll(val) {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  return Math.max(0, Math.min(val, maxScroll))
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// ============ Lerp Loop ============

function stopLerp() {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  isLerping = false
}

function lerpLoop() {
  currentScroll = lerp(currentScroll, targetScroll, LERP)

  if (Math.abs(currentScroll - targetScroll) < 0.5) {
    currentScroll = targetScroll
    window.scrollTo(0, currentScroll)
    isLerping = false
    rafId = null
    listeners.scrollEnd.forEach(fn => fn(currentScroll))
    return
  }

  window.scrollTo(0, currentScroll)
  rafId = requestAnimationFrame(lerpLoop)
}

function startLerp() {
  if (isAnchorScroll) return // Пріорітет для якорів
  if (!isLerping) {
    isLerping = true
    rafId = requestAnimationFrame(lerpLoop)
  }
}

// ============ Scroll Target Helpers ============

function addDelta(delta) {
  // Синхронізуємо currentScroll перед зміною — щоб не "стрибати"
  if (!isLerping) {
    currentScroll = window.scrollY
  }
  targetScroll = clampScroll(targetScroll + delta)
  startLerp()
}

// ============ Mouse Wheel ============

/**
 * Перевіряє чи елемент (або один з його предків до window) є скролабельним контейнером
 * з реальним переповненням по вертикалі. Якщо так — smooth scroll не перехоплює подію.
 */
function isInsideScrollable(el, deltaY) {
  let node = el
  while (node && node !== document.documentElement) {
    const style = window.getComputedStyle(node)
    const overflowY = style.overflowY
    const canScroll = overflowY === 'auto' || overflowY === 'scroll'
    if (canScroll) {
      const atTop    = node.scrollTop <= 0
      const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1
      // є куди скролити в потрібному напрямку
      if (!(deltaY < 0 && atTop) && !(deltaY > 0 && atBottom)) {
        return true
      }
    }
    node = node.parentElement
  }
  return false
}

function onWheel(e) {
  if (isInsideScrollable(e.target, e.deltaY)) return  // дозволяємо нативний скрол
  e.preventDefault()
  addDelta(e.deltaY * WHEEL_MULT)
}

// ============ Touch ============
// Константи touch
const TOUCH_LOCK_THRESHOLD   = 8    // px — після яких вирішуємо вертикальний чи горизонтальний
const TOUCH_MOMENTUM_MULT    = 18   // множник momentum при відпусканні
const TOUCH_FRICTION         = 0.92 // затухання momentum (за кадр)
const TOUCH_MIN_MOMENTUM     = 0.5  // px — зупиняємо якщо менше

function resetTouchState() {
  touchActive    = false
  touchLocked    = false
  touchVelY      = 0
  velHistory.length = 0
}

function getWeightedVelocity() {
  // Зважена середня швидкість по останніх семплах (свіжі важать більше)
  if (!velHistory.length) return 0
  let totalV = 0, totalW = 0
  velHistory.forEach(({ v }, i) => {
    const w = i + 1  // зростаючі ваги (останній семпл — найважчий)
    totalV += v * w
    totalW += w
  })
  return totalV / totalW
}

function onTouchStart(e) {
  // Ігноруємо multi-touch (pinch-zoom тощо)
  if (e.touches.length > 1) return

  touchStartX    = e.touches[0].clientX
  touchStartY    = e.touches[0].clientY
  touchLastY     = touchStartY
  touchTimestamp = Date.now()
  resetTouchState()

  stopLerp()
  currentScroll = window.scrollY
  targetScroll  = window.scrollY
}

function onTouchMove(e) {
  if (isAnchorScroll) return
  if (e.touches.length > 1) return

  const x   = e.touches[0].clientX
  const y   = e.touches[0].clientY
  const now = Date.now()
  const dt  = Math.max(now - touchTimestamp, 1)

  // Визначаємо напрямок після перших px руху
  if (!touchLocked) {
    const dx = Math.abs(x - touchStartX)
    const dy = Math.abs(y - touchStartY)
    if (dx < TOUCH_LOCK_THRESHOLD && dy < TOUCH_LOCK_THRESHOLD) return

    touchLocked = true
    touchActive = dy >= dx  // вертикальний рух переважає
  }

  // Горизонтальний свайп — не чіпаємо (слайдери, каруселі)
  if (!touchActive) return

  // Рахуємо швидкість і зберігаємо в history
  const velocity = (touchLastY - y) / dt * 16
  velHistory.push({ v: velocity, t: now })
  if (velHistory.length > VEL_SAMPLES) velHistory.shift()

  // Переміщуємо скрол прямо (без lerp — щоб палець слідував за скролом 1:1)
  const delta  = touchLastY - y
  const newPos = clampScroll(window.scrollY + delta)
  window.scrollTo(0, newPos)
  currentScroll = newPos
  targetScroll  = newPos

  touchLastY     = y
  touchTimestamp = now
}

function onTouchEnd(e) {
  if (!touchActive || isAnchorScroll) {
    resetTouchState()
    return
  }

  // Запускаємо momentum на основі зваженої швидкості
  const vel      = getWeightedVelocity()
  const momentum = vel * TOUCH_MOMENTUM_MULT

  currentScroll = window.scrollY
  targetScroll  = clampScroll(currentScroll + momentum)

  resetTouchState()

  // Якщо momentum малий — не запускаємо lerp взагалі
  if (Math.abs(momentum) < TOUCH_MIN_MOMENTUM) return
  startLerp()
}

function onTouchCancel() {
  // Скасування (напр. вспливаюче вікно перехопило touch) — зупиняємо без momentum
  resetTouchState()
  currentScroll = window.scrollY
  targetScroll  = window.scrollY
}

// ============ Keyboard ============

function onKeyDown(e) {
  if (isAnchorScroll) return

  // Ігноруємо якщо фокус у полі вводу
  const tag = document.activeElement?.tagName
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

  const page = window.innerHeight * PAGE_MULT

  const keyMap = {
    'ArrowDown':  KEY_STEP,
    'ArrowUp':   -KEY_STEP,
    'PageDown':   page,
    'PageUp':    -page,
    ' ':          page,   // Space
    'End':        Infinity,
    'Home':      -Infinity,
  }

  if (!(e.key in keyMap)) return
  e.preventDefault()

  const delta = keyMap[e.key]
  if (!isFinite(delta)) {
    // Home / End
    targetScroll = delta > 0
      ? document.documentElement.scrollHeight - window.innerHeight
      : 0
    if (!isLerping) currentScroll = window.scrollY
    startLerp()
  } else {
    addDelta(delta)
  }
}

// ============ Scrollbar Sync ============
// Якщо юзер тягне скролбар або скролить не через wheel

let syncTicking = false

function onNativeScroll() {
  if (isLerping || isAnchorScroll) return
  if (!syncTicking) {
    syncTicking = true
    requestAnimationFrame(() => {
      currentScroll = window.scrollY
      targetScroll  = window.scrollY
      syncTicking   = false
    })
  }
}

// ============ Anchor Navigation ============

function scrollToElement(el, duration = 900) {
  const header       = document.querySelector('.header')
  const headerOffset = header ? header.offsetHeight + 16 : 0
  const elementTop   = el.getBoundingClientRect().top + window.scrollY - headerOffset

  stopLerp()
  isAnchorScroll = true

  const startPos  = window.scrollY
  const distance  = elementTop - startPos
  let   startTime = null

  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  function step(timestamp) {
    if (!startTime) startTime = timestamp
    const elapsed  = timestamp - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased    = easeInOutCubic(progress)

    window.scrollTo(0, startPos + distance * eased)

    if (progress < 1) {
      requestAnimationFrame(step)
    } else {
      currentScroll  = elementTop
      targetScroll   = elementTop
      isAnchorScroll = false
      listeners.scrollEnd.forEach(fn => fn(currentScroll))
    }
  }

  // Якщо reduced-motion — скролимо миттєво
  if (prefersReducedMotion()) {
    window.scrollTo(0, elementTop)
    currentScroll  = elementTop
    targetScroll   = elementTop
    isAnchorScroll = false
    return
  }

  requestAnimationFrame(step)
}

function onAnchorClick(e) {
  const link = e.target.closest('a[href^="#"]')
  if (!link) return

  const targetId = link.getAttribute('href')
  if (!targetId || targetId === '#') return

  const targetEl = document.querySelector(targetId)
  if (!targetEl) return

  e.preventDefault()
  scrollToElement(targetEl, 900)
  history.pushState(null, '', targetId)
}

// ============ Resize ============

function onResize() {
  // Перераховуємо ліміт скролу після зміни розміру
  targetScroll  = clampScroll(targetScroll)
  currentScroll = window.scrollY
}

// ============ Public API ============

/**
 * Програмний скрол до позиції
 * @param {number} y - цільова позиція
 * @param {boolean} [instant=false] - миттєво без анімації
 */
function scrollTo(y, instant = false) {
  targetScroll = clampScroll(y)
  if (instant || prefersReducedMotion()) {
    currentScroll = targetScroll
    window.scrollTo(0, targetScroll)
  } else {
    if (!isLerping) currentScroll = window.scrollY
    startLerp()
  }
}

/**
 * Програмний скрол до елементу
 * @param {Element|string} target - елемент або CSS-селектор
 * @param {number} [duration=900]
 */
function scrollToTarget(target, duration = 900) {
  const el = typeof target === 'string'
    ? document.querySelector(target)
    : target
  if (el) scrollToElement(el, duration)
}

/**
 * Підписка на подію кінця скролу
 * @param {Function} fn
 * @returns {Function} unsubscribe
 */
function onScrollEnd(fn) {
  listeners.scrollEnd.push(fn)
  return () => {
    listeners.scrollEnd = listeners.scrollEnd.filter(f => f !== fn)
  }
}

/**
 * Поточна позиція (може бути між currentScroll і targetScroll)
 */
function getScrollY() {
  return currentScroll
}

// ============ Init / Destroy ============

const _handlers = {}  // Зберігаємо референції для removeEventListener

/**
 * Ініціалізація. Безпечно викликати повторно — не додасть подвійних обробників.
 */
function initSmoothScroll() {
  if (initialized) return
  initialized = true

  // Синхронізуємо початкову позицію
  currentScroll = window.scrollY
  targetScroll  = window.scrollY

  // Reduced-motion: не чіпаємо нічого, тільки якірну навігацію
  if (prefersReducedMotion()) {
    _handlers.anchorClick = onAnchorClick
    document.addEventListener('click', onAnchorClick)
    return
  }

  _handlers.wheel        = onWheel
  _handlers.touchStart   = onTouchStart
  _handlers.touchMove    = onTouchMove
  _handlers.touchEnd     = onTouchEnd
  _handlers.touchCancel  = onTouchCancel
  _handlers.keyDown      = onKeyDown
  _handlers.scroll       = onNativeScroll
  _handlers.resize       = onResize
  _handlers.anchorClick  = onAnchorClick

  window.addEventListener('wheel',        onWheel,       { passive: false })
  window.addEventListener('touchstart',   onTouchStart,  { passive: true })
  window.addEventListener('touchmove',    onTouchMove,   { passive: true })
  window.addEventListener('touchend',     onTouchEnd)
  window.addEventListener('touchcancel',  onTouchCancel)
  window.addEventListener('keydown',      onKeyDown)
  window.addEventListener('scroll',       onNativeScroll)
  window.addEventListener('resize',       onResize)
  document.addEventListener('click',      onAnchorClick)
}

/**
 * Повне відключення — прибирає всі обробники та зупиняє анімацію.
 */
function destroySmoothScroll() {
  if (!initialized) return
  initialized = false

  stopLerp()

  window.removeEventListener('wheel',        _handlers.wheel,       { passive: false })
  window.removeEventListener('touchstart',   _handlers.touchStart)
  window.removeEventListener('touchmove',    _handlers.touchMove)
  window.removeEventListener('touchend',     _handlers.touchEnd)
  window.removeEventListener('touchcancel',  _handlers.touchCancel)
  window.removeEventListener('keydown',      _handlers.keyDown)
  window.removeEventListener('scroll',       _handlers.scroll)
  window.removeEventListener('resize',       _handlers.resize)
  document.removeEventListener('click',      _handlers.anchorClick)

  listeners.scrollEnd = []
}

// ============ Exports ============

export {
  initSmoothScroll,
  destroySmoothScroll,
  scrollTo,
  scrollToTarget,
  onScrollEnd,
  getScrollY,
}

export default initSmoothScroll
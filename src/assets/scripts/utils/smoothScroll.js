/**
 * Smooth Scroll Engine v3 by Abetik:)
 * - Плавний lerp-скрол для миші/тачпаду на ПК
 * - На мобільних/тачскрінах — НАТИВНИЙ скрол (швидше, плавніше, без jank)
 * - Якорі з easeInOutCubic + offset під .header
 * - Keyboard navigation (Space, PageDown, Home/End, стрілки)
 * - prefers-reduced-motion → миттєвий скрол
 * - Lazy init після першого paint (не блокує LCP)
 * - Кешований maxScroll через ResizeObserver (нуль forced reflow)
 * - Кешований isScrollable через WeakMap (нуль getComputedStyle на hot path)
 * - Pause лerp при tab hidden (економія CPU)
 * - destroy() для повного відключення
 */

// ============ Constants ============

const LERP        = 0.12
const WHEEL_MULT  = 1.0
const KEY_STEP    = 120
const PAGE_MULT   = 0.85

// ============ State ============

let currentScroll  = 0
let targetScroll   = 0
let rafId          = null
let isLerping      = false
let isAnchorScroll = false
let initialized    = false
let isTouchDevice  = false
let maxScroll      = 0   // кешований ліміт — оновлюється тільки на resize/mutation
let docHeight      = 0

// Callbacks
const listeners = { scrollEnd: [] }

// Кеш scrollable-предків (WeakMap → автоочищується при видаленні елементу з DOM)
const scrollableCache = new WeakMap()

// ============ Utils ============

function lerp(a, b, t) {
  return a + (b - a) * t
}

function clampScroll(val) {
  return val < 0 ? 0 : val > maxScroll ? maxScroll : val
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function detectTouchDevice() {
  // Ловимо саме pointer-туч девайси, а не просто наявність touch API
  // (бо ноути з тач-екранами теж мають touch, але юзають мишу)
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches
}

function recalcMaxScroll() {
  docHeight = document.documentElement.scrollHeight
  maxScroll = Math.max(0, docHeight - window.innerHeight)
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
  if (isAnchorScroll) return
  if (document.hidden) {
    // Не крутимо rAF якщо вкладка прихована
    currentScroll = targetScroll
    window.scrollTo(0, currentScroll)
    return
  }
  if (!isLerping) {
    isLerping = true
    rafId = requestAnimationFrame(lerpLoop)
  }
}

function addDelta(delta) {
  if (!isLerping) currentScroll = window.scrollY
  targetScroll = clampScroll(targetScroll + delta)
  startLerp()
}

// ============ Mouse Wheel ============

/**
 * Перевіряємо чи елемент знаходиться всередині прокручуваного контейнера.
 * Кешуємо результат `isScrollableNode` через WeakMap, щоб не викликати
 * getComputedStyle на кожен wheel.
 */
function isScrollableNode(node) {
  if (scrollableCache.has(node)) return scrollableCache.get(node)
  const style = window.getComputedStyle(node)
  const overflowY = style.overflowY
  const result = overflowY === 'auto' || overflowY === 'scroll'
  scrollableCache.set(node, result)
  return result
}

function isInsideScrollable(el, deltaY) {
  let node = el
  // Обмежуємо глибину обходу — реально жоден scrollable не лежить глибше 12 рівнів
  let depth = 0
  while (node && node !== document.documentElement && depth < 12) {
    if (isScrollableNode(node)) {
      const atTop    = node.scrollTop <= 0
      const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1
      if (!(deltaY < 0 && atTop) && !(deltaY > 0 && atBottom)) {
        return true
      }
    }
    node = node.parentElement
    depth++
  }
  return false
}

function onWheel(e) {
  // Ctrl+wheel = zoom — не чіпаємо
  if (e.ctrlKey) return
  if (isInsideScrollable(e.target, e.deltaY)) return
  e.preventDefault()
  addDelta(e.deltaY * WHEEL_MULT)
}

// ============ Keyboard ============

function onKeyDown(e) {
  if (isAnchorScroll) return

  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (document.activeElement?.isContentEditable) return

  const page = window.innerHeight * PAGE_MULT

  let delta
  switch (e.key) {
    case 'ArrowDown': delta = KEY_STEP;  break
    case 'ArrowUp':   delta = -KEY_STEP; break
    case 'PageDown':  delta = page;      break
    case 'PageUp':    delta = -page;     break
    case ' ':         delta = e.shiftKey ? -page : page; break
    case 'End':       delta = Infinity;  break
    case 'Home':      delta = -Infinity; break
    default: return
  }

  e.preventDefault()

  if (!isFinite(delta)) {
    targetScroll = delta > 0 ? maxScroll : 0
    if (!isLerping) currentScroll = window.scrollY
    startLerp()
  } else {
    addDelta(delta)
  }
}

// ============ Native Scroll Sync ============
// Якщо юзер тягне скролбар або скрол ініційовано іншим скриптом — синхронізуємось

let syncTicking = false

function onNativeScroll() {
  if (isLerping || isAnchorScroll) return
  if (syncTicking) return
  syncTicking = true
  requestAnimationFrame(() => {
    currentScroll = window.scrollY
    targetScroll  = window.scrollY
    syncTicking   = false
  })
}

// ============ Anchor Navigation ============

function scrollToElement(el, duration = 900) {
  const header       = document.querySelector('.header')
  const headerOffset = header ? header.offsetHeight + 16 : 0
  const elementTop   = clampScroll(
    el.getBoundingClientRect().top + window.scrollY - headerOffset
  )

  // Reduced-motion або мобільний → нативний smooth
  if (prefersReducedMotion()) {
    window.scrollTo(0, elementTop)
    currentScroll  = elementTop
    targetScroll   = elementTop
    return
  }

  if (isTouchDevice) {
    window.scrollTo({ top: elementTop, behavior: 'smooth' })
    return
  }

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

  requestAnimationFrame(step)
}

function onAnchorClick(e) {
  // Ігноруємо modifier-clicks (відкриття в новій вкладці тощо)
  if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
  if (e.button !== undefined && e.button !== 0) return

  const link = e.target.closest('a[href^="#"]')
  if (!link) return

  const targetId = link.getAttribute('href')
  if (!targetId || targetId === '#') return

  let targetEl
  try {
    targetEl = document.querySelector(targetId)
  } catch {
    return // невалідний селектор
  }
  if (!targetEl) return

  e.preventDefault()
  scrollToElement(targetEl, 900)
  history.pushState(null, '', targetId)
}

// ============ Resize / Mutation Observers ============

let resizeRaf = null
function onResize() {
  if (resizeRaf) return
  resizeRaf = requestAnimationFrame(() => {
    recalcMaxScroll()
    targetScroll  = clampScroll(targetScroll)
    currentScroll = window.scrollY
    resizeRaf = null
  })
}

function onVisibilityChange() {
  if (document.hidden) {
    stopLerp()
    currentScroll = window.scrollY
    targetScroll  = window.scrollY
  }
}

// ============ Public API ============

function scrollTo(y, instant = false) {
  targetScroll = clampScroll(y)
  if (instant || prefersReducedMotion()) {
    currentScroll = targetScroll
    window.scrollTo(0, targetScroll)
    return
  }
  if (isTouchDevice) {
    window.scrollTo({ top: targetScroll, behavior: 'smooth' })
    currentScroll = targetScroll
    return
  }
  if (!isLerping) currentScroll = window.scrollY
  startLerp()
}

function scrollToTarget(target, duration = 900) {
  const el = typeof target === 'string'
    ? document.querySelector(target)
    : target
  if (el) scrollToElement(el, duration)
}

function onScrollEnd(fn) {
  listeners.scrollEnd.push(fn)
  return () => {
    listeners.scrollEnd = listeners.scrollEnd.filter(f => f !== fn)
  }
}

function getScrollY() {
  return isLerping ? currentScroll : window.scrollY
}

// ============ Init / Destroy ============

let resizeObserver = null

function attachListeners() {
  // Якірна навігація — завжди (працює і з reduced-motion і з мобільним)
  document.addEventListener('click', onAnchorClick)
  window.addEventListener('resize', onResize, { passive: true })

  if (prefersReducedMotion()) return

  if (isTouchDevice) {
    // На мобільних — НІЧОГО кастомного для скролу. Нативний momentum виграє.
    return
  }

  // ПК — повний пакет
  window.addEventListener('wheel',   onWheel,        { passive: false })
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('scroll',  onNativeScroll, { passive: true })
  document.addEventListener('visibilitychange', onVisibilityChange)

  // ResizeObserver на body — ловимо зміни висоти (картинки догрузились, accordion відкрився тощо)
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => {
      recalcMaxScroll()
      targetScroll = clampScroll(targetScroll)
    })
    resizeObserver.observe(document.body)
  }
}

/**
 * Ініціалізація. Безпечно викликати повторно — не додасть подвійних обробників.
 * Сам init відкладається до першого простою браузера, щоб не блокувати LCP.
 */
function initSmoothScroll() {
  if (initialized) return
  initialized = true

  isTouchDevice = detectTouchDevice()
  recalcMaxScroll()
  currentScroll = window.scrollY
  targetScroll  = window.scrollY

  const setup = () => attachListeners()

  // Чекаємо поки браузер не завантажить первинну верстку — інакше
  // підвіска перших обробників і ResizeObserver гальмує перший paint
  if (document.readyState === 'complete') {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(setup, { timeout: 500 })
    } else {
      setTimeout(setup, 0)
    }
  } else {
    window.addEventListener('load', () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(setup, { timeout: 500 })
      } else {
        setTimeout(setup, 0)
      }
    }, { once: true })
  }
}

function destroySmoothScroll() {
  if (!initialized) return
  initialized = false

  stopLerp()

  window.removeEventListener('wheel',   onWheel,        { passive: false })
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('scroll',  onNativeScroll)
  window.removeEventListener('resize',  onResize)
  document.removeEventListener('click', onAnchorClick)
  document.removeEventListener('visibilitychange', onVisibilityChange)

  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

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

const DEFAULT_ERROR_MESSAGE = 'Щось пішло не так. Спробуйте ще раз.';

const EXACT_MESSAGES = new Map([
  ['Request failed', DEFAULT_ERROR_MESSAGE],
  ['Failed to fetch', 'Не вдалося підключитися до сервера. Перевірте інтернет або спробуйте пізніше.'],
  ['NetworkError when attempting to fetch resource.', 'Не вдалося підключитися до сервера. Перевірте інтернет або спробуйте пізніше.'],
  ['Load failed', 'Не вдалося підключитися до сервера. Перевірте інтернет або спробуйте пізніше.'],
  ['Upload failed', 'Не вдалося завантажити файл. Перевірте формат і спробуйте ще раз.'],
  ['Search failed', 'Не вдалося виконати пошук. Спробуйте ще раз.'],
  ['Delete failed', 'Не вдалося видалити. Спробуйте ще раз.'],
  ['Not found', 'Запитувані дані не знайдено.'],
  ['status update failed', 'Не вдалося оновити статус. Спробуйте ще раз.'],
  ['Submission deadline has passed', 'Дедлайн здачі роботи вже минув.'],
]);

const PATTERN_MESSAGES = [
  [/^Cannot\s+(GET|POST|PUT|PATCH|DELETE)\b/i, 'Ця дія зараз недоступна. Перевірте адресу або спробуйте пізніше.'],
  [/^Non-JSON response:/i, 'Сервер повернув некоректну відповідь. Спробуйте пізніше.'],
  [/\b404\b|not\s*found/i, 'Запитувані дані не знайдено.'],
  [/\b401\b|unauthorized|jwt|token/i, 'Сесія закінчилась. Увійдіть в акаунт ще раз.'],
  [/\b403\b|forbidden/i, 'У вас немає доступу до цієї дії.'],
  [/\b409\b|conflict/i, 'Ці дані вже існують або конфліктують з поточними.'],
  [/\b429\b|too many requests/i, 'Забагато запитів. Зачекайте трохи і спробуйте ще раз.'],
  [/\b500\b|\b502\b|\b503\b|\b504\b|internal server error/i, 'Сервер тимчасово не може обробити запит. Спробуйте пізніше.'],
  [/deadline has passed/i, 'Дедлайн здачі роботи вже минув.'],
  [/invalid email/i, 'Вкажіть коректний email.'],
  [/password/i, 'Перевірте пароль і спробуйте ще раз.'],
];

export function friendlyErrorMessage(error, fallback = DEFAULT_ERROR_MESSAGE) {
  const raw = typeof error === 'string'
    ? error
    : error?.message || error?.error || error?.statusText || fallback;

  const message = String(raw || '').trim();
  if (!message) return fallback;

  if (EXACT_MESSAGES.has(message)) return EXACT_MESSAGES.get(message);

  const pattern = PATTERN_MESSAGES.find(([regex]) => regex.test(message));
  if (pattern) return pattern[1];

  return message;
}

export function apiErrorMessage(data, status, fallback = DEFAULT_ERROR_MESSAGE) {
  const raw = Array.isArray(data?.message)
    ? data.message.join(', ')
    : data?.message || data?.error || data?.statusText || fallback;

  return friendlyErrorMessage(raw || `HTTP ${status}`, fallback);
}

export function createFriendlyError(error, fallback) {
  return new Error(friendlyErrorMessage(error, fallback));
}

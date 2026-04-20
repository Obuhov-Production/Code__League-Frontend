# Contact Form — Discord Webhook Integration

Discord Webhook docs: https://docs.discord.com/developers/resources/webhook

## Архітектура (чому саме так)

Webhook URL **ніколи не йде на фронт**. Якщо покласти `WEBHOOK_URL` у `VITE_*` — він потрапить у білд і будь-хто зможе його дістати з сайту "URL" та спамити в Discord. Тому:

```
Browser → POST /api/contact → Backend → Discord Webhook URL
```

Бекенд читає `WEBHOOK_URL` з `.env` (backend), і формує Embed msg(if discord) і відправляє в Discord сам.

## Flow
### 1. Frontend (`ContactSection.jsx`) — `handleSubmit`
Фронт збирає дані форми і відправляє `POST /api/contact` на бекенд.

```js
// Тип форми: 'problem' | 'join_team'
// formData — об'єкт з полями активної форми

const res = await fetch('/api/contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: formType,         // 'problem' або 'join_team'
    ...activeFormData,      // поля: name, email, message / company, budget, details
  }),
})

if (!res.ok) throw new Error('Server error')
// показати toast: "Повідомлення відправлено!"
```

Ніяких webhook URL на фронті — тільки `/api/contact`.

### 2. Backend — роут `POST /api/contact`

```
routes/contact.js (або contact.ts)
```

**Кроки:**
1. Валідація запиту (name, email обов'язкові, захист від порожніх полів нада зробіть)
2. Rate limiting — не більше 3 запитів з одного IP за 10 хвилин (щоб не спамили)
3. Читаємо `process.env.CONTACT_METHOD` → вибираємо стратегію
4. Формуємо Discord Embed залежно від `type`
5. `fetch(process.env.WEBHOOK_URL, { method: 'POST', body: embed })`
6. Повертаємо `200 OK` або `500` з помилкою

### 3. Discord Embed — структура

**Тип `problem` (є проблема / питання):**
```json
{
  "username": "Code League Contact",
  "embeds": [{
    "title": "📩 Нове повідомлення",
    "color": 7506394,
    "fields": [
      { "name": "Ім'я",   "value": "...", "inline": true },
      { "name": "Email",  "value": "...", "inline": true },
      { "name": "Текст",  "value": "..." }
    ],
    "footer": { "text": "Code League · contact form" },
    "timestamp": "2026-04-20T00:00:00.000Z"
  }]
}
```

**Тип `join_team` (хоче в команду):**
```json
{
  "username": "Code League Contact",
  "embeds": [{
    "title": "🚀 Хтось хоче до нас у команду",
    "color": 5814783,
    "fields": [
      { "name": "Ім'я",      "value": "...", "inline": true },
      { "name": "Email",     "value": "...", "inline": true },
      { "name": "Компанія",  "value": "...", "inline": true },
      { "name": "Рівень",    "value": "..." },
      { "name": "Про себе",  "value": "..." }
    ],
    "footer": { "text": "Code League · join form" },
    "timestamp": "2026-04-20T00:00:00.000Z"
  }]
}
```

### 4. `.env` бекенду (серверний, не vite)

```env
CONTACT_METHOD=Discord        # Discord | Webhook | Telegram
WEBHOOK_URL=https://discord.com/api/webhooks/XXXXXXXXX/XXXXXXXX
```

### 5. Розширення під інші методи (`CONTACT_METHOD`)

```js
const senders = {
  Discord: sendToDiscord,
  Telegram: sendToTelegram,   // пізніше
  Webhook: sendToWebhook,     // generic POST
}

const send = senders[process.env.CONTACT_METHOD]
if (!send) return res.status(500).json({ error: 'Unknown CONTACT_METHOD' })
await send(data)
```

---

## Файли які треба створити / змінити

|---------------------------------------|-----------------------------------------------------------|
|                Файл                   |                            Дія                            |
|---------------------------------------|-----------------------------------------------------------|
| `ContactSection.jsx` → `handleSubmit` | Додати реальний `fetch('/api/contact', ...)`              |
| `backend/routes/contact.js`           | Новий роут: валідація + rate limit + send                 |
| `backend/services/discord.js`         | Функція `sendToDiscord(data)` — формує Embed і відправляє |
| `backend/.env`                        | `CONTACT_METHOD` і `WEBHOOK_URL` (вже є в `.env` проєкту) |
|---------------------------------------|-----------------------------------------------------------|


# Ну якось так вот логіка має бути
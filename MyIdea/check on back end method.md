# Backend API — Чеклист методів для перевірки / реалізації

> Усі ендпоінти відносно `BASE = /api`
> Авторизація: `Authorization: Bearer <JWT>`

---

## 1. AUTH (Аутентифікація)

### `POST /api/auth/register`
- **Що робить:** Реєстрація нового юзера
- **Body:** `{ username, email, password }`
- **Перевірити:**
  - Валідація email (формат, унікальність)
  - Валідація password (мін. довжина, складність)
  - username генерується з email якщо не передано
  - Повертає `{ token, user }` при успіху
  - Хешування пароля (bcrypt)
  - Дублікат email → 409 Conflict

### `POST /api/auth/login`
- **Що робить:** Вхід існуючого юзера
- **Body:** `{ email, password }`
- **Перевірити:**
  - Невірний email → 401
  - Невірний пароль → 401
  - Повертає `{ token, user }`
  - JWT має містити userId, role, exp

### `GET /api/auth/google` | `/api/auth/discord` | `/api/auth/github`
- **Що робить:** OAuth редирект
- **Перевірити:**
  - Редирект на провайдера
  - Callback повертає `?token=JWT&user=JSON`
  - При помилці → `?error=MESSAGE`
  - Якщо юзер вже існує — лінкує акаунт, а не створює новий

---

## 2. USERS (Профіль)

### `GET /api/users/me`
- **Що робить:** Отримати дані поточного юзера
- **Auth:** Так
- **Перевірити:**
  - Повертає повний об'єкт юзера: `{ id, username, email, role, user_avatar_url, user_banner_url, bio }`
  - Невалідний токен → 401
  - Expired токен → 401

### `PATCH /api/users/me`
- **Що робить:** Оновити профіль
- **Auth:** Так
- **Body:** `{ username?, email?, bio?, ... }`
- **Перевірити:**
  - Часткове оновлення (PATCH, не PUT)
  - Зміна username — перевірка унікальності
  - Зміна email — перевірка унікальності + формату
  - SQL-injection / XSS захист у bio та username
  - Повертає оновлений об'єкт юзера

### `POST /api/users/me/avatar`
- **Що робить:** Завантажити аватар
- **Auth:** Так
- **Body:** `multipart/form-data`, поле `avatar`
- **Перевірити:**
  - Обмеження розміру файлу (рекомендовано ≤ 5MB)
  - Тільки зображення (jpg, png, webp, gif)
  - Видаляє попередній файл при заміні
  - Повертає `{ user_avatar_url: "/uploads/avatars/..." }`
  - Шлях доступний статично (`/uploads/avatars/...`)

### `POST /api/users/me/banner`
- **Що робить:** Завантажити банер профілю
- **Auth:** Так
- **Body:** `multipart/form-data`, поле `banner`
- **Перевірити:**
  - Те саме що аватар, але для банера
  - Повертає `{ user_banner_url: "/uploads/banners/..." }`

### `DELETE /api/users/me/banner`
- **Що робить:** Видалити банер
- **Auth:** Так
- **Перевірити:**
  - Видаляє файл з диску
  - Ставить `user_banner_url = null` в БД

### `GET /api/users/search?q=query`
- **Що робить:** Пошук юзерів за нікнеймом або email
- **Auth:** Ні (публічний)
- **Перевірити:**
  - Шукає по username AND email (ILIKE / LIKE)
  - Мінімум 2 символи для пошуку
  - Повертає масив: `[{ id, username, email, user_avatar_url }]`
  - Лімітувати результати (макс. 20)
  - НЕ повертати паролі та чутливі дані

### `GET /api/users/:id`
- **Що робить:** Отримати публічний профіль юзера
- **Auth:** Ні
- **Перевірити:**
  - Повертає публічні дані (без email якщо приватний)
  - Невалідний id → 404

---

## 3. TOURNAMENTS (Турніри)

### `GET /api/tournaments`
- **Що робить:** Список усіх турнірів
- **Query:** `?status=registration|active|finished` (опціонально)
- **Перевірити:**
  - Фільтрація по статусу працює
  - Без фільтра — повертає все
  - Повертає: `[{ id, name, description, rules, status, start_date, end_date, registration_start, registration_end, min_team_size, max_team_size, teams_count, teams_limit, rounds_count }]`
  - `teams_count` — підрахунок зареєстрованих команд (COUNT)
  - Сортування: спочатку registration, потім active, потім finished

### `GET /api/tournaments/:id`
- **Що робить:** Один турнір по ID
- **Перевірити:**
  - Повний об'єкт турніру
  - 404 якщо не знайдено

### `POST /api/tournaments`
- **Що робить:** Створити турнір
- **Auth:** Так (organizer / admin)
- **Body:** `{ name, description?, rules?, start_date, end_date, registration_start, registration_end, min_team_size, max_team_size, teams_limit?, rounds_count }`
- **Перевірити:**
  - Тільки organizer/admin може створювати
  - Валідація дат: `registration_start < registration_end < start_date < end_date`
  - `min_team_size <= max_team_size`
  - `teams_limit` = null означає без ліміту
  - `rounds_count >= 1`

### `PATCH /api/tournaments/:id` ⚠️ КРИТИЧНИЙ — використовується формою редагування
- **Що робить:** Оновити турнір (форма редагування з фронтенду)
- **Auth:** Так (organizer / admin)
- **Body:** `{ name?, description?, rules?, start_date?, end_date?, registration_start?, registration_end?, teams_limit?, min_team_size?, max_team_size?, rounds_count? }`
- **Перевірити:**
  - Часткове оновлення (PATCH — тільки передані поля)
  - `name` — не порожній, мін. 3 символи
  - `description` і `rules` — допускають null (видалення)
  - Валідація дат: `registration_start < registration_end <= start_date < end_date`
  - `min_team_size <= max_team_size`, обидва >= 1
  - `teams_limit` = null означає без ліміту; якщо число — >= 0
  - `rounds_count >= 1`
  - Не можна міняти якщо статус = finished (→ 400)
  - Перевірка прав: тільки творець турніру або admin
  - Якщо зменшують `teams_limit` нижче поточного `teams_count` → помилка 400
  - Якщо зменшують `max_team_size` — перевірити існуючі команди
  - Повертає оновлений об'єкт турніру
  - **Реалізація:** SQL `UPDATE tournaments SET ... WHERE id = $1 RETURNING *`
  - **Використовується на фронтенді:** TabTournaments (модальне вікно перегляду), TabOrganizer (вкладка «Турніри»), TabAdmin (вкладка «Турніри» з табами Info/Команди)

### `PATCH /api/tournaments/:id/status`
- **Що робить:** Змінити статус турніру
- **Auth:** Так (organizer / admin)
- **Body:** `{ status: "registration" | "active" | "finished" }`
- **Перевірити:**
  - Валідні переходи: registration → active → finished
  - Не можна повернути назад (finished → active)

### `DELETE /api/tournaments/:id`
- **Що робить:** Видалити турнір
- **Auth:** Так (admin)
- **Перевірити:**
  - Каскадне видалення команд та пов'язаних даних
  - Або soft-delete (рекомендовано)

### `GET /api/tournaments/:id/leaderboard`
- **Що робить:** Таблиця лідерів турніру
- **Перевірити:**
  - Повертає команди + їх оцінки, відсортовані по балах
  - Порожній масив якщо немає оцінок

### `POST /api/tournaments/:id/announcements`
- **Що робить:** Оголошення в турнірі
- **Auth:** Так (organizer / admin)
- **Body:** `{ title, message }`
- **Перевірити:**
  - Тільки organizer/admin
  - Повертає створене оголошення

---

## 4. TEAMS (Команди)

### `POST /api/teams`
- **Що робить:** Зареєструвати нову команду
- **Auth:** Так
- **Body:** `{ name, tournament_id, city?, school?, telegram_username? }`
- **Перевірити:**
  - Юзер не може мати 2 команди в одному турнірі
  - Перевірка `teams_limit` — якщо ліміт досягнуто → 400
  - Турнір повинен бути в статусі `registration`
  - `name` унікальне в межах турніру
  - Повертає створену команду з `id`

### `GET /api/teams/my`
- **Що робить:** Мої команди
- **Auth:** Так
- **Перевірити:**
  - Повертає команди де user є учасником або капітаном
  - Включає дані турніру (join / populate)

### `GET /api/teams/tournament/:tournamentId`
- **Що робить:** Список команд турніру
- **Перевірити:**
  - Повертає масив команд з учасниками
  - Для кожної команди: `{ id, name, members: [...], city, school }`

### `PATCH /api/teams/:id`
- **Що робить:** Оновити команду (учасники, назва)
- **Auth:** Так (капітан команди)
- **Body:** `{ members?: [...], name? }`
- **Перевірити:**
  - Тільки капітан може оновлювати
  - `members` масив: `[{ full_name, email }]`
  - Перевірка min/max team size з турніру
  - Не можна оновити якщо турнір вже active/finished

### `DELETE /api/teams/:id`
- **Що робить:** Видалити команду
- **Auth:** Так (капітан або admin)
- **Перевірити:**
  - Видаляє команду та всіх учасників
  - `teams_count` турніру зменшується

### `GET /api/teams/:id`
- **Що робить:** Одна команда по ID
- **Перевірити:**
  - Повний об'єкт команди з учасниками

---

## 5. CHAT (Чат)

### `GET /api/chat-messages?room=roomName`
- **Що робить:** Історія повідомлень кімнати
- **Auth:** Так
- **Перевірити:**
  - Пагінація (limit/offset або cursor)
  - Повертає `[{ id, text, user, timestamp, ... }]`
  - Фільтрація по room

### `POST /api/chat/upload`
- **Що робить:** Завантажити файл в чат
- **Auth:** Так
- **Body:** `multipart/form-data`, поле `file`
- **Перевірити:**
  - Обмеження розміру (≤ 10MB)
  - Дозволені типи файлів
  - Повертає `{ url: "/uploads/chat/..." }`

### `GET /api/chat/:room/reactions`
- **Що робить:** Реакції на повідомлення в кімнаті
- **Auth:** Так
- **Перевірити:**
  - Повертає `{ "msgId_emoji": { emoji, count, users } }`

### `DELETE /api/chat/:room/clear`
- **Що робить:** Очистити всі повідомлення кімнати
- **Auth:** Так (admin)
- **Перевірити:**
  - Тільки admin
  - Видаляє всі повідомлення кімнати

### `GET /api/chat/:room/pinned`
- **Що робить:** Закріплені повідомлення
- **Auth:** Так
- **Перевірити:**
  - Повертає масив закріплених повідомлень

### WebSocket (Socket.IO)
- **Перевірити:**
  - Підключення з JWT
  - join/leave кімнати
  - Надсилання повідомлення (text, file_url)
  - Отримання повідомлень в реальному часі
  - Реакції (add/remove)
  - Mute працює — замучений юзер не може відправляти

---

## 6. ADMIN (Панель адміна)

### `GET /api/admin/users`
- **Що робить:** Список усіх юзерів
- **Auth:** Так (admin)
- **Перевірити:**
  - Тільки admin
  - Повертає `[{ id, username, email, role, ... }]`

### `PATCH /api/admin/users/:id`
- **Що робить:** Змінити роль юзера
- **Auth:** Так (admin)
- **Body:** `{ role: "user" | "organizer" | "jury" | "admin" }`
- **Перевірити:**
  - Не можна понизити себе
  - Валідні ролі

### `DELETE /api/admin/users/:id`
- **Що робить:** Видалити юзера
- **Auth:** Так (admin)
- **Перевірити:**
  - Каскадне видалення (команди, повідомлення, etc.)
  - Не можна видалити себе

### `PATCH /api/admin/users/:id/password`
- **Що робить:** Скинути пароль юзера
- **Auth:** Так (admin)
- **Body:** `{ password }`
- **Перевірити:**
  - Хешування нового пароля

### `GET /api/admin/stats`
- **Що робить:** Статистика платформи (для адмін-панелі)
- **Auth:** Так (admin)
- **Перевірити:**
  - Повертає `{ users, tournaments, teams, ... }`

### `GET /api/admin/teams`
- **Що робить:** Список усіх команд
- **Auth:** Так (admin)
- **Перевірити:**
  - Включає інфо про турнір

### `DELETE /api/admin/teams/:id`
- **Що робить:** Видалити будь-яку команду
- **Auth:** Так (admin)

---

## 7. ADMIN: CHAT MANAGEMENT

### `POST /api/admin/chat/rooms`
- **Що робить:** Створити кімнату чату
- **Auth:** Так (admin)
- **Body:** `{ name, label }`
- **Перевірити:**
  - `name` унікальне (slug-like)
  - `label` — відображувана назва

### `DELETE /api/admin/chat/rooms/:id`
- **Що робить:** Видалити кімнату
- **Auth:** Так (admin)
- **Перевірити:**
  - Видаляє кімнату + всі повідомлення

### `GET /api/admin/chat/settings/:room`
- **Що робить:** Налаштування кімнати
- **Auth:** Так (admin)

### `PATCH /api/admin/chat/settings/:room`
- **Що робить:** Оновити налаштування кімнати
- **Auth:** Так (admin)
- **Body:** `{ slowMode?, readOnly?, ... }`

### `POST /api/admin/chat/announce/:room`
- **Що робить:** Системне оголошення в кімнаті
- **Auth:** Так (admin)
- **Body:** `{ text }`

### `POST /api/admin/chat/pin/:msgId`
- **Що робить:** Закріпити повідомлення
- **Auth:** Так (admin)

### `DELETE /api/admin/chat/pin/:msgId`
- **Що робить:** Відкріпити повідомлення
- **Auth:** Так (admin)

### `GET /api/admin/chat/muted`
- **Що робить:** Список замучених юзерів
- **Auth:** Так (admin)

### `POST /api/admin/chat/mute/:userId`
- **Що робить:** Toggle mute юзера
- **Auth:** Так (admin)
- **Перевірити:**
  - Якщо muted → unmute, якщо not → mute

---

## 8. ORGANIZER APPLICATIONS (Заявки на організатора)

### `POST /api/applications/organizer` ⚠️ ОНОВЛЕНО — додані контактні дані
- **Що робить:** Подати заявку
- **Auth:** Так
- **Body:** `{ motivation, experience?, contact_email?, contact_telegram?, contact_phone? }`
- **Перевірити:**
  - `motivation` — обов'язкове, не порожнє, макс 1000 символів
  - `experience` — опціональне, макс 500 символів
  - Хоча б одне контактне поле (`contact_email`, `contact_telegram`, `contact_phone`) повинно бути заповнене
  - `contact_email` — валідація формату email
  - `contact_telegram` — очистити від зайвих символів, допустити з/без @
  - `contact_phone` — допустити різні формати
  - Одна активна заявка на юзера (статус = pending)
  - Повторна заявка якщо попередня rejected — дозволити (створити нову)
  - **DB:** таблиця `organizer_applications` потребує колонки: `contact_email`, `contact_telegram`, `contact_phone`

### `GET /api/applications/organizer/my`
- **Що робить:** Моя заявка
- **Auth:** Так
- **Перевірити:**
  - Повертає `null` якщо немає
  - `{ id, status, motivation, experience, contact_email, contact_telegram, contact_phone, created_at }`

### `GET /api/admin/applications/organizer`
- **Що робить:** Всі заявки (для адміна)
- **Auth:** Так (admin)
- **Перевірити:**
  - Повертає масив з username, email, user_avatar_url, + всі поля заявки (включно з контактами)
  - Сортування: спочатку pending, потім по даті

### `PATCH /api/admin/applications/organizer/:id`
- **Що робить:** Розглянути заявку
- **Auth:** Так (admin)
- **Body:** `{ status: "accepted" | "rejected" }`
- **Перевірити:**
  - При `accepted` → автоматично ставити роль `organizer`
  - Відправити нотифікацію юзеру
  - Не можна змінити вже оброблену заявку (accepted/rejected → 400)

---

## 9. NOTIFICATIONS (Сповіщення)

### `GET /api/notifications`
- **Що робить:** Мої сповіщення
- **Auth:** Так
- **Перевірити:**
  - Повертає `[{ id, type, message, read, created_at }]`
  - Сортовані: спочатку непрочитані, потім по даті

### `PATCH /api/notifications/:id/read`
- **Що робить:** Позначити як прочитане
- **Auth:** Так

### `DELETE /api/notifications/:id`
- **Що робить:** Видалити сповіщення
- **Auth:** Так (тільки свої)

### `PATCH /api/notifications/read-all`
- **Що робить:** Позначити всі як прочитані
- **Auth:** Так

---

## 10. JURY (Журі)

### `GET /api/jury/tournaments`
- **Що робить:** Турніри де юзер є журі
- **Auth:** Так (jury)
- **Перевірити:**
  - Тільки роль jury
  - Повертає лише призначені турніри

### `GET /api/jury/rounds/:roundId/submissions`
- **Що робить:** Завдання для оцінки
- **Auth:** Так (jury)
- **Перевірити:**
  - Повертає `[{ id, team, code, ... }]`

### `POST /api/jury/submissions/:submissionId/evaluate`
- **Що робить:** Оцінити роботу
- **Auth:** Так (jury)
- **Body:** `{ score, comment?, criteria?: {...} }`
- **Перевірити:**
  - Одна оцінка від одного журі на submission
  - Валідація score (діапазон)

---

## 11. REVIEWS (Відгуки)

### `GET /api/reviews`
- **Що робить:** Список публічних відгуків
- **Query:** `?q=search` (опціонально)
- **Перевірити:**
  - Повертає масив відгуків
  - Пошук по тексту
  - Сортування по даті (новіші першими)

### `POST /api/reviews`
- **Що робить:** Створити відгук
- **Auth:** Так
- **Body:** `{ text, rating? }`
- **Перевірити:**
  - Один відгук на юзера (або дозволити декілька?)
  - XSS/SQL injection захист
  - Валідація rating (1-5)

---

## 12. BADGES (Нагороди)

### `GET /api/badges/my`
- **Що робить:** Мої бейджі
- **Auth:** Так
- **Перевірити:**
  - `[{ id, badge_id, name, description, image_url, earned_at }]`

### `GET /api/admin/users/:userId/badges`
- **Що робить:** Бейджі конкретного юзера
- **Auth:** Так (admin)

### `POST /api/admin/users/:userId/badges`
- **Що робить:** Видати бейдж юзеру
- **Auth:** Так (admin)
- **Body:** `{ badge_id }`
- **Перевірити:**
  - Не видавати дублікат
  - badge_id існує в системі

### `DELETE /api/admin/users/:userId/badges/:badgeId`
- **Що робить:** Забрати бейдж
- **Auth:** Так (admin)

---

## 13. STATS (Публічна статистика)

### `GET /api/stats`
- **Що робить:** Публічна статистика платформи
- **Auth:** Ні
- **Перевірити:**
  - Повертає `{ users, tasks, tournaments, teams }`
  - Кешування (не запитувати БД кожен раз)

### `GET /api/chat/custom-rooms`
- **Що робить:** Список кастомних кімнат чату
- **Auth:** Так
- **Перевірити:**
  - Повертає `[{ id, name, label }]`

---

## Загальні перевірки для ВСІХ ендпоінтів

| Перевірка | Опис |
|-----------|------|
| **Auth middleware** | Endpoints з `authHeaders()` вимагають валідний JWT |
| **Role guard** | admin-only ендпоінти перевіряють `role === 'admin'` |
| **Input validation** | Всі body параметри валідуються (тип, довжина, формат) |
| **Error format** | Помилки повертають `{ message: "..." }` або `{ error: "..." }` |
| **Status codes** | 200/201 при успіху, 400/401/403/404/409/500 при помилках |
| **SQL injection** | Параметризовані запити (не конкатенація строк) |
| **XSS** | Санітизація текстових полів |
| **Rate limiting** | Login, register, search — обмеження кількості запитів |
| **CORS** | Правильні заголовки для фронтенд-домену |
| **File uploads** | Обмеження розміру, типу, cleanup старих файлів |

---

## Рекомендації по реалізації

1. **Middleware стек:**
   ```
   auth(req, res, next)       → перевірка JWT, додає req.user
   requireRole('admin')       → перевірка ролі
   validate(schema)           → валідація body через Joi/Zod
   rateLimit({ max: 100 })    → обмеження запитів
   ```

2. **Структура відповіді:**
   ```json
   // Успіх
   { "id": 1, "name": "..." }
   // або масив
   [{ "id": 1, ... }]

   // Помилка
   { "message": "Опис помилки" }
   ```

3. **Пагінація (де потрібна):**
   ```
   GET /api/tournaments?page=1&limit=20
   → { data: [...], total: 150, page: 1, pages: 8 }
   ```

4. **Файли зберігати в:**
   ```
   /uploads/avatars/   — аватари
   /uploads/banners/   — банери
   /uploads/chat/      — файли чату
   ```

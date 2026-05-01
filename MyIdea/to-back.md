# Backend — список задач для реалізації функціоналу

## 1. Підтвердження особи учасника (PIB) перед участю в турнірі

### Що потрібно
Коли лідер команди додає учасника з платформи, бекенд повинен перевірити що той користувач підтвердив своє ПІБ.

### API зміни
- `GET /api/users/search?q=...` — додати поле `identity_confirmed: boolean` до відповіді.
  - `identity_confirmed = true` якщо `first_name`, `last_name`, `middle_name` всі заповнені у профілі користувача.

- `PATCH /api/teams/:id` — при збереженні команди перевіряти:
  - Якщо учасник прив'язаний до платформи (`user_id` вказано), його `identity_confirmed` має бути `true`.
  - Якщо ні — повертати помилку `400` з текстом: `"Учасник {username} ще не підтвердив своє ПІБ у профілі"`.

- `POST /api/teams/:teamId/chat/members` — при додаванні до чату команди також перевіряти `identity_confirmed`.

### Бейдж `identity_confirmed`
- При збереженні ПІБ через `PATCH /api/users/me`:
  - Якщо `first_name`, `last_name`, `middle_name` всі не порожні — автоматично видати бейдж `identity_confirmed` через `INSERT INTO user_badges (user_id, badge_id)`.
  - `GET /api/badges/my` повинен повертати актуальний стан з БД (не мок).
  - Це виправляє баг: після оновлення сторінки бейдж зникає (зараз бекенд не зберігає бейдж).

---

## 2. Чат команди (Team Chat Room)

### Концепція
Кожна команда має приватну кімнату чату з id `team_{teamId}`.
Лише члени команди мають доступ до кімнати.

### Членство в кімнаті

**Таблиця `chat_room_members`:**
```sql
CREATE TABLE IF NOT EXISTS chat_room_members (
  room        TEXT NOT NULL,         -- наприклад 'team_42'
  user_id     INTEGER NOT NULL REFERENCES users(id),
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  added_by    INTEGER REFERENCES users(id),
  PRIMARY KEY (room, user_id)
);
```

### API ендпоінти

#### `GET /api/teams/:teamId/chat/members`
Повертає список членів чату команди.
```json
[{ "id": 1, "username": "...", "first_name": "...", "last_name": "...", "identity_confirmed": true }]
```
Доступ: тільки члени команди або адмін.

#### `POST /api/teams/:teamId/chat/members`
Додати користувача до чату команди.
Body: `{ "user_id": 123 }`
- Перевірити що `user_id` є учасником команди (або подавався у складі).
- Перевірити `identity_confirmed`.
- Вставити в `chat_room_members`.
- Надіслати Socket.IO подію `room:member_added` в кімнату `team_{teamId}`.
Доступ: лідер команди або адмін.

#### `DELETE /api/teams/:teamId/chat/members/:userId`
Видалити учасника з чату.
Доступ: лідер або адмін.

### WebSocket — доступ до кімнати
При `room:join` для кімнат що починаються з `team_`:
- Перевірити що `socket.user.id` є в `chat_room_members` для цієї кімнати.
- Якщо ні — відправити `error: "Доступ заборонено"`.

### Автоматичне створення чату при реєстрації команди
При `POST /api/teams` (реєстрація команди):
- Для кожного члена команди що має `user_id` (зареєстрований на платформі) — автоматично додати в `chat_room_members('team_{teamId}', user_id)`.

---

## 3. Прив'язка ПІБ учасника через чат (Member linking)

### Концепція
Якщо учасник увійшов в чат команди, лідер може прив'язати його до одного з записів у команді (де зазначено ПІБ).

### API

#### `POST /api/teams/:teamId/members/:memberId/link`
Прив'язати запис учасника команди до акаунту на платформі.
Body: `{ "user_id": 123 }`
- Встановлює `user_id` для запису `members[memberId]`.
- Автоматично додає `user_id` в `chat_room_members`.
- Перевіряє `identity_confirmed` для `user_id`.
Доступ: лідер команди або адмін.

---

## 4. Реєстрація учасника на турнір (окрема задача)

### Поточна ситуація
Зараз команда може бути зареєстрована на турнір без реєстрації окремих учасників.

### Що потрібно
Щоб учасники що прив'язані до платформи могли брати участь в турнірі:

- Додати таблицю `tournament_registrations`:
```sql
CREATE TABLE IF NOT EXISTS tournament_registrations (
  tournament_id INTEGER REFERENCES tournaments(id),
  user_id       INTEGER REFERENCES users(id),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tournament_id, user_id)
);
```

- `POST /api/tournaments/:id/register` — зареєструвати себе на турнір.
- `GET /api/tournaments/:id/registrations` — список зареєстрованих.

При прив'язці платформ-учасника до команди — перевіряти чи він зареєстрований на турнір цієї команди.

---

## 5. Пошук користувачів — розширення

`GET /api/users/search?q=...` повинен повертати:
```json
[{
  "id": 1,
  "username": "...",
  "email": "...",
  "first_name": "...",
  "last_name": "...",
  "identity_confirmed": true,
  "user_avatar_url": "..."
}]
```
`identity_confirmed` — обчислюється на льоту: `first_name IS NOT NULL AND last_name IS NOT NULL AND middle_name IS NOT NULL`.

---

---

## 6. Бан та мут користувача

### Поточна ситуація
Роль `banned` вже існує в полі `role` користувача (через кому). Фронтенд перевіряє `hasRole(user, 'banned')` та `hasRole(user, 'muted')` і відображає відповідний UI.

### Що потрібно

#### Роль `banned`
- Поле `role` у таблиці `users` вже підтримує множинні ролі через кому (наприклад `"user,banned"`).
- `PATCH /api/admin/users/:id` — встановлення ролі `banned` вже реалізовано через `setUserRole`.
- **Додатково**: при кожному `GET /api/users/me` повертати актуальну роль — якщо `role` містить `banned`, фронтенд показує незакривне модальне вікно.
- **Важливо**: `GET /api/users/me` повинен повертати дані навіть для заблокованого (щоб фронт міг визначити статус). Не повертати `403` для цього ендпоінту.

#### Роль `muted`
- Аналогічно до `banned` — роль `muted` додається адміном через `setUserRole`.
- При `GET /api/users/me` якщо `role` містить `muted` — фронтенд замінює поле вводу в чаті на повідомлення про блокування.
- **WebSocket**: при спробі відправити повідомлення (`message:send`) від замученого користувача — бекенд повинен відхилити з помилкою `"Вам заборонено писати повідомлення"`. Не зберігати і не розсилати повідомлення.
- Socket.IO middleware перевірка:
```js
// у room:message або message:send handler
if (user.role.includes('muted')) {
  return socket.emit('error', { message: 'Вам заборонено писати повідомлення' });
}
```

#### Зняття бану/муту
- Через `PATCH /api/admin/users/:id` — встановити роль без `banned`/`muted` (наприклад назад на `"user"`).
- Після зняття бану — при наступному завантаженні `/api/users/me` фронтенд автоматично прибере overlay.

#### Безпека
- Усі захищені ендпоінти (крім `/me`) повинні повертати `403` для заблокованих.
- Socket.IO middleware: при підключенні перевіряти якщо `role.includes('banned')` — відхиляти з'єднання з помилкою `"Акаунт заблоковано"`.

---

## Підсумок пріоритетів

| Пріоритет | Задача |
|-----------|--------|
| 🔴 Критично | `GET /api/users/me` повертає роль для banned-юзерів (не `403`) |
| 🔴 Критично | WebSocket відхиляти повідомлення від muted |
| 🔴 Критично | Бейдж `identity_confirmed` зберігати в БД |
| 🔴 Критично | Поле `identity_confirmed` в `/users/search` |
| 🟠 Важливо | Socket.IO middleware відхиляти banned при підключенні |
| 🟠 Важливо | Таблиця `chat_room_members` + API ендпоінти |
| 🟠 Важливо | Перевірка доступу до `team_*` кімнат в WebSocket |
| 🟡 Бажано | Автододавання в чат при реєстрації команди |
| 🟡 Бажано | Прив'язка учасника через `/link` |
| 🟢 Майбутнє | `tournament_registrations` таблиця |

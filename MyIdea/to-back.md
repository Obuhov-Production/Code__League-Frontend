# Що потрібно реалізувати на бекенді

> Складено на основі `authApi.js` + компонентів дашборду (TabTeams, TabTournaments, db.shared).
> Статус: ✅ є / ❌ потрібно зробити / ⚠️ є але потребує перевірки

---

## 1. Статистика платформи

| Метод | Маршрут | Статус |
|-------|---------|--------|
| GET | `/api/stats` | ✅ |

Очікувана відповідь:
```json
{ "participants": 536, "tournamentsTotal": 120, "tournamentsFinished": 40, "teams": 98 }
```

---

## 2. Турніри

| Метод | Маршрут | Статус |
|-------|---------|--------|
| GET | `/api/tournaments` | ✅ |
| GET | `/api/tournaments?status=registration` | ✅ |
| GET | `/api/tournaments/:id` | ✅ |
| POST | `/api/tournaments` | ✅ |
| PATCH | `/api/tournaments/:id` | ✅ |
| PATCH | `/api/tournaments/:id/status` | ✅ |
| DELETE | `/api/tournaments/:id` | ✅ |
| GET | `/api/tournaments/:id/leaderboard` | ⚠️ перевір структуру відповіді |
| POST | `/api/tournaments/:id/announcements` | ⚠️ перевір чи реалізовано |
| GET | `/api/tournaments/:id/rounds` | ❌ **ПОТРІБНО** |

### Rounds — що очікує фронтенд (`SubmitWorkModal`):
```json
[
  { "id": 1, "title": "Раунд 1", "order_index": 0, "status": "active" },
  { "id": 2, "title": "Раунд 2", "order_index": 1, "status": "pending" }
]
```
Фронтенд фільтрує по `status === 'active'`, якщо немає — бере останній.

---

## 3. Команди

| Метод | Маршрут | Статус |
|-------|---------|--------|
| GET | `/api/teams/my` | ✅ |
| GET | `/api/teams/tournament/:tournamentId` | ✅ |
| GET | `/api/teams/:id` | ✅ |
| POST | `/api/teams` | ✅ |
| PATCH | `/api/teams/:id` | ✅ |
| DELETE | `/api/teams/:id` | ✅ |

### Важливо: що повертає `GET /api/teams/my`

```json
[
  {
    "id": 1,
    "name": "Team Alpha",
    "city": "Kyiv",
    "school": "School 1",
    "telegram_username": "team_alpha",
    "tournament_id": 5,
    "tournament_name": "Code League 2025",
    "tournament_status": "running"
  }
]
```
`tournament_status` визначає кнопки в UI:
- `"registration"` → ✏️ Редагувати
- `"running"` → 📤 Подати роботу

### `GET /api/teams/:id` — повна деталь:
```json
{
  "id": 1,
  "name": "Team Alpha",
  "members": [
    { "full_name": "Іванов Іван", "email": "ivan@mail.com", "username": "ivan_dev" }
  ]
}
```

---

## 4. Submissions (Подача роботи) ❌ ПОТРІБНО РЕАЛІЗУВАТИ

| Метод | Маршрут | Опис |
|-------|---------|------|
| GET | `/api/submissions/teams/:teamId` | Сабмішени команди |
| POST | `/api/submissions/rounds/:roundId` | Створити сабмішен |
| PATCH | `/api/submissions/:id` | Оновити сабмішен |

### Таблиця `submissions`:
```
id                 PK
round_id           FK → rounds.id
team_id            FK → teams.id
github_repo_url    varchar
github_branch      varchar
pitch_video_url    varchar (YouTube/Vimeo)
live_demo_url      varchar
description        text
created_at         timestamp
updated_at         timestamp
```

### POST `/api/submissions/rounds/:roundId` body:
```json
{
  "team_id": 1,
  "github_repo_url": "https://github.com/user/repo",
  "github_branch": "main",
  "pitch_video_url": "https://youtube.com/...",
  "live_demo_url": "https://myproject.vercel.app",
  "description": "Короткий опис"
}
```

### GET `/api/submissions/teams/:teamId` відповідь:
```json
[{ "id": 1, "round_id": 2, "github_repo_url": "...", "github_branch": "main", ... }]
```

---

## 5. Jury (Журі) ❌ ПОТРІБНО РЕАЛІЗУВАТИ

| Метод | Маршрут | Опис |
|-------|---------|------|
| GET | `/api/jury/tournaments` | Турніри де поточний юзер є журі |
| GET | `/api/jury/rounds/:roundId/submissions` | Сабмішени для перевірки |
| POST | `/api/jury/submissions/:id/evaluate` | Виставити оцінку |

### POST evaluate body:
```json
{
  "backend": 8,
  "database": 7,
  "frontend": 9,
  "documentation": 6,
  "requirements": 8,
  "comment": "Гарна архітектура"
}
```
Критерії оцінки (константа `EVAL_CRITERIA` на фронтенді):
- `backend` — Backend / Код (якість, ООП, тести)
- `database` — База даних (структура, налаштування)
- `frontend` — Frontend / UX
- `documentation` — README, коментарі, API опис
- `requirements` — Виконання must-have критеріїв ТЗ

Також бекенд повинен знати яких юзерів призначено журі для турніру.
Журі призначається через `TournamentForm` → `jury_ids: [1, 2, 3]` при `POST/PATCH /api/tournaments`.

---

## 6. Сповіщення (Notifications) ❌ ПОТРІБНО РЕАЛІЗУВАТИ

| Метод | Маршрут | Опис |
|-------|---------|------|
| GET | `/api/notifications` | Список сповіщень юзера |
| PATCH | `/api/notifications/:id/read` | Позначити прочитаним |
| DELETE | `/api/notifications/:id` | Видалити |
| PATCH | `/api/notifications/read-all` | Всі як прочитані |

---

## 7. Badges (Значки) ❌ ПОТРІБНО РЕАЛІЗУВАТИ

| Метод | Маршрут | Опис |
|-------|---------|------|
| GET | `/api/badges/my` | Мої значки |
| GET | `/api/admin/users/:id/badges` | Значки юзера (адмін) |
| POST | `/api/admin/users/:id/badges` | Видати значок `{ badge_id: "team_member" }` |
| DELETE | `/api/admin/users/:id/badges/:badgeId` | Забрати значок |

Значки (`ALL_BADGES` на фронтенді):
- `identity_confirmed` — заповнив ПІБ у профілі
- `team_member` — вступив до першої команди

---

## 8. Заявки організатора

| Метод | Маршрут | Статус |
|-------|---------|--------|
| POST | `/api/applications/organizer` | ⚠️ перевір |
| GET | `/api/applications/organizer/my` | ⚠️ перевір |
| GET | `/api/admin/applications/organizer` | ⚠️ перевір |
| PATCH | `/api/admin/applications/organizer/:id` | ⚠️ перевір |

Body PATCH: `{ "status": "approved" | "rejected" }`

---

## 9. Чат

| Метод | Маршрут | Статус |
|-------|---------|--------|
| GET | `/api/chat-messages?room=general` | ⚠️ перевір |
| POST | `/api/chat/upload` | ⚠️ multipart file |
| GET | `/api/chat/:room/reactions` | ⚠️ |
| DELETE | `/api/chat/:room/clear` | ⚠️ адмін |
| GET | `/api/chat/custom-rooms` | ⚠️ |
| GET | `/api/chat/:room/pinned` | ⚠️ |
| POST | `/api/admin/chat/rooms` | ⚠️ |
| DELETE | `/api/admin/chat/rooms/:id` | ⚠️ |
| GET | `/api/admin/chat/settings/:room` | ⚠️ |
| PATCH | `/api/admin/chat/settings/:room` | ⚠️ |
| POST | `/api/admin/chat/announce/:room` | ⚠️ |
| POST | `/api/admin/chat/pin/:msgId` | ⚠️ |
| DELETE | `/api/admin/chat/pin/:msgId` | ⚠️ |
| GET | `/api/admin/chat/muted` | ⚠️ |
| POST | `/api/admin/chat/mute/:userId` | ⚠️ |
| GET | `/api/teams/:teamId/chat/members` | ⚠️ |
| POST | `/api/teams/:teamId/chat/members` | ⚠️ body: `{ user_id }` |
| POST | `/api/teams/:teamId/members/:memberId/link` | ⚠️ body: `{ user_id }` |

---

## 10. Користувачі

| Метод | Маршрут | Статус |
|-------|---------|--------|
| GET | `/api/users/me` | ✅ |
| PATCH | `/api/users/me` | ✅ |
| POST | `/api/users/me/avatar` | ✅ multipart |
| POST | `/api/users/me/banner` | ✅ multipart |
| DELETE | `/api/users/me/banner` | ✅ |
| GET | `/api/users/:id` | ✅ |
| GET | `/api/users/search?q=` | ✅ |

### Поле `identity_confirmed` на юзері ⚠️
Фронтенд перевіряє при додаванні до команди:
```js
if (!platformUser.identity_confirmed) { toast.error(...) }
```
Бекенд повинен повертати `identity_confirmed: true/false` — true якщо у юзера заповнено ПІБ (наприклад, `last_name` + `first_name` не пусті).

---

## 11. Admin

| Метод | Маршрут | Статус |
|-------|---------|--------|
| GET | `/api/admin/users` | ⚠️ |
| PATCH | `/api/admin/users/:id` | ⚠️ body: `{ role }` |
| DELETE | `/api/admin/users/:id` | ⚠️ |
| PATCH | `/api/admin/users/:id/password` | ⚠️ body: `{ password }` |
| GET | `/api/admin/stats` | ⚠️ |
| GET | `/api/admin/teams` | ⚠️ |
| DELETE | `/api/admin/teams/:id` | ⚠️ |

---

## 12. Відгуки (Reviews)

| Метод | Маршрут | Статус |
|-------|---------|--------|
| GET | `/api/reviews` | ⚠️ |
| GET | `/api/reviews?q=search` | ⚠️ |
| POST | `/api/reviews` | ⚠️ |

---

## Пріоритет реалізації

### 🔴 Критично (блокує основний флоу):
1. `GET /api/tournaments/:id/rounds` — без цього модалка "Подати роботу" не завантажується
2. `GET /api/submissions/teams/:teamId` — перевірка чи є вже сабмішен
3. `POST /api/submissions/rounds/:roundId` — власне подача роботи
4. `PATCH /api/submissions/:id` — оновлення поданої роботи

### 🟡 Важливо (UI є але запити падають):
5. `GET /api/jury/...` — повний jury flow
6. `GET /api/notifications` + mutations — таб сповіщень
7. `GET /api/badges/my` — профіль

### 🟢 Другорядне:
8. Заявки організатора (якщо ще не перевірено)
9. Адмін-ендпоїнти для чат-модерації
10. Reviews

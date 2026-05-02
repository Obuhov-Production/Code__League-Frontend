# Backend: що потрібно для повноцінної роботи сповіщень

## 1. Новий ендпоінт — DELETE /notifications (видалити всі)

Фронтенд викликає `DELETE /api/notifications` (без id) щоб очистити всі сповіщення поточного користувача.

```
DELETE /api/notifications
Authorization: Bearer <token>
→ 204 No Content
```

Без цього ендпоінту кнопка "🗑 Видалити всі" в панелі не синхронізується з базою даних
(стан очищається тільки локально у React).

---

## 2. Поле `type` у моделі Notification

Зараз фронтенд фільтрує сповіщення за `link_tab`, але це ненадійно.
Потрібно додати поле `type` до моделі і повертати його у відповіді.

**Значення:**
| type          | Опис                                      |
|---------------|-------------------------------------------|
| `tournament`  | Реєстрація, старт, результати турніру     |
| `team`        | Запрошення в команду, зміни складу        |
| `system`      | Бан/мут, системні повідомлення адміна     |
| `submission`  | Статус здачі роботи, оцінка журі          |
| `chat`        | Особисті повідомлення (якщо потрібно)     |

**Міграція:**
```sql
ALTER TABLE notifications ADD COLUMN type VARCHAR(32) NOT NULL DEFAULT 'system';
```

**Відповідь API:**
```json
{
  "id": 42,
  "message": "Ваша команда зареєстрована на турнір",
  "type": "tournament",
  "icon": "🏆",
  "link_tab": "tournaments",
  "is_read": false,
  "created_at": "2026-05-02T14:30:00Z"
}
```

---

## 3. Пагінація GET /notifications

Зараз повертаються всі сповіщення одразу. При великій кількості це уповільнює завантаження.

**Рекомендований формат:**
```
GET /api/notifications?page=1&limit=20&type=tournament
```

**Відповідь:**
```json
{
  "items": [...],
  "total": 87,
  "unread": 5,
  "page": 1,
  "limit": 20
}
```

Фронтенд тоді може підвантажувати наступну сторінку при скролі донизу списку (infinite scroll).

---

## 4. Socket event `notification:new` — розширена структура

Зараз сокет надсилає об'єкт сповіщення.
Переконайтесь що він містить всі потрібні поля, включно з `type`:

```js
// сервер (Node.js / socket.io)
socket.to(userId).emit('notification:new', {
  id: notification.id,
  message: notification.message,
  type: notification.type,       // <-- обов'язково
  icon: notification.icon,
  link_tab: notification.link_tab,
  is_read: false,
  created_at: new Date().toISOString(),
});
```

---

## 5. PATCH /notifications/read-all — підтвердження через відповідь

Зараз ендпоінт повертає просто 204. Бажано повертати кількість позначених записів:

```json
{ "updated": 12 }
```

Не критично, але корисно для логування на фронті.

---

## Пріоритет реалізації

| # | Задача                              | Пріоритет |
|---|-------------------------------------|-----------|
| 1 | DELETE /notifications (видалити всі)| Високий   |
| 2 | Поле `type` у моделі + API          | Високий   |
| 3 | type у socket event                 | Високий   |
| 4 | Пагінація GET /notifications        | Середній  |
| 5 | Відповідь з лічильником у read-all  | Низький   |

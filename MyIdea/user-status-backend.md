# User Status System - Backend Requirements

## Описание
Система статуса пользователя (online/offline/away/dnd) которая видна всем на платформе в профиле и чате.

## Таблицы

### 1. Добавить поле в таблицу `users`
```sql
ALTER TABLE users 
  ADD COLUMN status VARCHAR(20) DEFAULT 'offline',  -- online, offline, away, dnd
  ADD COLUMN last_seen_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN status_updated_at TIMESTAMP DEFAULT NOW();
```

### 2. Таблица для истории статусов (опционально)
```sql
CREATE TABLE user_status_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  changed_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### GET /api/users/:id/status
Получить статус пользователя.
```json
Response: {
  "user_id": 1,
  "status": "online",
  "last_seen_at": "2024-01-15T10:30:00Z",
  "last_seen_text": "2 хвилини тому"
}
```

### PATCH /api/users/me/status
Обновить свой статус.
```json
Body: {
  "status": "away"  // online, away, dnd, offline
}

Response: {
  "status": "away",
  "updated_at": "2024-01-15T10:35:00Z"
}
```

### GET /api/users/online
Получить список онлайн пользователей.
```json
Response: {
  "online_count": 15,
  "users": [
    { "id": 1, "username": "...", "status": "online", "last_seen_at": "..." }
  ]
}
```

### WebSocket события
```javascript
// Когда пользователь меняет статус
socket.emit('status:update', { status: 'away' });

// Получать обновления статуса других
socket.on('status:changed', (data) => {
  // { user_id: 1, status: 'online', timestamp: '...' }
});
```

## Логика обновления статуса

### Автоматическое обновление
```javascript
// При подключении WebSocket -> статус online
// При отключении WebSocket -> статус offline (через 5 минут таймаута)

const STATUS_TIMEOUT = 5 * 60 * 1000; // 5 минут

function updateUserStatus(userId, status) {
  // Обновить в БД
  // Отправить через WebSocket всем друзьям/участникам чатов
}

// Heartbeat каждые 30 секунд для проверки online
setInterval(() => {
  checkInactiveUsers();
}, 30000);
```

### Middleware для обновления last_seen
```javascript
// При любом API запросе обновлять last_seen_at
app.use((req, res, next) => {
  if (req.user) {
    updateLastSeen(req.user.id);
  }
  next();
});
```

## Интеграция в существующие endpoints

### Обновить GET /api/me
```json
{
  "id": 1,
  "username": "...",
  "email": "...",
  "status": "online",  // <-- добавить
  "last_seen_at": "...",
  ...
}
```

### Обновить GET /api/users/:id (для профиля)
```json
{
  "id": 1,
  "username": "...",
  "status": "online",  // <-- добавить
  "last_seen_at": "...",
  "last_seen_text": "5 хвилин тому", // человекочитаемый формат
  ...
}
```

### Обновить список сообщений в чате
```json
{
  "messages": [...],
  "users": [
    { "id": 1, "username": "...", "status": "online" }  // <-- добавить статус
  ]
}
```

## Frontend использование

### UserAvatar с статусом
```jsx
<UserAvatar user={user} size={36} showStatus={true} />
```

### Статусы и цвета
- `online` - зеленый (#22c55e), пульсирует
- `away` - оранжевый (#f59e0b)
- `dnd` - красный (#ef4444) - Do Not Disturb
- `offline` - серый (#9ca3af)

### Отображение в чате
- Аватарки в списке сообщений показывают статус
- Список участников чата показывает статус
- При наведении показывается tooltip с текстом статуса

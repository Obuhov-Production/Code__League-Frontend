# Admin Users Management - Backend Requirements

## Описание
Улучшенная система управления пользователями в админ панели с поиском, фильтрацией, сортировкой и массовыми действиями.

## API Endpoints

### GET /api/admin/users
Получить список всех пользователей с дополнительными полями.
```json
Response: {
  "users": [
    {
      "id": 1,
      "username": "user123",
      "email": "user@example.com",
      "role": "admin,organizer",
      "status": "online",
      "created_at": "2024-01-15T10:30:00Z",
      "avatar_url": "/uploads/avatar.jpg",
      "banner_color": "#AC9EF8",
      "github_username": "githubuser"
    }
  ]
}
```

### GET /api/admin/users/search?q=query&role=admin&sort_by=username&sort_desc=true
Поиск и фильтрация пользователей.
```json
Query params:
- q: поиск по username/email (опционально)
- role: фильтр по роли - all, admin, organizer, jury, user, banned (опционально)
- sort_by: поле сортировки - username, email, role, created_at (default: created_at)
- sort_desc: направление - true/false (default: true)

Response: {
  "total": 150,
  "filtered": 12,
  "users": [...]
}
```

### PATCH /api/admin/users/bulk
Массовые действия над пользователями.
```json
Body: {
  "user_ids": [1, 2, 3],
  "action": "ban" | "unban" | "delete" | "change_role",
  "role": "organizer"  // только для change_role
}

Response: {
  "success": true,
  "affected": 3
}
```

## SQL Запросы

### Поиск с фильтрацией и сортировкой
```sql
-- Поиск по username/email
SELECT * FROM users 
WHERE (username ILIKE '%query%' OR email ILIKE '%query%')
  AND ($role = 'all' OR role LIKE '%' || $role || '%')
ORDER BY 
  CASE WHEN $sort_by = 'username' THEN username END ASC,
  CASE WHEN $sort_by = 'created_at' THEN created_at END DESC;

-- Сортировка по ролям
SELECT * FROM users 
WHERE role LIKE '%admin%' 
ORDER BY created_at DESC;
```

### Массовое обновление
```sql
-- Забанить нескольких пользователей
UPDATE users 
SET role = CASE 
  WHEN role LIKE '%banned%' THEN role 
  ELSE role || ',banned' 
END
WHERE id IN (1, 2, 3);

-- Массовое удаление
DELETE FROM users WHERE id IN (1, 2, 3);

-- Смена роли
UPDATE users SET role = 'organizer' WHERE id IN (1, 2, 3);
```

## WebSocket события
```javascript
// При изменении статуса пользователя
socket.emit('admin:users:status', { user_id: 1, status: 'online' });

// При массовом действии
socket.emit('admin:users:bulk', { 
  action: 'ban', 
  user_ids: [1, 2, 3],
  performed_by: admin_id 
});

// Получать обновления
socket.on('admin:users:updated', (data) => {
  // Обновить список пользователей
});
```

## Frontend State
```javascript
const [userSearch, setUserSearch] = useState('');
const [userRoleFilter, setUserRoleFilter] = useState('all');
const [userSortBy, setUserSortBy] = useState('created_at');
const [userSortDesc, setUserSortDesc] = useState(true);
const [selectedUsers, setSelectedUsers] = useState([]);

// Фильтрация на клиенте (опционально) или запрос на сервер
const filteredUsers = useMemo(() => {
  // ... логика фильтрации
}, [users, userSearch, userRoleFilter, userSortBy, userSortDesc]);
```

## Поля таблицы users (дополнения)
```sql
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'offline';
ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMP;
ALTER TABLE users ADD COLUMN banner_color VARCHAR(7);
ALTER TABLE users ADD COLUMN github_username VARCHAR(100);
```

## Права доступа
- Только admin может:
  - Видеть список всех пользователей
  - Менять роли
  - Банить/разбанивать
  - Удалять пользователей
  - Видеть email и статус

- Organizer/jury:
  - Видеть только username и avatar
  - Нет доступа к управлению

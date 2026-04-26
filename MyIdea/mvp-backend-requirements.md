# MVP Backend Requirements - Полный функционал

## 1. Система бейджей (Badges)

### Таблицы
```sql
-- Бейджи (доступные достижения)
CREATE TABLE badges (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,  -- 'active_developer', 'winner', etc
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10) DEFAULT '🏅',  -- emoji
  color VARCHAR(7) DEFAULT '#AC9EF8',
  category VARCHAR(20),  -- 'activity', 'achievement', 'special'
  condition_type VARCHAR(50),  -- 'tournaments_count', 'elo', 'wins', etc
  condition_value INTEGER,  -- пороговое значение
  created_at TIMESTAMP DEFAULT NOW()
);

-- Бейджи пользователей
CREATE TABLE user_badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP DEFAULT NOW(),
  awarded_by INTEGER REFERENCES users(id),  -- кто выдал (NULL = автоматически)
  UNIQUE(user_id, badge_id)
);
```

### API Endpoints
```
GET  /api/badges              # Список всех бейджей
GET  /api/users/:id/badges   # Бейджи пользователя
POST /api/admin/users/:id/badges  # Выдать бейдж (admin only)
  Body: { badge_id: 1 }
DELETE /api/admin/users/:id/badges/:badge_id  # Отозвать бейдж

GET /api/me/badges  # Свои бейджи (включить в /api/me)
```

### Автоматические бейджи (логика на backend)
```javascript
// Проверка при различных событиях:
const BADGE_TRIGGERS = {
  'active_developer': (user) => user.tournaments_count >= 5,
  'first_win': (user) => user.wins >= 1,
  'champion': (user) => user.wins >= 3,
  'elo_master': (user) => user.elo >= 1000,
  'team_player': (user) => user.teams_count >= 3,
  'early_bird': (user) => user.created_at < '2024-01-01',
};

// Вызывать после:
// - Завершения турнира (wins++)
// - Начисления ELO
// - Создания команды
```

---

## 2. Auto-join Workspace и Chat при создании команды

### Логика
```javascript
// При POST /api/teams (создание команды)
async function createTeam(payload, userId) {
  // 1. Создать команду
  const team = await db.teams.create(payload);
  
  // 2. Добавить создателя как капитана
  await db.team_members.create({
    team_id: team.id,
    user_id: userId,
    role: 'captain',
    joined_at: new Date()
  });
  
  // 3. Создать workspace чат для команды
  const workspaceRoom = await db.chat_rooms.create({
    name: `team-${team.id}-workspace`,
    label: `💻 ${team.name} - Workspace`,
    type: 'team_workspace',
    team_id: team.id,
    is_private: true
  });
  
  // 4. Создать командный чат
  const teamRoom = await db.chat_rooms.create({
    name: `team-${team.id}`,
    label: `👥 ${team.name}`,
    type: 'team_chat',
    team_id: team.id,
    is_private: true
  });
  
  // 5. Добавить капитана в оба чата
  await db.chat_members.create([
    { room_id: workspaceRoom.id, user_id: userId },
    { room_id: teamRoom.id, user_id: userId }
  ]);
  
  // 6. Отправить приветственное сообщение
  await db.messages.create({
    room_id: teamRoom.id,
    user_id: SYSTEM_USER_ID,
    text: `🎉 Вітаємо! Команда "${team.name}" створена. Цей чат для спілкування команди.`,
    is_system: true
  });
  
  return team;
}
```

### API для присоединения к команде
```
POST /api/teams/:id/join
  # Автоматически добавляет пользователя в команду + в чаты команды
  
POST /api/teams/:id/invite
  Body: { user_id: 123 }
  # Пригласить пользователя (капитан only) - добавляет в команду + чаты
```

### Таблицы (дополнение)
```sql
-- Добавить поля в chat_rooms
ALTER TABLE chat_rooms ADD COLUMN team_id INTEGER REFERENCES teams(id);
ALTER TABLE chat_rooms ADD COLUMN type VARCHAR(20) DEFAULT 'general'; -- 'general', 'team_chat', 'team_workspace', 'tournament'
```

---

## 3. Панель жюри - оценка проектов

### Таблицы (уже частично есть, дополнения)
```sql
-- Добавить в submissions
ALTER TABLE submissions ADD COLUMN github_repo_url VARCHAR(255);
ALTER TABLE submissions ADD COLUMN github_branch VARCHAR(100) DEFAULT 'main';
ALTER TABLE submissions ADD COLUMN live_demo_url VARCHAR(255);
ALTER TABLE submissions ADD COLUMN pitch_video_url VARCHAR(255);
ALTER TABLE submissions ADD COLUMN documentation_url VARCHAR(255);
ALTER TABLE submissions ADD COLUMN evaluated_at TIMESTAMP;

-- Оценки жюри (уже есть evaluations, дополнения)
ALTER TABLE evaluations ADD COLUMN criteria JSONB;  -- [{key: 'code_quality', score: 85}, ...]
```

### API Endpoints
```
GET /api/jury/tournaments              # Турниры где пользователь жюри
GET /api/jury/rounds/:id/submissions   # Сабмиты раунда с github_url и т.д.

POST /api/jury/submissions/:id/evaluate
  Body: {
    total_score: 85,
    comment: "Гарна робота, але...",
    criteria: [
      { key: 'code_quality', label: 'Якість коду', score: 90 },
      { key: 'innovation', label: 'Інноваційність', score: 80 },
      { key: 'functionality', label: 'Функціональність', score: 85 },
      { key: 'presentation', label: 'Презентація', score: 85 }
    ]
  }

GET /api/jury/submissions/:id/code/files?path=src
  # Получить файлы из GitHub репозитория (прокси через backend)
  
GET /api/jury/submissions/:id/code/file?path=src/app.js
  # Получить содержимое файла
  
POST /api/jury/submissions/:id/code/comment
  Body: { file_path: 'src/app.js', line_number: 42, comment: 'Тут можна оптимізувати' }
```

### GitHub Integration для просмотра кода
```javascript
// Прокси запросы к GitHub API
async function getRepoFiles(repoUrl, branch = 'main', path = '') {
  const [owner, repo] = parseRepoUrl(repoUrl);
  const token = process.env.GITHUB_TOKEN;  # App token или пользователя
  
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers: { Authorization: `token ${token}` } }
  );
  
  return response.json();
}

async function getFileContent(repoUrl, branch, path) {
  const [owner, repo] = parseRepoUrl(repoUrl);
  const token = process.env.GITHUB_TOKEN;
  
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers: { Authorization: `token ${token}` } }
  );
  
  const data = await response.json();
  // Декодировать base64 content
  return Buffer.from(data.content, 'base64').toString('utf-8');
}
```

---

## 4. Назначение жюри при создании турнира

### Таблицы
```sql
-- Связь турнир-жюри
CREATE TABLE tournament_jury (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by INTEGER REFERENCES users(id),
  UNIQUE(tournament_id, user_id)
);
```

### API Endpoints
```
GET /api/users?role=jury  # Получить список пользователей с ролью jury

POST /api/tournaments
  Body: {
    ...fields,
    jury_ids: [1, 2, 3]  # ID пользователей-жюри
  }
  # При создании автоматически создавать записи в tournament_jury

PATCH /api/tournaments/:id
  Body: { jury_ids: [1, 2] }  # Обновить список жюри

GET /api/tournaments/:id/jury  # Получить список жюри турнира
```

### Логика проверки доступа
```javascript
function canEvaluate(user, tournamentId) {
  // Админ может оценивать всё
  if (user.role.includes('admin')) return true;
  
  // Жюри только назначенных турниров
  const isJury = await db.tournament_jury.exists({
    tournament_id: tournamentId,
    user_id: user.id
  });
  
  return isJury;
}
```

---

## 5. Leaderboard с графиками

### API Endpoints
```
GET /api/leaderboard?period=week|month|all
  Response: {
    users: [
      { rank: 1, user_id: 1, username: '...', elo: 1500, wins: 5, tournaments: 10 }
    ],
    my_rank: 15,
    total_users: 150
  }

GET /api/stats/activity?days=7
  # Для графика активности
  Response: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    submissions: [12, 19, 15, 25, 32, 28, 35],
    registrations: [5, 8, 12, 10, 15, 18, 20]
  }

GET /api/stats/tournaments/:id/activity
  # Активность по конкретному турниру
```

### Frontend график (уже реализован SVG)
```jsx
// Использовать данные из GET /api/stats/activity
// Рендерить SVG path на основе данных
```

---

## 6. Сводка для админ панели

### API Endpoints
```
GET /api/admin/stats
  Response: {
    users: 150,
    teams: 45,
    tournaments: { total: 12, running: 3, draft: 2, finished: 7 },
    submissions: 1204,
    messages: 15000,
    banned: 2,
    submissions_today: 15,
    submissions_week: 120,
    active_tournaments: 3,
    pending_applications: 5
  }

GET /api/admin/deadlines
  # Ближайшие дедлайны для Upcoming Deadlines карточки
  Response: [
    { tournament_id: 1, name: '...', deadline: '2024-01-15', days_left: 2, progress: 85 }
  ]
```

---

## 7. Полный список изменений для Backend

### Новые таблицы:
1. `badges` - справочник бейджей
2. `user_badges` - бейджи пользователей
3. `tournament_jury` - связь турниров и жюри
4. `tournament_repositories` - репозитории команд (уже документировано в tz-github-backend.md)
5. `code_reviews` - комментарии к коду (уже документировано)

### Изменения существующих таблиц:
```sql
-- users
ALTER TABLE users ADD COLUMN elo INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN wins INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN tournaments_count INTEGER DEFAULT 0;

-- tournaments
ALTER TABLE tournaments ADD COLUMN tz TEXT;
ALTER TABLE tournaments ADD COLUMN jury_ids INTEGER[];  # или через tournament_jury

-- submissions (новые поля для GitHub)
ALTER TABLE submissions ADD COLUMN github_repo_url VARCHAR(255);
ALTER TABLE submissions ADD COLUMN github_branch VARCHAR(100);
ALTER TABLE submissions ADD COLUMN live_demo_url VARCHAR(255);
ALTER TABLE submissions ADD COLUMN pitch_video_url VARCHAR(255);

-- chat_rooms
ALTER TABLE chat_rooms ADD COLUMN team_id INTEGER;
ALTER TABLE chat_rooms ADD COLUMN type VARCHAR(20);

-- teams - добавить триггер для auto-join
-- При создании команды автоматически создавать чаты
```

### Новые API endpoints:
1. `GET /api/users?role=jury` - список жюри
2. `POST/PUT /api/tournaments/:id/jury` - назначение жюри
3. `GET /api/jury/*` - панель жюри
4. `GET /api/badges` - список бейджей
5. `POST /api/admin/badges/grant` - выдача бейджей
6. `GET /api/stats/activity` - статистика для графиков
7. `GET /api/admin/deadlines` - дедлайны

### Webhooks:
```
POST /api/webhooks/github
  # Для автоматического обновления при push в репозиторий
```

---

## 8. Последовательность реализации (приоритет)

### Phase 1 (Core MVP):
1. ✅ TZ в турнирах (уже готово)
2. 🔄 Назначение жюри при создании турнира
3. 🔄 Панель жюри с оценками
4. 🔄 Auto-join чаты при создании команды

### Phase 2 (Stats & Gamification):
5. 🔄 Leaderboard с графиками
6. 🔄 Система бейджей
7. 🔄 ELO/EXP система (уже частично готово)

### Phase 3 (Advanced):
8. ⏳ GitHub интеграция (code review)
9. ⏳ Полноценный workspace
10. ⏳ Автоматическая проверка репозиториев

### Phase 4 ( polish ):
11. ⏳ Email уведомления
12. ⏳ Push notifications
13. ⏳ Экспорт данных

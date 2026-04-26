# TZ та GitHub Інтеграція - Требування до Backend

## 1. Технічне Завдання (TZ) в Турнірах

### Поле в таблиці `tournaments`
```sql
ALTER TABLE tournaments 
  ADD COLUMN tz TEXT NULL,  -- Технічне завдання (Markdown/Plain text)
  ADD COLUMN tz_enabled BOOLEAN DEFAULT FALSE;  -- Чи доступне TZ для учасників
```

### API Endpoints

#### POST /api/tournaments
```json
{
  "name": "...",
  "tz": "Опис технічного завдання...",
  ...
}
```

#### PATCH /api/tournaments/:id
```json
{
  "tz": "Оновлений опис..."
}
```

#### GET /api/tournaments/:id
**Response:**
```json
{
  "id": 1,
  "name": "...",
  "tz": "...",
  "tz_enabled": true,
  ...
}
```

**Логіка доступу:**
- `tz` повертається тільки якщо:
  - Користувач є організатором/адміном
  - Або `tz_enabled = true` (турнір розпочався)
  - Або статус = "running" / "finished"

---

## 2. GitHub Авторизація

### Поле в таблиці `users`
```sql
ALTER TABLE users 
  ADD COLUMN github_id VARCHAR(50) NULL,      -- GitHub ID
  ADD COLUMN github_username VARCHAR(100) NULL, -- GitHub логін
  ADD COLUMN github_token VARCHAR(255) NULL,   -- OAuth токен (encrypted)
  ADD COLUMN github_connected BOOLEAN DEFAULT FALSE,
  ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'email'; -- 'email' | 'github' | 'google'
```

### OAuth Flow
```
1. Frontend → GET /api/auth/github/login
2. Backend → Redirect to GitHub OAuth
3. GitHub → Callback /api/auth/github/callback?code=...
4. Backend → Exchange code for token
5. Backend → Get user info from GitHub API
6. Backend → Create/Update user, set auth_provider='github'
7. Backend → Return JWT token
```

### API Endpoints

#### GET /api/auth/github/login
Redirect to GitHub OAuth authorization page.

#### GET /api/auth/github/callback
Handle OAuth callback, create/link user account.

#### GET /api/me (оновлений)
```json
{
  "id": 1,
  "username": "...",
  "auth_provider": "github",
  "github_username": "octocat",
  "github_connected": true
}
```

---

## 3. GitHub Інтеграція для Турнірів (Code Workspace)

### Таблиця `tournament_repositories`
```sql
CREATE TABLE tournament_repositories (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id),
  team_id INTEGER REFERENCES teams(id),
  
  -- GitHub інформація
  github_repo_url VARCHAR(255),
  github_branch VARCHAR(100) DEFAULT 'main',
  github_commit_sha VARCHAR(100),
  
  -- Сабміт
  live_demo_url VARCHAR(255),
  pitch_video_url VARCHAR(255),
  documentation_url VARCHAR(255),
  
  -- Статус перевірки
  repo_verified BOOLEAN DEFAULT FALSE,
  last_verified_at TIMESTAMP,
  
  -- Таймстампи
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints

#### POST /api/teams/:id/repository
Додати/оновити репозиторій команди.
```json
{
  "github_repo_url": "https://github.com/user/repo",
  "github_branch": "main",
  "live_demo_url": "https://demo.example.com",
  "pitch_video_url": "https://youtube.com/..."
}
```

**Логіка:**
1. Перевірити що користувач є членом команди
2. Валідувати URL (regex для github.com)
3. Перевірити що репозиторій існує (GitHub API call)
4. Зберегти в БД
5. Запустити background job для клонування/перевірки

#### GET /api/teams/:id/repository
Отримати інформацію про репозиторій команди.

#### POST /api/teams/:id/repository/verify
Ручна перевірка репозиторію.

### GitHub API Integration

#### Перевірка репозиторію
```javascript
// Псевдокод
const verifyRepo = async (repoUrl, token) => {
  const [owner, repo] = parseGithubUrl(repoUrl);
  
  // GitHub API call
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Authorization: `token ${token}` }
  });
  
  if (response.status === 200) {
    const data = await response.json();
    return {
      verified: true,
      stars: data.stargazers_count,
      last_commit: data.pushed_at,
      language: data.language
    };
  }
  return { verified: false };
};
```

#### Отримання файлів (для code review)
```javascript
const getRepoFiles = async (owner, repo, branch, path = '') => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers: { Authorization: `token ${token}` } }
  );
  return response.json();
};
```

---

## 4. Code Workspace (Перегляд коду)

### Таблиця `code_reviews`
```sql
CREATE TABLE code_reviews (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id),
  team_id INTEGER REFERENCES teams(id),
  reviewer_id INTEGER REFERENCES users(id),
  
  file_path VARCHAR(500),
  line_number INTEGER,
  comment TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints

#### GET /api/teams/:id/code/files
Отримати список файлів з репозиторію (кешований).
```json
[
  { "path": "src/app.js", "type": "file", "size": 1024 },
  { "path": "src/components", "type": "dir" }
]
```

#### GET /api/teams/:id/code/file?path=src/app.js
Отримати вміст файлу.
```json
{
  "path": "src/app.js",
  "content": "...base64 або raw text...",
  "language": "javascript"
}
```

#### POST /api/teams/:id/code/comment
Додати коментар до рядка коду.
```json
{
  "file_path": "src/app.js",
  "line_number": 42,
  "comment": "Тут можна оптимізувати..."
}
```

---

## 5. Вебхуки (Webhooks)

### GitHub Webhook для автоматичних оновлень

#### Endpoint: POST /api/webhooks/github
```javascript
// GitHub push event
{
  "repository": { "full_name": "user/repo" },
  "ref": "refs/heads/main",
  "head_commit": { "id": "abc123", "message": "..." }
}

// Логіка:
// 1. Знайти tournament_repositories за repo_url
// 2. Оновити github_commit_sha
// 3. Оновити last_verified_at
// 4. Надіслати сповіщення команді (якщо enabled)
```

### Налаштування webhook на GitHub
```
Payload URL: https://api.example.com/api/webhooks/github
Content type: application/json
Secret: GITHUB_WEBHOOK_SECRET (env variable)
Events: Push, Pull request
```

---

## 6. Послідовність впровадження

### Етап 1: TZ (вже готово на фронтенді)
- [ ] Додати поле `tz` в таблицю tournaments
- [ ] Оновити POST /api/tournaments - приймати tz
- [ ] Оновити PATCH /api/tournaments/:id - оновлювати tz
- [ ] Оновити GET /api/tournaments/:id - повертати tz з логікою доступу

### Етап 2: GitHub OAuth
- [ ] Додати поля github_* в таблицю users
- [ ] Створити /api/auth/github/login
- [ ] Створити /api/auth/github/callback
- [ ] Оновити /api/me - повертати auth_provider

### Етап 3: Repositories (базове)
- [ ] Створити таблицю tournament_repositories
- [ ] POST /api/teams/:id/repository
- [ ] GET /api/teams/:id/repository
- [ ] Валідація URL та перевірка існування репо

### Етап 4: Code Workspace (розширене)
- [ ] Кешування файлів з GitHub
- [ ] GET /api/teams/:id/code/files
- [ ] GET /api/teams/:id/code/file
- [ ] Таблиця code_reviews
- [ ] POST /api/teams/:id/code/comment

### Етап 5: Webhooks
- [ ] POST /api/webhooks/github
- [ ] Автоматичні оновлення при push
- [ ] Сповіщення в чат

---

## 7. Зміни на Frontend (вже реалізовано)

- ✅ Поле TZ в TournamentForm (db.shared.jsx)
- ✅ GitHub preview блок (заглушка)
- ✅ Відображення auth_provider (потрібно додати в Dashboard)

**Додати в Dashboard.jsx для відображення GitHub статусу:**
```jsx
{user?.auth_provider === 'github' && (
  <span className="db-github-badge">🐙 {user.github_username}</span>
)}
```

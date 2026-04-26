# ELO / EXP Система - Требования к Backend

## Общее описание
Система начисления очков (ELO/EXP) за участие в турнирах. Организатор при создании турнира указывает награды, а бэкенд автоматически начисляет очки участникам.

## Поля в таблице `tournaments` (новые)
```sql
ALTER TABLE tournaments 
  ADD COLUMN elo_participation INT DEFAULT 10,   -- базовые очки за участие
  ADD COLUMN elo_per_round INT DEFAULT 20,       -- очки × номер пройденного раунда
  ADD COLUMN elo_winner INT DEFAULT 100;          -- бонус за 1-е место
```

## Поля в таблице `users` (новые)
```sql
ALTER TABLE users 
  ADD COLUMN elo INT DEFAULT 0,     -- общий ELO рейтинг
  ADD COLUMN exp INT DEFAULT 0;     -- альтернативное название (если нужно)
```

## Поля в таблице `tournament_participants` (новые, если нет)
```sql
ALTER TABLE tournament_participants 
  ADD COLUMN current_round INT DEFAULT 0,     -- до какого раунда дошел
  ADD COLUMN placement INT DEFAULT NULL,       -- итоговое место (1, 2, 3...)
  ADD COLUMN elo_earned INT DEFAULT 0,         -- сколько ELO получил
  ADD COLUMN elo_calculated BOOLEAN DEFAULT FALSE; -- начислено ли
```

## API Endpoints

### PATCH /api/tournaments/:id/status (продвижение раунда)
```
Body: { status: "running", current_round: 2 }
```
**Логика:** При переходе на новый раунд:
1. Найти всех участников с `current_round >= previous_round`
2. Начислить: `elo_per_round × previous_round`
3. Обновить `users.elo += sum`
4. Обновить `current_round` у всех кто прошел

### PATCH /api/tournaments/:id/finish
```
Body: { status: "finished", winners: [user_id1, user_id2, user_id3] }
```
**Логика:**
1. Всем участникам: `elo_participation` (если еще не начислено)
2. Кто дошел до раунда N: `elo_per_round × N` (за каждый пройденный)
3. Победителям (1-е место): `elo_winner`
4. Обновить `users.elo`, `tournament_participants.elo_earned`

### GET /api/users/:id (или /api/me)
```
Response: { id, username, email, elo, exp, ... }
```
Возвращать `elo` в объекте пользователя. Frontend использует `user?.elo ?? user?.exp ?? 0`

### GET /api/leaderboard
```
Response: [{ user_id, username, elo, tournaments_count, wins }]
```
Сортировка по `elo DESC`. Для страницы лидерборда.

## Формула расчета ELO за турнир
```
ELO_earned = elo_participation 
           + Σ(elo_per_round × round_number) for each passed round
           + (placement === 1 ? elo_winner : 0)
```

Пример: Турнир с 3 раундами, elo_participation=10, elo_per_round=20, elo_winner=100
- Участник дошел до 2-го раунда, не победил:
  - 10 + (20×1) + (20×2) = 10 + 20 + 40 = 70 ELO
- Победитель (прошел 3 раунда):
  - 10 + (20×1) + (20×2) + (20×3) + 100 = 10 + 20 + 40 + 60 + 100 = 230 ELO

## Начальные значения (default)
- `elo_participation` = 10
- `elo_per_round` = 20
- `elo_winner` = 100

## Frontend поля (уже добавлены)
В `TournamentForm` (db.shared.jsx) добавлены 3 поля:
- `elo_participation` (number)
- `elo_per_round` (number)
- `elo_winner` (number)

Отправляются в POST/PATCH /api/tournaments

## Что нужно сделать на backend
1. Добавить колонки в `tournaments` (3 поля)
2. Добавить колонку `elo` в `users`
3. Добавить колонки в `tournament_participants` (current_round, placement, elo_earned)
4. При создании турнира сохранять elo_* поля
5. При продвижении раунда начислять elo_per_round × round
6. При завершении турнира начислять participation + winner bonus
7. Возвращать `elo` в GET /api/me и GET /api/users/:id
8. Создать GET /api/leaderboard для общего рейтинга

## Важно
- ELO начисляется **один раз** за турнир
- Если участник выбыл в раунде N, он получает очки за раунды 1..N-1
- Победитель получает все раунды + winner bonus
- `elo_calculated` защита от двойного начисления

# RouteFlow

Приложение для построения маршрутов с использованием Yandex Maps API.

## Структура проекта

Проект разделен на два отдельных приложения:

- **`client/`** - React клиентское приложение
- **`server/`** - Express серверное приложение
- **`shared/`** - Общие типы и схемы

## Быстрый старт

### 1. Запуск сервера

```bash
cd server
npm install
cp env.example .env
# Отредактируйте .env файл
npm run dev
```

Сервер будет доступен на http://localhost:5001

### 2. Запуск клиента

```bash
cd client
npm install
cp env.example .env.local
# Отредактируйте .env.local файл
npm run dev
```

Клиент будет доступен на http://localhost:3000

## Развертывание

### Сервер

```bash
cd server
npm run build
npm start
```

### Клиент

```bash
cd client
npm run build
# Разверните папку dist на ваш хостинг
```

## Переменные окружения

### Сервер (.env)
- `PORT` - Порт сервера (по умолчанию 5001)
- `DATABASE_URL` - URL базы данных
- `SESSION_SECRET` - Секрет для сессий
- `CLIENT_URL` - URL клиентского приложения
- `NODE_ENV` - Окружение (development/production)
- `YANDEX_MAPS_API_KEY` - API ключ Yandex Maps (обязательно)
- `ALLOWED_ORIGINS` - Разрешенные источники для CORS (через запятую)

### Клиент (.env.local)
- `VITE_API_URL` - URL API сервера
- **Примечание**: API ключ Yandex Maps больше не используется на клиенте. Все запросы проксируются через сервер.

## Технологии

- **Клиент**: React, TypeScript, Vite, Tailwind CSS, Redux Toolkit, React Query, DOMPurify, toast, retry logic
- **Сервер**: Node.js, Express, TypeScript, Drizzle ORM, Winston, express-rate-limit
- **Общее**: Zod для валидации

---

## TODO

### Кэширование и производительность

- [ ] **Кэширование автодополнения адресов**
  - Реализовать Service Worker с Cache API
  - Использовать стратегию stale-while-revalidate для автодополнения
  - Кэшировать популярные запросы для быстрого ответа
  - Снизить количество запросов к Yandex Geocoder API

- [ ] **Кэширование рассчитанных маршрутов**
  - Кэшировать результаты расчета маршрутов по ключу (start + destinations + mode)
  - Использовать стратегию network-first с fallback на кэш
  - Обеспечить офлайн-доступ к сохраненным маршрутам
  - Установить TTL для кэша маршрутов (например, 24 часа)

---

## Лицензия

MIT

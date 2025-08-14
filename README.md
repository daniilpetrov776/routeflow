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

### Клиент (.env.local)
- `VITE_API_URL` - URL API сервера

## Технологии

- **Клиент**: React, TypeScript, Vite, Tailwind CSS, Redux Toolkit
- **Сервер**: Node.js, Express, TypeScript, Drizzle ORM
- **Общее**: Zod для валидации

# RouteFlow Server

Серверная часть приложения RouteFlow, построенная на Express.js.

## Установка

```bash
npm install
```

## Настройка окружения

Скопируйте `env.example` в `.env` и заполните необходимые переменные:

```bash
cp env.example .env
```

## Запуск в режиме разработки

```bash
npm run dev
```

Сервер будет доступен на http://localhost:5001

## Сборка для продакшена

```bash
npm run build
npm start
```

## API Endpoints

Все API endpoints доступны по пути `/api/*`

## База данных

Для работы с базой данных используйте:

```bash
npm run db:push
```

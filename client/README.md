# RouteFlow Client

Клиентская часть приложения RouteFlow для планирования маршрутов, построенная на React + Vite.

## Установка

```bash
npm install
```

## Настройка окружения

Скопируйте `env.example` в `.env.local` и заполните необходимые переменные:

```bash
cp env.example .env.local
```

## Запуск в режиме разработки

```bash
npm run dev
```

Приложение будет доступно на http://localhost:3000

## Сборка для продакшена

```bash
npm run build
npm run preview
```

## Структура проекта

- `src/components/` - React компоненты
- `src/pages/` - Страницы приложения
- `src/store/` - Redux store
- `src/hooks/` - React хуки
- `src/services/` - API сервисы
- `src/types/` - TypeScript типы

## API

Приложение настроено на работу с API сервером по адресу http://localhost:5001

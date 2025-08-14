# Инструкция по развертыванию

## Развертывание сервера

### 1. Vercel (рекомендуется для API)
```bash
cd server
vercel --prod
```

### 2. Railway
```bash
cd server
railway login
railway init
railway up
```

### 3. Heroku
```bash
cd server
heroku create your-app-name
git push heroku main
```

## Развертывание клиента

### 1. Vercel (рекомендуется для SPA)
```bash
cd client
vercel --prod
```

### 2. Netlify
```bash
cd client
npm run build
# Загрузите папку dist в Netlify
```

### 3. GitHub Pages
```bash
cd client
npm run build
# Настройте GitHub Actions для автоматического деплоя
```

## Переменные окружения для продакшена

### Сервер
```env
PORT=5001
DATABASE_URL=your_production_database_url
SESSION_SECRET=your_secure_session_secret
CLIENT_URL=https://your-client-domain.com
NODE_ENV=production
```

### Клиент
```env
VITE_API_URL=https://your-server-domain.com
```

## Важные моменты

1. **CORS**: Убедитесь, что `CLIENT_URL` в сервере указывает на правильный домен клиента
2. **База данных**: Используйте продакшн базу данных (например, Neon, Supabase)
3. **HTTPS**: Все продакшн URL должны использовать HTTPS
4. **Переменные окружения**: Не забудьте настроить переменные окружения на вашем хостинге

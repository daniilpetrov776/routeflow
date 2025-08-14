#!/bin/bash

echo "🚀 Установка зависимостей для RouteFlow..."

echo "📦 Установка зависимостей для сервера..."
cd server
npm install
cd ..

echo "📦 Установка зависимостей для клиента..."
cd client
npm install
cd ..

echo "✅ Установка завершена!"
echo ""
echo "Для запуска сервера:"
echo "  cd server && npm run dev"
echo ""
echo "Для запуска клиента:"
echo "  cd client && npm run dev"
echo ""
echo "Не забудьте настроить .env файлы!"

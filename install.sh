#!/bin/bash

# Настройки
APP_DIR="avatar-customizer"
REPO_URL="https://github.com/Attam2213/avatar-customizer.git"

echo "=== Начало установки Avatar Customizer ==="

# 1. Обновление системы и установка зависимостей
echo "[1/4] Установка Node.js, npm, Git и PM2..."
# Обновляем списки пакетов
sudo apt-get update
# Устанавливаем curl и git если нет
sudo apt-get install -y curl git
# Устанавливаем Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
# Устанавливаем PM2 глобально для управления процессами
sudo npm install -g pm2

# 2. Клонирование репозитория
echo "[2/4] Скачивание проекта..."
if [ -d "$APP_DIR" ]; then
    echo "Папка $APP_DIR уже существует. Пропускаем клонирование."
else
    git clone "$REPO_URL" "$APP_DIR"
fi

# 3. Установка зависимостей проекта
echo "[3/4] Установка библиотек проекта..."
cd "$APP_DIR"
npm install

# 4. Запуск приложения
echo "[4/4] Запуск сервера..."
# Останавливаем старый процесс если есть
pm2 stop avatar-app 2>/dev/null || true
pm2 delete avatar-app 2>/dev/null || true
# Запускаем новый
pm2 start server.js --name "avatar-app"
# Сохраняем список процессов для автозапуска после перезагрузки
pm2 save
# Настраиваем автозапуск PM2
pm2 startup | tail -n 1 > startup_tmp.sh
chmod +x startup_tmp.sh
sudo ./startup_tmp.sh
rm startup_tmp.sh

echo "=== Установка завершена! ==="
echo "Приложение запущено. Статус:"
pm2 status

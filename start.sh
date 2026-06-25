#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

if [ ! -d "$BACKEND_DIR/.venv" ]; then
  echo "Создаю виртуальное окружение для backend..."
  python3 -m venv "$BACKEND_DIR/.venv"
  "$BACKEND_DIR/.venv/bin/python" -m pip install --upgrade pip
  "$BACKEND_DIR/.venv/bin/python" -m pip install -r "$BACKEND_DIR/requirements.txt"
fi

echo "Запускаю backend..."
("$BACKEND_DIR/.venv/bin/python" "$BACKEND_DIR/main.py") &

echo "Запускаю frontend..."
(cd "$FRONTEND_DIR" && npm run dev) &

echo "Сервисы запущены."

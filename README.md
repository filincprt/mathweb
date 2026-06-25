# MathWeb — обучение таблице умножения и деления (1–10)

Проект разделён на `frontend` и `backend`. Запуск осуществляется напрямую через Python для сервера и npm/Vite для клиента.

## Запуск backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Сервер будет доступен на `http://127.0.0.1:8000`.

## Запуск frontend

```powershell
cd frontend
npm install
npm run dev
```

Откройте `http://localhost:5173`.

## Запуск одной командой

```bash
python start.py
```

Этот скрипт создаст виртуальное окружение backend, установит зависимости и запустит backend и frontend одновременно.

## Что реализовано

- FastAPI backend с SQLite
- React + TypeScript + Vite + Tailwind
- Дашборд с графиком, тепловой картой и историей прогонов
- Кастомная мобильная клавиатура и таймер тренировок
- Система баллов, оценок и достижения
- Пользовательские ачивки
- PWA-конфигурация для офлайн-режима

> Docker используется только опционально; локальный запуск через Python предпочтительнее для разработки.

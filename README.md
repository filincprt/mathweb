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

## Запуск одной командой через Python

Для разработки достаточно выполнить команду из корня проекта:

```bash
python start.py
```

Скрипт сам создаст виртуальное окружение backend, установит Python-зависимости, установит npm-зависимости frontend и запустит два процесса: FastAPI на `http://127.0.0.1:8000` и Vite на `http://127.0.0.1:5173`.

Для запуска одним backend-процессом (frontend предварительно собирается и отдаётся через FastAPI) используйте:

```bash
python start.py --prod
```

После сборки приложение будет доступно на `http://127.0.0.1:8000`. Если `frontend/dist` уже собран, можно ускорить запуск командой `python start.py --prod --skip-build`. Хосты и порты настраиваются флагами `--host`, `--port`, `--frontend-host`, `--frontend-port` или переменными окружения `MATHWEB_HOST`, `MATHWEB_PORT`, `MATHWEB_FRONTEND_HOST`, `MATHWEB_FRONTEND_PORT`.

### Если регистрация показывает `Failed to fetch`

1. Остановите все старые процессы backend/frontend.
2. Запустите проект именно через `python start.py` или `./start.sh` / `./start.ps1`: лаунчер проверит `backend/requirements.txt` и обновит `backend/.venv`, если зависимости изменились.
3. Если в логах всё ещё есть `passlib`, удалите старое окружение `backend/.venv` и снова выполните `python start.py` — актуальный backend использует прямой `bcrypt`, а не `passlib`.

## Что реализовано

- FastAPI backend с SQLite
- React + TypeScript + Vite + Tailwind
- Дашборд с графиком, тепловой картой и историей прогонов
- Кастомная мобильная клавиатура и таймер тренировок
- Система баллов, оценок и достижения
- Пользовательские ачивки
- PWA-конфигурация для офлайн-режима

> Docker используется только опционально; локальный запуск через Python предпочтительнее для разработки.

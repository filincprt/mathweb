import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / 'backend'
FRONTEND = ROOT / 'frontend'
VENV = BACKEND / '.venv'

IS_WINDOWS = sys.platform.startswith('win')
PYTHON_EXE = VENV / 'Scripts' / 'python.exe' if IS_WINDOWS else VENV / 'bin' / 'python'
NPM_CMD = 'npm.cmd' if IS_WINDOWS else 'npm'


def run(cmd, cwd, env=None):
    effective_env = os.environ.copy()
    if env:
        effective_env.update(env)
    return subprocess.Popen(cmd, cwd=cwd, env=effective_env, shell=False)


def ensure_venv():
    if not PYTHON_EXE.exists():
        print('Создаём виртуальное окружение для backend...')
        subprocess.check_call([sys.executable, '-m', 'venv', str(VENV)])
        print('Устанавливаем зависимости backend...')
        subprocess.check_call([str(PYTHON_EXE), '-m', 'pip', 'install', '--upgrade', 'pip'])
        subprocess.check_call([str(PYTHON_EXE), '-m', 'pip', 'install', '-r', str(BACKEND / 'requirements.txt')])
    else:
        print('Виртуальное окружение backend уже существует.')


def ensure_frontend():
    if not (FRONTEND / 'node_modules').exists():
        print('Устанавливаем зависимости frontend...')
        subprocess.check_call([NPM_CMD, 'install'], cwd=str(FRONTEND))
    else:
        print('node_modules уже есть. Пропускаем npm install.')


def main():
    ensure_venv()
    ensure_frontend()

    print('Запускаем backend...')
    backend_proc = run(
        [
            str(PYTHON_EXE),
            '-m',
            'uvicorn',
            'main:app',
            '--reload',
            '--host',
            '127.0.0.1',
            '--port',
            '8000',
        ],
        cwd=str(BACKEND),
    )
    print('Запускаем frontend...')
    frontend_proc = run([NPM_CMD, 'run', 'dev'], cwd=str(FRONTEND))

    print('Открытое окно: backend PID', backend_proc.pid)
    print('Открытое окно: frontend PID', frontend_proc.pid)
    print('Нажмите Ctrl+C, чтобы завершить оба процесса.')

    try:
        while True:
            backend_exit = backend_proc.poll()
            frontend_exit = frontend_proc.poll()
            if backend_exit is not None or frontend_exit is not None:
                break
            # Спим коротко, не дожидаясь завершения одного из процессов.
            time.sleep(0.5)
    except KeyboardInterrupt:
        print('\nОстанавливаем процессы...')
        for proc in (backend_proc, frontend_proc):
            if proc and proc.poll() is None:
                proc.terminate()
        for proc in (backend_proc, frontend_proc):
            if proc:
                proc.wait(timeout=5)
        print('Завершено.')
        sys.exit(0)

    if backend_exit is not None and frontend_proc.poll() is None:
        print('Frontend завершительный процесс: останавливаем frontend...')
        frontend_proc.terminate()
        frontend_proc.wait(timeout=5)
    if frontend_exit is not None and backend_proc.poll() is None:
        print('Backend завершительный процесс: останавливаем backend...')
        backend_proc.terminate()
        backend_proc.wait(timeout=5)

    if backend_exit is not None:
        print(f'Backend завершился с кодом {backend_exit}')
    if frontend_exit is not None:
        print(f'Frontend завершился с кодом {frontend_exit}')

    sys.exit(backend_exit or frontend_exit or 0)


if __name__ == '__main__':
    main()

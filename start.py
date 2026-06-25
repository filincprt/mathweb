"""One-command launcher for MathWeb.

Usage:
    python start.py          # install deps (if needed) and run backend + Vite dev server
    python start.py --prod   # build frontend and serve the whole app from FastAPI
"""

from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
VENV = BACKEND / ".venv"
REQUIREMENTS = BACKEND / "requirements.txt"
REQUIREMENTS_MARKER = VENV / ".requirements.sha256"

IS_WINDOWS = sys.platform.startswith("win")
PYTHON_EXE = VENV / "Scripts" / "python.exe" if IS_WINDOWS else VENV / "bin" / "python"
NPM_CMD = "npm.cmd" if IS_WINDOWS else "npm"
DEFAULT_BACKEND_HOST = "127.0.0.1"
DEFAULT_BACKEND_PORT = "8000"
DEFAULT_FRONTEND_HOST = "127.0.0.1"
DEFAULT_FRONTEND_PORT = "5173"


def print_step(message: str) -> None:
    print(f"\n==> {message}", flush=True)


def run_checked(cmd: Iterable[str], cwd: Path) -> None:
    subprocess.check_call(list(cmd), cwd=str(cwd))


def popen(cmd: Iterable[str], cwd: Path, env: dict[str, str] | None = None) -> subprocess.Popen:
    effective_env = os.environ.copy()
    if env:
        effective_env.update(env)
    return subprocess.Popen(list(cmd), cwd=str(cwd), env=effective_env, shell=False)


def ensure_command(command: str, hint: str) -> None:
    if shutil.which(command) is None:
        raise RuntimeError(f"Команда '{command}' не найдена. {hint}")


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def install_backend_dependencies() -> None:
    print_step("Устанавливаем зависимости backend")
    run_checked([str(PYTHON_EXE), "-m", "pip", "install", "--upgrade", "pip"], BACKEND)
    # Старые версии проекта ставили passlib/bcrypt; удаляем их, чтобы stale .venv
    # не мог снова попасть в проблемный passlib bcrypt backend при ручных запусках.
    run_checked([str(PYTHON_EXE), "-m", "pip", "uninstall", "-y", "passlib", "bcrypt"], BACKEND)
    run_checked([str(PYTHON_EXE), "-m", "pip", "install", "-r", str(REQUIREMENTS)], BACKEND)
    REQUIREMENTS_MARKER.write_text(file_sha256(REQUIREMENTS), encoding="utf-8")


def ensure_venv() -> None:
    current_requirements_hash = file_sha256(REQUIREMENTS)

    if not PYTHON_EXE.exists():
        print_step("Создаём виртуальное окружение для backend")
        run_checked([sys.executable, "-m", "venv", str(VENV)], ROOT)
        install_backend_dependencies()
        return

    installed_requirements_hash = REQUIREMENTS_MARKER.read_text(encoding="utf-8").strip() if REQUIREMENTS_MARKER.exists() else ""
    if installed_requirements_hash != current_requirements_hash:
        install_backend_dependencies()
        return

    print("Виртуальное окружение backend уже существует, зависимости актуальны.")


def ensure_frontend_dependencies() -> None:
    ensure_command(NPM_CMD, "Установите Node.js LTS: https://nodejs.org/")
    if (FRONTEND / "node_modules").exists():
        print("node_modules уже есть. Пропускаем npm install.")
        return

    print_step("Устанавливаем зависимости frontend")
    npm_install_cmd = "ci" if (FRONTEND / "package-lock.json").exists() else "install"
    run_checked([NPM_CMD, npm_install_cmd], FRONTEND)


def build_frontend(api_base: str) -> None:
    ensure_frontend_dependencies()
    print_step("Собираем frontend для отдачи через FastAPI")
    env = {"VITE_API_BASE_URL": api_base}
    effective_env = os.environ.copy()
    effective_env.update(env)
    subprocess.check_call([NPM_CMD, "run", "build"], cwd=str(FRONTEND), env=effective_env)


def terminate_processes(processes: list[subprocess.Popen]) -> None:
    for proc in processes:
        if proc.poll() is None:
            proc.terminate()
    deadline = time.time() + 5
    for proc in processes:
        if proc.poll() is not None:
            continue
        try:
            proc.wait(timeout=max(0, deadline - time.time()))
        except subprocess.TimeoutExpired:
            proc.kill()


def run_dev(host: str, port: str, frontend_host: str, frontend_port: str) -> int:
    ensure_venv()
    ensure_frontend_dependencies()

    backend_url = f"http://{host}:{port}"
    print_step("Запускаем backend")
    backend_proc = popen(
        [
            str(PYTHON_EXE),
            "-m",
            "uvicorn",
            "main:app",
            "--reload",
            "--host",
            host,
            "--port",
            port,
        ],
        BACKEND,
        env={"FRONTEND_DIST_DIR": str(FRONTEND / "dist")},
    )

    print_step("Запускаем frontend")
    frontend_proc = popen(
        [NPM_CMD, "run", "dev", "--", "--host", frontend_host, "--port", frontend_port],
        FRONTEND,
        env={"VITE_API_BASE_URL": backend_url},
    )

    processes = [backend_proc, frontend_proc]
    print(f"Backend:  {backend_url} (PID {backend_proc.pid})")
    print(f"Frontend: http://{frontend_host}:{frontend_port} (PID {frontend_proc.pid})")
    print("Нажмите Ctrl+C, чтобы завершить оба процесса.")

    try:
        while True:
            for proc, name in ((backend_proc, "backend"), (frontend_proc, "frontend")):
                code = proc.poll()
                if code is not None:
                    print(f"{name} завершился с кодом {code}. Останавливаем остальные процессы...")
                    terminate_processes(processes)
                    return code
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nОстанавливаем процессы...")
        terminate_processes(processes)
        return 0


def run_prod(host: str, port: str, skip_build: bool) -> int:
    ensure_venv()
    if not skip_build:
        build_frontend(api_base="")
    elif not (FRONTEND / "dist" / "index.html").exists():
        raise RuntimeError("frontend/dist не найден. Запустите без --skip-build или выполните npm run build.")

    app_url = f"http://{host}:{port}"
    print_step("Запускаем приложение одной FastAPI-командой")
    print(f"MathWeb: {app_url}")
    return subprocess.call(
        [str(PYTHON_EXE), "-m", "uvicorn", "main:app", "--host", host, "--port", port],
        cwd=str(BACKEND),
        env={**os.environ.copy(), "FRONTEND_DIST_DIR": str(FRONTEND / "dist")},
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Запуск MathWeb одной командой через Python")
    parser.add_argument("--prod", action="store_true", help="собрать frontend и отдавать его через FastAPI")
    parser.add_argument("--skip-build", action="store_true", help="в prod-режиме использовать существующий frontend/dist")
    parser.add_argument("--host", default=os.getenv("MATHWEB_HOST", DEFAULT_BACKEND_HOST), help="host backend/FastAPI")
    parser.add_argument("--port", default=os.getenv("MATHWEB_PORT", DEFAULT_BACKEND_PORT), help="port backend/FastAPI")
    parser.add_argument("--frontend-host", default=os.getenv("MATHWEB_FRONTEND_HOST", DEFAULT_FRONTEND_HOST), help="host Vite dev server")
    parser.add_argument("--frontend-port", default=os.getenv("MATHWEB_FRONTEND_PORT", DEFAULT_FRONTEND_PORT), help="port Vite dev server")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.prod:
            return run_prod(args.host, args.port, args.skip_build)
        return run_dev(args.host, args.port, args.frontend_host, args.frontend_port)
    except (subprocess.CalledProcessError, RuntimeError) as exc:
        print(f"Ошибка запуска: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

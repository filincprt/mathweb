# Backend FastAPI для MathWeb: логика прогонов, аналитика, достижения и прямой запуск через Python
from fastapi import FastAPI, HTTPException, Depends, Response, Header, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Field, SQLModel, Session, create_engine, select
from pydantic import BaseModel, validator
import bcrypt
from datetime import datetime, timedelta
from jose import jwt, JWTError
from typing import Optional, List, Dict, Any
import os
import json
import random
import uvicorn
from pathlib import Path

SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60
BCRYPT_MAX_PASSWORD_BYTES = 72


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nickname: str = Field(index=True, unique=True)
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Run(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, index=True)
    date: datetime = Field(default_factory=datetime.utcnow)
    operation: str = 'mix'
    tables: str = Field(default='[]')
    correct: int = 0
    total: int = 0
    percent: float = 0.0
    score: int = 0
    stars: int = 0
    details: Optional[str] = None

class Achievement(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    key: str
    name: str
    description: str
    custom: bool = False
    earned_at: datetime = Field(default_factory=datetime.utcnow)

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./data.db')
engine = create_engine(DATABASE_URL, echo=False)

app = FastAPI(title='MathWeb API')
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event('startup')
def on_startup():
    SQLModel.metadata.create_all(engine)

# --- Утилиты ---

def validate_password_bytes(password: str) -> str:
    if len(password.encode('utf-8')) > BCRYPT_MAX_PASSWORD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Пароль не должен превышать 72 байта в UTF-8',
        )
    return password


def verify_password(plain: str, hashed: str) -> bool:
    validate_password_bytes(plain)
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except ValueError:
        return False


def get_password_hash(password: str) -> str:
    validate_password_bytes(password)
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[User]:
    if not authorization:
        return None
    try:
        scheme, _, token = authorization.partition(' ')
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get('sub'))
    except (JWTError, ValueError):
        return None
    with Session(engine) as session:
        return session.get(User, user_id)


def compute_heatmap(runs: List[Run]) -> List[List[int]]:
    matrix = [[0 for _ in range(10)] for _ in range(10)]
    for run in runs:
        if not run.details:
            continue
        try:
            details = json.loads(run.details)
        except json.JSONDecodeError:
            continue
        for item in details:
            if item.get('correct', False):
                continue
            if item.get('op') == 'mul':
                i = item.get('a', 1) - 1
                j = item.get('b', 1) - 1
            else:
                i = item.get('b', 1) - 1
                j = int(item.get('a', 1) / item.get('b', 1)) - 1
            if 0 <= i < 10 and 0 <= j < 10:
                matrix[i][j] += 1
    return matrix


def compute_streak(runs: List[Run]) -> int:
    if not runs:
        return 0
    sorted_runs = sorted(runs, key=lambda run: run.date)
    streak = 0
    previous = None
    for run in sorted_runs:
        if not previous:
            streak = 1
        else:
            diff = (run.date.date() - previous.date.date()).days
            if diff == 1:
                streak += 1
            elif diff > 1:
                streak = 1
        previous = run
    return streak


def compute_achievements(details: List[Dict[str, Any]], percent: float) -> List[Dict[str, str]]:
    achievements = []
    if details and all(item.get('correct', False) for item in details):
        if all(item.get('durationMs', 0) <= 5000 for item in details):
            achievements.append({"key": "lightning", "name": "Молния", "description": "Все ответы за менее чем 5 секунд", "custom": False})
        if all(not item.get('usedHint', False) for item in details):
            achievements.append({"key": "perfect", "name": "Идеальный", "description": "100% без подсказок", "custom": False})
    sevens = [item for item in details if item.get('op') == 'mul' and item.get('a') == 7]
    if sevens and all(item.get('correct', False) for item in sevens):
        achievements.append({"key": "master-sevens", "name": "Мастер семёрок", "description": "100% на таблице умножения на 7", "custom": False})
    if percent >= 90:
        achievements.append({"key": "top-score", "name": "Перфекционист", "description": "Результат 90% и выше", "custom": False})
    return achievements

# --- Pydantic схемы ---
class RegisterIn(BaseModel):
    nickname: str
    password: str

    @validator('nickname')
    def nickname_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('Никнейм не может быть пустым')
        return value.strip()

    @validator('password')
    def password_length(cls, value: str) -> str:
        if len(value) < 4:
            raise ValueError('Пароль должен содержать как минимум 4 символа')
        if len(value.encode('utf-8')) > BCRYPT_MAX_PASSWORD_BYTES:
            raise ValueError('Пароль не должен превышать 72 байта в UTF-8')
        return value

class TokenOut(BaseModel):
    access_token: str
    token_type: str = 'bearer'

class LoginIn(BaseModel):
    nickname: str
    password: str

    @validator('nickname')
    def nickname_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('Никнейм не может быть пустым')
        return value.strip()

    @validator('password')
    def password_length(cls, value: str) -> str:
        if len(value) < 4:
            raise ValueError('Пароль должен содержать как минимум 4 символа')
        if len(value.encode('utf-8')) > BCRYPT_MAX_PASSWORD_BYTES:
            raise ValueError('Пароль не должен превышать 72 байта в UTF-8')
        return value

class QuizSetup(BaseModel):
    operation: str = 'mix'
    tables: List[int] = []
    order: str = 'random'
    count: Optional[int] = 10
    timerEnabled: bool = False
    timerSeconds: int = 10

    @validator('operation')
    def op_validate(cls, value: str) -> str:
        if value not in ('mul', 'div', 'mix'):
            raise ValueError('Неверный тип операции')
        return value

    @validator('tables', each_item=True)
    def table_validate(cls, value: int) -> int:
        if value < 1 or value > 10:
            raise ValueError('Таблица должна быть от 1 до 10')
        return value

    @validator('order')
    def order_validate(cls, value: str) -> str:
        if value not in ('order', 'random'):
            raise ValueError('Неверный порядок')
        return value

    @validator('count')
    def count_validate(cls, value: Optional[int]) -> Optional[int]:
        if value is None or value <= 0:
            return 10
        return value

class QuestionOut(BaseModel):
    a: int
    b: int
    op: str

class QuizAnswerDetail(BaseModel):
    a: int
    b: int
    op: str
    answer: Optional[int]
    correct: bool
    usedHint: bool
    durationMs: int

class RunResultIn(BaseModel):
    correct: int
    total: int
    percent: float
    score: int
    stars: int
    operation: str
    tables: List[int]
    details: List[QuizAnswerDetail]

class AchievementIn(BaseModel):
    key: str
    name: str
    description: str

    @validator('key')
    def key_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('Ключ достижения не может быть пустым')
        return value.strip()

    @validator('name')
    def name_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('Название не может быть пустым')
        return value.strip()

# --- Endpoints ---
@app.post('/api/register', response_model=TokenOut)
def register(data: RegisterIn):
    with Session(engine) as session:
        existing = session.exec(select(User).where(User.nickname == data.nickname)).first()
        if existing:
            raise HTTPException(status_code=400, detail='Nickname already taken')
        user = User(nickname=data.nickname, password_hash=get_password_hash(data.password))
        session.add(user)
        session.commit()
        session.refresh(user)
        access = create_access_token({"sub": str(user.id)}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        return {"access_token": access}

@app.post('/api/login', response_model=TokenOut)
def login(data: LoginIn):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.nickname == data.nickname)).first()
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')
        access = create_access_token({"sub": str(user.id)}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        return {"access_token": access}

@app.get('/api/me')
def me(user: Optional[User] = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Not authenticated')
    return {"id": user.id, "nickname": user.nickname, "created_at": user.created_at}

@app.post('/api/quiz/generate', response_model=List[QuestionOut])
def gen_quiz(cfg: QuizSetup):
    pool: List[Dict[str, Any]] = []
    tables = cfg.tables or list(range(1, 11))
    for t in tables:
        for x in range(1, 11):
            if cfg.operation in ('mul', 'mix'):
                pool.append({'a': t, 'b': x, 'op': 'mul'})
            if cfg.operation in ('div', 'mix'):
                pool.append({'a': t * x, 'b': t, 'op': 'div'})
    if cfg.order == 'random':
        random.shuffle(pool)
    count = cfg.count if cfg.count <= len(pool) else len(pool)
    return pool[:count]

@app.post('/api/quiz/result')
def save_result(payload: RunResultIn, user: Optional[User] = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Not authenticated')
    details_json = json.dumps([item.dict() for item in payload.details])
    with Session(engine) as session:
        run = Run(
            user_id=user.id,
            operation=payload.operation,
            tables=json.dumps(payload.tables),
            correct=payload.correct,
            total=payload.total,
            percent=payload.percent,
            score=payload.score,
            stars=payload.stars,
            details=details_json,
        )
        session.add(run)
        session.commit()
        session.refresh(run)
        achievements = compute_achievements(payload.details, payload.percent)
        for item in achievements:
            exists = session.exec(select(Achievement).where(Achievement.user_id == user.id, Achievement.key == item['key'])).first()
            if not exists:
                ach = Achievement(user_id=user.id, key=item['key'], name=item['name'], description=item['description'], custom=False)
                session.add(ach)
        session.commit()
        return {"id": run.id}

@app.get('/api/dashboard')
def dashboard(user: Optional[User] = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Not authenticated')
    with Session(engine) as session:
        runs = session.exec(select(Run).where(Run.user_id == user.id).order_by(Run.date.desc())).all()
        total_runs = len(runs)
        average_percent = round(sum((r.percent for r in runs), 0) / total_runs, 1) if total_runs else 0
        best_run = max(runs, key=lambda r:r.percent, default=None)
        best_percent = best_run.percent if best_run else 0
        best_date = best_run.date.isoformat() if best_run else None
        streak = compute_streak(runs)
        trend = [{"label": run.date.strftime('%d.%m'), "percent": run.percent} for run in runs[:12][::-1]]
        heatmap = compute_heatmap(runs)
        return {
            "totalRuns": total_runs,
            "averagePercent": average_percent,
            "bestPercent": best_percent,
            "bestDate": best_date,
            "streak": streak,
            "trend": trend,
            "heatmap": heatmap,
        }

@app.get('/api/runs')
def runs(user: Optional[User] = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Not authenticated')
    with Session(engine) as session:
        runs = session.exec(select(Run).where(Run.user_id == user.id).order_by(Run.date.desc()).limit(20)).all()
        return [
            {
                "id": run.id,
                "date": run.date.isoformat(),
                "operation": run.operation,
                "tables": json.loads(run.tables),
                "correct": run.correct,
                "total": run.total,
                "percent": run.percent,
                "score": run.score,
                "stars": run.stars,
            }
            for run in runs
        ]

@app.get('/api/achievements')
def achievements(user: Optional[User] = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Not authenticated')
    with Session(engine) as session:
        achievements = session.exec(select(Achievement).where(Achievement.user_id == user.id).order_by(Achievement.earned_at.desc())).all()
        return [
            {
                "key": item.key,
                "name": item.name,
                "description": item.description,
                "custom": item.custom,
                "earned_at": item.earned_at.isoformat(),
            }
            for item in achievements
        ]

@app.post('/api/achievements/custom')
def create_custom_achievement(payload: AchievementIn, user: Optional[User] = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Not authenticated')
    with Session(engine) as session:
        existing = session.exec(select(Achievement).where(Achievement.user_id == user.id, Achievement.key == payload.key)).first()
        if existing:
            raise HTTPException(status_code=400, detail='Achievement key already exists')
        achievement = Achievement(
            user_id=user.id,
            key=payload.key,
            name=payload.name,
            description=payload.description,
            custom=True,
        )
        session.add(achievement)
        session.commit()
        return {"status": "created"}


def configure_frontend_static() -> None:
    """Serve a built Vite frontend when FRONTEND_DIST_DIR points to frontend/dist."""
    dist_dir = Path(os.getenv('FRONTEND_DIST_DIR', Path(__file__).resolve().parents[1] / 'frontend' / 'dist'))
    index_html = dist_dir / 'index.html'
    assets_dir = dist_dir / 'assets'

    if assets_dir.exists():
        app.mount('/assets', StaticFiles(directory=str(assets_dir)), name='frontend-assets')

    if index_html.exists():
        @app.get('/', include_in_schema=False)
        def frontend_index():
            return FileResponse(index_html)

        @app.get('/{path:path}', include_in_schema=False)
        def frontend_spa(path: str):
            requested = dist_dir / path
            if requested.is_file():
                return FileResponse(requested)
            return FileResponse(index_html)


configure_frontend_static()

if __name__ == '__main__':
    uvicorn.run(app, host='127.0.0.1', port=8000, reload=False)

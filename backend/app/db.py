# SQLite 데이터베이스 (D-019, DATA-MODEL.md 5절)
import os
import sqlite3
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = PROJECT_ROOT / "data" / "expense.db"

# 기록 표 (DATA-MODEL.md 5절). 값 검사는 서버 입력 검사(C-5)가 합니다.
# AUTOINCREMENT: 지운 기록의 번호를 다시 쓰지 않습니다. (DATA-MODEL.md 5절)
CREATE_RECORDS_TABLE = """
CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    occurred_at TEXT NOT NULL,
    memo TEXT NOT NULL,
    category TEXT,
    payment_method TEXT,
    created_at TEXT NOT NULL
)
"""


def get_db_path() -> Path:
    """환경 변수 EXPENSE_DB_PATH가 있으면 그 파일, 없으면 data/expense.db (ARCHITECTURE.md 3절)"""
    value = os.environ.get("EXPENSE_DB_PATH")
    return Path(value) if value else DEFAULT_DB_PATH


def connect() -> sqlite3.Connection:
    # 폴더는 만들지 않습니다. 없는 폴더를 가리키면 오류가 납니다. (TEST-PLAN.md T-921)
    return sqlite3.connect(get_db_path())


def init_db() -> None:
    """표가 없으면 만듭니다."""
    conn = connect()
    try:
        conn.execute(CREATE_RECORDS_TABLE)
        conn.commit()
    finally:
        conn.close()

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
    """데이터베이스를 열고, 표가 없으면 만듭니다.

    폴더는 만들지 않습니다. 없는 폴더를 가리키면 sqlite3 오류가 나고, 서버는 500을 돌려줍니다. (TEST-PLAN.md T-921)
    요청마다 표를 확인하므로, 서버를 켤 때 열지 못했던 파일도 나중에 열 수 있게 되면 그대로 씁니다.
    """
    conn = sqlite3.connect(get_db_path())
    try:
        conn.execute(CREATE_RECORDS_TABLE)
        conn.commit()
    except sqlite3.Error:
        conn.close()
        raise
    return conn


def init_db() -> None:
    """서버를 켤 때 파일과 표를 미리 만듭니다."""
    connect().close()

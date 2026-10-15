from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app import clock
from app.main import app


@pytest.fixture
def db_path(tmp_path, monkeypatch):
    # 테스트마다 새 임시 데이터베이스를 씁니다. (TEST-PLAN.md 4절)
    path = tmp_path / "test.db"
    monkeypatch.setenv("EXPENSE_DB_PATH", str(path))
    return path


@pytest.fixture
def client(db_path):
    with TestClient(app) as c:
        yield c


# "지금"을 고정할 때 쓰는 시각: 한국 시간 2026-10-14 15:30:20 (TEST-PLAN.md 4절)
FIXED_NOW_KST = datetime(2026, 10, 14, 15, 30, 20, 123000, tzinfo=timezone(timedelta(hours=9)))


@pytest.fixture
def set_now(monkeypatch):
    """set_now(aware_datetime)로 서버의 "지금"을 바꿉니다."""

    def _set(moment: datetime) -> None:
        monkeypatch.setattr(clock, "utc_now", lambda: moment.astimezone(timezone.utc))

    _set(FIXED_NOW_KST)
    return _set

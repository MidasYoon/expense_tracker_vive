import pytest
from fastapi.testclient import TestClient

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

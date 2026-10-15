# 서버 오류 (TEST-PLAN.md 6절 T-921, ARCHITECTURE.md 6절)
import pytest
from fastapi.testclient import TestClient

from app import records
from app.main import app
from test_records import VALID

OCTOBER = {"from": "2026-10-01", "to": "2026-10-31"}


@pytest.fixture
def broken_db(tmp_path, monkeypatch, set_now):
    # 없는 폴더 안의 파일을 가리킴 (TEST-PLAN.md 검토 3)
    monkeypatch.setenv("EXPENSE_DB_PATH", str(tmp_path / "no-such-folder" / "expense.db"))


@pytest.fixture
def broken_client(broken_db):
    # 서버를 켤 때 데이터베이스를 못 열어도 멈추지 않아야 합니다. (P-18 I)
    # raise_server_exceptions=False: 테스트 도구가 서버 오류를 다시 던지지 않고 실제 응답(500)을 보여 줌
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client


def test_t921_a07_a08_return_internal_error(broken_client):
    for response in (
        broken_client.get("/api/records", params=OCTOBER),
        broken_client.post("/api/records", json=VALID),
    ):
        assert response.status_code == 500
        # 오류 응답 형식만 있고 사람이 읽는 문구는 없음 (API-SPEC.md 4절)
        assert response.json() == {"code": "INTERNAL_ERROR"}


def test_t921_a09_returns_internal_error(broken_client):
    response = broken_client.delete("/api/records/1")

    assert response.status_code == 500
    assert response.json() == {"code": "INTERNAL_ERROR"}


def test_t921_a10_still_works_without_database(broken_client):
    # A-10은 데이터베이스를 쓰지 않음 (DATA-MODEL.md 8절, TEST-PLAN.md T-921 2026-10-15 고침)
    response = broken_client.get("/api/options")

    assert response.status_code == 200
    assert len(response.json()["incomeCategories"]) == 5


def test_database_becomes_usable_after_folder_appears(broken_client, tmp_path):
    assert broken_client.get("/api/records", params=OCTOBER).status_code == 500

    (tmp_path / "no-such-folder").mkdir()

    response = broken_client.get("/api/records", params=OCTOBER)
    assert response.status_code == 200
    assert response.json()["records"] == []


def test_unexpected_error_returns_internal_error(client, monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("뜻밖의 오류")

    monkeypatch.setattr(records, "list_with_totals", boom)
    with TestClient(client.app, raise_server_exceptions=False) as c:
        response = c.get("/api/records", params=OCTOBER)

    assert response.status_code == 500
    assert response.json() == {"code": "INTERNAL_ERROR"}
    assert "뜻밖의" not in response.text

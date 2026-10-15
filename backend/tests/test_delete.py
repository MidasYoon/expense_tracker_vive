# A-09 기록 지우기 (TEST-PLAN.md 5.3 T-301, T-302)
import sqlite3

import pytest

from test_list import OCTOBER, insert


@pytest.fixture(autouse=True)
def fixed_now(set_now):
    return set_now


def row_ids(db_path) -> list[int]:
    conn = sqlite3.connect(db_path)
    try:
        return [row[0] for row in conn.execute("SELECT id FROM records ORDER BY id")]
    finally:
        conn.close()


def listed_ids(client) -> list[int]:
    return [r["id"] for r in client.get("/api/records", params=OCTOBER).json()["records"]]


def test_t301_delete_existing_record(client, db_path):
    keep = insert(db_path, "2026-10-05 09:00")
    target = insert(db_path, "2026-10-06 09:00")

    response = client.delete(f"/api/records/{target}")

    assert response.status_code == 204
    assert response.content == b""
    assert listed_ids(client) == [keep]
    # 지운 표시만 남기지 않고 줄 자체가 없음
    assert row_ids(db_path) == [keep]


@pytest.mark.parametrize("path_id", ["999", "abc", "-1", "1.5", "0", str(2**63), "%20"])
def test_t302_missing_or_non_numeric_id(client, db_path, path_id):
    keep = insert(db_path, "2026-10-05 09:00")

    response = client.delete(f"/api/records/{path_id}")

    assert response.status_code == 404
    assert response.json() == {"code": "RECORD_NOT_FOUND"}
    assert row_ids(db_path) == [keep]


def test_t302_delete_same_record_twice(client, db_path):
    keep = insert(db_path, "2026-10-05 09:00")
    target = insert(db_path, "2026-10-06 09:00")

    assert client.delete(f"/api/records/{target}").status_code == 204
    second = client.delete(f"/api/records/{target}")

    assert second.status_code == 404
    assert second.json() == {"code": "RECORD_NOT_FOUND"}
    assert row_ids(db_path) == [keep]

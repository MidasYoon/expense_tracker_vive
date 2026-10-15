# A-07 기간 목록과 합계 (TEST-PLAN.md 5.2, 5.4, 5.5, 5.6, 그리고 P-14에서 넘어온 T-101 나머지)
import sqlite3

import pytest

OCTOBER = {"from": "2026-10-01", "to": "2026-10-31"}


@pytest.fixture(autouse=True)
def fixed_now(set_now):
    return set_now


def insert(db_path, occurred_at, record_type="EXPENSE", amount=1000, memo="메모",
           created_at="2026-10-14 12:00:00.000", category=None, payment_method=None) -> int:
    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.execute(
            "INSERT INTO records (type, amount, occurred_at, memo, category, payment_method, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?)",
            (record_type, amount, occurred_at, memo, category, payment_method, created_at),
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def get(client, **params):
    return client.get("/api/records", params=params)


def occurred(response) -> list[str]:
    assert response.status_code == 200
    return [r["occurredAt"] for r in response.json()["records"]]


def test_t101_saved_record_is_visible_in_a07(client):
    body = {
        "type": "EXPENSE",
        "amount": 12000,
        "occurredAt": "2026-10-12T18:30",
        "memo": "  회사 동료들과 저녁 식사  ",
        "category": None,
        "paymentMethod": None,
    }
    saved = client.post("/api/records", json=body).json()

    response = get(client, **OCTOBER)

    assert response.json()["records"] == [saved]
    assert saved["memo"] == "회사 동료들과 저녁 식사"


def test_t201_record_fields(client, db_path):
    insert(db_path, "2026-10-12 18:30", category="FOOD", payment_method="DEBIT_CARD")

    record = get(client, **OCTOBER).json()["records"][0]

    assert set(record) == {"id", "type", "amount", "occurredAt", "memo", "category", "paymentMethod"}
    assert record["occurredAt"] == "2026-10-12T18:30"
    assert record["category"] == "FOOD" and record["paymentMethod"] == "DEBIT_CARD"


def test_t202_order(client, db_path):
    for occurred_at in ["2026-10-05 09:00", "2026-10-20 09:00", "2026-10-12 09:00"]:
        insert(db_path, occurred_at)
    newest_first = ["2026-10-20T09:00", "2026-10-12T09:00", "2026-10-05T09:00"]

    assert occurred(get(client, **OCTOBER, order="desc")) == newest_first
    assert occurred(get(client, **OCTOBER)) == newest_first
    assert occurred(get(client, **OCTOBER, order="asc")) == newest_first[::-1]

    response = get(client, **OCTOBER, order="new")
    assert response.status_code == 400
    assert response.json() == {"code": "INVALID_ORDER"}


def test_t203_same_time_ordered_by_created_at_then_id(client, db_path):
    first = insert(db_path, "2026-10-12 18:30", created_at="2026-10-14 12:00:00.001")
    second = insert(db_path, "2026-10-12 18:30", created_at="2026-10-14 12:00:00.002")
    third = insert(db_path, "2026-10-12 18:30", created_at="2026-10-14 12:00:00.002")

    ids = lambda r: [x["id"] for x in r.json()["records"]]  # noqa: E731
    assert ids(get(client, **OCTOBER, order="desc")) == [third, second, first]
    assert ids(get(client, **OCTOBER, order="asc")) == [first, second, third]


def test_t204_returns_all_1000_records(client, db_path):
    conn = sqlite3.connect(db_path)
    try:
        conn.executemany(
            "INSERT INTO records (type, amount, occurred_at, memo, created_at) VALUES (?, ?, ?, ?, ?)",
            [("EXPENSE", 1, f"2026-10-{d:02d} 12:00", "m", "2026-10-14 12:00:00.000")
             for d in range(1, 31) for _ in range(34)][:1000],
        )
        conn.commit()
    finally:
        conn.close()

    assert len(get(client, **OCTOBER).json()["records"]) == 1000


def test_t401_month_boundaries(client, db_path):
    for occurred_at in ["2026-09-30 23:59", "2026-10-01 00:00", "2026-10-31 23:59", "2026-11-01 00:00"]:
        insert(db_path, occurred_at)

    assert occurred(get(client, **OCTOBER, order="asc")) == ["2026-10-01T00:00", "2026-10-31T23:59"]


def test_t402_same_start_and_end_day(client, db_path):
    for occurred_at in ["2026-10-11 23:59", "2026-10-12 00:00", "2026-10-12 23:59", "2026-10-13 00:00"]:
        insert(db_path, occurred_at)

    response = get(client, **{"from": "2026-10-12", "to": "2026-10-12"}, order="asc")

    assert occurred(response) == ["2026-10-12T00:00", "2026-10-12T23:59"]


@pytest.mark.parametrize(
    "params",
    [
        {"from": "2026-10-31", "to": "2026-10-01"},
        {"to": "2026-10-31"},
        {"from": "2026-10-01"},
        {},
        {"from": "2026-10-1", "to": "2026-10-31"},
        {"from": "2026/10/01", "to": "2026-10-31"},
        {"from": "2026-02-30", "to": "2026-03-01"},
    ],
)
def test_t403_invalid_period(client, params):
    response = get(client, **params)

    assert response.status_code == 400
    assert response.json() == {"code": "INVALID_PERIOD"}


def totals(client, **params) -> dict:
    return get(client, **params).json()["totals"]


def test_t501_totals(client, db_path):
    for amount in (100000, 200000):
        insert(db_path, "2026-10-05 09:00", record_type="INCOME", amount=amount)
    for amount in (12000, 300000):
        insert(db_path, "2026-10-06 09:00", record_type="EXPENSE", amount=amount)

    assert totals(client, **OCTOBER) == {"income": 300000, "expense": 312000, "balance": -12000}


def test_t502_records_outside_period_not_counted(client, db_path):
    insert(db_path, "2026-10-05 09:00", record_type="INCOME", amount=1000)
    insert(db_path, "2026-09-30 23:59", record_type="INCOME", amount=50000)
    insert(db_path, "2026-11-01 00:00", record_type="EXPENSE", amount=70000)

    assert totals(client, **OCTOBER) == {"income": 1000, "expense": 0, "balance": 1000}


def test_t503_total_over_one_billion(client, db_path):
    for _ in range(3):
        insert(db_path, "2026-10-05 09:00", record_type="INCOME", amount=1_000_000_000)

    assert totals(client, **OCTOBER)["income"] == 3_000_000_000


def test_t601_empty_period(client):
    assert get(client, **OCTOBER).json() == {
        "records": [],
        "totals": {"income": 0, "expense": 0, "balance": 0},
    }

# A-08 기록 적기 (TEST-PLAN.md 5.1 T-101 ~ T-117, 5.7 T-704)
import re
import sqlite3
from datetime import timedelta, timezone

import pytest

from conftest import FIXED_NOW_KST

VALID = {
    "type": "EXPENSE",
    "amount": 12000,
    "occurredAt": "2026-10-12T18:30",
    "memo": "회사 동료들과 저녁 식사",
    "category": None,
    "paymentMethod": None,
}


@pytest.fixture(autouse=True)
def fixed_now(set_now):
    return set_now


def post(client, **changes):
    body = {**VALID, **changes}
    return client.post("/api/records", json=body)


def field_codes(response) -> dict:
    assert response.status_code == 400
    assert response.json()["code"] == "VALIDATION_FAILED"
    return {e["field"]: e["code"] for e in response.json()["fieldErrors"]}


def db_rows(db_path) -> list[tuple]:
    conn = sqlite3.connect(db_path)
    try:
        return conn.execute(
            "SELECT id, type, amount, occurred_at, memo, category, payment_method, created_at"
            " FROM records ORDER BY id"
        ).fetchall()
    finally:
        conn.close()


def test_t101_required_fields_only(client, db_path):
    response = post(client)

    assert response.status_code == 201
    body = response.json()
    assert body == {"id": body["id"], **VALID}
    assert body["category"] is None and body["paymentMethod"] is None
    # "A-07로 읽으면 보임"은 A-07을 만드는 P-15에서 확인합니다. 지금은 데이터베이스를 직접 읽습니다.
    assert len(db_rows(db_path)) == 1


@pytest.mark.parametrize("missing", ["type", "amount", "occurredAt", "memo"])
def test_t102_missing_required_field(client, db_path, missing):
    body = {k: v for k, v in VALID.items() if k != missing}

    response = client.post("/api/records", json=body)

    assert field_codes(response) == {missing: "REQUIRED"}
    assert db_rows(db_path) == []


def test_t103_reports_every_wrong_field(client):
    body = {k: v for k, v in VALID.items() if k != "memo"}
    body["amount"] = 0

    response = client.post("/api/records", json=body)

    assert field_codes(response) == {"amount": "TOO_SMALL", "memo": "REQUIRED"}


@pytest.mark.parametrize("value", ["income", "TRANSFER", 1])
def test_t104_invalid_type(client, value):
    assert field_codes(post(client, type=value)) == {"type": "INVALID"}


@pytest.mark.parametrize(
    "amount, expected",
    [(0, "TOO_SMALL"), (-1, "TOO_SMALL"), (1, None), (1_000_000_000, None), (1_000_000_001, "TOO_LARGE")],
)
def test_t105_amount_boundaries(client, amount, expected):
    response = post(client, amount=amount)

    if expected is None:
        assert response.status_code == 201
        assert response.json()["amount"] == amount
    else:
        assert field_codes(response) == {"amount": expected}


@pytest.mark.parametrize("amount", [12.5, "12000", 12.0, True])
def test_t106_amount_not_integer(client, amount):
    assert field_codes(post(client, amount=amount)) == {"amount": "INVALID"}


@pytest.mark.parametrize(
    "occurred_at, saved",
    [("2026-10-14T15:29", True), ("2026-10-14T15:30", True), ("2026-10-14T15:31", False)],
)
def test_t107_future_check_by_minute(client, occurred_at, saved):
    response = post(client, occurredAt=occurred_at)

    if saved:
        assert response.status_code == 201
    else:
        assert field_codes(response) == {"occurredAt": "IN_FUTURE"}


# T-108 대체 확인: Windows의 Python은 실행 중에 컴퓨터 시간대를 바꿀 수 없습니다(time.tzset 없음).
# 서버는 컴퓨터 시간대를 쓰지 않고 UTC에 9시간을 더하므로, 같은 순간을 다른 시간대로 넣어도 결과가 같아야 합니다.
@pytest.mark.parametrize("offset_hours", [0, -5])
@pytest.mark.parametrize(
    "occurred_at, saved",
    [("2026-10-14T15:29", True), ("2026-10-14T15:30", True), ("2026-10-14T15:31", False)],
)
def test_t108_same_result_from_other_timezones(client, set_now, offset_hours, occurred_at, saved):
    set_now(FIXED_NOW_KST.astimezone(timezone(timedelta(hours=offset_hours))))

    response = post(client, occurredAt=occurred_at)

    assert (response.status_code == 201) is saved


@pytest.mark.parametrize(
    "value",
    ["2026-10-12T18:30:00", "2026-10-12 18:30", "2026-02-30T10:00", "2026-10-12T24:00", 202610121830],
)
def test_t109_invalid_occurred_at_format(client, value):
    assert field_codes(post(client, occurredAt=value)) == {"occurredAt": "INVALID_FORMAT"}


@pytest.mark.parametrize(
    "memo, expected",
    [
        ("  점심  ", "점심"),
        ("\t점심\n", "점심"),
        ("　점심　", "점심"),
        (" 점심 값 ", "점심 값"),
    ],
)
def test_t110_memo_trimmed(client, db_path, memo, expected):
    response = post(client, memo=memo)

    assert response.status_code == 201
    assert response.json()["memo"] == expected
    assert db_rows(db_path)[0][4] == expected


@pytest.mark.parametrize("memo", ["", "   ", "\t\n", "　　"])
def test_t111_blank_memo(client, memo):
    assert field_codes(post(client, memo=memo)) == {"memo": "REQUIRED"}


@pytest.mark.parametrize(
    "memo, saved",
    [("가" * 50, True), ("가" * 51, False), (" " + "가" * 50 + " ", True)],
)
def test_t112_memo_length(client, memo, saved):
    response = post(client, memo=memo)

    if saved:
        assert response.status_code == 201
    else:
        assert field_codes(response) == {"memo": "TOO_LONG"}


FAMILY = "\U0001F468‍\U0001F469‍\U0001F467‍\U0001F466"  # 코드 포인트 7개


@pytest.mark.parametrize(
    "memo, saved",
    [
        ("\U0001F44D" * 50, True),  # 👍 50개 = 50자
        ("\U0001F44D" * 51, False),
        (FAMILY * 7 + "가", True),  # 49자 + 1자 = 50자
        (FAMILY * 8, False),  # 56자
    ],
)
def test_t113_memo_counts_code_points(client, memo, saved):
    response = post(client, memo=memo)

    if saved:
        assert response.status_code == 201
    else:
        assert field_codes(response) == {"memo": "TOO_LONG"}


EXPENSE_CODES = ["FOOD", "TRANSPORT", "HOUSING", "TELECOM", "HOUSEHOLD",
                 "MEDICAL", "LEISURE", "EDUCATION", "FAMILY_EVENT", "OTHER_EXPENSE"]
INCOME_CODES = ["SALARY", "ALLOWANCE", "SIDE_INCOME", "INTEREST", "OTHER_INCOME"]


def test_t114_category_must_match_type(client):
    for code in EXPENSE_CODES:
        assert post(client, type="EXPENSE", category=code).status_code == 201
    for code in INCOME_CODES:
        assert post(client, type="INCOME", category=code).status_code == 201

    assert field_codes(post(client, type="INCOME", category="FOOD")) == {"category": "INVALID"}
    assert field_codes(post(client, category="COFFEE")) == {"category": "INVALID"}


def test_category_checked_against_both_lists_when_type_is_wrong(client):
    assert field_codes(post(client, type="TRANSFER", category="FOOD")) == {"type": "INVALID"}
    assert field_codes(post(client, type="TRANSFER", category="COFFEE")) == {
        "type": "INVALID",
        "category": "INVALID",
    }


def test_t115_payment_method(client):
    for record_type in ("INCOME", "EXPENSE"):
        for code in ["CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "EASY_PAY", "OTHER"]:
            assert post(client, type=record_type, paymentMethod=code).status_code == 201

    assert field_codes(post(client, paymentMethod="POINT")) == {"paymentMethod": "INVALID"}


def test_t116_ignores_id_and_created_at_in_request(client, db_path):
    response = post(client, id=999, createdAt="2000-01-01 00:00:00.000")

    assert response.status_code == 201
    assert response.json()["id"] != 999
    row = db_rows(db_path)[0]
    assert row[0] != 999
    assert row[7] == "2026-10-14 15:30:20.123"


def test_t117_stored_formats(client, db_path):
    post(client, amount=12000, occurredAt="2026-10-12T18:30")

    _, _, amount, occurred_at, _, _, _, created_at = db_rows(db_path)[0]
    assert isinstance(amount, int) and amount == 12000
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}", occurred_at)
    assert occurred_at == "2026-10-12 18:30"
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}", created_at)
    assert created_at == "2026-10-14 15:30:20.123"


@pytest.mark.parametrize(
    "content_type, data",
    [
        ("text/plain", '{"type": "EXPENSE"}'),
        ("application/x-www-form-urlencoded", "type=EXPENSE&amount=12000"),
    ],
)
def test_t704_rejects_non_json(client, db_path, content_type, data):
    response = client.post("/api/records", content=data, headers={"Content-Type": content_type})

    assert response.status_code == 415
    assert response.json() == {"code": "UNSUPPORTED_MEDIA_TYPE"}
    assert db_rows(db_path) == []


def test_accepts_json_with_charset(client):
    import json

    response = client.post(
        "/api/records",
        content=json.dumps(VALID),
        headers={"Content-Type": "application/json; charset=utf-8"},
    )

    assert response.status_code == 201


@pytest.mark.parametrize("data", ["{broken", "[1, 2]", '"text"'])
def test_broken_or_non_object_json_is_empty_request(client, db_path, data):
    response = client.post("/api/records", content=data, headers={"Content-Type": "application/json"})

    assert field_codes(response) == {
        "type": "REQUIRED",
        "amount": "REQUIRED",
        "occurredAt": "REQUIRED",
        "memo": "REQUIRED",
    }
    assert db_rows(db_path) == []

# 기록 적기: 서버 입력 검사(ARCHITECTURE.md C-5)와 저장(C-6)
# 칸별 오류 코드는 API-SPEC.md 4절, 저장 형식은 DATA-MODEL.md 5절을 따릅니다.
import re
import sqlite3
from datetime import date, datetime

from app import clock
from app.options import EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS

TYPES = ("INCOME", "EXPENSE")
CATEGORY_CODES = {
    "INCOME": {code for code, _ in INCOME_CATEGORIES},
    "EXPENSE": {code for code, _ in EXPENSE_CATEGORIES},
}
ALL_CATEGORY_CODES = CATEGORY_CODES["INCOME"] | CATEGORY_CODES["EXPENSE"]
PAYMENT_METHOD_CODES = {code for code, _ in PAYMENT_METHODS}

MAX_AMOUNT = 1_000_000_000
MAX_MEMO_LENGTH = 50
OCCURRED_AT_PATTERN = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}")


def _check_type(value) -> str | None:
    if value is None:
        return "REQUIRED"
    if value not in TYPES:
        return "INVALID"
    return None


def _check_amount(value) -> str | None:
    if value is None:
        return "REQUIRED"
    # JSON의 true/false, 12.0, "12000"은 정수가 아닙니다.
    if isinstance(value, bool) or not isinstance(value, int):
        return "INVALID"
    if value < 1:
        return "TOO_SMALL"
    if value > MAX_AMOUNT:
        return "TOO_LARGE"
    return None


def _check_occurred_at(value, now: datetime) -> str | None:
    if value is None or value == "":
        return "REQUIRED"
    if not isinstance(value, str) or not OCCURRED_AT_PATTERN.fullmatch(value):
        return "INVALID_FORMAT"
    try:
        occurred_at = datetime.strptime(value, "%Y-%m-%dT%H:%M")
    except ValueError:
        # 없는 날짜(예: 2월 30일)
        return "INVALID_FORMAT"
    # 분 단위로 비교합니다. 지금과 같은 분은 저장됩니다. (DATA-MODEL.md 5절)
    if occurred_at > now.replace(second=0, microsecond=0, tzinfo=None):
        return "IN_FUTURE"
    return None


def _check_memo(value) -> str | None:
    # str.strip()은 탭, 줄바꿈, 전각 띄어쓰기를 포함한 모든 공백 글자를 지웁니다. (DATA-MODEL.md 3절)
    if not isinstance(value, str) or value.strip() == "":
        return "REQUIRED"
    # len()은 코드 포인트 하나를 1자로 셉니다. (DATA-MODEL.md 3절)
    if len(value.strip()) > MAX_MEMO_LENGTH:
        return "TOO_LONG"
    return None


def _check_category(value, record_type) -> str | None:
    if value is None:
        return None
    if record_type in TYPES:
        allowed = CATEGORY_CODES[record_type]
    else:
        # 구분이 없거나 틀리면 구분에 맞는지는 볼 수 없으므로, 목록에 있는 코드인지만 봅니다.
        allowed = ALL_CATEGORY_CODES
    if value not in allowed:
        return "INVALID"
    return None


def _check_payment_method(value) -> str | None:
    if value is None:
        return None
    if value not in PAYMENT_METHOD_CODES:
        return "INVALID"
    return None


def validate(body: dict, now: datetime) -> list[dict]:
    """틀린 칸을 모두 돌려줍니다. 비어 있으면 통과입니다."""
    checks = [
        ("type", _check_type(body.get("type"))),
        ("amount", _check_amount(body.get("amount"))),
        ("occurredAt", _check_occurred_at(body.get("occurredAt"), now)),
        ("memo", _check_memo(body.get("memo"))),
        ("category", _check_category(body.get("category"), body.get("type"))),
        ("paymentMethod", _check_payment_method(body.get("paymentMethod"))),
    ]
    return [{"field": field, "code": code} for field, code in checks if code]


def create(conn: sqlite3.Connection, body: dict, now: datetime) -> dict:
    """검사를 통과한 요청을 저장하고 저장된 기록을 돌려줍니다. id, createdAt은 요청 값을 쓰지 않습니다."""
    record = {
        "type": body["type"],
        "amount": body["amount"],
        "occurredAt": body["occurredAt"],
        "memo": body["memo"].strip(),
        "category": body.get("category"),
        "paymentMethod": body.get("paymentMethod"),
    }
    created_at = now.strftime("%Y-%m-%d %H:%M:%S.") + f"{now.microsecond // 1000:03d}"
    cursor = conn.execute(
        "INSERT INTO records (type, amount, occurred_at, memo, category, payment_method, created_at)"
        " VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            record["type"],
            record["amount"],
            record["occurredAt"].replace("T", " "),
            record["memo"],
            record["category"],
            record["paymentMethod"],
            created_at,
        ),
    )
    conn.commit()
    return {"id": cursor.lastrowid, **record}


# ---- 기간 목록과 합계 (API-SPEC.md A-07) ----

ORDERS = ("desc", "asc")
DATE_PATTERN = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")


def _parse_date(value: str | None) -> date | None:
    if value is None or not DATE_PATTERN.fullmatch(value):
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        # 없는 날짜(예: 2월 30일)도 형식이 틀린 것으로 봅니다. [AI 제안·채택] (P-15)
        return None


def is_valid_period(period_from: str | None, period_to: str | None) -> bool:
    start, end = _parse_date(period_from), _parse_date(period_to)
    # 시작일과 끝날이 같은 것은 됩니다.
    return start is not None and end is not None and start <= end


def list_with_totals(conn: sqlite3.Connection, period_from: str, period_to: str, order: str) -> dict:
    """시작일 00:00부터 끝날 23:59까지의 기록과 합계. 합계는 읽은 목록으로 계산해 목록과 늘 맞습니다."""
    direction = "DESC" if order == "desc" else "ASC"
    rows = conn.execute(
        "SELECT id, type, amount, occurred_at, memo, category, payment_method FROM records"
        " WHERE occurred_at >= ? AND occurred_at <= ?"
        f" ORDER BY occurred_at {direction}, created_at {direction}, id {direction}",
        (f"{period_from} 00:00", f"{period_to} 23:59"),
    ).fetchall()

    found = [
        {
            "id": row[0],
            "type": row[1],
            "amount": row[2],
            "occurredAt": row[3].replace(" ", "T"),
            "memo": row[4],
            "category": row[5],
            "paymentMethod": row[6],
        }
        for row in rows
    ]
    income = sum(r["amount"] for r in found if r["type"] == "INCOME")
    expense = sum(r["amount"] for r in found if r["type"] == "EXPENSE")
    return {
        "records": found,
        "totals": {"income": income, "expense": expense, "balance": income - expense},
    }


# ---- 기록 지우기 (API-SPEC.md A-09) ----

RECORD_ID_PATTERN = re.compile(r"[0-9]+")
MAX_RECORD_ID = 2**63 - 1  # SQLite INTEGER의 가장 큰 값


def parse_record_id(value: str) -> int | None:
    """숫자(0-9)로만 된 번호만 기록 번호로 봅니다. 그 밖에는 없는 기록과 같게 다룹니다. [AI 제안·채택] (P-17)"""
    if not RECORD_ID_PATTERN.fullmatch(value):
        return None
    record_id = int(value)
    return record_id if record_id <= MAX_RECORD_ID else None


def delete(conn: sqlite3.Connection, record_id: int) -> bool:
    """데이터베이스에서 바로 지웁니다. 지운 표시만 남기지 않습니다. (DATA-MODEL.md 5절) 지웠으면 True."""
    cursor = conn.execute("DELETE FROM records WHERE id = ?", (record_id,))
    conn.commit()
    return cursor.rowcount == 1

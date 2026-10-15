# T-952: API 목록(A-07 ~ A-10) 밖의 요청은 성공하지 않음 (TEST-PLAN.md 7절, API-SPEC.md 2절·5절)
# 넣지 않는 기능(고치기, 분류·결제 수단 편집, 로그인)의 API가 없는지 확인합니다.
import pytest

from test_list import OCTOBER, insert


@pytest.fixture(autouse=True)
def fixed_now(set_now):
    return set_now


@pytest.mark.parametrize(
    "method, path",
    [
        ("PUT", "/api/records/{id}"),  # 기록 고치기 (R-018)
        ("PATCH", "/api/records/{id}"),  # 기록 고치기 (R-018)
        ("POST", "/api/options"),  # 분류·결제 수단 편집 (R-022)
        ("POST", "/api/login"),  # 로그인 (D-016)
    ],
)
def test_t952_requests_outside_api_list_do_not_succeed(client, db_path, method, path):
    record_id = insert(db_path, "2026-10-05 09:00", amount=1000, memo="그대로")
    records_before = client.get("/api/records", params=OCTOBER).json()
    options_before = client.get("/api/options").json()

    response = client.request(
        method,
        path.format(id=record_id),
        json={"type": "INCOME", "amount": 999, "memo": "바뀜", "occurredAt": "2026-10-05T09:00"},
    )

    assert not 200 <= response.status_code < 300
    assert client.get("/api/records", params=OCTOBER).json() == records_before
    assert client.get("/api/options").json() == options_before

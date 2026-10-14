# T-705: 다른 주소에서 온 요청에 다른 주소를 허락하는 헤더가 없음 (TEST-PLAN.md 5.7, API-SPEC.md 3절)


def test_t705_no_cors_header_for_other_origin(client):
    origin = {"Origin": "http://example.com"}

    response = client.get("/api/options", headers=origin)
    preflight = client.options(
        "/api/options",
        headers={**origin, "Access-Control-Request-Method": "POST"},
    )

    assert "access-control-allow-origin" not in response.headers
    assert "access-control-allow-origin" not in preflight.headers

# 서버가 화면 파일과 API를 같은 주소에서 내보내는지 확인 (D-020, P-13)
from fastapi.testclient import TestClient

from app.main import create_app


def test_serves_frontend_and_api_together(db_path, tmp_path):
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("<title>가계부</title>", encoding="utf-8")

    with TestClient(create_app(dist)) as client:
        page = client.get("/")
        options = client.get("/api/options")

    assert page.status_code == 200
    assert "<title>가계부</title>" in page.text
    assert options.status_code == 200
    assert options.headers["content-type"] == "application/json"


def test_index_html_is_revalidated_but_assets_are_not(db_path, tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<title>가계부</title>", encoding="utf-8")
    (dist / "assets" / "index-abc.js").write_text("console.log(1)", encoding="utf-8")

    with TestClient(create_app(dist)) as client:
        page = client.get("/")
        script = client.get("/assets/index-abc.js")

    assert page.headers["cache-control"] == "no-cache"
    assert "cache-control" not in script.headers


def test_runs_api_only_without_built_frontend(db_path, tmp_path):
    with TestClient(create_app(tmp_path / "no-dist")) as client:
        assert client.get("/api/options").status_code == 200
        assert client.get("/").status_code == 404

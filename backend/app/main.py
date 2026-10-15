# 가계부 서버 (D-018). 127.0.0.1에서만 켭니다. (ARCHITECTURE.md 3절)
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app import clock, db, records
from app.options import EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS

# 빌드한 화면 파일 (npm run build). 화면과 API를 같은 주소에서 내보냅니다. (D-020)
FRONTEND_DIST = db.PROJECT_ROOT / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


def _to_list(items: list[tuple[str, str]]) -> list[dict[str, str]]:
    return [{"code": code, "name": name} for code, name in items]


def create_app(frontend_dist: Path = FRONTEND_DIST) -> FastAPI:
    # API 설명 화면(/docs 등)은 PRD에 없는 기능이라 끕니다.
    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

    # A-10 분류·결제 수단 목록 (API-SPEC.md A-10)
    @app.get("/api/options")
    def get_options() -> dict:
        return {
            "incomeCategories": _to_list(INCOME_CATEGORIES),
            "expenseCategories": _to_list(EXPENSE_CATEGORIES),
            "paymentMethods": _to_list(PAYMENT_METHODS),
        }

    # A-08 기록 적기 (API-SPEC.md A-08)
    @app.post("/api/records")
    async def create_record(request: Request) -> JSONResponse:
        # 본문은 JSON으로만 받습니다. 다른 사이트가 보내는 요청을 막기 위해서입니다. (API-SPEC.md 3절 CSRF)
        content_type = request.headers.get("content-type", "").split(";")[0].strip().lower()
        if content_type != "application/json":
            return JSONResponse(status_code=415, content={"code": "UNSUPPORTED_MEDIA_TYPE"})

        try:
            body = await request.json()
        except ValueError:
            body = None
        # 깨진 JSON이나 객체가 아닌 JSON은 빈 요청과 같게 다룹니다. [AI 제안·채택] (P-14)
        if not isinstance(body, dict):
            body = {}

        now = clock.now_kst()
        field_errors = records.validate(body, now)
        if field_errors:
            return JSONResponse(
                status_code=400,
                content={"code": "VALIDATION_FAILED", "fieldErrors": field_errors},
            )

        conn = db.connect()
        try:
            record = records.create(conn, body, now)
        finally:
            conn.close()
        return JSONResponse(status_code=201, content=record)

    # 화면 파일은 API 다음에 붙여, /api/ 주소는 API가 먼저 받게 합니다.
    # 빌드하지 않아 폴더가 없으면 API만 켭니다.
    if frontend_dist.is_dir():
        app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

    return app


app = create_app()

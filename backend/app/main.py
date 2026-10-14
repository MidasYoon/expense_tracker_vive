# 가계부 서버 (D-018). 127.0.0.1에서만 켭니다. (ARCHITECTURE.md 3절)
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app import db
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

    # 화면 파일은 API 다음에 붙여, /api/ 주소는 API가 먼저 받게 합니다.
    # 빌드하지 않아 폴더가 없으면 API만 켭니다.
    if frontend_dist.is_dir():
        app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

    return app


app = create_app()

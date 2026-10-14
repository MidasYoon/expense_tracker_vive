# 가계부 서버 (D-018). 127.0.0.1에서만 켭니다. (ARCHITECTURE.md 3절)
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import db
from app.options import EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


# API 설명 화면(/docs 등)은 PRD에 없는 기능이라 끕니다.
app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)


def _to_list(items: list[tuple[str, str]]) -> list[dict[str, str]]:
    return [{"code": code, "name": name} for code, name in items]


# A-10 분류·결제 수단 목록 (API-SPEC.md A-10)
@app.get("/api/options")
def get_options() -> dict:
    return {
        "incomeCategories": _to_list(INCOME_CATEGORIES),
        "expenseCategories": _to_list(EXPENSE_CATEGORIES),
        "paymentMethods": _to_list(PAYMENT_METHODS),
    }

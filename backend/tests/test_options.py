# T-118: A-10 분류·결제 수단 목록 (TEST-PLAN.md 5.1)


def test_t118_options_match_data_model(client):
    response = client.get("/api/options")

    assert response.status_code == 200
    assert response.json() == {
        "incomeCategories": [
            {"code": "SALARY", "name": "월급"},
            {"code": "ALLOWANCE", "name": "용돈"},
            {"code": "SIDE_INCOME", "name": "부수입"},
            {"code": "INTEREST", "name": "이자"},
            {"code": "OTHER_INCOME", "name": "기타 수입"},
        ],
        "expenseCategories": [
            {"code": "FOOD", "name": "식비"},
            {"code": "TRANSPORT", "name": "교통"},
            {"code": "HOUSING", "name": "주거"},
            {"code": "TELECOM", "name": "통신"},
            {"code": "HOUSEHOLD", "name": "생활용품"},
            {"code": "MEDICAL", "name": "의료"},
            {"code": "LEISURE", "name": "문화·여가"},
            {"code": "EDUCATION", "name": "교육"},
            {"code": "FAMILY_EVENT", "name": "경조사"},
            {"code": "OTHER_EXPENSE", "name": "기타 지출"},
        ],
        "paymentMethods": [
            {"code": "CASH", "name": "현금"},
            {"code": "CREDIT_CARD", "name": "신용카드"},
            {"code": "DEBIT_CARD", "name": "체크카드"},
            {"code": "BANK_TRANSFER", "name": "계좌이체"},
            {"code": "EASY_PAY", "name": "간편결제"},
            {"code": "OTHER", "name": "기타"},
        ],
    }

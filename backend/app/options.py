# 분류·결제 수단 고정 목록 (DATA-MODEL.md 8절). 사용자가 바꿀 수 없습니다. (R-002, R-003, R-022)
# 순서도 DATA-MODEL.md 8절과 같아야 합니다. (API-SPEC.md A-10)

INCOME_CATEGORIES = [
    ("SALARY", "월급"),
    ("ALLOWANCE", "용돈"),
    ("SIDE_INCOME", "부수입"),
    ("INTEREST", "이자"),
    ("OTHER_INCOME", "기타 수입"),
]

EXPENSE_CATEGORIES = [
    ("FOOD", "식비"),
    ("TRANSPORT", "교통"),
    ("HOUSING", "주거"),
    ("TELECOM", "통신"),
    ("HOUSEHOLD", "생활용품"),
    ("MEDICAL", "의료"),
    ("LEISURE", "문화·여가"),
    ("EDUCATION", "교육"),
    ("FAMILY_EVENT", "경조사"),
    ("OTHER_EXPENSE", "기타 지출"),
]

PAYMENT_METHODS = [
    ("CASH", "현금"),
    ("CREDIT_CARD", "신용카드"),
    ("DEBIT_CARD", "체크카드"),
    ("BANK_TRANSFER", "계좌이체"),
    ("EASY_PAY", "간편결제"),
    ("OTHER", "기타"),
]

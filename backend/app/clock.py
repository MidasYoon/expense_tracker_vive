# "지금"은 한국 시간(UTC+9) 기준입니다. (D-014)
# 컴퓨터의 시간대를 쓰지 않고 세계 표준시(UTC)에 9시간을 더합니다. 한국은 서머타임이 없습니다.
from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))


def utc_now() -> datetime:
    # 테스트에서 이 함수를 바꿔 "지금"을 고정합니다. (TEST-PLAN.md 4절)
    return datetime.now(timezone.utc)


def now_kst() -> datetime:
    return utc_now().astimezone(KST)

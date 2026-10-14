# 서버를 켜면 records 표가 DATA-MODEL.md 5절대로 만들어지는지 확인 (P-12)
import sqlite3


def test_records_table_matches_data_model(client, db_path):
    conn = sqlite3.connect(db_path)
    try:
        # (이름, 형식, NOT NULL, 기본 키)
        columns = [
            (name, col_type, notnull, pk)
            for _, name, col_type, notnull, _, pk in conn.execute("PRAGMA table_info(records)")
        ]
    finally:
        conn.close()

    assert columns == [
        ("id", "INTEGER", 0, 1),
        ("type", "TEXT", 1, 0),
        ("amount", "INTEGER", 1, 0),
        ("occurred_at", "TEXT", 1, 0),
        ("memo", "TEXT", 1, 0),
        ("category", "TEXT", 0, 0),
        ("payment_method", "TEXT", 0, 0),
        ("created_at", "TEXT", 1, 0),
    ]


def test_deleted_record_id_is_not_reused(client, db_path):
    insert = (
        "INSERT INTO records (type, amount, occurred_at, memo, created_at)"
        " VALUES ('EXPENSE', 1000, '2026-10-14 12:00', '점심', '2026-10-14 12:00:00.000')"
    )
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(insert)
        last_id = conn.execute(insert).lastrowid
        conn.execute("DELETE FROM records WHERE id = ?", (last_id,))
        new_id = conn.execute(insert).lastrowid
    finally:
        conn.close()

    assert new_id == last_id + 1

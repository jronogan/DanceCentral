import os

import psycopg2


def main():
    # We intentionally don't call python-dotenv here because under Python 3.14
    # find_dotenv() can assert in some execution contexts.
    host = os.getenv("DB_HOST")
    user = os.getenv("DB_USER")
    db = os.getenv("DB")
    port = os.getenv("DB_PORT")

    if not all([host, user, db, port]):
        raise SystemExit(
            "Missing DB env vars (DB_HOST, DB_USER, DB, DB_PORT). "
            "Run this via `pipenv run` where your .env is loaded."
        )

    conn = psycopg2.connect(host=host, user=user, database=db, port=port)
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM gigs_roles")
    print("gigs_roles count:", cur.fetchone()[0])

    cur.execute(
        "SELECT gig_id, role_name, needed_count FROM gigs_roles ORDER BY gig_id, role_name"
    )
    rows = cur.fetchall()
    for r in rows[:200]:
        print(r)

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()

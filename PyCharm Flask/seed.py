"""Seed script for Dance Collective backend.

Goal
----
Create a clean, deterministic dataset containing exactly 5 users with
specific role combinations:

1) dancer
2) choreographer
3) employer
4) dancer + choreographer
5) choreographer + employer

Notes
-----
- This script connects using the same env vars as the app via `db/db_pool.py`.
- It is safe to re-run: it deletes existing rows in a dependency-safe order.
- It inserts roles into `roles` table if missing.

Run
---
python seed.py

(Ensure your .env DB_* vars are set and Postgres is running.)
"""

from __future__ import annotations

import bcrypt

from db.db_pool import get_cursor, release_connection


USERS = [
    {
        "user_name": "Seed Dancer",
        "email": "dancer1@example.com",
        "dob": "1998-01-01",
        "password": "Password123!",
        "roles": ["dancer"],
    },
    {
        "user_name": "Seed Choreographer",
        "email": "choreo2@example.com",
        "dob": "1997-02-02",
        "password": "Password123!",
        "roles": ["choreographer"],
    },
    {
        "user_name": "Seed Employer",
        "email": "employer3@example.com",
        "dob": "1985-03-03",
        "password": "Password123!",
        "roles": ["employer"],
        # Optional employer profile. Only created if the tables exist.
        "employer_profile": {
            "employer_name": "Seed Employer Co",
            "description": "Seed employer profile",
            "website": "https://example.com",
            "email": "contact@example.com",
            "phone": "00000000",
        },
    },
    {
        "user_name": "Seed DancerChoreo",
        "email": "dancechoreo4@example.com",
        "dob": "1996-04-04",
        "password": "Password123!",
        "roles": ["dancer", "choreographer"],
    },
    {
        "user_name": "Seed ChoreoEmployer",
        "email": "choreoemployer5@example.com",
        "dob": "1994-05-05",
        "password": "Password123!",
        "roles": ["choreographer", "employer"],
        "employer_profile": {
            "employer_name": "Seed ChoreoEmployer Co",
            "description": "Seed employer profile",
            "website": "https://example.com",
            "email": "contact2@example.com",
            "phone": "11111111",
        },
    },
]


def _hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt(12)).decode("utf-8")


def main() -> None:
    conn, cursor = get_cursor()

    try:
        # --- Clean existing data (best-effort; ignore missing tables) ---
        # We delete in FK-safe order. If some tables don't exist in your DB,
        # we swallow the error and keep going.
        cleanup_sql = [
            "DELETE FROM applications_roles",
            "DELETE FROM applications",
            "DELETE FROM gigs_roles",
            "DELETE FROM gigs",
            "DELETE FROM employer_members",
            "DELETE FROM employers",
            "DELETE FROM users_skills",
            "DELETE FROM users_roles",
            "DELETE FROM users",
        ]

        for stmt in cleanup_sql:
            try:
                cursor.execute(stmt)
            except Exception:
                conn.rollback()
            else:
                conn.commit()

        # Ensure base roles exist.
        for role in ("dancer", "choreographer", "employer"):
            cursor.execute(
                "INSERT INTO roles (role_name) VALUES (%s) ON CONFLICT (role_name) DO NOTHING",
                (role,),
            )
        conn.commit()

        created_users = []
        for u in USERS:
            password_hash = _hash_password(u["password"])
            cursor.execute(
                """
                INSERT INTO users (user_name, email, dob, password_hash)
                VALUES (%s, %s, %s, %s)
                RETURNING user_id, user_name, email
                """,
                (u["user_name"], u["email"], u["dob"], password_hash),
            )
            row = cursor.fetchone()
            conn.commit()

            user_id = int(row["user_id"])
            for role_name in u["roles"]:
                cursor.execute(
                    "INSERT INTO users_roles (user_id, role_name) VALUES (%s, %s)",
                    (user_id, role_name),
                )
            conn.commit()

            # If they have an employer role, optionally create an employer profile and membership,
            # but only if those tables exist.
            if "employer" in u["roles"] and u.get("employer_profile"):
                profile = u["employer_profile"]
                try:
                    cursor.execute(
                        """
                        INSERT INTO employers (employer_name, description, website, email, phone)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING employer_id
                        """,
                        (
                            profile.get("employer_name"),
                            profile.get("description"),
                            profile.get("website"),
                            profile.get("email"),
                            profile.get("phone"),
                        ),
                    )
                    employer = cursor.fetchone()
                    conn.commit()

                    employer_id = int(employer["employer_id"])
                    cursor.execute(
                        """
                        INSERT INTO employer_members (employer_id, user_id, member_role)
                        VALUES (%s, %s, %s)
                        ON CONFLICT DO NOTHING
                        """,
                        (employer_id, user_id, "owner"),
                    )
                    conn.commit()
                except Exception:
                    conn.rollback()

            created_users.append({"user_id": user_id, "email": u["email"], "roles": u["roles"]})

        print("Seed complete. Created users:")
        for cu in created_users:
            print(f"- user_id={cu['user_id']} email={cu['email']} roles={','.join(cu['roles'])}")

    finally:
        release_connection(conn)


if __name__ == "__main__":
    main()

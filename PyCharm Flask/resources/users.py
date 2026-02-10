import bcrypt
from flask import request, jsonify, Blueprint
from db.db_pool import get_cursor, release_connection
from marshmallow import ValidationError
from flask_jwt_extended import jwt_required, create_access_token, create_refresh_token, get_jwt_identity, get_jwt

import psycopg2

users = Blueprint('users', __name__)

@users.route('/register', methods=['POST'])
def register_user():
    data = request.get_json() or {}
    user_name= data['name']
    email = data['email']
    dob= data['date_of_birth']
    password = data['password']
    conn, cursor = get_cursor()

    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(12))
    try:
        cursor.execute(
            """
            INSERT INTO users (user_name, email, dob, password_hash) 
            VALUES (%s, %s, %s, %s)
            RETURNING user_id, user_name, email, dob
            """
            ,
            (user_name, email, dob, password_hash.decode('utf-8'))
        )
        user = cursor.fetchone()

        if not user:
            return jsonify(status='error', msg='user not registered'), 401
        conn.commit()
        return jsonify(user), 200
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return jsonify(status='error', msg='user already registered'), 401
    finally:
        release_connection(conn)

@users.route('/login', methods=['POST'])
def login_user():
    data = request.get_json() or {}
    email = data['email']
    password = data['password']
    conn, cursor = get_cursor()
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    results = cursor.fetchone()
    release_connection(conn)

    if not results:
        return jsonify(status='error', msg='email not registered'), 401

    access = bcrypt.checkpw(password.encode('utf-8'), results['password_hash'].encode('utf-8'))

    if not access:
        return jsonify(status='error', msg='password incorrect'), 401

    claims = {'name': results['user_name'], 'email': email}
    user_id = str(results['user_id'])
    access_token = create_access_token(user_id, additional_claims=claims)
    refresh_token = create_refresh_token(user_id, additional_claims=claims)

    return jsonify(access_token=access_token, refresh_token=refresh_token), 200

@users.route('/refresh')
@jwt_required(refresh=True)
def refresh():
    # Get the user id from jwt
    identity = get_jwt_identity()
    claims = get_jwt()
    email = claims['email']
    name = claims['name']
    access_token = create_access_token(int(identity), additional_claims={"email": email, "name": name})

    return jsonify(access=access_token), 200

@users.route('/me')
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    conn, cursor = get_cursor()

    try:
        cursor.execute("SELECT dob, email, user_id, user_name FROM users WHERE user_id = %s", (user_id,))
        results = cursor.fetchone()
        if not results:
            return jsonify(status='error', msg='user not registered'), 401
        return jsonify(results), 200
    finally:
        release_connection(conn)

@users.route('/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user_id = int(get_jwt_identity())

    if current_user_id == user_id:
        return jsonify(status='error', msg='cannot delete self'), 401

    conn, cursor = get_cursor()
    try:
        cursor.execute(
            """
            DELETE FROM users WHERE user_id = %s""",
            (user_id,))
        conn.commit()
        return jsonify(status='success', msg='user deleted'), 200
    finally:
        release_connection(conn)

@users.route('/', methods=['PATCH'])
@jwt_required()
def update_me():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    name = data.get("name")
    email = data.get("email")
    dob = data.get("date_of_birth")

    conn, cursor = get_cursor()
    try:
        cursor.execute(
            """
            UPDATE users
            SET
                user_name = COALESCE(%s, user_name),
                email     = COALESCE(%s, email),
                dob       = COALESCE(%s, dob)
            WHERE user_id = %s
            RETURNING user_id, user_name, email, dob
            """,
            (name, email, dob, user_id)
        )

        updated = cursor.fetchone()
        if not updated:
            conn.rollback()
            return jsonify(status="error", msg="user not found"), 404

        conn.commit()
        return jsonify(updated), 200

    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return jsonify(status="error", msg="email already in use"), 409
    finally:
        release_connection(conn)


@users.route('/<int:user_id>/public', methods=['GET'])
@jwt_required()
def get_public_user_profile(user_id: int):
    """Employer-facing, read-only profile data for an applicant.

    Access control: requester must be an employer who posted a gig that this user applied to.
    Returned: basic user info + roles + skills + active media by kind.
    """

    current_user_id = int(get_jwt_identity())
    conn, cursor = get_cursor()

    try:
        # Authorization: current user must have at least one gig (posted_by_user_id)
        # where the target user has an application.
        cursor.execute(
            """
            SELECT 1
            FROM gigs g
            JOIN applications a ON a.gig_id = g.gig_id
            WHERE g.posted_by_user_id = %s
              AND a.user_id = %s
            LIMIT 1
            """,
            (current_user_id, user_id),
        )
        allowed = cursor.fetchone()
        if not allowed:
            return jsonify({"error": "not authorized"}), 403

        cursor.execute(
            """
            SELECT user_id, user_name, email, dob
            FROM users
            WHERE user_id = %s
            """,
            (user_id,),
        )
        u = cursor.fetchone()
        if not u:
            return jsonify({"error": "user not found"}), 404

        # roles
        cursor.execute(
            """
            SELECT role_name
            FROM users_roles
            WHERE user_id = %s
            ORDER BY role_name
            """,
            (user_id,),
        )
        roles = cursor.fetchall() or []

        # skills
        cursor.execute(
            """
            SELECT skill_name
            FROM users_skills
            WHERE user_id = %s
            ORDER BY skill_name
            """,
            (user_id,),
        )
        skills = cursor.fetchall() or []

        # media (optional table)
        media_by_kind = {}
        try:
            cursor.execute(
                """
                SELECT kind, resource_type, public_id, secure_url
                FROM user_media
                WHERE user_id = %s AND is_active = TRUE
                """,
                (user_id,),
            )
            media_rows = cursor.fetchall() or []
            for r in media_rows:
                k = r.get("kind")
                if not k:
                    continue
                media_by_kind[k] = {
                    "kind": k,
                    "resource_type": r.get("resource_type"),
                    "public_id": r.get("public_id"),
                    "secure_url": r.get("secure_url"),
                }
        except Exception:
            # If user_media table isn't present yet in a dev DB, return without media.
            media_by_kind = {}

        return jsonify(
            {
                "user_id": u.get("user_id"),
                "name": u.get("user_name"),
                "email": u.get("email"),
                "dob": u.get("dob"),
                "roles": roles,
                "skills": skills,
                "media": media_by_kind,
            }
        ), 200

    finally:
        release_connection(conn)

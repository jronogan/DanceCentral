from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db.db_pool import get_cursor, release_connection
import psycopg2

employer_members = Blueprint('employer_members', __name__)

@employer_members.route('/', methods=['POST'])
@jwt_required()
def create_member():
    data = request.get_json() or {}
    employer_id = data.get('employer_id')
    member_role = data.get('member_role')

    if employer_id is None or not member_role:
        return jsonify({"information missing"}), 400

    user_id = int(get_jwt_identity())

    conn, cursor = get_cursor()

    try:
        cursor.execute(
            "INSERT INTO employer_members (employer_id, user_id, member_role) "
            "VALUES (%s, %s, %s) RETURNING employer_id, user_id, member_role, joined_at",
            (employer_id, user_id, member_role)
        )
        member = cursor.fetchone()
        conn.commit()
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return jsonify({"member already created"}), 400
    except psycopg2.errors.ForeignKeyViolation:
        conn.rollback()
        return jsonify(status="error", msg="invalid employer_id or user_id"), 400

    finally:
        release_connection(conn)

    return jsonify(status="created", member=member), 201

# STRETCH REFINE THIS FOR ADMINS OWNERS TO UPDATE ONLY, AND CAN EDIT OTHER USER'S ROLE
@employer_members.route('/', methods=['PATCH'])
@jwt_required()
def update_member():
    data = request.get_json() or {}
    employer_id = data.get('employer_id')
    member_role = data.get('member_role')

    if employer_id is None or not member_role:
        return jsonify(status="error", msg="missing employer_id or member_role"), 400

    current_user_id = int(get_jwt_identity())
    conn, cursor = get_cursor()

    try:
        cursor.execute('SELECT employer_id, user_id FROM employer_members WHERE employer_id = %s AND user_id = %s',
                       (int(employer_id), current_user_id))
        member = cursor.fetchone()

        if not member:
            return jsonify(status="error", msg="not a member of this employer"), 400
        # if member[0] not in ("admin", "owner"):
        #     return jsonify(status="error", msg="not authorized to change role"), 400

        cursor.execute(
            """
            UPDATE employer_members
            SET member_role = %s
            WHERE employer_id = %s AND user_id = %s
            RETURNING employer_id, user_id, member_role
            """,
            (member_role, int(employer_id), current_user_id)
        )

        updated = cursor.fetchone()
        conn.commit()
        return jsonify(status="updated", member=updated), 200

    finally:
        release_connection(conn)

@employer_members.route('/', methods=['DELETE'])
@jwt_required()
def delete_member():
    data = request.get_json() or {}
    employer_id = data.get('employer_id')

    if employer_id is None:
        return jsonify(status="error", msg="missing employer_id"), 400

    current_user_id = int(get_jwt_identity())

    conn, cursor = get_cursor()
    try:
        cursor.execute(
        "DELETE FROM employer_members WHERE employer_id = %s AND user_id = %s", (int(employer_id), current_user_id)
        )
        conn.commit()
        return jsonify(status="deleted"), 200
    finally:
        release_connection(conn)

@employer_members.route('/')
@jwt_required()
def get_employer_members():
    employer_id = request.args.get('employer_id')
    if employer_id is None:
        return jsonify(status="error", msg="missing employer_id"), 400

    current_user_id = int(get_jwt_identity())

    conn, cursor = get_cursor()
    try:
        cursor.execute(
            """
            SELECT 1 FROM employer_members 
            WHERE employer_id = %s AND user_id = %s
            """,
            (int(employer_id), current_user_id)
        )
        member = cursor.fetchone()
        if not member:
         return jsonify(status="error", msg="not a member of this employer"), 400

        cursor.execute(
            """
            SELECT user_id, member_role
            FROM employer_members
            WHERE employer_id = %s
            ORDER BY user_id DESC""",
            (int(employer_id),)
        )
        members = cursor.fetchall()
        return jsonify(status="success", members=members), 200
    finally:
        release_connection(conn)

@employer_members.route('/me')
@jwt_required()
def get_employer_from_user():
    user_id = int(get_jwt_identity())
    conn, cursor = get_cursor()
    try:
        cursor.execute(
            """
            SELECT employer_id, member_role FROM employer_members 
            WHERE user_id = %s
            """,
            (user_id,)
        )
        employer = cursor.fetchone()

        if not employer:
         return jsonify(status="error", msg="no employer found"), 400
        return jsonify(employer), 200
    finally:
        release_connection(conn)


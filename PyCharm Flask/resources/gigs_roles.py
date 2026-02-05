from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db.db_pool import get_cursor, release_connection
import psycopg2

gigs_roles = Blueprint('gigs_roles', __name__)

@gigs_roles.route('/', methods=['POST'])
@jwt_required()
def create_gigs_roles():
    data = request.get_json() or {}
    gig_id = data.get('gig_id')
    role_name = data.get('role_name')
    needed_count = data.get('needed_count')
    pay_amount = data.get('pay_amount')
    pay_currency = data.get('pay_currency')
    pay_unit = data.get('pay_unit')

    required_fields = [
        "gig_id",
        "role_name",
        "needed_count",
        "pay_amount",
        "pay_currency",
        "pay_unit"
    ]

    missing = [f for f in required_fields if not data.get(f)]

    if missing:
        return jsonify({
            "message": "Missing required fields",
            "missing": missing
        }), 400

    current_user_id = int(get_jwt_identity())

    conn, cursor = get_cursor()

    try:
        cursor.execute(
            """
            SELECT 1
            FROM gigs
            WHERE gig_id = %s AND posted_by_user_id = %s""",
            (gig_id, current_user_id)
        )

        allowed = cursor.fetchone()
        if not allowed:
            return jsonify({"message": "Only the employer who posted this gig can add roles"}), 403

        cursor.execute(
            """
            INSERT INTO gigs_roles
             (gig_id, role_name, needed_count, pay_amount, pay_currency, pay_unit)
            VALUES (%s, %s, %s, %s, %s,%s) 
            RETURNING gig_id, role_name, needed_count, pay_amount, pay_currency, pay_unit""",
            (gig_id, role_name, needed_count, pay_amount, pay_currency, pay_unit)
        )
        entered = cursor.fetchone()
        conn.commit()
        return jsonify(entered), 201
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return jsonify({"Role already added to gig"}), 400
    except psycopg2.errors.ForeignKeyViolation:
        conn.rollback()
        return jsonify({"Invalid id or role"}), 400

    finally:
        release_connection(conn)

@gigs_roles.route('/<gig_id>', methods=['DELETE'])
@jwt_required()
def delete_gigs_roles(gig_id):
    data = request.get_json() or {}
    role_name = data.get('role_name')
    if not role_name:
        return jsonify({"message": "Missing role_name"}), 400

    current_user_id = int(get_jwt_identity())
    conn, cursor = get_cursor()
    try:
        cursor.execute(
            """
            SELECT 1
            FROM gigs
            WHERE gig_id = %s AND posted_by_user_id = %s""",
            (gig_id, current_user_id)
        )
        allowed = cursor.fetchone()
        if not allowed:
            return jsonify({"message": "Only the employer who posted this gig can delete"}), 403

        cursor.execute(
            """
            DELETE FROM gigs_roles
            WHERE gig_id = %s AND role_name = %s""",
            (gig_id, role_name)
        )
        conn.commit()
        return jsonify(status="deleted"), 200
    finally:
        release_connection(conn)

@gigs_roles.route('/<gig_id>', methods=['PATCH'])
@jwt_required()
def update_gigs_roles(gig_id):
    data = request.get_json() or {}
    role_name = data.get('role_name')
    needed_count = data.get('needed_count')
    pay_amount = data.get('pay_amount')
    pay_currency = data.get('pay_currency')
    pay_unit = data.get('pay_unit')

    current_user_id = int(get_jwt_identity())

    conn, cursor = get_cursor()

    try:
        cursor.execute(
            """
            SELECT 1
            FROM gigs
            WHERE gig_id = %s AND posted_by_user_id = %s""",
            (gig_id, current_user_id)
        )

        allowed = cursor.fetchone()
        if not allowed:
            return jsonify({"message": "Only the employer who posted this gig can add roles"}), 403

        cursor.execute(
            """
            UPDATE gigs_roles
            SET needed_count = COALESCE(%s, needed_count),
                pay_amount = COALESCE(%s, pay_amount),
                pay_currency = COALESCE(%s, pay_currency),
                pay_unit = COALESCE(%s, pay_unit)
            WHERE gig_id = %s and role_name = %s
            RETURNING gig_id, role_name, needed_count, pay_amount, pay_currency, pay_unit""",
            (needed_count, pay_amount, pay_currency, pay_unit, gig_id, role_name)
        )

        updated = cursor.fetchone()
        conn.commit()
        return jsonify(updated), 200

    finally:
        release_connection(conn)

@gigs_roles.route('/<gig_id>')
@jwt_required()
def get_gigs_roles(gig_id):
    conn, cursor = get_cursor()
    try:
        cursor.execute(
            """
            SELECT * FROM gigs_roles
            WHERE gig_id = %s
            """,
            (gig_id,)
        )
        entered = cursor.fetchall()
        if not entered:
            return jsonify("Failed to fetch gig roles"), 400

        return jsonify(entered), 200
    finally:
        release_connection(conn)

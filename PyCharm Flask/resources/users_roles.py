from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db.db_pool import get_cursor, release_connection
import psycopg2

users_roles = Blueprint("users_roles", __name__)

@users_roles.route("/roles", methods=["POST"])
@jwt_required()
def assign_role():
    data = request.get_json() or {}
    user_id = data["user_id"]
    role_name = data["role_name"].strip().lower()
    conn, cursor = get_cursor()

    try:
        cursor.execute("INSERT INTO users_roles (user_id, role_name) VALUES (%s, %s)",(user_id, role_name))
        conn.commit()
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        release_connection(conn)
        return jsonify(status="error", msg="role already assigned"), 400

    release_connection(conn)
    return jsonify(status="ok", msg="role assigned"), 201

@users_roles.route("/roles", methods=["DELETE"])
@jwt_required()
def remove_role():
    data = request.get_json() or {}
    user_id = int(data["user_id"])
    role_name = data["role_name"]

    conn, cursor = get_cursor()
    cursor.execute(
        "DELETE FROM users_roles WHERE user_id = %s AND role_name = %s",
        (user_id, role_name)
    )
    conn.commit()
    release_connection(conn)

    if cursor.rowcount == 0:
        return jsonify(status="error", msg="role not found"), 404

    return jsonify(status="ok", msg="role removed"), 200

@users_roles.route("/myroles")
@jwt_required()
def get_roles_for_user():
    user_id = int(get_jwt_identity())
    conn, cursor = get_cursor()
    cursor.execute(
        "SELECT ur.role_name FROM users u JOIN users_roles ur ON u.user_id = ur.user_id WHERE ur.user_id = %s",
        (user_id,)
    )
    roles = cursor.fetchall()
    release_connection(conn)

    return jsonify([r["role_name"] for r in roles]), 200

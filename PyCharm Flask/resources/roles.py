from flask import request, jsonify, Blueprint
from db.db_pool import get_cursor, release_connection
from flask_jwt_extended import jwt_required
import psycopg2

roles = Blueprint('roles', __name__)

# Only allowed roles in the constraint table
# ALLOWED_ROLES = {"dancer", "choreographer", "employer"}

@roles.route('/')
def get_roles():
    conn, cursor = get_cursor()
    cursor.execute("SELECT role_name FROM roles ORDER BY role_name ASC")
    results = cursor.fetchall()
    release_connection(conn)

    # Need to iterate since its a dictionary
    return jsonify([r["role_name"] for r in results]), 200


@roles.route('/<role_name>')
def get_role(role_name):
    conn, cursor = get_cursor()
    cursor.execute("SELECT role_name FROM roles WHERE role_name = %s", (role_name,))
    result = cursor.fetchone()
    release_connection(conn)

    if not result:
        return jsonify(status='error', msg='role not found'), 404

    return jsonify(status='ok', role=result["role_name"]), 200

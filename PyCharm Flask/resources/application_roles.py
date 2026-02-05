from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db.db_pool import get_cursor, release_connection
import psycopg2

applications_roles = Blueprint('applications_roles', __name__)

@applications_roles.route('/')
@jwt_required()
def get_applications_roles():
    application_id = request.args.get('application_id')
    role_name = request.args.get('role_name')

    conn, cursor = get_cursor()
    try:
        cursor.execute(
            """
            SELECT * FROM applications_roles
            WHERE application_id = %s AND role_name = %s
            """,
            (application_id, role_name)
        )
        entered = cursor.fetchall()
        if not entered:
            return jsonify("Failed to fetch applications roles"), 400

        return jsonify(entered), 200
    finally:
        release_connection(conn)
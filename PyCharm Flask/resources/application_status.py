from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db.db_pool import get_cursor, release_connection
import psycopg2

application_status = Blueprint('applications_status', __name__)

@application_status.route('/')
@jwt_required()
def get_application_status():
    conn, cursor = get_cursor()
    try:
        cursor.execute(
            """
            SELECT * FROM application_status
            """
        )
        status = cursor.fetchall()
        if not status:
            return jsonify("Failed to fetch applications roles"), 400

        return jsonify(status), 200
    finally:
        release_connection(conn)
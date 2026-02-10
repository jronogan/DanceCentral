from flask import jsonify, Blueprint
from db.db_pool import get_cursor, release_connection

member_types = Blueprint('member_types', __name__)

@member_types.route('/')
def get_member_types():
    conn, cursor = get_cursor()

    cursor.execute(
        """
        SELECT member_type
        FROM members
        """
    )
    results = cursor.fetchall()

    release_connection(conn)

    return jsonify([r["member_type"] for r in results]), 200

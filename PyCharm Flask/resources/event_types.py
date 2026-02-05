from flask import jsonify, Blueprint
from db.db_pool import get_cursor, release_connection

event_types = Blueprint('event_types', __name__)

@event_types.route('/')
def get_event_types():
    conn, cursor = get_cursor()

    cursor.execute(
        """
        SELECT type_name
        FROM event_types
        ORDER BY type_name ASC
        """
    )
    results = cursor.fetchall()

    release_connection(conn)

    return jsonify([r["type_name"] for r in results]), 200

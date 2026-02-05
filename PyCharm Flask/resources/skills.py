from flask import jsonify, Blueprint
from db.db_pool import get_cursor, release_connection

skills = Blueprint('skills', __name__)

@skills.route('/')
def get_skills():
    conn, cursor = get_cursor()

    cursor.execute(
        """
        SELECT skill_name
        FROM skills
        ORDER BY skill_name ASC
        """
    )
    results = cursor.fetchall()

    release_connection(conn)

    return jsonify([r["skill_name"] for r in results]), 200

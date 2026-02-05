from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db.db_pool import get_cursor, release_connection
import psycopg2


users_skills = Blueprint("users_skills", __name__)

@users_skills.route("/skills", methods=["POST"])
@jwt_required()
def assign_skill():
    data = request.get_json() or {}

    user_id = int(data["user_id"])
    skill_name = data["skill_name"].strip().lower()

    conn, cursor = get_cursor()

    try:
        cursor.execute(
            "INSERT INTO users_skills (user_id, skill_name) VALUES (%s, %s)",
            (user_id, skill_name)
        )
        conn.commit()

    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        release_connection(conn)
        return jsonify(status="error", msg="skill already assigned"), 400

    release_connection(conn)
    return jsonify(status="ok", msg="skill assigned"), 201

@users_skills.route("/skills", methods=["DELETE"])
@jwt_required()
def remove_skill():
    data = request.get_json() or {}

    user_id = int(data["user_id"])
    skill_name = data["skill_name"].strip().lower()

    conn, cursor = get_cursor()

    cursor.execute(
        "DELETE FROM users_skills WHERE user_id = %s AND skill_name = %s",
        (user_id, skill_name)
    )
    conn.commit()
    release_connection(conn)

    if cursor.rowcount == 0:
        return jsonify(status="error", msg="skill not found"), 404

    return jsonify(status="ok", msg="skill removed"), 200

@users_skills.route("/<user_id>/skills", methods=["GET"])
@jwt_required()
def get_skills_for_user(user_id):
    conn, cursor = get_cursor()

    cursor.execute(
        "SELECT us.skill_name FROM users_skills us WHERE us.user_id = %s ORDER BY us.skill_name",
        (user_id,)
    )

    rows = cursor.fetchall()
    release_connection(conn)

    skills = [r["skill_name"] for r in rows]

    return jsonify(skills), 200


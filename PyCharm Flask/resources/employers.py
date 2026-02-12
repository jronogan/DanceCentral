from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db.db_pool import get_cursor, release_connection
import psycopg2

from resources.validations.request import validate_json
from resources.validations.schemas import EmployerCreateSchema, EmployerUpdateSchema

employers = Blueprint("employers", __name__)

@employers.route("/", methods=["POST"])
@jwt_required()
def create_employer():
    data, err, status = validate_json(EmployerCreateSchema())
    if err:
        return err, status

    employer_name = data.get("employer_name")
    description = data.get("description")
    website = data.get("website")
    email = data.get("email")
    phone = data.get("phone")

    conn, cursor = get_cursor()
    try:
        cursor.execute(
            """
            INSERT INTO employers (employer_name, description, website, email, phone)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING employer_id, employer_name, description, website, email, phone, created_at
            """,
            (employer_name, description, website, email, phone),
        )
        # RETURNING IS REQUIRED since we want to fetch immediately
        employer = cursor.fetchone()
        conn.commit()
    except psycopg2.error.UniqueViolation:
        conn.rollback()
        release_connection(conn)
        return jsonify(status="error", msg="company already registered"), 400

    release_connection(conn)
    return jsonify(status="ok", employer=employer), 201

@employers.route("/")
@jwt_required()
def get_employers():
    conn, cursor = get_cursor()
    cursor.execute(
        """
        SELECT employer_id, employer_name, description, website, email, phone, created_at
        FROM employers
        ORDER BY created_at DESC
        """
    )
    employers = cursor.fetchall()
    release_connection(conn)

    return jsonify(employers), 200

@employers.route("/<employer_id>")
@jwt_required()
def get_employer(employer_id):
    conn, cursor = get_cursor()
    cursor.execute(
        """
        SELECT employer_id, employer_name, description, website, email, phone, created_at
        FROM employers
        WHERE employer_id = %s
        """,
        (employer_id,),
    )
    found = cursor.fetchone()
    release_connection(conn)

    if not found:
        return jsonify(status="error", msg="employer not found"), 404

    return jsonify(found), 200

@employers.route("/<employer_id>", methods=["PATCH"])
@jwt_required()
def update_employer(employer_id):
    data, err, status = validate_json(EmployerUpdateSchema(), partial=True)
    if err:
        return err, status

    employer_name = data.get("employer_name")
    description = data.get("description")
    website = data.get("website")
    email = data.get("email")
    phone = data.get("phone")

    conn, cursor = get_cursor()

    cursor.execute(
        """
        UPDATE employers
        SET employer_name = COALESCE(%s, employer_name),
            description   = COALESCE(%s, description),
            website       = COALESCE(%s, website),
            email         = COALESCE(%s, email),
            phone         = COALESCE(%s, phone)
        WHERE employer_id = %s
        RETURNING employer_id, employer_name, description, website, email, phone, created_at
        """,
        (employer_name, description, website, email, phone, employer_id),
    )

    updated = cursor.fetchone()
    conn.commit()
    release_connection(conn)

    if not updated:
        return jsonify(status="error", msg="employer not found"), 404

    return jsonify(updated), 200

@employers.route("/<employer_id>", methods=["DELETE"])
@jwt_required()
def delete_employer(employer_id):
    conn, cursor = get_cursor()

    cursor.execute("DELETE FROM employers WHERE employer_id = %s", (employer_id,))
    conn.commit()

    found = cursor.rowcount
    release_connection(conn)

    if found == 0:
        return jsonify(status="error", msg="employer not found"), 404

    return jsonify(status="ok", msg="employer deleted"), 200

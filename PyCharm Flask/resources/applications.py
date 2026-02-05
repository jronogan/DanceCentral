from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db.db_pool import get_cursor, release_connection
import psycopg2

applications = Blueprint('applications', __name__)

@applications.route('/', methods=['POST'])
@jwt_required()
def create_application():
    data = request.get_json() or {}
    gig_id = data.get('gig_id')
    if not gig_id:
        return jsonify({'message': 'No gig_id provided'}), 400

    user_id = int(get_jwt_identity())

    conn, cursor = get_cursor()

    try:
        cursor.execute(
            """
            INSERT INTO applications (gig_id, user_id)
            VALUES (%s, %s)
            RETURNING application_id, user_id, gig_id, status, applied_at""",
            (gig_id, user_id)
        )
        applied = cursor.fetchone()

        if not applied:
            return jsonify({'application failed'}), 400

        conn.commit()
        return jsonify(status="applied", application=applied)

    except psycopg2.errors.ForeignKeyViolation:
        conn.rollback()
        return jsonify({'application failed'}), 400
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return jsonify({'application already exists'}), 400

    finally:
        release_connection(conn)

@applications.route('/')
@jwt_required()
def get_application():
    user_id = int(get_jwt_identity())
    gig_id = request.args.get('gig_id')
    conn, cursor = get_cursor()

    try:
        # Checking if it's the employer --> is it employer view?
        if gig_id is not None:
            cursor.execute(
                """
                SELECT gig_id FROM gigs
                WHERE posted_by_user_id = %s AND gig_id = %s""",
                (user_id, gig_id)
            )
            posted = cursor.fetchone()

            if not posted:
                return jsonify({'not authorized'}), 400

            cursor.execute(
                """
                SELECT a.application_id, a.user_id, a.gig_id, a.status, a.applied_at
                    FROM applications a
                    WHERE a.gig_id = %s
                    ORDER BY a.applied_at DESC""",
                (gig_id,)
            )
            applicants = cursor.fetchall()
            return jsonify(applicants), 200

        cursor.execute(
            """
            SELECT application_id, user_id, gig_id, status, applied_at
            FROM applications WHERE user_id = %s
            ORDER BY gig_id ASC""",
            (user_id,)
        )
        check = cursor.fetchall()
        if not check:
            return jsonify({'failed to retrieve application'}), 400
        return jsonify(check), 200
    finally:
        release_connection(conn)

@applications.route('/', methods=['DELETE'])
@jwt_required()
def delete_application():
    data = request.get_json() or {}
    gig_id = data.get('gig_id')
    if not gig_id:
        return jsonify({'message': 'No gig_id provided'}), 400
    user_id = int(get_jwt_identity())
    conn, cursor = get_cursor()

    try:
        cursor.execute(
            """
            DELETE FROM applications WHERE user_id = %s AND gig_id = %s""",
            (user_id, gig_id)
        )
        conn.commit()
        return jsonify(status="deleted"), 200
    finally:
        release_connection(conn)

@applications.route('/<application_id>', methods=['PATCH'])
@jwt_required()
def update_application(application_id):
    data = request.get_json() or {}
    new_status = data.get('status')
    current_user_id = int(get_jwt_identity())
    conn, cursor = get_cursor()
    try:
        cursor.execute(
            """
            SELECT a.application_id
            FROM applications a
            JOIN gigs g ON a.gig_id = g.gig_id
            WHERE a.application_id = %s AND g.posted_by_user_id = %s""",
            (application_id, current_user_id)
        )
        allowed = cursor.fetchone()
        if not allowed:
            return jsonify({'not authorized'}), 400

        cursor.execute(
            """
            UPDATE applications
            SET status = %s
            WHERE application_id = %s
            RETURNING application_id, user_id, gig_id, status, applied_at""",
            (new_status, application_id)
        )
        updated = cursor.fetchone()
        conn.commit()

        if not updated:
            return jsonify({'Application not found'}), 400

        return jsonify(status="updated", update=updated), 200
    finally:
        release_connection(conn)





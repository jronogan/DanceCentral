from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db.db_pool import get_cursor, release_connection
import psycopg2

applications = Blueprint('applications', __name__)

@applications.route("/", methods=["GET"])
@jwt_required()
def get_application():
    user_id = int(get_jwt_identity())
    gig_id_raw = request.args.get("gig_id")
    conn, cursor = get_cursor()

    try:
        # Employer view: list applicants for a specific gig you posted
        if gig_id_raw is not None:
            try:
                gig_id = int(gig_id_raw)
            except ValueError:
                return jsonify({"error": "gig_id must be an integer"}), 400

            cursor.execute(
                """
                SELECT 1
                FROM gigs
                WHERE posted_by_user_id = %s AND gig_id = %s
                """,
                (user_id, gig_id),
            )
            posted = cursor.fetchone()
            if not posted:
                return jsonify({"error": "not authorized"}), 403

            cursor.execute(
                """
                SELECT
                    a.application_id,
                    a.user_id,
                    a.gig_id,
                    a.status,
                    a.applied_at,
                    u.user_name AS applicant_name,
                    u.email AS applicant_email,
                    g.gig_name,
                    g.gig_date,
                    g.type_name,
                    g.gig_details
                FROM applications a
                JOIN users u ON a.user_id = u.user_id
                JOIN gigs g ON a.gig_id = g.gig_id
                WHERE a.gig_id = %s
                ORDER BY a.applied_at DESC
                """,
                (gig_id,),
            )

            applicants = cursor.fetchall() or []
            return jsonify(applicants), 200

        # User view: my applications
        cursor.execute(
            """
            SELECT
                a.application_id,
                a.gig_id,
                a.status,
                a.applied_at,
                g.gig_name,
                g.gig_date,
                g.type_name,
                g.gig_details
            FROM applications a
            JOIN gigs g ON a.gig_id = g.gig_id
            WHERE a.user_id = %s
            ORDER BY a.applied_at DESC
            """,
            (user_id,),
        )

        applied = cursor.fetchall() or []
        return jsonify(applied), 200

    except Exception as e:
        # During debugging, log the error so you don't silently swallow SQL issues
        print("get_application error:", e)
        return jsonify([]), 200

    finally:
        release_connection(conn)


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

    if not new_status:
        return jsonify({"error": "Missing 'status'"}), 400

    allowed_for_employer = {"accepted", "rejected", "shortlisted"}
    allowed_for_user = {"withdrawn, applied"}

    conn, cursor = get_cursor()
    try:
        # Load the application + ownership info in one query
        cursor.execute(
            """
            SELECT
              a.application_id,
              a.user_id AS applicant_user_id,
              a.gig_id,
              g.posted_by_user_id
            FROM applications a
            JOIN gigs g ON a.gig_id = g.gig_id
            WHERE a.application_id = %s
            """,
            (application_id,)
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Application not found"}), 404

        application_id = row["application_id"]
        applicant_user_id = row["applicant_user_id"]
        gig_id = row["gig_id"]
        posted_by_user_id = row["posted_by_user_id"]


        is_employer = (int(posted_by_user_id) == current_user_id)
        is_applicant = (int(applicant_user_id) == current_user_id)

        if not (is_employer or is_applicant):
            return jsonify({"error": "not authorized"}), 403

        # Enforce status allowed by actor
        if is_employer and new_status not in allowed_for_employer:
            return jsonify({"error": f"Employers cannot set status '{new_status}'"}), 403

        if is_applicant and new_status not in allowed_for_user:
            return jsonify({"error": f"Users cannot set status '{new_status}'"}), 403

        # Optional: prevent employer and applicant conflict if somehow both (rare edge)
        # Employer should win? Usually not needed.

        cursor.execute(
            """
            UPDATE applications
            SET status = %s
            WHERE application_id = %s
            RETURNING application_id, user_id, gig_id, status, applied_at
            """,
            (new_status, application_id)
        )
        updated = cursor.fetchone()
        conn.commit()

        return jsonify(updated), 200

    finally:
        release_connection(conn)






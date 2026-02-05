from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db.db_pool import get_cursor, release_connection
import psycopg2

gigs = Blueprint("gigs", __name__)

@gigs.route("/", methods=["POST"])
@jwt_required()
def create_gig():
    data = request.get_json() or  {}
    gig_name = data.get("gig_name")
    gig_date = data.get("gig_date")
    gig_details = data.get("gig_details")
    type_name = data.get("type_name")
    employer_id = data.get("employer_id")

    if not gig_name or not gig_details or not gig_date or not type_name or not employer_id:
        return jsonify(status="error", msg="missing information"), 400

    posted_by_user_id = int(get_jwt_identity())

    conn, cursor = get_cursor()
    try:
        cursor.execute(
            """
            INSERT INTO gigs (gig_name, gig_date, gig_details, type_name, employer_id, posted_by_user_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING gig_id, gig_name, gig_date, gig_details, created_at, type_name, employer_id, posted_by_user_id
            """,
            (gig_name, gig_date, gig_details, type_name, employer_id, posted_by_user_id)
        )
        gig = cursor.fetchone()
        conn.commit()

    except psycopg2.errors.ForeignKeyViolation:
        conn.rollback()
        release_connection(conn)
        return jsonify(status="error", msg="invalid type_name/employer_id/posted_by_user_id"), 400
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        release_connection(conn)
        return jsonify(status="error", msg="gig already posted"), 400

    release_connection(conn)
    return jsonify(status="ok", gig=gig), 201

# NOTE: GET requests should avoid using body. Use query strings
@gigs.route("/")
@jwt_required()
def get_gigs():
    employer_id = request.args.get("employer_id")
    type_name = request.args.get("type_name")
    posted_by_user_id = request.args.get("posted_by_user_id")

    where = []
    params = []

    if employer_id:
        where.append("g.employer_id = %s")
        params.append(int(employer_id))
    if type_name:
        where.append("g.type_name = %s")
        params.append(type_name)
    if posted_by_user_id:
        where.append("g.posted_by_user_id = %s")
        params.append(int(posted_by_user_id))

    # THIS IS ABIT SIAO
    # " AND ".join(where) joins the [list] as X AND Y AND Z
    # WHERE X AND Y AND Z if (condition: list exists) else "" (give an empty string)
    where_sql = (" WHERE " + " AND ".join(where)) if where else ""

    conn, cursor = get_cursor()
    cursor.execute(
        f"""
        SELECT g.gig_id, g.gig_name, g.gig_date, g.gig_details, g.created_at,
               g.type_name, g.employer_id, g.posted_by_user_id
        FROM gigs g
        {where_sql}
        ORDER BY g.created_at DESC
        """,
        tuple(params)
    )
    rows = cursor.fetchall()
    release_connection(conn)

    return jsonify(status="ok", gigs=rows), 200

@gigs.route("/<gig_id>", methods=["PATCH"])
@jwt_required()
def update_gig(gig_id):
    data = request.get_json() or {}

    gig_name = data.get("gig_name")
    gig_date = data.get("gig_date")
    gig_details = data.get("gig_details")
    type_name = data.get("type_name")
    employer_id = data.get("employer_id")

    current_user_id = int(get_jwt_identity())

    conn, cursor = get_cursor()

    # Ensure gig exists and is owned by current user
    cursor.execute(
        "SELECT posted_by_user_id FROM gigs WHERE gig_id = %s",
        (gig_id,)
    )
    row = cursor.fetchone()
    if not row:
        release_connection(conn)
        return jsonify(status="error", msg="gig not found"), 404

    if int(row["posted_by_user_id"]) != current_user_id:
        release_connection(conn)
        return jsonify(status="error", msg="not allowed to update this gig"), 403

    try:
        cursor.execute(
            """
            UPDATE gigs
            SET gig_name   = COALESCE(%s, gig_name),
                gig_date   = COALESCE(%s, gig_date),
                gig_details= COALESCE(%s, gig_details),
                type_name    = COALESCE(%s, type_name),
                employer_id= COALESCE(%s, employer_id)
            WHERE gig_id = %s
            RETURNING gig_id, gig_name, gig_date, gig_details, created_at, type_name, employer_id, posted_by_user_id
            """,
            (gig_name, gig_date, gig_details, type_name, employer_id, gig_id)
        )
        updated = cursor.fetchone()
        conn.commit()

    except psycopg2.errors.ForeignKeyViolation:
        conn.rollback()
        release_connection(conn)
        return jsonify(status="error", msg="invalid type_name or employer_id"), 400
    except psycopg2.Error:
        conn.rollback()
        release_connection(conn)
        return jsonify(status="error", msg="could not update gig"), 400

    release_connection(conn)
    return jsonify(status="ok", gig=updated), 200

@gigs.route("/<gig_id>", methods=["DELETE"])
@jwt_required()
def delete_gig(gig_id):
    current_user_id = int(get_jwt_identity())

    conn, cursor = get_cursor()

    cursor.execute(
        "SELECT posted_by_user_id FROM gigs WHERE gig_id = %s",
        (gig_id,)
    )
    row = cursor.fetchone()

    if not row:
        release_connection(conn)
        return jsonify(status="error", msg="gig not found"), 404

    if int(row["posted_by_user_id"]) != current_user_id:
        release_connection(conn)
        return jsonify(status="error", msg="not allowed to delete this gig"), 403

    cursor.execute("DELETE FROM gigs WHERE gig_id = %s", (gig_id,))
    conn.commit()
    release_connection(conn)

    return jsonify(status="ok", msg="gig deleted"), 200

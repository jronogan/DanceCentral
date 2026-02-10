from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from db.db_pool import get_cursor, release_connection

user_media = Blueprint("user_media", __name__)


def _normalize_kind(kind: str):
    kind = (kind or "").strip().lower()
    if kind in {"profile_photo", "resume", "showreel"}:
        return kind
    return None


@user_media.get("/me/media")
@jwt_required()
def get_my_media():
    """Return the user's active media (0-1 rows per kind)."""
    user_id = get_jwt_identity()
    conn, cur = get_cursor()
    try:
        cur.execute(
            """
            SELECT media_id, user_id, kind, is_active,
                   resource_type, public_id, secure_url, format, bytes, created_at
              FROM user_media
             WHERE user_id = %s
               AND is_active = TRUE
             ORDER BY created_at DESC
            """,
            (user_id,),
        )
        rows = cur.fetchall() or []

        # Return as a mapping by kind for easy frontend consumption.
        out = {"profile_photo": None, "resume": None, "showreel": None}
        for r in rows:
            k = r.get("kind")
            if k in out and out[k] is None:
                out[k] = r

        return jsonify(out), 200
    finally:
        release_connection(conn)


@user_media.post("/me/media")
@jwt_required()
def upsert_my_media():
    """Insert new media for a kind and deactivate any previous active row for that kind."""
    user_id = get_jwt_identity()
    body = request.get_json(silent=True) or {}

    kind = _normalize_kind(body.get("kind"))
    if not kind:
        return jsonify({"error": "Invalid kind. Use profile_photo, resume, or showreel."}), 400

    resource_type = (body.get("resource_type") or "").strip().lower()
    if resource_type not in {"image", "raw", "video"}:
        return jsonify({"error": "Invalid resource_type. Use image, raw, or video."}), 400

    public_id = (body.get("public_id") or "").strip()
    secure_url = (body.get("secure_url") or "").strip()
    fmt = body.get("format")
    size_bytes = body.get("bytes")

    if not public_id or not secure_url:
        return jsonify({"error": "public_id and secure_url are required."}), 400

    conn, cur = get_cursor()
    try:
        # Deactivate existing active media for this kind
        cur.execute(
            """
            UPDATE user_media
               SET is_active = FALSE
             WHERE user_id = %s
               AND kind = %s
               AND is_active = TRUE
            """,
            (user_id, kind),
        )

        # Insert new row as active
        cur.execute(
            """
            INSERT INTO user_media (user_id, kind, is_active, resource_type, public_id, secure_url, format, bytes)
            VALUES (%s, %s, TRUE, %s, %s, %s, %s, %s)
            RETURNING media_id, user_id, kind, is_active,
                      resource_type, public_id, secure_url, format, bytes, created_at
            """,
            (user_id, kind, resource_type, public_id, secure_url, fmt, size_bytes),
        )
        row = cur.fetchone()
        conn.commit()
        return jsonify(row), 201
    finally:
        release_connection(conn)


@user_media.delete("/me/media/<kind>")
@jwt_required()
def delete_my_media(kind):
    """Soft-delete (deactivate) the active media row for this kind."""
    user_id = get_jwt_identity()
    kind = _normalize_kind(kind)
    if not kind:
        return jsonify({"error": "Invalid kind."}), 400

    conn, cur = get_cursor()
    try:
        cur.execute(
            """
            UPDATE user_media
               SET is_active = FALSE
             WHERE user_id = %s
               AND kind = %s
               AND is_active = TRUE
            RETURNING media_id
            """,
            (user_id, kind),
        )
        row = cur.fetchone()
        conn.commit()
        if not row:
            return jsonify({"error": "No active media found for that kind."}), 404
        return jsonify({"ok": True}), 200
    finally:
        release_connection(conn)
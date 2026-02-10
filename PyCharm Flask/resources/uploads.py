import os
import time

import cloudinary
import cloudinary.utils
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

uploads = Blueprint("uploads", __name__, url_prefix="/uploads")


def _kind_config(kind: str):
    kind = (kind or "").strip().lower()

    # profile photo -> image
    if kind == "profile_photo":
        return {
            "resource_type": "image",
            "folder_suffix": "profile_photo",
            "allowed_formats": ["jpg", "jpeg", "png"],
        }

    # resume pdf -> raw (recommended)
    if kind == "resume":
        return {
            "resource_type": "raw",
            "folder_suffix": "resume",
            "allowed_formats": ["pdf"],
        }

    # showreel -> video
    if kind == "showreel":
        return {
            "resource_type": "video",
            "folder_suffix": "showreel",
            "allowed_formats": ["mp4"],
        }

    return None


@uploads.route("/cloudinary/sign", methods=["POST"])
@jwt_required()
def cloudinary_sign():
    user_id = get_jwt_identity()
    body = request.get_json(silent=True) or {}
    kind = body.get("kind")

    cfg = _kind_config(kind)
    if not cfg:
        return jsonify({"error": "Invalid kind. Use profile_photo, resume, or showreel."}), 400

    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")

    if not cloud_name or not api_key or not api_secret:
        return jsonify({"error": "Cloudinary env vars not configured."}), 500

    # Configure cloudinary (safe to do per-request; you can move this to app init too)
    cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret, secure=True)

    timestamp = int(time.time())

    folder = f"dc/users/{user_id}/{cfg['folder_suffix']}"

    # These params MUST match what the frontend sends to Cloudinary
    params_to_sign = {
        "timestamp": timestamp,
        "folder": folder,
        "allowed_formats": ",".join(cfg["allowed_formats"]),
    }

    signature = cloudinary.utils.api_sign_request(params_to_sign, api_secret)

    return jsonify(
        {
            "cloudName": cloud_name,
            "apiKey": api_key,
            "timestamp": timestamp,
            "signature": signature,
            "folder": folder,
            "resourceType": cfg["resource_type"],
            "allowedFormats": cfg["allowed_formats"],
        }
    ), 200

from __future__ import annotations

from typing import Any, Tuple

from flask import jsonify, request
from marshmallow import Schema, ValidationError


def validate_json(
    schema: Schema,
    *,
    partial: bool = False,
    allow_unknown: bool = False,
) -> Tuple[dict[str, Any] | None, Any | None, int]:
    """Validate request JSON against a Marshmallow schema.

    Contract:
      - Reads JSON body silently. If missing/invalid -> 400.
      - On validation error -> 422 with per-field messages.
      - Returns (data, error_response, status_code).

    `allow_unknown=False` will reject unknown fields by default.
    """

    data = request.get_json(silent=True)
    if data is None:
        return None, jsonify({"status": "error", "msg": "Invalid or missing JSON body"}), 400

    try:
        loaded = schema.load(
            data,
            partial=partial,
            unknown=("INCLUDE" if allow_unknown else "RAISE"),
        )
        return loaded, None, 200
    except ValidationError as err:
        return None, jsonify({"status": "error", "msg": "Validation error", "errors": err.messages}), 422

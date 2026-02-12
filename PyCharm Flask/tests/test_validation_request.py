from flask import Flask

from resources.validations.request import validate_json
from resources.validations.schemas import UserLoginSchema


def _app():
    app = Flask(__name__)

    @app.post("/login")
    def login():
        data, err, status = validate_json(UserLoginSchema())
        if err:
            return err, status
        return {"status": "ok", "data": data}, 200

    return app


def test_missing_json_body_returns_400():
    app = _app()
    client = app.test_client()

    res = client.post("/login")
    assert res.status_code == 400
    payload = res.get_json()
    assert payload["status"] == "error"


def test_invalid_json_returns_400():
    app = _app()
    client = app.test_client()

    res = client.post("/login", data="not-json", content_type="application/json")
    assert res.status_code == 400


def test_validation_error_returns_422():
    app = _app()
    client = app.test_client()

    res = client.post("/login", json={"email": "not-an-email", "password": "x"})
    assert res.status_code == 422
    payload = res.get_json()
    assert payload["status"] == "error"
    assert "email" in payload["errors"]


def test_valid_payload_returns_200():
    app = _app()
    client = app.test_client()

    res = client.post("/login", json={"email": "a@b.com", "password": "secret"})
    assert res.status_code == 200
    payload = res.get_json()
    assert payload["status"] == "ok"
    assert payload["data"]["email"] == "a@b.com"

# Flask request validations

This folder contains **Marshmallow** schemas + a small helper for consistent JSON validation.

## Quick use

```python
from resources.validations.request import validate_json
from resources.validations.schemas import UserRegisterSchema

payload, err_resp, status = validate_json(UserRegisterSchema())
if err_resp:
    return err_resp, status
```

## Notes

- Missing/invalid JSON -> **400**
- Schema validation errors -> **422** with `{ errors: { field: [messages...] } }`
- Unknown fields are rejected by default.

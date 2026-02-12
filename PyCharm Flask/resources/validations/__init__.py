"""Request validation helpers and Marshmallow schemas for Flask resources.

Usage:
  from resources.validations.schemas import UserRegisterSchema
  from resources.validations.request import validate_json

  payload, errors, status = validate_json(UserRegisterSchema())
  if errors:
      return errors, status
"""

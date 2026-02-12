from __future__ import annotations

from marshmallow import Schema, fields, validate


class UserRegisterSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    email = fields.Email(required=True)
    date_of_birth = fields.Date(required=True)  # accepts "YYYY-MM-DD"
    password = fields.String(required=True, validate=validate.Length(min=8, max=255))


class UserLoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=1, max=255))


class UserUpdateMeSchema(Schema):
    name = fields.String(required=False, allow_none=True, validate=validate.Length(min=1, max=120))
    email = fields.Email(required=False, allow_none=True)
    date_of_birth = fields.Date(required=False, allow_none=True)


class GigCreateSchema(Schema):
    gig_name = fields.String(required=True, validate=validate.Length(min=1, max=200))
    gig_date = fields.Date(required=True)
    gig_details = fields.String(required=True, validate=validate.Length(min=1, max=4000))
    type_name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    employer_id = fields.Integer(required=True, strict=True)


class GigUpdateSchema(Schema):
    gig_name = fields.String(required=False, allow_none=True, validate=validate.Length(min=1, max=200))
    gig_date = fields.Date(required=False, allow_none=True)
    gig_details = fields.String(required=False, allow_none=True, validate=validate.Length(min=1, max=4000))
    type_name = fields.String(required=False, allow_none=True, validate=validate.Length(min=1, max=120))
    employer_id = fields.Integer(required=False, allow_none=True, strict=True)


class EmployerCreateSchema(Schema):
    employer_name = fields.String(required=True, validate=validate.Length(min=1, max=200))
    description = fields.String(required=False, allow_none=True, validate=validate.Length(max=4000))
    website = fields.String(required=False, allow_none=True, validate=validate.Length(max=500))
    email = fields.Email(required=False, allow_none=True)
    phone = fields.String(required=False, allow_none=True, validate=validate.Length(max=50))


class EmployerUpdateSchema(Schema):
    employer_name = fields.String(required=False, allow_none=True, validate=validate.Length(min=1, max=200))
    description = fields.String(required=False, allow_none=True, validate=validate.Length(max=4000))
    website = fields.String(required=False, allow_none=True, validate=validate.Length(max=500))
    email = fields.Email(required=False, allow_none=True)
    phone = fields.String(required=False, allow_none=True, validate=validate.Length(max=50))


class ApplicationCreateSchema(Schema):
    gig_id = fields.Integer(required=True, strict=True)


class ApplicationDeleteSchema(Schema):
    gig_id = fields.Integer(required=True, strict=True)


class ApplicationUpdateStatusSchema(Schema):
    status = fields.String(required=True, validate=validate.Length(min=1, max=50))


class GigRoleCreateSchema(Schema):
    gig_id = fields.Integer(required=True, strict=True)
    role_name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    needed_count = fields.Integer(required=True, strict=True, validate=validate.Range(min=1, max=10000))
    pay_amount = fields.Float(required=True)
    pay_currency = fields.String(required=True, validate=validate.Length(min=1, max=10))
    pay_unit = fields.String(required=True, validate=validate.Length(min=1, max=50))


class GigRoleDeleteSchema(Schema):
    role_name = fields.String(required=True, validate=validate.Length(min=1, max=120))


class GigRoleUpdateSchema(Schema):
    role_name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    needed_count = fields.Integer(required=False, allow_none=True, strict=True, validate=validate.Range(min=1, max=10000))
    pay_amount = fields.Float(required=False, allow_none=True)
    pay_currency = fields.String(required=False, allow_none=True, validate=validate.Length(min=1, max=10))
    pay_unit = fields.String(required=False, allow_none=True, validate=validate.Length(min=1, max=50))

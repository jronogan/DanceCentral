import pytest
from marshmallow import ValidationError

from resources.validations.schemas import (
    EmployerCreateSchema,
    ApplicationCreateSchema,
    GigRoleCreateSchema,
)


def test_employer_create_requires_name():
    with pytest.raises(ValidationError):
        EmployerCreateSchema().load({})


def test_application_create_requires_gig_id_int():
    with pytest.raises(ValidationError):
        ApplicationCreateSchema().load({"gig_id": "abc"})


def test_gig_role_create_requires_required_fields():
    with pytest.raises(ValidationError):
        GigRoleCreateSchema().load({"gig_id": 1})

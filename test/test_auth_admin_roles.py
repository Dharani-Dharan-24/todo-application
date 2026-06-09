from fastapi import HTTPException

from ..routers.admin import user_is_admin
from ..routers.auth import normalize_role


def test_normalize_role_accepts_admin_with_extra_formatting():
    assert normalize_role(" Admin ") == "admin"


def test_normalize_role_rejects_invalid_role():
    try:
        normalize_role("manager")
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Expected invalid role to raise HTTPException")


def test_user_is_admin_accepts_normalized_admin_role():
    assert user_is_admin({"role": " Admin "}) is True


def test_user_is_admin_rejects_non_admin_role():
    assert user_is_admin({"role": "user"}) is False

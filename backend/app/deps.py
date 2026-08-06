"""Auth dependencies and role guards."""

import uuid
from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Role, User
from app.security import decode_access_token

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(creds.credentials)
    if payload is None or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )

    try:
        user_id = uuid.UUID(str(payload["sub"]))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_roles(*roles: Role) -> Callable[[User], User]:
    """
    Route guard.

    Note this is authorization by ROLE. Whether a specific collector may
    collect a specific child on a specific date is a separate question with its
    own service (module M2.4) — never conflate the two.
    """

    allowed = set(roles)

    def _guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of: {', '.join(r.value for r in allowed)}",
            )
        return user

    return _guard


require_admin = require_roles(Role.admin)
require_staff = require_roles(Role.admin, Role.teacher, Role.guard)
require_guard = require_roles(Role.guard, Role.admin)
require_teacher = require_roles(Role.teacher, Role.admin)
# Parents, relatives and drivers are all collectors and share these routes.
require_collector = require_roles(Role.parent, Role.driver)

"""Authentication — login and the current user."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.phone import is_valid as valid_phone, normalise as normalise_phone
from app.db import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import LoginRequest, LoginResponse, UpdateMeRequest, UserOut
from app.security import create_access_token, hash_password, needs_rehash, verify_password

router = APIRouter(tags=["auth"])


@router.post("/auth/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    # Normalised so +923001234567, 0300-1234567 and 03001234567 all reach
    # the same account — they are the same number to a human.
    phone = normalise_phone(body.phone)
    user = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()

    # Same error and roughly the same work for "no such user" and "wrong
    # password", so the response cannot be used to enumerate phone numbers.
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled"
        )

    # Transparently upgrade hashes when argon2 parameters change.
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(body.password)
        db.commit()

    token, expires_in = create_access_token(
        subject=str(user.id), role=user.role.value, school_id=str(user.school_id)
    )
    return LoginResponse(
        access_token=token, expires_in=expires_in, user=UserOut.model_validate(user)
    )


@router.get("/users/me", response_model=UserOut, tags=["auth"])
def read_me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/users/me", response_model=UserOut, tags=["auth"])
def update_me(
    body: UpdateMeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    """
    Registers the FCM token and the language preference.

    Without this endpoint `users.fcm_token` could never be populated, so no
    push notification could ever be delivered.
    """
    if body.fcm_token is not None:
        user.fcm_token = body.fcm_token
    if body.locale is not None:
        user.locale = body.locale
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)

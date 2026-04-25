import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import ACCESS_TOKEN_EXPIRE_SECONDS, encode_jwt
from app.deps.auth import get_current_user
from app.deps.db import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginPayload,
    RegisterPayload,
    RegisterResponse,
    Session,
    UserProfile,
)

router = APIRouter(prefix="/auth", tags=["auth"])

DEMO_EMAILS = {"siti@gingergig.my", "amir@gingergig.my", "faiz@gingergig.my"}


def _initials(name: str) -> str:
    parts = [part for part in name.split() if part]
    return "".join(part[0] for part in parts[:2]).upper()


def _profile_from_user(user: User) -> UserProfile:
    return UserProfile(
        id=str(user.id),
        name=user.name,
        role=user.role,
        locale=user.locale,
        kycStatus=user.kyc_status,
        avatarUrl=user.avatar_url,
        area=user.area,
        age=user.age,
        phone=user.phone,
        initials=_initials(user.name),
    )


def _session_for_user(user: User) -> Session:
    return Session(
        accessToken=encode_jwt({"sub": str(user.id)}),
        expiresIn=ACCESS_TOKEN_EXPIRE_SECONDS,
        userId=str(user.id),
    )


@router.post("/login", response_model=Session)
async def login(
    payload: LoginPayload,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Session:
    result = await db.execute(select(User).where(User.email == str(payload.email)))
    user = result.scalar_one_or_none()
    if user is None or user.email not in DEMO_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    return _session_for_user(user)


@router.post("/register", response_model=RegisterResponse)
async def register(
    payload: RegisterPayload,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RegisterResponse:
    result = await db.execute(select(User).where(User.email == str(payload.email)))
    existing_user = result.scalar_one_or_none()
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        id=uuid.uuid4(),
        email=str(payload.email),
        phone=payload.phone,
        password_hash="demo-mock-auth",  # noqa: S106 - explicit demo-only placeholder.
        name=payload.name,
        role=payload.role,
        locale=payload.locale,
        kyc_status="not_started",
    )
    db.add(user)
    await db.flush()

    return RegisterResponse(
        userId=str(user.id),
        accessToken=encode_jwt({"sub": str(user.id)}),
        expiresIn=ACCESS_TOKEN_EXPIRE_SECONDS,
        kycRequired=payload.role == "elder",
        kycStatus=user.kyc_status,
    )


@router.get("/me", response_model=UserProfile)
async def me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserProfile:
    return _profile_from_user(current_user)

from typing import Literal

from pydantic import BaseModel, EmailStr


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


class RegisterPayload(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str
    role: Literal["elder", "requestor", "companion"]
    locale: Literal["ms", "en", "zh", "ta"]


class Session(BaseModel):
    accessToken: str
    tokenType: Literal["bearer"] = "bearer"
    expiresIn: int
    userId: str


class RegisterResponse(BaseModel):
    userId: str
    accessToken: str
    tokenType: Literal["bearer"] = "bearer"
    expiresIn: int
    kycRequired: bool
    kycStatus: Literal["not_started", "pending", "approved", "failed", "manual_review"]


class UserProfile(BaseModel):
    id: str
    name: str
    role: Literal["elder", "requestor", "companion"]
    locale: Literal["ms", "en", "zh", "ta"]
    kycStatus: Literal["not_started", "pending", "approved", "failed", "manual_review"]
    avatarUrl: str | None = None
    area: str | None = None
    age: int | None = None
    phone: str | None = None
    initials: str

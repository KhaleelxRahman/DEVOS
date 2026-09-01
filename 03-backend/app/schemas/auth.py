from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

# --- Legacy request/response models (kept for API compatibility) ---


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- Canonical schemas used by AuthService and the /auth router ---


class UserRegister(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class AuthResponseData(BaseModel):
    """Payload for successful register/login responses."""

    user: UserResponse
    token: str

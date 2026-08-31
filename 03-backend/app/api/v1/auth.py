from fastapi import APIRouter
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.core.security import hash_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
def register(data: RegisterRequest):
    return {"email": data.email, "password_hash": hash_password(data.password)}

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest):
    token = create_access_token({"sub": data.email})
    return TokenResponse(access_token=token)

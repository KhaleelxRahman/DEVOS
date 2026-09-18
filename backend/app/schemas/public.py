from pydantic import BaseModel, EmailStr


class WaitlistJoinRequest(BaseModel):
    email: EmailStr


class WaitlistJoinResponse(BaseModel):
    email: EmailStr
    message: str


class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    message: str


class ContactResponse(BaseModel):
    message: str

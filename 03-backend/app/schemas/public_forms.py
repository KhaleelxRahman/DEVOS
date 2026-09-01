from pydantic import BaseModel, EmailStr, Field, field_validator


# No HTML tags allowed in free-text fields; plain-text forms only.
def _reject_html(value: str) -> str:
    if "<" in value or ">" in value:
        raise ValueError("HTML tags are not allowed")
    return value


class WaitlistJoinRequest(BaseModel):
    email: EmailStr
    name: str | None = Field(default=None, max_length=120)

    @field_validator("name")
    @classmethod
    def name_plain_text(cls, v: str | None) -> str | None:
        if v is not None:
            return _reject_html(v.strip()) or None
        return v


class WaitlistJoinResponse(BaseModel):
    status: str  # "joined" | "already_registered"


class ContactRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=4000)
    # Honeypot field: must be empty. Bots that fill hidden inputs are rejected
    # silently with a fake success to avoid giving feedback.
    website: str = Field(default="", max_length=64)

    @field_validator("name", "subject", "message")
    @classmethod
    def plain_text(cls, v: str) -> str:
        return _reject_html(v.strip())


class ContactResponse(BaseModel):
    status: str  # "received"

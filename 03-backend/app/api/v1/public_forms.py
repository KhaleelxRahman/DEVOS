from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.waitlist import WaitlistEntry, ContactMessage
from app.schemas.common import ApiResponse
from app.schemas.public_forms import (
    WaitlistJoinRequest,
    WaitlistJoinResponse,
    ContactRequest,
    ContactResponse,
)
from app.core.rate_limit import rate_limit

# Intentionally PUBLIC endpoints (no authentication). These power the
# public marketing website's waitlist and contact forms. Rate-limited and
# validated; they write only to their own tables and never expose data.

router = APIRouter(tags=["public"])


@router.post(
    "/waitlist",
    response_model=ApiResponse[WaitlistJoinResponse],
    dependencies=[Depends(rate_limit(5, 60, "waitlist"))],
)
async def join_waitlist(payload: WaitlistJoinRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower()
    existing = await db.execute(select(WaitlistEntry).where(WaitlistEntry.email == email))
    if existing.scalar_one_or_none() is not None:
        # Idempotent: do not reveal whether an email was previously used
        # beyond what the submitter already knows, and never duplicate rows.
        return ApiResponse(success=True, data=WaitlistJoinResponse(status="already_registered"))
    db.add(WaitlistEntry(email=email, name=payload.name))
    await db.commit()
    return ApiResponse(success=True, data=WaitlistJoinResponse(status="joined"))


@router.post(
    "/contact",
    response_model=ApiResponse[ContactResponse],
    dependencies=[Depends(rate_limit(3, 60, "contact"))],
)
async def submit_contact(payload: ContactRequest, db: AsyncSession = Depends(get_db)):
    # Honeypot: real users never see/fill this field. Return fake success.
    if payload.website:
        return ApiResponse(success=True, data=ContactResponse(status="received"))
    db.add(
        ContactMessage(
            name=payload.name,
            email=payload.email.lower(),
            subject=payload.subject,
            message=payload.message,
        )
    )
    await db.commit()
    return ApiResponse(success=True, data=ContactResponse(status="received"))

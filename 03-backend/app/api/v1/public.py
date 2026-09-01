from fastapi import APIRouter
from app.schemas.common import ApiResponse
from app.schemas.public import (
    WaitlistJoinRequest,
    WaitlistJoinResponse,
    ContactRequest,
    ContactResponse,
)

router = APIRouter(tags=["public"])


@router.post("/waitlist", response_model=ApiResponse[WaitlistJoinResponse])
async def join_waitlist(payload: WaitlistJoinRequest):
    return ApiResponse(
        success=True,
        data=WaitlistJoinResponse(
            email=payload.email,
            message="Successfully joined the DEVOS waitlist.",
        ),
    )


@router.post("/contact", response_model=ApiResponse[ContactResponse])
async def submit_contact(payload: ContactRequest):
    return ApiResponse(
        success=True,
        data=ContactResponse(
            message="Your message has been received.",
        ),
    )

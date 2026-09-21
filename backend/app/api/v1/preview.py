"""Phase 2D — dev-server preview endpoints.

POST /projects/{project_id}/preview         — start the project dev server and
                                              wait for real reachability (READY).
GET  /projects/{project_id}/preview/status  — current preview state for a project.
POST /projects/{project_id}/preview/stop    — stop the running preview (no orphan).
GET  /projects/{project_id}/executions/{execution_id}/preview/{path:path}
                                            — proxy the dev server through the
                                              authorized backend for the iframe.
"""
from fastapi import APIRouter, Depends, Header, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.v1.executions import _owned_project
from app.core.rate_limit import rate_limit
from app.core.security import create_preview_token, decode_preview_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.execution import PreviewInfo
from app.services.activity_service import ActivityService
from app.services.execution_service import ExecutionService
from app.services.preview_service import PreviewService

router = APIRouter(prefix="/projects/{project_id}", tags=["preview"])


def _preview_token_for(execution, user) -> str | None:
    """Phase 2G: mint the short-lived, execution-scoped iframe token.

    Only a READY preview gets one. The token authorizes ONLY this execution's
    preview proxy and can never be used as a session/API credential (distinct
    signing key, ``typ="preview"``, short TTL).
    """
    if execution is None or not execution.execution_id:
        return None
    if execution.status != "READY" or not execution.preview_port:
        return None
    return create_preview_token(
        execution_id=execution.execution_id,
        user_id=user.id,
        project_id=execution.project_id,
    )


@router.post(
    "/preview",
    response_model=ApiResponse[PreviewInfo],
    dependencies=[Depends(rate_limit(10, 60, "preview_start"))],
)
async def start_preview(
    project_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Phase 2D: start the project's real dev server and wait until it is
    reachable (READY) with a real connection check. Returns the preview
    info including the backend proxy URL for the browser iframe. The public
    base URL is derived from the incoming request so the proxy URL is
    correct in every environment (localhost, Render, any host)."""
    host = request.headers.get("host") or request.url.netloc
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    public_base_url = f"{proto}://{host}"
    execution = await ExecutionService.start_dev_server(
        db, current_user, project_id, public_base_url=public_base_url)
    await ActivityService.record(
        db,
        user_id=current_user.id,
        project_id=execution.project_id,
        activity_type="preview.started",
        metadata={
            "execution_id": execution.execution_id,
            "status": execution.status,
            "port": execution.preview_port,
        },
    )
    info = PreviewService.build_preview_info(
        execution, project_id, _preview_token_for(execution, current_user))
    return ApiResponse(success=True, data=info)


@router.get(
    "/preview/status",
    response_model=ApiResponse[PreviewInfo],
)
async def preview_status(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Phase 2D: current preview state for a project (READY when the dev
    server is running and reachable; FAILED when it crashed or timed out)."""
    await _owned_project(db, project_id, current_user)
    execution = await ExecutionService.get_active_preview(
        db, current_user, project_id)
    if execution is None:
        return ApiResponse(
            success=True,
            data=PreviewInfo(
                execution_id="", project_id=project_id, status="STOPPED"),
        )
    info = PreviewService.build_preview_info(
        execution, project_id, _preview_token_for(execution, current_user))
    return ApiResponse(success=True, data=info)


@router.post(
    "/preview/stop",
    response_model=ApiResponse[PreviewInfo],
    dependencies=[Depends(rate_limit(10, 60, "preview_stop"))],
)
async def stop_preview(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Phase 2D: stop the running preview. The process is killed through the
    canonical cancellation path so no orphan server or held port remains."""
    await _owned_project(db, project_id, current_user)
    execution = await ExecutionService.get_active_preview(
        db, current_user, project_id)
    if execution is None:
        return ApiResponse(
            success=True,
            data=PreviewInfo(
                execution_id="", project_id=project_id, status="STOPPED"),
        )
    stopped = await ExecutionService.cancel_execution(
        db, current_user, project_id, execution.execution_id)
    await ActivityService.record(
        db,
        user_id=current_user.id,
        project_id=project_id,
        activity_type="preview.stopped",
        metadata={"execution_id": stopped.execution_id},
    )
    # A stopped preview is never READY, so no iframe token is issued.
    info = PreviewService.build_preview_info(
        stopped, project_id, _preview_token_for(stopped, current_user))
    return ApiResponse(success=True, data=info)


@router.get(
    "/executions/{execution_id}/preview/{preview_path:path}",
    dependencies=[Depends(rate_limit(120, 60, "preview_proxy"))],
)
async def preview_proxy(
    project_id: str,
    execution_id: str,
    preview_path: str,
    request: Request,
    authorization: str | None = Header(default=None),
    preview_token: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Phase 2D: relay the running dev server's HTTP response through the
    authorized backend so the browser iframe can load the preview without
    exposing the dev-server port publicly. Ownership is enforced; the target
    is always http://127.0.0.1:<stored port> — never client-supplied.

    Authentication is EITHER a Bearer session JWT (API clients) OR, for the
    iframe which cannot set headers, a short-lived `preview_token` query param.
    Phase 2G: that URL token must be a dedicated execution-scoped preview
    token — a session JWT is explicitly NOT accepted in the URL, because a
    credential in a URL leaks through browser history, access logs and
    Referer headers."""
    from app.api.deps import AuthRequiredException as _ARE
    from app.core.errors import (
        ExecutionInvalidTypeException,
    )
    from app.core.security import decode_access_token
    from app.services.auth_service import AuthService

    if authorization and authorization.startswith("Bearer "):
        user_id = decode_access_token(authorization.split(" ", 1)[1])
        if not user_id:
            raise _ARE("Invalid or expired session token")
    elif preview_token:
        scope = decode_preview_token(preview_token)
        if (not scope
                or scope["execution_id"] != execution_id
                or scope["project_id"] != project_id):
            raise _ARE("Invalid or expired preview token")
        user_id = scope["user_id"]
    else:
        raise _ARE()
    user = await AuthService.get_by_id(db, user_id)
    if not user:
        raise _ARE("User associated with token no longer exists")

    execution = await ExecutionService.get_execution(
        db, user, project_id, execution_id)
    if execution.execution_type != "DEV_SERVER":
        raise ExecutionInvalidTypeException(
            "Preview proxy only applies to DEV_SERVER executions")
    if execution.status != "READY" or not execution.preview_port:
        return JSONResponse(
            status_code=409,
            content={"success": False, "error": {
                "code": "PREVIEW_NOT_READY",
                "message": "Preview is not READY",
            }},
        )

    port = int(execution.preview_port)
    target_url = f"http://127.0.0.1:{port}/{preview_path}"
    query = request.url.query
    if query:
        target_url = f"{target_url}?{query}"

    import httpx

    async def _relay():
        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                upstream = await client.get(target_url)
        except Exception as exc:
            return JSONResponse(
                status_code=502,
                content={"success": False, "error": {
                    "code": "PREVIEW_PROXY_ERROR",
                    "message": f"Dev server unreachable: {exc}",
                }},
            )
        headers = {
            k: v for k, v in upstream.headers.items()
            if k.lower() not in {
                "content-encoding", "transfer-encoding",
                "content-length", "connection",
            }
        }
        return StreamingResponse(
            upstream.aiter_bytes(),
            status_code=upstream.status_code,
            headers=headers,
        )

    return await _relay()
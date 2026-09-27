"""Phase 1 builder API endpoints.
Generation transaction fields preserved exactly as required by the contract:
  generation_request_id, user_id, project_id, prompt, normalized_build_spec,
  mode, status, created_files, modified_files, deleted_files,
  failed_operations, started_at, completed_at
States: IDLE -> PLANNING -> GENERATING -> APPLYING -> SYNCING -> COMPLETED
Failures remain distinguishable: PARTIAL, FAILED, CANCELLED, BLOCKED
FAILED/PARTIAL/CANCELLED/BLOCKED are never represented as COMPLETED.
"""
from __future__ import annotations

import asyncio
import logging
import os
from uuid import uuid4

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.builder import (
    ApplyStatusResponse,
    BuilderStreamEvent,
    CreateGenerationRequest,
    GeneratedPlan,
    NormalizedBuildSpec,
    RequirementsClassification,
    StatusResponse,
    SummaryResponse,
)
from app.schemas.common import ApiResponse, ErrorDetail
from app.services.builder_service import (
    TERMINAL_STATUSES,
    ALLOWED_TRANSITIONS,
    BACKGROUND_STORE,
    classify_requirements,
    build_plan_text,
    utcnow,
)
from app.services.file_service import FileService
from app.services.project_service import ProjectService
from app.services.builder_templates import generate_file_map

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}/builder", tags=["builder"])

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MAX_PROMPT_LENGTH = 2000
MAX_RETRIES = 3
STORE_CLEANUP_INTERVAL_SECONDS = 300
STORE_ENTRY_TTL_SECONDS = 3600

# Status constants for type safety
STATUS_IDLE = "IDLE"
STATUS_PLANNING = "PLANNING"
STATUS_GENERATING = "GENERATING"
STATUS_APPLYING = "APPLYING"
STATUS_SYNCING = "SYNCING"
STATUS_COMPLETED = "COMPLETED"
STATUS_PARTIAL = "PARTIAL"
STATUS_FAILED = "FAILED"
STATUS_CANCELLED = "CANCELLED"
STATUS_BLOCKED = "BLOCKED"

# Operation types
OP_CREATE = "create"
OP_WRITE = "write"
OP_MODIFY = "modify"
OP_DELETE = "delete"


def split_generated_path(path: str) -> tuple[str, str]:
    """Split a generated file path into (parent_relative_path, filename).

    The plan intentionally targets a nested layout (`server/index.js`,
    `client/App.jsx`, `server/routes/tasks.js`, ...). Previously the apply step
    called `FileService.create_file(project_id, "", path.split("/")[-1], ...)`,
    which discarded every directory component and wrote everything flat into the
    project root. Same-named files from different directories then silently
    overwrote each other (`server/db.js` vs `client/api.js`,
    `server/package.json` vs the root `package.json`) and the generated app was
    unrunnable.

    `FileService.create_file` requires a parent-relative path plus a single
    filename (it rejects separators in the name) and already creates missing
    parent directories, so splitting is all that is needed to preserve the
    planned structure.
    """
    normalized = str(path).replace("\\", "/").strip()
    parts = [p for p in normalized.split("/") if p not in ("", ".")]
    if not parts:
        raise ValueError(f"Invalid generated path: {path!r}")
    if ".." in parts:
        raise ValueError(f"Generated path escapes the project: {path!r}")
    return "/".join(parts[:-1]), parts[-1]


def create_generated_file(
    project_id: str, path: str, content: str = ""
) -> None:
    """Write one generated file at its full planned relative path.

    Preserves the directory structure by creating the parent directory when it
    does not exist yet, then delegating to the owner-scoped, path-validated
    `FileService.create_file`.
    """
    parent_rel, name = split_generated_path(path)
    if parent_rel:
        # Validate the parent through the same containment check the file write
        # uses, then create it if missing. `os.makedirs(..., exist_ok=True)`
        # is safe to repeat, so the second file in a directory is not an error.
        parent_abs = FileService.validate_safe_path(project_id, parent_rel)
        if not os.path.isdir(parent_abs):
            os.makedirs(parent_abs, exist_ok=True)
    FileService.create_file(project_id, parent_rel, name, content)


# Result of writing one generated file to the workspace.
WRITE_CREATED = "created"
WRITE_MODIFIED = "modified"
WRITE_UNCHANGED = "unchanged"


def sync_generated_file(project_id: str, path: str, content: str = "") -> str:
    """Converge one generated file to the generated content (upsert).

    Returns one of WRITE_CREATED / WRITE_MODIFIED / WRITE_UNCHANGED.

    `apply` is the sole writer, but the same project can be generated and
    applied more than once (a new generation against an existing workspace, or
    a re-applied transaction). A plain create failed for every file with "A file
    or folder with this name already exists" in those cases. Treating the write
    as a sync against a desired state makes apply idempotent (re-running
    changes nothing) and convergent (an edited or deleted file is restored to
    the generated snapshot), which is what "apply a change set" means.
    """
    abs_path = FileService.validate_safe_path(project_id, path)
    if not os.path.isfile(abs_path):
        create_generated_file(project_id, path, content)
        return WRITE_CREATED

    try:
        with open(abs_path, encoding="utf-8") as fh:
            existing = fh.read()
    except OSError:
        existing = None
    if existing == content:
        return WRITE_UNCHANGED

    # Content differs (the user edited it, or it was changed since generation):
    # converge the workspace back to the generated snapshot.
    FileService.save_file(project_id, path, content)
    return WRITE_MODIFIED


def validate_transition(current_status: str | None, new_status: str) -> None:
    """Validate that a state transition is allowed.

    Raises ValueError if the transition is not allowed.
    """
    if current_status is None:
        if new_status != STATUS_PLANNING:
            raise ValueError(f"Invalid initial transition to {new_status}")
        return

    allowed = ALLOWED_TRANSITIONS.get(current_status, set())
    if new_status not in allowed:
        raise ValueError(
            f"Invalid transition from {current_status} to {new_status}. "
            f"Allowed: {allowed}"
        )


def validate_prompt(prompt: str | None) -> ApiResponse | None:
    """Validate prompt content. Returns error response if invalid, None if valid."""
    if not prompt or not prompt.strip():
        return ApiResponse(
            success=False,
            error=ErrorDetail(code="VALIDATION_ERROR", message="prompt is required"),
        )
    if len(prompt) > MAX_PROMPT_LENGTH:
        return ApiResponse(
            success=False,
            error=ErrorDetail(
                code="VALIDATION_ERROR",
                message=f"prompt must be {MAX_PROMPT_LENGTH} characters or fewer",
            ),
        )
    return None


def prompt_cleaned(prompt: str) -> str:
    """Clean and normalize prompt text."""
    return prompt.strip()
# ---------------------------------------------------------------------------
# Phase 1 builder endpoints
# ---------------------------------------------------------------------------
@router.post("/classify", response_model=ApiResponse[RequirementsClassification])
async def classify(
    project_id: str,
    payload: CreateGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """D-05: classify requirements from a user prompt (EXPLICIT/INFERRED/OPTIONAL/UNSUPPORTED)."""
    await ProjectService.get_for_user(db, project_id, current_user.id)
    validation_error = validate_prompt(payload.prompt)
    if validation_error:
        return validation_error
    reqs, spec = classify_requirements(payload.prompt.strip())
    plan_text = build_plan_text(spec)
    return ApiResponse(
        success=True,
        data=RequirementsClassification(
            project_id=project_id,
            prompt=payload.prompt.strip(),
            requirements=reqs,
            plan=plan_text,
            stack=spec.stack,
            unsupported=spec.unsupported,
            mode=payload.mode or "build",
        ),
    )
@router.post("/plan", response_model=ApiResponse[GeneratedPlan])
async def plan(
    project_id: str,
    payload: CreateGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """D-06: build a user-visible plan and normalized spec."""
    await ProjectService.get_for_user(db, project_id, current_user.id)
    validation_error = validate_prompt(payload.prompt)
    if validation_error:
        return validation_error
    reqs, spec = classify_requirements(payload.prompt.strip())
    plan_text = build_plan_text(spec)
    return ApiResponse(
        success=True,
        data=GeneratedPlan(
            project_id=project_id,
            prompt=payload.prompt.strip(),
            plan=plan_text,
            spec=NormalizedBuildSpec.model_validate(spec.model_dump()),
            files=spec.files,
        ),
    )
@router.post("/start", response_model=ApiResponse[StatusResponse])
async def start(
    project_id: str,
    payload: CreateGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """D-03/D-04: start a generation transaction in the background."""
    await ProjectService.get_for_user(db, project_id, current_user.id)
    validation_error = validate_prompt(payload.prompt)
    if validation_error:
        return validation_error
    gen_id = payload.generation_request_id or str(uuid4())
    if gen_id in BACKGROUND_STORE:
        existing = BACKGROUND_STORE[gen_id]
        if existing["status"] not in TERMINAL_STATUSES:
            return ApiResponse(
                success=False,
                error=ErrorDetail(
                    code="GENERATION_IN_PROGRESS",
                    message="A generation with this id is already running",
                ),
            )
    loop = asyncio.get_event_loop()
    task = loop.create_task(
        _run_generation(
            gen_id=gen_id,
            project_id=project_id,
            user_id=current_user.id,
            prompt=payload.prompt.strip(),
            mode=payload.mode or "build",
            project_name=payload.project_name,
            retries=0,
        )
    )
    BACKGROUND_STORE[gen_id] = {
        "status": "IDLE",
        "task": task,
        "prompt": payload.prompt.strip(),
        "mode": payload.mode or "build",
        "user_id": current_user.id,
        "project_id": project_id,
        "started_at": utcnow().isoformat(),
        "completed_at": None,
        "files": [],
        "failed_operations": [],
    }
    return ApiResponse(
        success=True,
        data=StatusResponse(
            generation_request_id=gen_id,
            project_id=project_id,
            status="IDLE",
            started_at=BACKGROUND_STORE[gen_id]["started_at"],
            completed_at=None,
        ),
    )
@router.get("/status/{generation_request_id}", response_model=ApiResponse[StatusResponse])
async def status(
    project_id: str,
    generation_request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """D-03: fetch generation transaction status."""
    await ProjectService.get_for_user(db, project_id, current_user.id)
    record = BACKGROUND_STORE.get(generation_request_id)
    if record is None:
        return ApiResponse(
            success=False,
            error=ErrorDetail(
                code="GENERATION_NOT_FOUND",
                message="No generation with that id was found",
            ),
        )
    return ApiResponse(
        success=True,
        data=StatusResponse(
            generation_request_id=generation_request_id,
            project_id=record["project_id"],
            status=record["status"],
            started_at=record["started_at"],
            completed_at=record["completed_at"],
        ),
    )
@router.get("/stream/{generation_request_id}")
async def stream(
    project_id: str,
    generation_request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """D-13: SSE stream for a generation transaction."""
    await ProjectService.get_for_user(db, project_id, current_user.id)
    record = BACKGROUND_STORE.get(generation_request_id)
    if record is None:
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "error": {
                    "code": "GENERATION_NOT_FOUND",
                    "message": "No generation with that id was found",
                }
            },
        )
    async def event_generator():
        while True:
            rec = BACKGROUND_STORE.get(generation_request_id)
            if rec is None:
                yield (
                    "data: "
                    + BuilderStreamEvent(
                        event="error", data={"message": "generation disappeared"}
                    ).model_dump_json()
                    + "\n\n"
                )
                break
            yield (
                "data: "
                + BuilderStreamEvent(
                    event="status",
                    data={
                        "generation_request_id": generation_request_id,
                        "status": rec["status"],
                        "started_at": rec["started_at"],
                        "completed_at": rec["completed_at"],
                    },
                ).model_dump_json()
                + "\n\n"
            )
            if rec["status"] in TERMINAL_STATUSES:
                yield (
                    "data: "
                    + BuilderStreamEvent(
                        event="finished",
                        data={
                            "generation_request_id": generation_request_id,
                            "status": rec["status"],
                            "files": rec.get("files", []),
                            "failed_operations": rec.get("failed_operations", []),
                            "started_at": rec["started_at"],
                            "completed_at": rec["completed_at"],
                        },
                    ).model_dump_json()
                    + "\n\n"
                )
                break
            await asyncio.sleep(0.5)
    return StreamingResponse(
        event_generator(),
        media_type="text/x-event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
@router.get("/summary/{generation_request_id}", response_model=ApiResponse[SummaryResponse])
async def summary(
    project_id: str,
    generation_request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """D-16/D-17: change summary and diff for a completed generation."""
    await ProjectService.get_for_user(db, project_id, current_user.id)
    record = BACKGROUND_STORE.get(generation_request_id)
    if record is None:
        return ApiResponse(
            success=False,
            error=ErrorDetail(
                code="GENERATION_NOT_FOUND",
                message="No generation with that id was found",
            ),
        )
    files = record.get("files", [])
    by_status: dict[str, list[str]] = {"created": [], "modified": [], "deleted": []}
    for f in files:
        op = f.get("operation") if isinstance(f, dict) else None
        path = f.get("path") if isinstance(f, dict) else str(f)
        path = path or ""
        if op == "create" or op == "write":
            by_status["created"].append(path)
        elif op == "modify":
            by_status["modified"].append(path)
        elif op == "delete":
            by_status["deleted"].append(path)
        else:
            by_status["created"].append(path)
    diff_lines = []
    for path in by_status["created"]:
        diff_lines.append(f"A  {path}")
    for path in by_status["modified"]:
        diff_lines.append(f"M  {path}")
    for path in by_status["deleted"]:
        diff_lines.append(f"D  {path}")
    return ApiResponse(
        success=True,
        data=SummaryResponse(
            generation_request_id=generation_request_id,
            project_id=project_id,
            status=record["status"],
            summary=(
                f"Generated {len(by_status['created'])} file(s), "
                f"modified {len(by_status['modified'])} file(s), "
                f"deleted {len(by_status['deleted'])} file(s)."
            ),
            created_files=by_status["created"],
            modified_files=by_status["modified"],
            deleted_files=by_status["deleted"],
            diff="\n".join(diff_lines) if diff_lines else "(no file changes)",
            started_at=record["started_at"],
            completed_at=record["completed_at"],
        ),
    )

@router.post("/apply/{generation_request_id}", response_model=ApiResponse[ApplyStatusResponse])
async def apply(
    project_id: str,
    generation_request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """D-14/D-15: apply a completed generation's files to the project workspace."""
    await ProjectService.get_for_user(db, project_id, current_user.id)
    record = BACKGROUND_STORE.get(generation_request_id)
    if record is None:
        return ApiResponse(
            success=False,
            error=ErrorDetail(
                code="GENERATION_NOT_FOUND",
                message="No generation with that id was found",
            ),
        )
    if record["status"] not in {"COMPLETED", "PARTIAL"}:
        return ApiResponse(
            success=False,
            error=ErrorDetail(
                code="GENERATION_NOT_READY",
                message="Generation must be COMPLETED or PARTIAL before apply",
            ),
        )
    files: list[dict] = record.get("files", [])
    created: list[str] = []
    modified: list[str] = []
    unchanged: list[str] = []
    failed: list[str] = []
    for f in files:
        if not isinstance(f, dict):
            failed.append(f"invalid file record: {f}")
            continue
        op = f.get("operation")
        path = f.get("path")
        content = f.get("content") or ""
        if not path:
            failed.append(f"missing path in file record: {f}")
            continue
        try:
            if op in ("create", "write"):
                # Upsert: idempotent on re-apply, convergent on edited files.
                result = sync_generated_file(project_id, path, content)
                if result == WRITE_CREATED:
                    created.append(path)
                elif result == WRITE_MODIFIED:
                    modified.append(path)
                else:
                    unchanged.append(path)
            elif op == "modify":
                FileService.save_file(project_id, path, content)
                modified.append(path)
            elif op == "delete":
                FileService.delete(project_id, path)
                failed.append(f"delete not replayed for {path} (safety)")
            else:
                failed.append(f"unknown operation {op} for {path}")
        except Exception as exc:
            failed.append(f"{path}: {exc}")
    record["status"] = "SYNCING"
    record["completed_at"] = utcnow().isoformat()
    return ApiResponse(
        success=True,
        data=ApplyStatusResponse(
            generation_request_id=generation_request_id,
            project_id=project_id,
            applied_files=created,
            modified_files=modified,
            failed_operations=failed,
            status="SYNCING",
        ),
    )
@router.post("/cancel/{generation_request_id}", response_model=ApiResponse[StatusResponse])
async def cancel(
    project_id: str,
    generation_request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """D-04: request cancellation of a running generation."""
    await ProjectService.get_for_user(db, project_id, current_user.id)
    record = BACKGROUND_STORE.get(generation_request_id)
    if record is None:
        return ApiResponse(
            success=False,
            error=ErrorDetail(
                code="GENERATION_NOT_FOUND",
                message="No generation with that id was found",
            ),
        )
    if record["status"] in TERMINAL_STATUSES:
        return ApiResponse(
            success=False,
            error=ErrorDetail(
                code="GENERATION_NOT_CANCELLABLE",
                message="Generation is already in a terminal state",
            ),
        )
    record["status"] = "CANCELLED"
    record["completed_at"] = utcnow().isoformat()
    task = record.get("task")
    if task and not task.done():
        task.cancel()
    return ApiResponse(
        success=True,
        data=StatusResponse(
            generation_request_id=generation_request_id,
            project_id=project_id,
            status="CANCELLED",
            started_at=record["started_at"],
            completed_at=record["completed_at"],
        ),
    )
# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
async def _run_generation(
    gen_id: str,
    project_id: str,
    user_id: str,
    prompt: str,
    mode: str,
    project_name: str | None,
    retries: int,
):
    """Run one generation transaction end-to-end with bounded retries."""
    store = BACKGROUND_STORE.setdefault(gen_id, {})
    store.update(
        {
            "status": "PLANNING",
            "prompt": prompt,
            "mode": mode,
            "user_id": user_id,
            "project_id": project_id,
            "started_at": utcnow().isoformat(),
            "completed_at": None,
            "files": [],
            "failed_operations": [],
        }
    )
    try:
        reqs, spec = classify_requirements(prompt)
        store["status"] = "GENERATING"
        # spec.files is list[str] of file paths (see NormalizedBuildSpec),
        # not objects with .path/.contents attributes.
        #
        # Content comes from the deterministic template map. Previously every
        # file was created with `content: ""`, so generation produced a correct
        # set of EMPTY files (including an empty `.env.example`, which made the
        # generated app's documented `cp ../.env.example .env` step useless).
        template_map = generate_file_map()
        store["files"] = [
            {
                "operation": "create",
                "path": path,
                "content": template_map.get(path, ""),
            }
            for path in spec.files
        ]
        store["status"] = "APPLYING"
        # Generation is intentionally side-effect free: it only records the
        # generated file set in the transaction. `apply` is the sole writer to
        # the workspace. Previously generation wrote the files itself and apply
        # wrote them again, so the second write failed for every file with
        # "A file or folder with this name already exists", and files appeared
        # in the user's workspace before they ever pressed "Apply".
        store["status"] = "SYNCING"
        store["completed_at"] = utcnow().isoformat()
        if store.get("failed_operations"):
            store["status"] = "PARTIAL"
        else:
            store["status"] = "COMPLETED"
    except Exception as exc:  # noqa: BLE001
        store.setdefault("failed_operations", []).append(str(exc))
        if retries < MAX_RETRIES:
            store["status"] = "IDLE"
            await asyncio.sleep(1)
            await _run_generation(
                gen_id=gen_id,
                project_id=project_id,
                user_id=user_id,
                prompt=prompt,
                mode=mode,
                project_name=project_name,
                retries=retries + 1,
            )
        else:
            store["status"] = "FAILED"
            store["completed_at"] = utcnow().isoformat()

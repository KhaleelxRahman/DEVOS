from typing import Any

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppException(Exception):
    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        data: Any | None = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.data = data
        super().__init__(message)


class AuthRequiredException(AppException):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message=message,
            code="AUTH_REQUIRED",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class InvalidCredentialsException(AppException):
    def __init__(self, message: str = "Invalid email or password"):
        super().__init__(
            message=message,
            code="INVALID_CREDENTIALS",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ProjectNotFoundException(AppException):
    def __init__(self, message: str = "Project not found"):
        super().__init__(
            message=message,
            code="PROJECT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class ProjectAccessDeniedException(AppException):
    def __init__(
        self, message: str = "You do not have permission to access this project"
    ):
        super().__init__(
            message=message,
            code="PROJECT_ACCESS_DENIED",
            status_code=status.HTTP_403_FORBIDDEN,
        )


class FileNotFoundException(AppException):
    def __init__(self, message: str = "File not found"):
        super().__init__(
            message=message,
            code="FILE_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class FileAccessDeniedException(AppException):
    def __init__(self, message: str = "Path outside project boundaries is forbidden"):
        super().__init__(
            message=message,
            code="FILE_ACCESS_DENIED",
            status_code=status.HTTP_403_FORBIDDEN,
        )


class ValidationException(AppException):
    def __init__(self, message: str = "Validation error"):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )


class ExecutionInvalidProjectException(AppException):
    """Phase 2A: project id is malformed or does not resolve to a row."""

    def __init__(self, message: str = "Invalid project for execution"):
        super().__init__(
            message=message,
            code="INVALID_PROJECT",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class ExecutionForbiddenException(AppException):
    """Phase 2A: cross-user / cross-project / ownership violation."""

    def __init__(self, message: str = "Execution is forbidden for this context"):
        super().__init__(
            message=message,
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN,
        )


class ExecutionInvalidWorkspaceException(AppException):
    """Phase 2A: workspace identity does not match the authorized project."""

    def __init__(self, message: str = "Invalid workspace for execution"):
        super().__init__(
            message=message,
            code="INVALID_WORKSPACE",
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )


class ExecutionInvalidTypeException(AppException):
    """Phase 2A: unknown or future-state execution type."""

    def __init__(self, message: str = "Invalid execution type"):
        super().__init__(
            message=message,
            code="INVALID_EXECUTION_TYPE",
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )


class ExecutionBlockedCommandException(AppException):
    """Phase 2A: command rejected by the server-side command policy."""

    def __init__(self, message: str = "Command is blocked by the execution policy"):
        super().__init__(
            message=message,
            code="BLOCKED_COMMAND",
            status_code=status.HTTP_403_FORBIDDEN,
        )


class ExecutionInvalidWorkingDirectoryException(AppException):
    """Phase 2A: working directory escapes the project workspace."""

    def __init__(self, message: str = "Invalid working directory for execution"):
        super().__init__(
            message=message,
            code="INVALID_WORKING_DIRECTORY",
            status_code=status.HTTP_403_FORBIDDEN,
        )


class ExecutionInvalidRequestException(AppException):
    """Phase 2A: malformed execution request (e.g. identity collision)."""

    def __init__(self, message: str = "Invalid execution request"):
        super().__init__(
            message=message,
            code="INVALID_REQUEST",
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )


class QualityOperationNotSupportedException(AppException):
    """Phase 2C: the requested quality operation is not configured for
    this project (no real tooling detected in the workspace)."""

    def __init__(self, message: str = "Quality operation is not supported by this project"):
        super().__init__(
            message=message,
            code="QUALITY_OPERATION_NOT_SUPPORTED",
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )


class QualityToolUnavailableException(AppException):
    """Phase 2C: the operation is configured, but its tool is not
    installed on the execution server (honest upfront refusal)."""

    def __init__(self, message: str = "Required tool is not installed on this server"):
        super().__init__(
            message=message,
            code="QUALITY_TOOL_UNAVAILABLE",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class PreviewNotSupportedException(AppException):
    """Phase 2D: the project has no configured start/dev command
    (no real dev-tooling detected in the workspace)."""

    def __init__(self, message: str = "No dev server start command detected in this project"):
        super().__init__(
            message=message,
            code="PREVIEW_NOT_SUPPORTED",
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )


class PreviewLaunchFailedException(AppException):
    """Phase 2D: the dev server process could not be started or never
    became reachable (real port probe failed)."""

    def __init__(self, message: str = "Dev server failed to start"):
        super().__init__(
            message=message,
            code="PREVIEW_LAUNCH_FAILED",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class PreviewNotFoundException(AppException):
    """Phase 2D: no running/ready preview exists for this execution."""

    def __init__(self, message: str = "Preview not found"):
        super().__init__(
            message=message,
            code="PREVIEW_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
            },
        },
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = exc.errors()
    first_error = errors[0]["msg"] if errors else "Validation failed"
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": first_error,
            },
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred",
            },
        },
    )

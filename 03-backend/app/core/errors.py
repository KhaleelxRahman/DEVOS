from typing import Any, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

class AppException(Exception):
    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        data: Optional[Any] = None,
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
    def __init__(self, message: str = "You do not have permission to access this project"):
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
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
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
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
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

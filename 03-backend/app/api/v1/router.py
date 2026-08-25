from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.projects import router as projects_router
from app.api.v1.files import router as files_router
from app.api.v1.git import router as git_router
from app.api.v1.github import router as github_router
from app.api.v1.ai import router as ai_router
from app.api.v1.terminal import router as terminal_router
from app.api.v1.activity import router as activity_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(projects_router)
api_v1_router.include_router(files_router)
api_v1_router.include_router(git_router)
api_v1_router.include_router(github_router)
api_v1_router.include_router(ai_router)
api_v1_router.include_router(terminal_router)
api_v1_router.include_router(activity_router)

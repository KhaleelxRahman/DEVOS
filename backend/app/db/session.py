from collections.abc import AsyncIterator
import os

from sqlalchemy import event
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import DATABASE_URL


def _ensure_sqlite_parent_dir(db_url: str) -> bool:
    """Create the parent directory for a file-backed SQLite database if missing."""
    try:
        url = make_url(db_url)
        if url.get_backend_name() == "sqlite":
            if url.database and url.database != ":memory:":
                parent = os.path.dirname(os.path.abspath(url.database))
                if parent:
                    os.makedirs(parent, exist_ok=True)
            return True
    except Exception:
        pass
    return False


_IS_SQLITE = _ensure_sqlite_parent_dir(DATABASE_URL)

# Async engine (aiosqlite locally, asyncpg in production). The entire request
# path — dependencies, services and Alembic — is async-first.
engine = create_async_engine(DATABASE_URL, future=True)

if _IS_SQLITE:
    @event.listens_for(engine.sync_engine, "connect")
    def _configure_sqlite_pragmas(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA busy_timeout=5000")
        finally:
            cursor.close()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency that yields a request-scoped async session."""
    async with AsyncSessionLocal() as session:
        yield session

"""encrypt existing github_connections.access_token values

Revision ID: d4e1f0a9b2c7
Revises: c520db81c7c6
Create Date: 2026-09-28

Access tokens were stored in plaintext, so a database read exposed a live
GitHub bearer credential. This migration re-encrypts every existing row with
Fernet using ``TOKEN_ENCRYPTION_KEY`` from the environment.

The key is never hardcoded here: it is read from the running application's
settings so the migration and the application can never disagree about it.
When no key is configured the migration is a no-op and says so, rather than
failing a production deploy or writing a key into the migration history.
Re-running is safe: rows already holding ciphertext are skipped.
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "d4e1f0a9b2c7"
down_revision: str | None = "c520db81c7c6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "github_connections" not in inspector.get_table_names():
        return

    from app.core.config import settings
    from app.core.crypto import encrypt_token, is_encrypted

    key = (settings.TOKEN_ENCRYPTION_KEY or "").strip()
    if not key:
        print(
            "TOKEN_ENCRYPTION_KEY is not set; leaving existing "
            "github_connections tokens unchanged. Set the key and re-run "
            "this migration to encrypt them.\n"
        )
        return

    connection = bind
    rows = connection.execute(
        sa.text("SELECT id, access_token FROM github_connections")
    ).fetchall()
    encrypted = 0
    for row in rows:
        if is_encrypted(row.access_token):
            continue
        connection.execute(
            sa.text(
                "UPDATE github_connections SET access_token = :token WHERE id = :id"
            ),
            {"token": encrypt_token(row.access_token), "id": row.id},
        )
        encrypted += 1
    if encrypted:
        connection.commit()
    print(
        f"Encrypted {encrypted} of {len(rows)} github_connections token(s).\n"
    )


def downgrade() -> None:
    # Downgrading cannot restore the original plaintext: it was never kept
    # anywhere. Re-encrypting is therefore a no-op by design; each user must
    # re-authorise instead. Stated explicitly rather than silently pretending.
    print(
        "Downgrade is a no-op: plaintext tokens were never retained, so they "
        "cannot be restored. Users must re-authorise GitHub.\n"
    )

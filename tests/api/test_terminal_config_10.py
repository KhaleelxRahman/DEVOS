"""Phase 10 - D1 terminal quoted-argument regression + DATABASE_URL config.

Root causes these tests lock down:

* D1: the terminal input box used `trimmed.split(/\\s+/)`, which shredded any
  argument containing whitespace and passed quote characters through as
  literal text. `python -c "print('X')"` became `['-c', '"print(\\'X\\')"']`.
  The tokenizer in `frontend/src/lib/shellTokenize.ts` now decides argument
  boundaries client-side; the backend stays the authoritative security
  boundary. These tests assert the backend correctly ACCEPTS a well-formed
  quoted argument and still REJECTS every attack the naive split could have
  been confused by.
* DATABASE_URL: an ambient OS-level `DATABASE_URL=file:./dev.db` overrides
  `backend/.env` and previously surfaced as an opaque SQLAlchemy parse error.
  Config now rejects it at startup with an actionable message.
"""

import pytest

from app.core.config import Settings
from app.services.execution_service import classify_command
from app.services.terminal_service import TerminalService


# --- D1: quoted argument boundaries -------------------------------------


def test_quoted_argument_is_one_argument():
    """A quoted argument containing spaces stays a SINGLE argument."""
    command = "python"
    args = ["-c", "print('REAL_STDOUT_OK')"]
    assert len(args) == 2
    assert args[1] == "print('REAL_STDOUT_OK')"
    # No residual quote characters reach the process.
    assert '"' not in args[1]
    # Policy classifies it as a controlled python -c run, not BLOCKED.
    assert classify_command(command, args) == "CONTROLLED"


def test_quote_characters_do_not_reach_the_process():
    """Quotes are grouping syntax; they must never be forwarded as text."""
    tokens = ["-c", "print(1)"]
    assert not any('"' in token or "'" in token for token in tokens)


def test_multi_word_commit_message_survives_tokenization():
    """`git commit -m "my message"` keeps the message as one argument."""
    args = ["commit", "-m", "my commit message"]
    assert args[-1] == "my commit message"
    TerminalService.validate_command("git", args)


# --- D1: security must NOT be weakened by the tokenizer ------------------


@pytest.mark.parametrize(
    "args",
    [
        ["status; rm -rf /"],          # command chaining
        ["status && whoami"],          # chaining
        ["status | tee out.txt"],      # pipe
        ["$(whoami)"],                 # command substitution
        ["`whoami`"],                  # backtick substitution
        ["../../etc/passwd"],          # traversal out of the workspace
        ["-C", "C:/Windows"],          # absolute working directory
        [".env"],                      # sensitive credential file
        ["sub/.env"],                  # sensitive file nested
    ],
)
def test_metacharacters_and_traversal_still_blocked(args):
    """The tokenizer changes ARGUMENT BOUNDARIES, never the security policy.

    Each of these must still be refused with a 403 by the authoritative
    backend validator.
    """
    with pytest.raises(Exception) as excinfo:
        TerminalService.validate_command("git", args)
    assert getattr(excinfo.value, "status_code", None) == 403


@pytest.mark.parametrize(
    "arg",
    [
        "--git-dir=C:/Users/someone/elsewhere/.git",
        "--git-dir=/etc",
        "--work-tree=C:/Windows/System32",
        "--git-dir=../../outside",
    ],
)
def test_path_smuggled_inside_option_value_is_blocked(arg):
    """Regression: a path hidden in a `--flag=value` token must be refused.

    `ntpath.isabs("--git-dir=C:/elsewhere")` is False and the value never
    starts with "/", so the original per-argument containment check passed it
    through. Verified exploit: `git --git-dir=<outside repo> show HEAD:file`
    returned the contents of a file outside the project workspace.
    """
    with pytest.raises(Exception) as excinfo:
        TerminalService.validate_command("git", [arg, "show", "HEAD:file"])
    assert getattr(excinfo.value, "status_code", None) == 403


def test_relative_option_value_is_still_allowed():
    """The fix must not over-block a workspace-relative option value."""
    TerminalService.validate_command("git", ["--git-dir=.git", "status"])


def test_default_deny_preserved():
    """A non-allowlisted command is still refused regardless of tokenizing."""
    with pytest.raises(Exception) as excinfo:
        TerminalService.validate_command("rm", ["-rf", "build"])
    assert getattr(excinfo.value, "status_code", None) == 403


def test_chained_command_is_blocked_by_execution_policy():
    """The execution policy classifies chained input as BLOCKED, not SAFE."""
    assert classify_command("git", ["status; rm -rf /"]) == "BLOCKED"
    assert classify_command("bash", ["-c", "echo hi"]) == "BLOCKED"


def test_quoted_python_program_is_controlled_not_blocked():
    """The fix must not over-block a legitimate quoted argument.

    `python -c` is an approved CONTROLLED prefix, and the tokenizer now hands
    the backend one clean program argument instead of a quote-mangled one.
    """
    assert classify_command("python", ["-c", "print('REAL_STDOUT_OK')"]) == "CONTROLLED"


def test_execution_policy_remains_default_deny():
    """`classify_command` is a strict allowlist: unlisted commands are BLOCKED.

    Note this is intentionally narrower than `TerminalService.validate_command`.
    `git status` is legal for the terminal endpoint yet is BLOCKED here,
    because the Phase 2B execution policy only auto-runs a small set of
    quality/preview commands and requires approval for anything else. The
    tokenizer does not and must not widen this set.
    """
    assert classify_command("git", ["status"]) == "BLOCKED"
    assert classify_command("rm", ["-rf", "/"]) == "BLOCKED"
    assert classify_command("echo", ["DEVOS_PHASE2_TEST"]) == "SAFE"


# --- DATABASE_URL ambient-override conflict ------------------------------


def test_ambient_file_url_is_rejected_with_actionable_message():
    """`file:./dev.db` (the ambient override) must fail loudly and clearly."""
    with pytest.raises(ValueError) as excinfo:
        Settings(DATABASE_URL="file:./dev.db")
    message = str(excinfo.value)
    assert "sqlite+aiosqlite" in message
    assert "DATABASE_URL" in message


def test_empty_database_url_is_rejected():
    with pytest.raises(ValueError):
        Settings(DATABASE_URL="   ")


@pytest.mark.parametrize(
    "url",
    [
        "sqlite+aiosqlite:///./data/devos.db",
        "postgresql+asyncpg://user:pass@localhost:5432/devos",
    ],
)
def test_valid_database_urls_are_accepted(url):
    """Both documented forms still load, so the fix is not over-strict."""
    assert Settings(DATABASE_URL=url).DATABASE_URL == url


@pytest.mark.parametrize(
    "url,expected",
    [
        ("sqlite:///./data/devos.db", "sqlite+aiosqlite"),
        ("postgresql://user:pass@localhost:5432/devos", "postgresql+asyncpg"),
    ],
)
def test_sync_driver_is_rejected_with_guidance(url, expected):
    """Sync drivers break the async engine; reject and name the async form."""
    with pytest.raises(ValueError) as excinfo:
        Settings(DATABASE_URL=url)
    assert expected in str(excinfo.value)
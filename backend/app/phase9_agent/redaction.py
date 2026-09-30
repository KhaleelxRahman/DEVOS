"""Secret redaction for the agent.

Two directions, because both leak:

* OUTBOUND - what we send to a model. A prompt containing a project .env or a
  hard-coded key would ship that credential to a third party.
* INBOUND  - what we record. Step evidence, summaries and error text are
  persisted and rendered in the UI, so an echoed token becomes a stored
  credential leak.

The patterns below are deliberately broad. A false positive costs a redacted
identifier; a false negative ships a live secret.
"""

from __future__ import annotations

import re

# (name, pattern). Ordered most specific first.
_SECRET_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("openai_key", re.compile(r"\bsk-[A-Za-z0-9_\-]{16,}\b")),
    ("github_token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{16,}\b")),
    ("google_key", re.compile(r"\bAIza[0-9A-Za-z_\-]{20,}\b")),
    ("aws_key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("slack_token", re.compile(r"\bxox[abprs]-[A-Za-z0-9\-]{10,}\b")),
    ("bearer", re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._\-]{20,}")),
    # Credential-bearing query parameters. httpx embeds the FULL request URL in
    # HTTPStatusError, and Gemini puts the API key in `?key=...`. Without this
    # pattern a provider auth failure writes a live key into persisted step
    # evidence and the UI.
    (
        "url_query_secret",
        re.compile(
            r"(?i)([?&](?:key|api[_-]?key|apikey|access[_-]?token|token|secret|"
            r"password|client[_-]?secret|signature)=)([^&\s'\"]{4,})"
        ),
    ),
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}")),
    (
        "assignment",
        # KEY=value / "key": "value" where the key name implies a credential.
        re.compile(
            r"(?i)\b([A-Z0-9_]*(?:API[_-]?KEY|SECRET|PASSWORD|PASSWD|TOKEN|"
            r"ACCESS[_-]?KEY|PRIVATE[_-]?KEY|CREDENTIAL)[A-Z0-9_]*)\b\s*[:=]\s*"
            r"[\"']?([^\s\"',}]{6,})[\"']?"
        ),
    ),
)

REDACTED = "[REDACTED]"


def redact(text: str | None) -> str:
    """Return ``text`` with credential-shaped substrings replaced."""
    if not text:
        return ""
    out = str(text)
    for _name, pattern in _SECRET_PATTERNS:
        if _name == "assignment":
            out = pattern.sub(lambda m: f"{m.group(1)}={REDACTED}", out)
        else:
            out = pattern.sub(REDACTED, out)
    return out


def contains_secret(text: str | None) -> bool:
    """True when the text still holds something credential-shaped."""
    if not text:
        return False
    return redact(text) != str(text)


def redact_structure(value, _depth: int = 0):
    """Recursively redact a JSON-ish structure (evidence dicts, plans, ...)."""
    if _depth > 12:
        return value
    if isinstance(value, str):
        return redact(value)
    if isinstance(value, dict):
        return {k: redact_structure(v, _depth + 1) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [redact_structure(v, _depth + 1) for v in value]
    return value
